#!/bin/sh

# Adapted from: https://prettier.io/docs/en/precommit.html#option-6-shell-script

staged_files="$(git diff --cached --name-only --diff-filter=ACMR | sed 's| |\\ |g')"

[ -z "${staged_files}" ] && exit 0

# Lint all selected files
# --quiet to silence unmatched file warnings caused by .eslintignore
echo "${staged_files}" | xargs ./node_modules/.bin/eslint --fix --quiet

[ "${?}" -ne 0 ] && exit 1

# Add back the modified/linted files to staging
echo "${staged_files}" | xargs git add

exit 0
