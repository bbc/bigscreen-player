export default function deferExceptions (cb) {
  try {
    cb()
  } catch (e) {
    setTimeout(function () {
      throw e
    }, 0)
  }
}
