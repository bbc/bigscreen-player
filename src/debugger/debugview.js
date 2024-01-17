import DOMHelpers from "../domhelpers"

let appElement, logBox, logContainer, staticContainer, staticBox

function init() {
  logBox = document.createElement("div")
  logContainer = document.createElement("span")
  staticBox = document.createElement("div")
  staticContainer = document.createElement("span")

  if (appElement === undefined) {
    appElement = document.body
  }

  logBox.id = "logBox"
  logBox.style.position = "absolute"
  logBox.style.width = "63%"
  logBox.style.left = "5%"
  logBox.style.top = "15%"
  logBox.style.bottom = "25%"
  logBox.style.backgroundColor = "#1D1D1D"
  logBox.style.opacity = 0.9
  logBox.style.overflow = "hidden"

  staticBox.id = "staticBox"
  staticBox.style.position = "absolute"
  staticBox.style.width = "30%"
  staticBox.style.right = "1%"
  staticBox.style.top = "15%"
  staticBox.style.bottom = "25%"
  staticBox.style.backgroundColor = "#1D1D1D"
  staticBox.style.opacity = 0.9
  staticBox.style.overflow = "hidden"

  logContainer.id = "logContainer"
  logContainer.style.color = "#ffffff"
  logContainer.style.fontSize = "11pt"
  logContainer.style.position = "absolute"
  logContainer.style.bottom = "1%"
  logContainer.style.left = "1%"
  logContainer.style.wordWrap = "break-word"
  logContainer.style.whiteSpace = "pre-line"

  staticContainer.id = "staticContainer"
  staticContainer.style.color = "#ffffff"
  staticContainer.style.fontSize = "11pt"
  staticContainer.style.wordWrap = "break-word"
  staticContainer.style.left = "1%"
  staticContainer.style.whiteSpace = "pre-line"

  logBox.appendChild(logContainer)
  staticBox.appendChild(staticContainer)
  appElement.appendChild(logBox)
  appElement.appendChild(staticBox)
}

function setRootElement(root) {
  if (root) {
    appElement = root
  }
}

function render(logData) {
  const LINES_TO_DISPLAY = 29
  let dynamicLogs = logData.dynamic

  if (dynamicLogs.length === 0) {
    logContainer.textContent = ""
  }

  dynamicLogs = dynamicLogs.slice(-LINES_TO_DISPLAY)
  logContainer.textContent = dynamicLogs.join("\n")

  logData.static.forEach(updateStaticElements)
}

function updateStaticElements(log) {
  const existingElement = document.querySelector(log.key)
  const text = `${log.key}: ${log.value}`

  if (existingElement) {
    if (text !== existingElement.textContent) {
      existingElement.textContent = text
    }
  } else {
    createNewStaticElement(log.key, log.value)
  }
}

function createNewStaticElement(key, value) {
  const staticLog = document.createElement("div")

  staticLog.id = key
  staticLog.style.paddingBottom = "1%"
  staticLog.style.borderBottom = "1px solid white"
  staticLog.textContent = `${key}: ${value}`

  staticContainer.appendChild(staticLog)
}

function tearDown() {
  DOMHelpers.safeRemoveElement(logBox)
  DOMHelpers.safeRemoveElement(staticBox)

  appElement = undefined
  staticContainer = undefined
  logContainer = undefined
  logBox = undefined
}

export default {
  init,
  setRootElement,
  render,
  tearDown,
}
