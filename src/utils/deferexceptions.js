function DeferExceptions(cb) {
  try {
    cb()
  } catch (e) {
    setTimeout(() => {
      throw e
    }, 0)
  }
}

export default DeferExceptions
