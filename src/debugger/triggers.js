function setupTrigger(signal, [triggerName, triggerHandle] = []) {
  const callTriggerHandle = (event) => typeof triggerHandle === "function" && triggerHandle(event.detail)

  signal.addEventListener(triggerName, callTriggerHandle)

  return function cleanupTrigger() {
    signal.removeEventListener(triggerName, callTriggerHandle)
  }
}

export default function setupAllTriggers(signal, ...triggers) {
  const cleanupFunctions = triggers.map((trigger) => setupTrigger(signal, trigger))

  return function cleanupAllTriggers() {
    for (const cleanupFunc of cleanupFunctions) {
      cleanupFunc()
    }
  }
}
