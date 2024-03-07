export default function Resizer() {
  let resized: boolean

  function resize(element: HTMLElement, top: number, left: number, width: number, height: number, zIndex: number) {
    element.style.top = `${top}px`
    element.style.left = `${left}px`
    element.style.width = `${width}px`
    element.style.height = `${height}px`
    element.style.zIndex = `${zIndex}`
    element.style.position = "absolute"
    resized = true
  }

  function clear(element: HTMLElement) {
    element.style.top = ""
    element.style.left = ""
    element.style.width = ""
    element.style.height = ""
    element.style.zIndex = ""
    element.style.position = ""
    resized = false
  }

  function isResized() {
    return resized || false
  }

  return {
    resize,
    clear,
    isResized,
  }
}
