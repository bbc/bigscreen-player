import DOMHelpers from "../domhelpers"

/**
 * Safely checks if an attribute exists on an element.
 * Browsers < DOM Level 2 do not have 'hasAttribute'
 *
 * The interesting case - can be null when it isn't there or "", but then can also return "" when there is an attribute with no value.
 * For subs this is good enough. There should not be attributes without values.
 * @param {Element} el HTML Element
 * @param {String} attribute attribute to check for
 */
function hasAttribute(el, attribute) {
  return !!el.getAttribute(attribute)
}

function hasNestedTime(element) {
  return !hasAttribute(element, "begin") || !hasAttribute(element, "end")
}

function TimedText(timedPieceNode, toStyleFunc) {
  const start = timeStampToSeconds(timedPieceNode.getAttribute("begin"))
  const end = timeStampToSeconds(timedPieceNode.getAttribute("end"))
  const _node = timedPieceNode
  let htmlElementNode

  function timeStampToSeconds(timeStamp) {
    const timePieces = timeStamp.split(":")
    let timeSeconds = parseFloat(timePieces.pop(), 10)
    if (timePieces.length) {
      timeSeconds += 60 * parseInt(timePieces.pop(), 10)
    }
    if (timePieces.length) {
      timeSeconds += 60 * 60 * parseInt(timePieces.pop(), 10)
    }
    return timeSeconds
  }

  function removeFromDomIfExpired(time) {
    if (time > end || time < start) {
      DOMHelpers.safeRemoveElement(htmlElementNode)
      return true
    }
    return false
  }

  function addToDom(parentNode) {
    const node = htmlElementNode || generateHtmlElementNode()
    parentNode.appendChild(node)
  }

  function generateHtmlElementNode(node) {
    const source = node || _node
    let localName = source.localName || source.tagName

    // We lose line breaks with nested TimePieces, so this provides similar layout
    const parentNodeLocalName =
      (source.parentNode && source.parentNode.localName) || (source.parentNode && source.parentNode.tagName)
    if (localName === "span" && parentNodeLocalName === "p" && hasNestedTime(source.parentNode)) {
      localName = "p"
    }

    const html = document.createElement(localName)
    const style = toStyleFunc(source)
    if (style) {
      html.setAttribute("style", style)
      html.style.cssText = style
    }

    if (localName === "p") {
      html.style.margin = "0px"
    }

    for (let i = 0, j = source.childNodes.length; i < j; i++) {
      const n = source.childNodes[i]
      if (n.nodeType === 3) {
        html.appendChild(document.createTextNode(n.data))
      } else if (n.nodeType === 1) {
        html.appendChild(generateHtmlElementNode(n))
      }
    }
    if (!node) {
      htmlElementNode = html
    }

    return html
  }

  return {
    start: start,
    end: end,
    // TODO: can we stop this from adding/removing itself from the DOM? Just expose the 'generateNode' function? OR just generate the node at creation and have a property...
    removeFromDomIfExpired: removeFromDomIfExpired,
    addToDom: addToDom,
  }
}

export default TimedText
