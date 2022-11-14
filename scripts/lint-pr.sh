#!/bin/sh

PR_BASE_SHA="${PR_BASE_SHA}"
PR_HEAD_SHA="${PR_HEAD_SHA}"

changed_files="$(git diff --name-only --diff-filter=ACMR ${PR_BASE_SHA} ${PR_HEAD_SHA})"

# Manually check the `git diff` succeeded
[ "${?}" -ne 0 ] && exit 1

# Exit early if no files were changed
[ -z "${changed_files}" ] && exit 0

# Lint changed files
printf "%s\n" "${changed_files}" \
    | sed 's| |\\ |g' \
    | xargs ./node_modules/.bin/eslint --quiet

[ "${?}" -ne 0 ] && exit 1

exit 0
