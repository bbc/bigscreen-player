function addClass (el, className) {
  if (el.classList) {
    el.classList.add(className)
  } else {
    el.className += ' ' + className
  }
}

function removeClass (el, className) {
  if (el.classList) {
    el.classList.remove(className)
  } else {
    el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ')
  }
}

function hasClass (el, className) {
  if (el.classList) {
    return el.classList.contains(className)
  } else {
    return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className)
  }
}

function isRGBATuple (rgbaString) {
  return new RegExp('^#([A-Fa-f0-9]{8})$').test(rgbaString)
}

/**
 *  Checks that the string is an RGBA tuple and returns a RGB Tripple.
 *  A string that isn't an RGBA tuple will be returned to the caller.
 * @param {String} rgbaString
 */
function rgbaToRGB (rgbaString) {
  if (isRGBATuple(rgbaString)) {
    rgbaString = rgbaString.slice(0, 7)
  }
  return rgbaString
}

/**
 * Safely removes an element from the DOM, simply doing
 * nothing if the node is detached (Has no parent).
 * @param {Element} el The Element to remove
 */
function safeRemoveElement (el) {
  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

export default {
  addClass: addClass,
  removeClass: removeClass,
  hasClass: hasClass,
  rgbaToRGB: rgbaToRGB,
  isRGBA: isRGBATuple,
  safeRemoveElement: safeRemoveElement
}
