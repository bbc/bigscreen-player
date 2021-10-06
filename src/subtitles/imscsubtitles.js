import { fromXML, generateISD, renderHTML } from 'smp-imsc'
import DOMHelpers from '../domhelpers'
import DebugTool from '../debugger/debugtool'
import Plugins from '../plugins'
import Utils from '../utils/playbackutils'
import LoadURL from '../utils/loadurl'
import TimeUtils from '../utils/timeutils'

function IMSCSubtitles (mediaPlayer, autoStart, parentElement, mediaSources, defaultStyleOpts) {
  const SEGMENTS_TO_KEEP = 3
  const liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength()
  const LOAD_ERROR_COUNT_MAX = 3
  const windowStartEpochSeconds = getWindowStartTime() / 1000

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

  function loadAllRequiredSegments () {
    const segmentsToLoad = []
    const currentSegment = TimeUtils.calculateSegmentNumber(windowStartEpochSeconds + mediaPlayer.getCurrentTime(), mediaSources.currentSubtitlesSegmentLength())
    for (let i = 0; i < SEGMENTS_TO_KEEP; i++) {
      const segmentNumber = currentSegment + i
      const alreadyLoaded = segments.some((segment) => segment.number === segmentNumber)

      if (!alreadyLoaded) {
        segmentsToLoad.push(segmentNumber)
      }
    }

    if (SEGMENTS_TO_KEEP === segmentsToLoad.length) {
      // This is to ensure when seeking to a point with no subtitles, don't leave previous subtitle displayed.
      removeCurrentSubtitlesElement()
    }

    segmentsToLoad.forEach((segmentNumber) => {
      const url = mediaSources.currentSubtitlesSource()
      loadSegment(url, segmentNumber)
    })
  }

  function loadSegment (url, segmentNumber) {
    url = url.replace('$segment$', segmentNumber)
    LoadURL(url, {
      timeout: mediaSources.subtitlesRequestTimeout(),
      onLoad: (responseXML, responseText, status) => {
        resetLoadErrorCount()
        if (!responseXML && !liveSubtitles) {
          DebugTool.info('Error: responseXML is invalid.')
          Plugins.interface.onSubtitlesXMLError({cdn: mediaSources.currentSubtitlesCdn()})
          stop()
          return
        }

        try {
          const xml = fromXML(responseText.split(/<\?xml[^\?]+\?>/i)[1] || responseText)
          const times = xml.getMediaTimeEvents()

          segments.push({
            xml: modifyStyling(xml),
            times: times || [0],
            previousSubtitleIndex: null,
            number: segmentNumber
          })

          if (segments.length > SEGMENTS_TO_KEEP) {
            pruneSegments()
          }
        } catch (e) {
          DebugTool.info('Error transforming subtitles: ' + e)
          Plugins.interface.onSubtitlesTransformError()
          stop()
        }
      },
      onError: (statusCode) => {
        DebugTool.info('Error loading subtitles data: ' + statusCode)
        loadErrorFailover(statusCode)
      },
      onTimeout: () => {
        DebugTool.info('Request timeout loading subtitles')
        Plugins.interface.onSubtitlesTimeout({cdn: mediaSources.currentSubtitlesCdn()})
        stop()
      }
    })
  }

  function resetLoadErrorCount () {
    loadErrorCount = 0
  }

  function loadErrorLimit () {
    loadErrorCount++
    if (loadErrorCount >= LOAD_ERROR_COUNT_MAX) {
      resetLoadErrorCount()
      return true
    }
  }

  function loadErrorFailover (statusCode) {
    const errorCase = () => { DebugTool.info('No more CDNs available for subtitle failover') }

    if ((liveSubtitles && loadErrorLimit()) || !liveSubtitles) {
      stop()
      segments = []
      mediaSources.failoverSubtitles(start, errorCase, statusCode)
    }
  }

  function pruneSegments () {
    // Before sorting, check if we've gone back in time, so we know whether to prune from front or back of array
    const seekedBack = segments[SEGMENTS_TO_KEEP].number < segments[SEGMENTS_TO_KEEP - 1].number

    segments.sort((a, b) => a.number - b.number)

    if (seekedBack) {
      segments.pop()
    } else {
      segments.splice(0, 1)
    }
  }

  // Opts: { backgroundColour: string (css colour, hex), fontFamily: string , size: number, lineHeight: number }
  function transformStyleOptions (opts) {
    if (opts === undefined) return

    const customStyles = {}

    if (opts.backgroundColour) {
      customStyles.spanBackgroundColorAdjust = {transparent: opts.backgroundColour}
    }

    if (opts.fontFamily) {
      customStyles.fontFamily = opts.fontFamily
    }

    if (opts.size) {
      customStyles.sizeAdjust = opts.size
    }

    if (opts.lineHeight) {
      customStyles.lineHeightAdjust = opts.lineHeight
    }

    return customStyles
  }

  function removeCurrentSubtitlesElement () {
    if (currentSubtitlesElement) {
      DOMHelpers.safeRemoveElement(currentSubtitlesElement)
      currentSubtitlesElement = undefined
    }
  }

  function removeExampleSubtitlesElement () {
    if (exampleSubtitlesElement) {
      DOMHelpers.safeRemoveElement(exampleSubtitlesElement)
      exampleSubtitlesElement = undefined
    }
  }

  function update (currentTime) {
    const segment = getSegmentToRender(currentTime)

    if (segment) {
      render(currentTime, segment.xml)
    }
  }

  function getSegmentToRender (currentTime) {
    let segment

    for (let i = 0; i < segments.length; i++) {
      for (let j = 0; j < segments[i].times.length; j++) {
        const lastOne = segments[i].times.length === j + 1

        if (currentTime >= segments[i].times[j] && (lastOne || currentTime < segments[i].times[j + 1]) && segments[i].previousSubtitleIndex !== j && segments[i].times[j] !== 0) {
          segment = segments[i]
          currentSegmentRendered = segments[i]
          segments[i].previousSubtitleIndex = j
          break
        }
      }
    }

    return segment
  }

  function render (currentTime, xml) {
    removeCurrentSubtitlesElement()

    currentSubtitlesElement = document.createElement('div')
    currentSubtitlesElement.id = 'bsp_subtitles'
    currentSubtitlesElement.style.position = 'absolute'
    parentElement.appendChild(currentSubtitlesElement)

    renderSubtitle(xml, currentTime, currentSubtitlesElement, imscRenderOpts, parentElement.clientHeight, parentElement.clientWidth)
  }

  function renderExample (exampleXmlString, styleOpts, safePosition) {
    safePosition = safePosition || {}
    const exampleXml = fromXML(exampleXmlString)
    removeExampleSubtitlesElement()

    const customStyleOptions = transformStyleOptions(styleOpts)
    const exampleStyle = Utils.merge(imscRenderOpts, customStyleOptions)

    exampleSubtitlesElement = document.createElement('div')
    exampleSubtitlesElement.id = 'subtitlesPreview'
    exampleSubtitlesElement.style.position = 'absolute'

    const elementWidth = parentElement.clientWidth
    const elementHeight = parentElement.clientHeight
    const topPixels = ((safePosition.top || 0) / 100) * elementHeight
    const rightPixels = ((safePosition.right || 0) / 100) * elementWidth
    const bottomPixels = ((safePosition.bottom || 0) / 100) * elementHeight
    const leftPixels = ((safePosition.left || 0) / 100) * elementWidth

    const renderWidth = elementWidth - leftPixels - rightPixels
    const renderHeight = elementHeight - topPixels - bottomPixels

    exampleSubtitlesElement.style.top = (topPixels) + 'px'
    exampleSubtitlesElement.style.right = (rightPixels) + 'px'
    exampleSubtitlesElement.style.bottom = (bottomPixels) + 'px'
    exampleSubtitlesElement.style.left = (leftPixels) + 'px'
    parentElement.appendChild(exampleSubtitlesElement)

    renderSubtitle(exampleXml, 1, exampleSubtitlesElement, exampleStyle, renderHeight, renderWidth)
  }

  function renderSubtitle (xml, currentTime, subsElement, styleOpts, renderHeight, renderWidth) {
    try {
      const isd = generateISD(xml, currentTime)
      renderHTML(isd, subsElement, null, renderHeight, renderWidth, false, null, null, false, styleOpts)
    } catch (e) {
      DebugTool.info('Exception while rendering subtitles: ' + e)
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function modifyStyling (xml) {
    if (liveSubtitles && xml && xml.head && xml.head.styling) {
      xml.head.styling.initials = defaultStyleOpts.initials
    }
    return xml
  }

  function timeIsValid (time) {
    return time > windowStartEpochSeconds
  }

  function getCurrentTime () {
    return liveSubtitles ? windowStartEpochSeconds + mediaPlayer.getCurrentTime() : mediaPlayer.getCurrentTime()
  }

  function getWindowStartTime () {
    return mediaSources && mediaSources.time().windowStartTime
  }

  function start () {
    const url = mediaSources.currentSubtitlesSource()
    if (url && url !== '') {
      if (!liveSubtitles && segments.length === 0) {
        loadSegment(url)
      }

      updateInterval = setInterval(() => {
        const time = getCurrentTime()
        if (liveSubtitles && timeIsValid(time)) {
          loadAllRequiredSegments()
        }
        update(time)
      }, 750)
    }
  }

  function stop () {
    clearInterval(updateInterval)
    removeCurrentSubtitlesElement()
  }

  function customise (styleOpts, enabled) {
    const customStyleOptions = transformStyleOptions(styleOpts)
    imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions)
    if (enabled) {
      render(getCurrentTime(), currentSegmentRendered && currentSegmentRendered.xml)
    }
  }

  return {
    start: start,
    stop: stop,
    updatePosition: () => {},
    customise: customise,
    renderExample: renderExample,
    clearExample: removeExampleSubtitlesElement,
    tearDown: () => {
      stop()
      resetLoadErrorCount()
      segments = undefined
    }
  }
}

export default IMSCSubtitles
