function DeferExceptions (cb) {
  try {
    cb()
  } catch (e) {
    setTimeout(function () {
      throw e
    }, 0)
  }
}

export default DeferExceptions
