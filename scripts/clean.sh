#!/usr/bin/env bash
# Clears Mastra's build artifacts, so the next `bun run dev` rebuilds from source.
#
# The symptom this exists for is `fetch failed` in the web app: the browser reaches
# :5173 fine, but nothing is answering on :4111 because `mastra dev` refused to start.
# The usual cause is `apps/server/.mastra/dev.lock`, which names the pid that holds the
# dev server. A crashed or `kill -9`'d run never removes it, and every later run then
# defers to a process that no longer exists. The other cause is `.mastra/output`, a
# bundle that can disagree with the sources it was built from after a branch switch.
#
# Both live under `apps/server/.mastra`, which is gitignored and entirely generated —
# deleting it costs one rebuild and nothing else. It is not deleted while a live
# `mastra dev` still holds the lock, since that would leave that server running with
# its own bundle pulled out from under it.
#
# Written for bash 3.2, because that is what macOS ships.
#
# Usage:
#   bun run clean            refuses if the lock names a live process
#   bun run clean --force    deletes anyway, whoever holds it
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

TARGET=apps/server/.mastra
LOCK="$TARGET/dev.lock"

if [ ! -d "$TARGET" ]; then
	echo "▸ nothing to clean — $TARGET does not exist"
	exit 0
fi

# The lock is JSON (`{"pid":84165}`), read with grep rather than a JSON parser so this
# script keeps working when node_modules is the thing being repaired.
if [ -f "$LOCK" ]; then
	PID=$(tr -dc '0-9' <"$LOCK")
	if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
		if [ "$FORCE" -eq 0 ]; then
			echo "✗ pid $PID still holds $LOCK — it looks like \`mastra dev\` is running."
			echo "  Stop it and run again, or \`bun run clean --force\` to delete anyway."
			exit 1
		fi
		echo "▸ pid $PID still holds the lock — deleting anyway (--force)"
	else
		echo "▸ stale lock: pid ${PID:-unknown} is gone"
	fi
fi

echo "▸ removing $TARGET ($(du -sh "$TARGET" | cut -f1))"
rm -rf "$TARGET"

echo "✓ cleaned — the next \`bun run dev\` rebuilds it"
