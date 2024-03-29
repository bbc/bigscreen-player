#!/bin/sh

# Adapted from: https://prettier.io/docs/en/precommit.html#option-6-shell-script

staged_files="$(
  git diff --cached --name-only --diff-filter=ACMR | # get staged files
  sed 's| |\\ |g' # escape whitespace
)"

if [ -z "${staged_files}" ]; then
  exit 0
fi

# Lint all selected files
# --quiet to silence unmatched file warnings caused by .eslintignore
if !(
  printf "%s\n" "${staged_files}" |
    xargs ./node_modules/.bin/eslint --fix --quiet
  )
then
  exit 1
fi

# Add back the modified/linted files to staging
printf "%s\n" "${staged_files}" | xargs git add

exit 0
