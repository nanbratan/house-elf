#!/usr/bin/env bash
# The pre-commit hook, runnable on demand. This is the gate to run before a commit.
#
# `bun run verify` is unscoped and slow: every workspace checked, tested with
# coverage, and built. That is the wrong tool to reach for after editing three files,
# and nothing needs it there — the pre-push hook runs the same work decomposed per
# workspace, and CI runs it serially after that. Reach for it by hand only when a
# change could have broken something outside the files it touched.
#
# This runs the same checks the pre-commit hook runs, over the same set of files the
# commit would contain — staged if anything is staged, otherwise everything changed
# against HEAD. Like the hook, it decides *when* and over *what*, never *how*: every
# job below shells out to a package.json script, so there is still exactly one
# definition of how to lint, format and test this repo.
#
# Written for bash 3.2, because that is what macOS ships — no `mapfile`.
#
# Usage:
#   bun run verify:fast          staged files, else working-tree changes vs HEAD
#   bun run verify:fast --all    everything, unscoped (still no build, no coverage)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ALL=0
[ "${1:-}" = "--all" ] && ALL=1

LIST=$(mktemp)
trap 'rm -f "$LIST"' EXIT

if [ "$ALL" -eq 0 ]; then
	# Staged, unstaged and untracked, all against HEAD, so a partially staged commit
	# is still fully covered. Deleted paths fall out via the -f test.
	{
		git diff --name-only --cached --diff-filter=ACMR
		git diff --name-only --diff-filter=ACMR
		git ls-files --others --exclude-standard
	} | sort -u | while IFS= read -r f; do
		[ -n "$f" ] && [ -f "$f" ] && printf '%s\n' "$f"
	done >"$LIST"

	if [ ! -s "$LIST" ]; then
		echo "▸ nothing changed against HEAD — use --all to check everything"
		exit 0
	fi
	echo "▸ scope: $(wc -l <"$LIST" | tr -d ' ') changed file(s)"
else
	echo "▸ scope: whole repo"
fi

# Filters the changed list by extension; prints nothing if none match.
matching() {
	grep -E "$1" "$LIST" || true
}

# Filters by workspace prefix and strips it, so the workspace's own script receives
# paths relative to its root. Vitest needs this: SvelteKit's Vite plugin resolves
# `$lib` and `$app` against the working directory, so the run must happen in there.
#
# Newlines are flattened to spaces: the result is interpolated into a `bash -c`
# string, and a multi-line value there runs the first path as the command and every
# remaining line as its own command.
in_workspace() {
	matching "$2" | grep "^$1" | sed "s|^$1||" | tr '\n' ' ' || true
}

FAILED=""
run() {
	name="$1"
	shift
	echo "─── $name"
	if "$@"; then
		echo "    ✓ $name"
	else
		echo "    ✗ $name"
		FAILED="$FAILED $name"
	fi
}

if [ "$ALL" -eq 1 ]; then
	run format bun run format:check .
	run lint bun run lint
	# The root `check` script: root tsc, then every workspace's own check.
	run types bun run check
	run test:server bun run --filter '@house-elf/server' test:unit
	run test:web bun run --filter '@house-elf/web' test:unit
	run test:web-react bun run --filter '@house-elf/web-react' test:unit
else
	FMT=$(matching '\.(ts|tsx|js|jsx|mjs|svelte|json|jsonc|css|md|yml|yaml|html)$')
	[ -n "$FMT" ] && run format bun run format:check $FMT

	SRC=$(matching '\.(ts|tsx|js|jsx|mjs|svelte)$')
	if [ -n "$SRC" ]; then
		run lint bun run lint $SRC
		# Unscoped: tsc has no useful per-file mode here, and incremental costs ~2s.
		run types bunx tsc --noEmit --incremental -p tsconfig.json
	fi

	# The root project above includes only `vitest.shared.ts`, `playwright.config.ts`
	# and `tests/`, so on its own it type-checks no application source at all. Each
	# workspace is a separate tsconfig and needs its own run.
	#
	# `tsc -p` has no useful per-file mode, so the unit of scoping is the workspace,
	# not the file, and each workspace's own `check` script stays the single
	# definition of *how* it is checked — plain tsc in most, svelte-check in
	# apps/web. This only decides which ones run.
	CHECK=""
	for ws in server web web-react; do
		if [ -n "$(in_workspace "apps/$ws/" '\.(ts|tsx|svelte)$')" ]; then
			CHECK="$CHECK @house-elf/$ws"
		fi
	done

	# packages/shared is imported by the apps, so a type change there surfaces in its
	# dependents rather than in itself — checking it alone would prove nothing.
	if [ -n "$(in_workspace 'packages/shared/' '\.ts$')" ]; then
		CHECK="@house-elf/shared @house-elf/server @house-elf/web @house-elf/web-react"
	fi

	for ws in $CHECK; do
		run "check:${ws#@house-elf/}" bun run --filter "$ws" check
	done

	# `vitest related` runs only the tests importing these files, transitively.
	SERVER=$(in_workspace 'apps/server/' '\.ts$')
	if [ -n "$SERVER" ]; then
		run test:server bash -c "cd apps/server && bun run test:related $SERVER"
	fi

	WEB=$(in_workspace 'apps/web/' '\.(ts|svelte)$')
	if [ -n "$WEB" ]; then
		run test:web bash -c "cd apps/web && bun run test:related $WEB"
	fi

	WEB_REACT=$(in_workspace 'apps/web-react/' '\.(ts|tsx)$')
	if [ -n "$WEB_REACT" ]; then
		run test:web-react bash -c "cd apps/web-react && bun run test:related $WEB_REACT"
	fi
fi

echo
if [ -n "$FAILED" ]; then
	echo "✗ failed:$FAILED"
	exit 1
fi
echo "✓ fast checks passed"
