#!/bin/zsh
# Double-click me: builds the site from content/ and publishes it (git push → Vercel deploys).
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "▶ Building site from content/…"
if ! node scripts/build.js; then
  echo "\n✗ Build failed — see the messages above. Press any key to close."; read -k1; exit 1
fi
echo "\n▶ Publishing…"
git add -A
if git diff --cached --quiet; then
  echo "Nothing changed since the last publish."
else
  git commit -q -m "Update projects ($(date '+%Y-%m-%d %H:%M'))"
  git push -q origin main && echo "\n✓ Pushed — Vercel is deploying. Live in ~30s at https://www.kodustudio.com"
fi
echo "\nPress any key to close."; read -k1
