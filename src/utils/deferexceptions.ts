export default function DeferExceptions(callback: () => void) {
  try {
    callback()
  } catch (error: unknown) {
    setTimeout(() => {
      throw error
    }, 0)
  }
}
