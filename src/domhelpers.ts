function addClass(el: HTMLElement, className: string) {
  if (el.classList) {
    el.classList.add(className)
  } else {
    el.className += ` ${className}`
  }
}

function removeClass(el: HTMLElement, className: string) {
  if (el.classList) {
    el.classList.remove(className)
  } else {
    el.className = el.className.replace(new RegExp(`(^|\\b)${className.split(" ").join("|")}(\\b|$)`, "gi"), " ")
  }
}

function hasClass(el: HTMLElement, className: string) {
  return el.classList ? el.classList.contains(className) : new RegExp(`(^| )${className}( |$)`, "gi").test(el.className)
}

function isRGBA(rgbaString: string) {
  return new RegExp("^#([A-Fa-f0-9]{8})$").test(rgbaString)
}

/**
 *  Checks that the string is an RGBA tuple and returns a RGB Tripple.
 *  A string that isn't an RGBA tuple will be returned to the caller.
 */
function rgbaToRGB(rgbaString: string) {
  return isRGBA(rgbaString) ? rgbaString.slice(0, 7) : rgbaString
}

/**
 * Safely removes an element from the DOM, simply doing
 * nothing if the node is detached (Has no parent).
 * @param el The Element to remove
 */
function safeRemoveElement(el?: Element) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

export default {
  addClass,
  removeClass,
  hasClass,
  rgbaToRGB,
  isRGBA,
  safeRemoveElement,
}