#!/bin/bash
# Ultra Shine — safety check
# Run this anytime to see at a glance whether all your work is backed up
# to GitHub or if there's anything sitting only on the DevDrive at risk.
#
# Usage:  ./scripts/safety-check.sh
# Or from any directory:
#   /Volumes/DevDrive/ULTRASHINE_OS/04_WEBSITE/ultrashine-site/scripts/safety-check.sh

set -e
cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # no color

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  ULTRA SHINE · SAFETY CHECK${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Uncommitted changes — only on DevDrive, at risk
modified=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$modified" -eq 0 ]; then
  echo -e "${GREEN}✓${NC}  Working tree clean — no uncommitted files at risk."
else
  echo -e "${YELLOW}!${NC}  ${YELLOW}$modified uncommitted file(s) on disk only${NC} — not backed up yet."
  git status --short | head -10
  echo ""
  echo -e "   ${YELLOW}→ Commit + push these to make them safe:${NC}"
  echo "       git add -A && git commit -m \"your message\" && git push"
fi

echo ""

# 2. Commits on local main not pushed to GitHub yet
ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)

if [ "$ahead" -eq 0 ] && [ "$behind" -eq 0 ]; then
  echo -e "${GREEN}✓${NC}  Local is in sync with GitHub — every commit is backed up."
elif [ "$ahead" -gt 0 ]; then
  echo -e "${YELLOW}!${NC}  ${YELLOW}$ahead commit(s) ahead of GitHub${NC} — pushed to disk but not GitHub."
  echo -e "   ${YELLOW}→ Run:${NC} git push"
else
  echo -e "${YELLOW}!${NC}  $behind commit(s) behind GitHub. Run: git pull"
fi

echo ""

# 3. Last commit details
last_commit_sha=$(git rev-parse --short HEAD)
last_commit_msg=$(git log -1 --pretty=format:"%s")
last_commit_when=$(git log -1 --pretty=format:"%cr")
echo -e "${BOLD}Last commit:${NC} $last_commit_sha — $last_commit_when"
echo "             \"$last_commit_msg\""
echo ""

# 4. Remote URL — confirm GitHub is the backup (with credentials redacted)
remote_url=$(git remote get-url origin 2>/dev/null || echo "NO REMOTE CONFIGURED")
# Strip any embedded user:token@ portion so screenshots are safe to share
safe_url=$(echo "$remote_url" | sed -E 's#https://[^@]*@#https://#')
echo -e "${BOLD}GitHub backup:${NC} $safe_url"
echo ""

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$modified" -eq 0 ] && [ "$ahead" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  STATUS: FULLY SAFE — Everything is backed up to GitHub.${NC}"
  echo -e "         If the DevDrive died right now, nothing would be lost."
else
  echo -e "${YELLOW}${BOLD}  STATUS: AT RISK — Some work is only on the DevDrive.${NC}"
  echo -e "         See above for what to commit/push to make it safe."
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
