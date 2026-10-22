#!/bin/zsh
# Double-click me: takes everything on 'staging' and puts it on the live site.
#
# Use Publish.command first to get your work onto staging and check the preview.
# This one is the last step: staging → main → www.kodustudio.com
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

finish() { echo "\nPress any key to close."; read -k1; exit $1 }

HERE=$(git rev-parse --abbrev-ref HEAD)

# Anything uncommitted would be left behind by the branch switch below.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ You have changes that haven't been published yet."
  echo "  Run Publish.command first, then come back to this."
  finish 1
fi

echo "▶ Checking what's on staging…"
if ! git fetch -q origin; then
  echo "✗ Couldn't reach GitHub. Check your internet and try again."
  finish 1
fi

AHEAD=$(git rev-list --count main..staging)
BEHIND=$(git rev-list --count staging..main)

if [ "$AHEAD" -eq 0 ]; then
  echo "\n✓ Nothing to do — the live site already has everything on staging."
  finish 0
fi

if [ "$BEHIND" -gt 0 ]; then
  echo "\n✗ main has $BEHIND commit(s) that staging doesn't."
  echo "  The branches have drifted apart, so this can't be a clean fast-forward."
  echo "  Ask Claude to sort it out rather than forcing it."
  finish 1
fi

echo "\n▶ This will put $AHEAD commit(s) on the LIVE site:\n"
git log --oneline --no-decorate main..staging | sed 's/^/    /'

echo "\nGo live? [y/N] "
read -k1 REPLY
echo ""
if [ "$REPLY" != "y" ] && [ "$REPLY" != "Y" ]; then
  echo "\nCancelled. Nothing changed."
  finish 0
fi

echo "\n▶ Publishing to the live site…"
git checkout -q main || { echo "✗ Couldn't switch to main."; finish 1 }

# --ff-only: refuse rather than invent a merge commit if anything unexpected is there
if ! git merge --ff-only -q staging; then
  echo "✗ Couldn't fast-forward main. Nothing was pushed."
  git checkout -q "$HERE"
  finish 1
fi

if git push -q origin main; then
  git checkout -q "$HERE"
  echo "\n✓ Live. Vercel is deploying — www.kodustudio.com updates in ~30s."
  echo "  You're back on '$HERE'."
else
  echo "\n✗ Push failed — see above. main was merged locally but not pushed."
  git checkout -q "$HERE"
  finish 1
fi

finish 0
