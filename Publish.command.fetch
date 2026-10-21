#!/bin/zsh
# Double-click me: builds the site from content/ and publishes it (git push → Vercel deploys).
#
#   on main      → publishes to the live site, www.kodustudio.com
#   any other    → publishes to that branch's Vercel preview, live site untouched
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" = "main" ]; then
  echo "▶ Branch: main — this publishes to the LIVE site."
else
  echo "▶ Branch: $BRANCH — this publishes to a preview, not the live site."
fi

echo "\n▶ Building site from content/…"
if ! node scripts/build.js; then
  echo "\n✗ Build failed — see the messages above. Press any key to close."; read -k1; exit 1
fi

echo "\n▶ Publishing…"
git add -A
if git diff --cached --quiet && git diff --quiet; then
  echo "Nothing changed since the last publish."
else
  git diff --cached --quiet || git commit -q -m "Update projects ($(date '+%Y-%m-%d %H:%M'))"
fi

# Push the branch you are actually on, and set its upstream the first time
if git push -q -u origin "$BRANCH"; then
  if [ "$BRANCH" = "main" ]; then
    echo "\n✓ Pushed — Vercel is deploying. Live in ~30s at https://www.kodustudio.com"
  else
    echo "\n✓ Pushed '$BRANCH' — Vercel is building a preview (~30s)."
    echo "  Find the URL in the Vercel dashboard, or on the GitHub branch page."
    echo "  The live site is unchanged."
  fi
else
  echo "\n✗ Push failed — see the messages above."
fi

echo "\nPress any key to close."; read -k1
