#!/bin/sh

# Adapted from: https://prettier.io/docs/en/precommit.html#option-6-shell-script

files="$(git diff --cached --name-only --diff-filter=ACMR | sed 's| |\\ |g')"

[ -z "${files}" ] && exit 0

# Prettify all selected files
echo "${files}" | xargs ./node_modules/.bin/prettier --ignore-unknown --write

# Add back the modified/prettified files to staging
echo "${files}" | xargs git add

exit 0
