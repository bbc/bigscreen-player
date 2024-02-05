import DOMHelpers from "../domhelpers"

type Entry = { id: string; key: string; value: string | number | boolean }

class DebugView {
  private appElement: HTMLElement | undefined
  private logBox: HTMLElement | undefined
  private logContainer: HTMLElement | undefined
  private staticContainer: HTMLElement | undefined
  private staticBox: HTMLElement | undefined

  constructor() {
    this.logBox = document.createElement("div")
    this.logContainer = document.createElement("span")
    this.staticBox = document.createElement("div")
    this.staticContainer = document.createElement("span")

    if (this.appElement === undefined) {
      this.appElement = document.body
    }

    this.logBox.id = "logBox"
    this.logBox.style.position = "absolute"
    this.logBox.style.width = "63%"
    this.logBox.style.left = "5%"
    this.logBox.style.top = "15%"
    this.logBox.style.bottom = "25%"
    this.logBox.style.backgroundColor = "#1D1D1D"
    this.logBox.style.opacity = "0.9"
    this.logBox.style.overflow = "hidden"

    this.staticBox.id = "staticBox"
    this.staticBox.style.position = "absolute"
    this.staticBox.style.width = "30%"
    this.staticBox.style.right = "1%"
    this.staticBox.style.top = "15%"
    this.staticBox.style.bottom = "25%"
    this.staticBox.style.backgroundColor = "#1D1D1D"
    this.staticBox.style.opacity = "0.9"
    this.staticBox.style.overflow = "hidden"

    this.logContainer.id = "logContainer"
    this.logContainer.style.color = "#ffffff"
    this.logContainer.style.fontSize = "11pt"
    this.logContainer.style.position = "absolute"
    this.logContainer.style.bottom = "1%"
    this.logContainer.style.left = "1%"
    this.logContainer.style.wordWrap = "break-word"
    this.logContainer.style.whiteSpace = "pre-line"

    this.staticContainer.id = "staticContainer"
    this.staticContainer.style.color = "#ffffff"
    this.staticContainer.style.fontSize = "11pt"
    this.staticContainer.style.wordWrap = "break-word"
    this.staticContainer.style.left = "1%"
    this.staticContainer.style.whiteSpace = "pre-line"

    this.logBox.appendChild(this.logContainer)
    this.staticBox.appendChild(this.staticContainer)
    this.appElement.appendChild(this.logBox)
    this.appElement.appendChild(this.staticBox)
  }

  public setRootElement(root?: HTMLElement) {
    if (root) {
      this.appElement = root
    }
  }

  public tearDown() {
    DOMHelpers.safeRemoveElement(this.logBox)
    DOMHelpers.safeRemoveElement(this.staticBox)

    this.appElement = undefined
    this.staticContainer = undefined
    this.logContainer = undefined
    this.logBox = undefined
  }

  public render({ dynamic: dynamicLogs, static: staticLogs }: { dynamic: string[]; static: Entry[] }) {
    this.renderDynamicLogs(dynamicLogs)
    this.renderStaticLogs(staticLogs)
  }

  private renderDynamicLogs(dynamic: string[]) {
    if (this.logContainer) this.logContainer.textContent = dynamic.join("\n")
  }

  private renderStaticLogs(staticLogs: Entry[]) {
    staticLogs.forEach((entry) => this.renderStaticLog(entry))
  }

  private renderStaticLog(entry: Entry) {
    const { id, key, value } = entry
    const existingElement = document.querySelector(`#${id}`)

    const text = `${key}: ${value}`

    if (existingElement == null) {
      this.createNewStaticElement(entry)

      return
    }

    if (existingElement.textContent === text) {
      return
    }

    existingElement.textContent = text
  }

  private createNewStaticElement({ id, key, value }: Entry) {
    const staticLog = document.createElement("div")

    staticLog.id = id
    staticLog.style.paddingBottom = "1%"
    staticLog.style.borderBottom = "1px solid white"
    staticLog.textContent = `${key}: ${value}`

    this.staticContainer?.appendChild(staticLog)
  }
}

export default DebugView
