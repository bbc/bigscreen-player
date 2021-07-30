function Resizer () {
  var resized

  function resize (element, top, left, width, height, zIndex) {
    element.style.top = top + 'px'
    element.style.left = left + 'px'
    element.style.width = width + 'px'
    element.style.height = height + 'px'
    element.style.zIndex = zIndex + ''
    element.style.position = 'absolute'
    resized = true
  }

  function clear (element) {
    element.style.top = null
    element.style.left = null
    element.style.width = null
    element.style.height = null
    element.style.zIndex = null
    element.style.position = null
    resized = false
  }

  function isResized () {
    return resized || false
  }

  return {
    resize: resize,
    clear: clear,
    isResized: isResized
  }
}

export default Resizer

