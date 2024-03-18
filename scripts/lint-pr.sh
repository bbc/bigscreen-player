#!/bin/sh

PR_BASE_SHA="${PR_BASE_SHA}"
PR_HEAD_SHA="${PR_HEAD_SHA}"

changed_files="$(git diff --name-only --diff-filter=ACMR ${PR_BASE_SHA} ${PR_HEAD_SHA})"

# Manually check the `git diff` succeeded
if [ "${?}" -ne 0 ]; then
  exit 1
fi

# Exit early if no files were changed
if [ -z "${changed_files}" ]; then
  exit 0
fi

# Lint changed files
if !(
  printf "%s\n" "${changed_files}" |
    sed 's| |\\ |g' |
    xargs ./node_modules/.bin/eslint --quiet
  )
then
  exit 1
fi

exit 0
