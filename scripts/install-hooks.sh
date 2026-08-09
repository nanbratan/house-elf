#!/usr/bin/env bash
# Installs the git hooks. Run by the root `prepare` script on every `bun install`.
#
# Two tools write into the same hook files and neither knows about the other:
#
#   lefthook install --force   generates the whole file, ending in
#                              `call_lefthook run "<hook>" "$@"`
#   bd hooks install --beads   appends its own block after that, preserving
#                              whatever content is already there
#
# Order matters and cannot be swapped: lefthook regenerates the file wholesale and
# would delete the beads block, so beads has to go last.
#
# That ordering is what breaks the gate. lefthook's generated hook ends with its own
# `call_lefthook` line, so the script's exit status IS lefthook's — until beads
# appends a block after it whose trailing `if` becomes the last command to run. A
# failing lefthook then prints its failure and exits 0, and the commit proceeds. That
# is not hypothetical: commit 6f36ac3 landed three unformatted files through a gate
# that had already reported `exit status 1` (house-elf-8nf).
#
# So this script re-arms the gate afterwards, turning
#
#   call_lefthook run "pre-commit" "$@"
# into
#   call_lefthook run "pre-commit" "$@" || exit $?
#
# which aborts before the beads block on failure. Skipping beads on an aborted commit
# is correct — there is no commit left to record.
#
# Patching a generated file is a workaround, so it is written to fail loudly rather
# than degrade: if the expected line is missing from pre-commit or pre-push, this
# exits non-zero instead of leaving a silently unarmed gate behind. A lefthook
# template change should break the install, not the guarantee.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# `bun run prepare` puts this on PATH, a direct `bash scripts/install-hooks.sh` does
# not. Added here so the script behaves the same either way.
PATH="$PWD/node_modules/.bin:$PATH"

lefthook install --force

# bd is optional: a clone without it still gets the lefthook gate, which is the part
# that guards code quality.
if command -v bd >/dev/null 2>&1; then
	bd hooks install --beads
fi

HOOKS_DIR=$(git config core.hooksPath || echo .git/hooks)

# Only these two are gates. post-merge and post-checkout are beads-only (no lefthook
# line to repair), and prepare-commit-msg is repaired if present but is not required
# — it writes a trailer, it does not decide whether a commit happens.
REQUIRED="pre-commit pre-push"
OPTIONAL="prepare-commit-msg"

for hook in $REQUIRED $OPTIONAL; do
	file="$HOOKS_DIR/$hook"
	[ -f "$file" ] || continue

	if grep -q 'call_lefthook run .* || exit \$?' "$file"; then
		continue
	fi

	if grep -q '^call_lefthook run ' "$file"; then
		tmp=$(mktemp)
		sed 's/^call_lefthook run \(.*\)$/call_lefthook run \1 || exit $?/' "$file" >"$tmp"
		# `cat >` rather than `mv`, to keep the file's existing executable bit.
		cat "$tmp" >"$file"
		rm -f "$tmp"
	fi
done

# Post-condition. Everything above is best-effort string surgery; this is the part
# that actually holds, so it is checked rather than assumed.
for hook in $REQUIRED; do
	file="$HOOKS_DIR/$hook"

	if [ ! -f "$file" ]; then
		echo "install-hooks: $file missing — lefthook did not install it" >&2
		exit 1
	fi

	if ! grep -q 'call_lefthook run .* || exit \$?' "$file"; then
		echo "install-hooks: $file does not propagate lefthook's exit code." >&2
		echo "  Expected a line: call_lefthook run \"$hook\" \"\$@\" || exit \$?" >&2
		echo "  lefthook's template has probably changed — see house-elf-8nf." >&2
		exit 1
	fi
done

echo "install-hooks: gate armed (${REQUIRED// /, })"
