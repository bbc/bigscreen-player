import { fromXML, generateISD, renderHTML } from "smp-imsc"
import DOMHelpers from "../domhelpers"
import DebugTool from "../debugger/debugtool"
import Plugins from "../plugins"
import Utils from "../utils/playbackutils"
import LoadURL from "../utils/loadurl"
import findSegmentTemplate from "../utils/findtemplate"

const SEGMENTS_BUFFER_SIZE = 3
const LOAD_ERROR_COUNT_MAX = 3

function IMSCSubtitles(mediaPlayer, autoStart, parentElement, mediaSources, defaultStyleOpts) {
  const windowStartEpochSeconds = mediaSources?.time().windowStartTime / 1000
  const presentationTimeOffsetSeconds = mediaSources?.time().presentationTimeOffsetSeconds

  let imscRenderOpts = transformStyleOptions(defaultStyleOpts)
  let currentSegmentRendered
  let loadErrorCount = 0
  let segments = []

  let exampleSubtitlesElement
  let currentSubtitlesElement
  let currentTrackingElement
  let updateInterval

  const IMSCErrorHandler = {
    info: (...args) => DebugTool.info(`IMSC: ${args.join("--")}`),
    warn: (...args) => DebugTool.warn(`IMSC: ${args.join("--")}`),
    error: (...args) => DebugTool.error(`IMSC: ${args.join("--")}`),
    fatal: (...args) => DebugTool.error(`IMSC fatal: ${args.join("--")}`),
  }

  DebugTool.info(`Subtitles parent element has z-index: ${parentElement.style.zIndex}`)

  parentElement.appendChild(createTestEl())

  const playbackEl = document.querySelector("#CorePlayback")

  if (playbackEl) {
    const video = playbackEl.querySelector("video")
    video.style.top = "-100%"

    DebugTool.info("Schmoved video out of the way")
  }

  const html = document.querySelector("html")

  if (html) {
    html.style.backgroundColor = "transparent"
  }

  if (autoStart) {
    start()
  }

  function getTimeOffset() {
    return presentationTimeOffsetSeconds || windowStartEpochSeconds
  }

  function calculateSegmentNumber() {
    const segmentNumber = Math.floor(getCurrentTime() / mediaSources.currentSubtitlesSegmentLength())

    // Add 1 as the PTO gives segment '0' relative to the presentation time.
    // DASH segments use one-based indexing, so add 1 to the result of PTO.
    // (Imagine PTO was 0)
    if (typeof presentationTimeOffsetSeconds === "number" && isFinite(presentationTimeOffsetSeconds)) {
      return segmentNumber + 1
    }

    return segmentNumber
  }

  function loadAllRequiredSegments() {
    const segmentsToLoad = []

    const currentSegmentNumber = calculateSegmentNumber()

    for (let offset = 0; offset < SEGMENTS_BUFFER_SIZE; offset++) {
      const segmentNumber = currentSegmentNumber + offset
      const alreadyLoaded = segments.some((segment) => segment.number === segmentNumber)

      if (!alreadyLoaded) {
        segmentsToLoad.push(segmentNumber)
      }
    }

    if (SEGMENTS_BUFFER_SIZE === segmentsToLoad.length) {
      // This is to ensure when seeking to a point with no subtitles, don't leave previous subtitle displayed.
      removeCurrentSubtitlesElement()
    }

    const segmentsUrlTemplate = mediaSources.currentSubtitlesSource()
    const segmentsTemplate = findSegmentTemplate(segmentsUrlTemplate)

    segmentsToLoad.forEach((segmentNumber) => {
      loadSegment(segmentsUrlTemplate.replace(segmentsTemplate, segmentNumber), segmentNumber)
    })
  }

  function loadSegment(url, segmentNumber) {
    LoadURL(url, {
      timeout: mediaSources.subtitlesRequestTimeout(),
      onLoad: (responseXML, responseText) => {
        resetLoadErrorCount()
        if (!responseXML && isSubtitlesWhole()) {
          DebugTool.info("Error: responseXML is invalid.")
          Plugins.interface.onSubtitlesXMLError({ cdn: mediaSources.currentSubtitlesCdn() })
          stop()
          return
        }

        try {
          const xml = fromXML(responseText.split(/<\?xml[^?]+\?>/i)[1] || responseText, IMSCErrorHandler)
          const times = xml.getMediaTimeEvents()

          if (!times?.length) {
            DebugTool.error("No media time events in subtitles file")
          }

          segments.push({
            xml: modifyStyling(xml),
            times: times || [0],
            previousSubtitleIndex: null,
            number: segmentNumber,
          })

          if (segments.length > SEGMENTS_BUFFER_SIZE) {
            pruneSegments()
          }
        } catch (error) {
          DebugTool.info(`Error transforming subtitles: ${error}`)
          Plugins.interface.onSubtitlesTransformError()
          stop()
        }
      },
      onError: ({ statusCode, ...rest } = {}) => {
        DebugTool.info(`Error loading subtitles data: ${statusCode}`)
        loadErrorFailover({ statusCode, ...rest })
      },
      onTimeout: () => {
        DebugTool.info("Request timeout loading subtitles")
        Plugins.interface.onSubtitlesTimeout({ cdn: mediaSources.currentSubtitlesCdn() })
        stop()
      },
    })
  }

  function resetLoadErrorCount() {
    loadErrorCount = 0
  }

  function loadErrorLimit() {
    loadErrorCount++
    if (loadErrorCount >= LOAD_ERROR_COUNT_MAX) {
      resetLoadErrorCount()
      return true
    }
  }

  function loadErrorFailover(opts) {
    const errorCase = () => {
      DebugTool.info("No more CDNs available for subtitle failover")
    }

    const isWhole = isSubtitlesWhole()

    if (isWhole || (!isWhole && loadErrorLimit())) {
      stop()
      segments = []
      mediaSources.failoverSubtitles(start, errorCase, opts)
    }
  }

  function pruneSegments() {
    // Before sorting, check if we've gone back in time, so we know whether to prune from front or back of array
    const seekedBack = segments[SEGMENTS_BUFFER_SIZE].number < segments[SEGMENTS_BUFFER_SIZE - 1].number

    segments.sort((someSegment, otherSegment) => someSegment.number - otherSegment.number)

    if (seekedBack) {
      segments.pop()
    } else {
      segments.splice(0, 1)
    }
  }

  // Opts: { backgroundColour: string (css colour, hex), fontFamily: string , size: number, lineHeight: number }
  function transformStyleOptions(opts) {
    if (opts === undefined) return

    const customStyles = {}

    if (opts.backgroundColour) {
      customStyles.spanBackgroundColorAdjust = { transparent: opts.backgroundColour }
    }

    if (opts.fontFamily) {
      customStyles.fontFamily = opts.fontFamily
    }

    if (opts.size > 0) {
      customStyles.sizeAdjust = opts.size
    }

    if (opts.lineHeight) {
      customStyles.lineHeightAdjust = opts.lineHeight
    }

    return customStyles
  }

  function removeCurrentSubtitlesElement() {
    if (currentSubtitlesElement == null) {
      return
    }

    DOMHelpers.safeRemoveElement(currentSubtitlesElement)
    currentSubtitlesElement = undefined

    DebugTool.info("Removed previous subtitle cue.")
  }

  function removeExampleSubtitlesElement() {
    if (exampleSubtitlesElement) {
      DOMHelpers.safeRemoveElement(exampleSubtitlesElement)
      exampleSubtitlesElement = undefined
    }
  }

  function getSegmentToRender(currentTime) {
    let segment

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      for (let timesIndex = 0; timesIndex < segments[segmentIndex].times.length; timesIndex++) {
        const lastOne = segments[segmentIndex].times.length === timesIndex + 1

        if (
          currentTime >= segments[segmentIndex].times[timesIndex] &&
          (lastOne || currentTime < segments[segmentIndex].times[timesIndex + 1]) &&
          segments[segmentIndex].previousSubtitleIndex !== timesIndex &&
          segments[segmentIndex].times[timesIndex] !== 0
        ) {
          segment = segments[segmentIndex]
          currentSegmentRendered = segments[segmentIndex]
          segments[segmentIndex].previousSubtitleIndex = timesIndex
          break
        }
      }
    }

    return segment
  }

  function render(currentTime, xml) {
    removeCurrentSubtitlesElement()

    currentSubtitlesElement = document.createElement("div")
    currentSubtitlesElement.id = "bsp_subtitles"
    currentSubtitlesElement.style.position = "absolute"
    currentSubtitlesElement.style.zIndex = "99"

    parentElement.appendChild(currentSubtitlesElement)

    renderSubtitle(
      xml,
      currentTime,
      currentSubtitlesElement,
      imscRenderOpts,
      parentElement.clientHeight,
      parentElement.clientWidth
    )
  }

  function renderExample(exampleXmlString, styleOpts, safePosition = {}) {
    const exampleXml = fromXML(exampleXmlString)
    removeExampleSubtitlesElement()

    const customStyleOptions = transformStyleOptions(styleOpts)
    const exampleStyle = Utils.merge(imscRenderOpts, customStyleOptions)

    exampleSubtitlesElement = document.createElement("div")
    exampleSubtitlesElement.id = "subtitlesPreview"
    exampleSubtitlesElement.style.position = "absolute"

    const elementWidth = parentElement.clientWidth
    const elementHeight = parentElement.clientHeight
    const topPixels = ((safePosition.top || 0) / 100) * elementHeight
    const rightPixels = ((safePosition.right || 0) / 100) * elementWidth
    const bottomPixels = ((safePosition.bottom || 0) / 100) * elementHeight
    const leftPixels = ((safePosition.left || 0) / 100) * elementWidth

    const renderWidth = elementWidth - leftPixels - rightPixels
    const renderHeight = elementHeight - topPixels - bottomPixels

    exampleSubtitlesElement.style.top = `${topPixels}px`
    exampleSubtitlesElement.style.right = `${rightPixels}px`
    exampleSubtitlesElement.style.bottom = `${bottomPixels}px`
    exampleSubtitlesElement.style.left = `${leftPixels}px`
    parentElement.appendChild(exampleSubtitlesElement)

    renderSubtitle(exampleXml, 1, exampleSubtitlesElement, exampleStyle, renderHeight, renderWidth)
  }

  function renderSubtitle(xml, currentTime, subsElement, styleOpts, renderHeight, renderWidth) {
    try {
      const isd = generateISD(xml, currentTime, IMSCErrorHandler)

      if (isd == null) {
        DebugTool.error(`No presentable subtitles cue at time ${currentTime}`)
      }

      renderHTML(isd, subsElement, null, renderHeight, renderWidth, false, IMSCErrorHandler, null, false, styleOpts)

      const contents = getContents(isd)

      if (contents) {
        DebugTool.info(`Added new subtitle cue: ${contents}`)
      }

      const { width, height } = subsElement.getBoundingClientRect()

      DebugTool.info(`Subtitle cue wrapper width: ${width} height: ${height}`)

      const cueEl = subsElement.firstChild?.firstChild

      if (cueEl == null) {
        DebugTool.info("Subtitle cue not actually rendered")
        return
      }

      const cueRect = cueEl.getBoundingClientRect()

      DebugTool.info(
        `Subtitle cue x: ${cueRect.left} y: ${cueRect.top} width: ${parseInt(cueRect.width)} height: ${parseInt(
          cueRect.height
        )}`
      )

      const firstLineEl = cueEl.firstChild.firstChild?.firstChild?.firstChild

      if (firstLineEl == null) {
        DebugTool.info("No lines of subtitles in cue")
        return
      }

      const lineRect = firstLineEl.getBoundingClientRect()

      DebugTool.info(
        `Subtitle line ` +
          `x: ${parseInt(lineRect.left)} ` +
          `y: ${parseInt(lineRect.top)} ` +
          `width: ${parseInt(lineRect.width)} ` +
          `height: ${parseInt(lineRect.height)}`
      )

      currentTrackingElement = createTrackingEl(firstLineEl)
      parentElement.appendChild(currentTrackingElement)

      const stylesToRemove = [
        "display",
        "flex-direction",
        "justify-content",
        "direction",
        "font-family",
        "font-style",
        "font-weight",
        "text-align",
        "text-decoration",
        "text-emphasis-style",
        "text-combine-upright",
        "unicode-bidi",
        "white-space",
        "writing-mode",
      ]

      sanitiseStylesDown(subsElement.firstChild, ...stylesToRemove)

      DebugTool.info(`Styles sanitised. Removed ${stylesToRemove.join(", ")}`)
    } catch (error) {
      DebugTool.info(`Exception while rendering subtitles: ${error}`)
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function getContents(isd) {
    const { contents } = isd

    if (!contents?.length) {
      return
    }

    if (contents[0].text) {
      return `\n${contents.map(({ text }) => text).join(" \\")}`
    }

    return getContents(contents[0])
  }

  function createTrackingEl(el) {
    const { top, left, width, height } = el.getBoundingClientRect()

    const trackingEl = document.createElement("div")

    const border = 4

    trackingEl.style.position = "absolute"

    trackingEl.style.top = `${top - border / 2}px`
    trackingEl.style.left = `${left - border / 2}px`
    trackingEl.style.width = `${width + border}px`
    trackingEl.style.height = `${height + border}px`

    trackingEl.style.boxSizing = "border-box"
    trackingEl.style.borderColor = "red"
    trackingEl.style.borderStyle = "solid"
    trackingEl.style.borderWidth = `${border}px`

    return trackingEl
  }

  function createTestEl() {
    const el = document.createElement("div")

    el.style.position = "absolute"
    el.style.backgroundColor = "rgb(0, 0, 0)"
    el.style.color = "rgb(255, 255, 255)"
    el.style.fontFamily =
      'ReithSans, Arial, Roboto, Arial, Helvetica, "Liberation Sans", sans-serif, Arial, Helvetica, "Liberation Sans", sans-serif'

    el.textContent = "If you can see me 'rgb' colours are supported"

    return el
  }

  function sanitiseStylesDown(element, ...styles) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError("must be html")
    }

    for (const style of styles) {
      element.style.removeProperty(style)
    }

    if (element.style.backgroundColor.indexOf("rgb") !== -1) {
      element.style.setProperty("background-color", "black")
    }

    if (element.style.color.indexOf("rgb") !== -1) {
      element.style.setProperty("color", "white")
    }

    if (!element.hasChildNodes()) {
      return
    }

    const children = [...element.childNodes].filter((node) => node.nodeType === 1)

    for (const child of children) {
      sanitiseStylesDown(child, ...styles)
    }
  }

  function stripStylesDown(element) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError("must be html")
    }

    if (element.textContent?.length === 1) {
      element.setAttribute("style", "background-color: white; color: black; font-size: 24px;")
      return
    }

    element.removeAttribute("style")

    if (!element.hasChildNodes()) {
      return
    }

    const children = [...element.childNodes].filter((node) => node.nodeType === 1)

    for (const child of children) {
      stripStylesDown(child)
    }
  }

  function modifyStyling(xml) {
    if (!isSubtitlesWhole() && xml?.head?.styling) {
      xml.head.styling.initials = defaultStyleOpts.initials
    }

    return xml
  }

  function isSubtitlesWhole() {
    const subtitlesUrl = mediaSources.currentSubtitlesSource()

    if (typeof subtitlesUrl !== "string") {
      return false
    }

    return findSegmentTemplate(subtitlesUrl) == null
  }

  function isValidTime(time) {
    return time >= getTimeOffset()
  }

  function getCurrentTime() {
    return isSubtitlesWhole() ? mediaPlayer.getCurrentTime() : getTimeOffset() + mediaPlayer.getCurrentTime()
  }

  function start() {
    stop()

    const url = mediaSources.currentSubtitlesSource()
    const isWhole = isSubtitlesWhole()

    if (url && url !== "") {
      if (isWhole && segments.length === 0) {
        loadSegment(url)
      }

      updateInterval = setInterval(() => {
        const time = getCurrentTime()

        if (!isWhole && isValidTime(time)) {
          loadAllRequiredSegments()
        }

        update(time)
      }, 750)
    }
  }

  function stop() {
    clearInterval(updateInterval)
    removeCurrentSubtitlesElement()
  }

  function update(currentTime) {
    const segment = getSegmentToRender(currentTime)

    if (segment == null) {
      if (currentSegmentRendered == null) {
        DebugTool.error(`No presentable subtitles segment for time: ${currentTime}`)
        DebugTool.info(`Number of subtitle segments: ${segments.length}`)
      }

      return
    }

    if (currentTrackingElement) {
      DOMHelpers.safeRemoveElement(currentTrackingElement)
      currentTrackingElement = null
    }

    render(currentTime, segment.xml)
  }

  function customise(styleOpts, enabled) {
    const customStyleOptions = transformStyleOptions(styleOpts)
    imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions)
    if (enabled) {
      render(getCurrentTime(), currentSegmentRendered && currentSegmentRendered.xml)
    }
  }

  return {
    start,
    stop,
    updatePosition: () => {},
    customise,
    renderExample,
    clearExample: removeExampleSubtitlesElement,
    tearDown: () => {
      stop()
      resetLoadErrorCount()
      segments = undefined
    },
  }
}

export default IMSCSubtitles
