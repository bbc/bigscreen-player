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
  let currentSegmentRendered = {}
  let loadErrorCount = 0
  let segments = []

  let exampleSubtitlesElement
  let currentSubtitlesElement
  let updateInterval

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
          DebugTool.error("responseXML is invalid")
          Plugins.interface.onSubtitlesXMLError({ cdn: mediaSources.currentSubtitlesCdn() })
          stop()
          return
        }

        try {
          const xmlText = isSubtitlesWhole() ? responseText : responseText.split(/<\?xml[^?]+\?>/i)[1] || responseText
          const xml = fromXML(xmlText)
          const times = xml.getMediaTimeEvents()

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
          error.name = "SubtitlesTransformError"
          DebugTool.error(error)

          Plugins.interface.onSubtitlesTransformError()
          stop()
        }
      },
      onError: ({ statusCode, ...rest } = {}) => {
        DebugTool.error(`Failed to load subtitle data. Status code: ${statusCode}`)
        loadErrorFailover({ statusCode, ...rest })
      },
      onTimeout: () => {
        DebugTool.error("Loading subtitles timed out")
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
    if (currentSubtitlesElement) {
      DOMHelpers.safeRemoveElement(currentSubtitlesElement)
      currentSubtitlesElement = undefined
    }
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
      const isd = generateISD(xml, currentTime)
      renderHTML(isd, subsElement, null, renderHeight, renderWidth, false, null, null, false, styleOpts)
    } catch (error) {
      error.name = "SubtitlesRenderError"
      DebugTool.error(error)

      Plugins.interface.onSubtitlesRenderError()
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

    if (segment) {
      render(currentTime, segment.xml)
    }
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
