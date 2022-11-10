#!/bin/sh

# Adapted from: https://prettier.io/docs/en/precommit.html#option-6-shell-script

staged_files="$(git diff --cached --name-only --diff-filter=ACMR | sed 's| |\\ |g')"

[ -z "${staged_files}" ] && exit 0

# Prettify all selected files
echo "${staged_files}" | xargs ./node_modules/.bin/prettier --ignore-unknown --write

# Add back the modified/prettified files to staging
echo "${staged_files}" | xargs git add

exit 0
