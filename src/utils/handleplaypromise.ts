export default function handlePlayPromise(playPromise?: Promise<unknown>) {
  if (!playPromise || typeof playPromise.catch !== "function") return

  playPromise.catch((error?: Error) => {
    if (error && error.name === "AbortError") {
      return
    }
    throw error
  })
}
