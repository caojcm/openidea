#!/usr/bin/env bash
set -euo pipefail

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
before=$(git rev-parse HEAD)
git fetch "$1" main

if git merge-base --is-ancestor FETCH_HEAD HEAD; then
  printf 'changed=false\nsha=%s\n' "$before" >> "$GITHUB_OUTPUT"
  exit 0
fi

if ! git merge --no-edit FETCH_HEAD; then
  git merge --abort
  echo "::error::Upstream merge conflict. Resolve it manually; origin/main was not changed."
  exit 1
fi

git push origin HEAD:main
printf 'changed=true\nsha=%s\n' "$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
