class NoErrorThrownError extends Error {}

/**
 * @param {() => unknown} call
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
