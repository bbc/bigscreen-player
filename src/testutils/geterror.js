export class NoErrorThrownError extends Error {}

/**
 * @see {@link https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-conditional-expect.md#how-to-catch-a-thrown-error-for-testing-without-violating-this-rule} [2023-06-16]
 *
 * @param {Function} call
 * @returns {Promise<Error>}
 */
export default async function getError(call) {
  try {
    await call()

    throw new NoErrorThrownError()
  } catch (error) {
    return error
  }
}
