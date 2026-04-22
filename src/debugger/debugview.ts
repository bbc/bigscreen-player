import DOMHelpers from "../domhelpers"

type Entry = { id: string; key: string; value: string | number | boolean }

let appElement: HTMLElement | undefined
let logBox: HTMLElement | undefined
let logContainer: HTMLElement | undefined
let staticContainer: HTMLElement | undefined
let staticBox: HTMLElement | undefined

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
  logBox.style.opacity = "0.9"
  logBox.style.overflow = "hidden"

  staticBox.id = "staticBox"
  staticBox.style.position = "absolute"
  staticBox.style.width = "30%"
  staticBox.style.right = "1%"
  staticBox.style.top = "15%"
  staticBox.style.bottom = "25%"
  staticBox.style.backgroundColor = "#1D1D1D"
  staticBox.style.opacity = "0.9"
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

function setRootElement(root?: HTMLElement) {
  if (root) {
    appElement = root
  }
}

function renderDynamicLogs(dynamic: string[]) {
  if (logContainer) logContainer.textContent = dynamic.join("\n")
}

function renderStaticLogs(staticLogs: (Entry | null)[]) {
  staticLogs.forEach((entry) => renderStaticLog(entry))
}

function render({ dynamic: dynamicLogs, static: staticLogs }: { dynamic: string[]; static: (Entry | null)[] }) {
  renderDynamicLogs(dynamicLogs)
  renderStaticLogs(staticLogs)
}

function renderStaticLog(entry: Entry | null) {
  if (entry == null) {
    return
  }

  const { id, key, value } = entry

  const existingElement = document.querySelector(`#${id}`)

  const text = `${key}: ${value}`

  if (existingElement == null) {
    createNewStaticElement(entry)

    return
  }

  if (existingElement.textContent === text) {
    return
  }

  existingElement.textContent = text
}

function createNewStaticElement({ id, key, value }: Entry) {
  const staticLog = document.createElement("div")

  staticLog.id = id
  staticLog.style.paddingBottom = "1%"
  staticLog.style.borderBottom = "1px solid white"
  staticLog.textContent = `${key}: ${value}`

  staticContainer?.appendChild(staticLog)
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
