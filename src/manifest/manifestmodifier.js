function filter (manifest, representationOptions) {
  const constantFps = representationOptions.constantFps
  const maxFps = representationOptions.maxFps

  if (constantFps || maxFps) {
    manifest.Period.AdaptationSet = manifest.Period.AdaptationSet.map(function (adaptationSet) {
      if (adaptationSet.contentType === 'video') {
        const frameRates = []

        adaptationSet.Representation_asArray = adaptationSet.Representation_asArray.filter(function (representation) {
          if (!maxFps || representation.frameRate <= maxFps) {
            frameRates.push(representation.frameRate)
            return true
          }
        }).filter((representation) => {
          return !constantFps || representation.frameRate === Math.max.apply(null, frameRates)
        })
      }
      return adaptationSet
    })
  }

  return manifest
}

function extractBaseUrl (manifest) {
  if (manifest.Period && typeof manifest.Period.BaseURL === 'string') {
    return manifest.Period.BaseURL
  }

  if (manifest.Period && manifest.Period.BaseURL && typeof manifest.Period.BaseURL.__text === 'string') {
    return manifest.Period.BaseURL.__text
  }

  if (typeof manifest.BaseURL === 'string') {
    return manifest.BaseURL
  }

  if (manifest.BaseURL && typeof manifest.BaseURL.__text === 'string') {
    return manifest.BaseURL.__text
  }
}

function generateBaseUrls (manifest, sources) {
  if (!manifest) return

  const baseUrl = extractBaseUrl(manifest)

  if (isBaseUrlAbsolute(baseUrl)) {
    setAbsoluteBaseUrl(baseUrl)
  } else {
    if (baseUrl) {
      setBaseUrlsFromBaseUrl(baseUrl)
    } else {
      setBaseUrlsFromSource()
    }
  }

  removeUnusedPeriodAttributes()

  function generateBaseUrl (source, priority, serviceLocation) {
    return {
      __text: source,
      'dvb:priority': priority,
      'dvb:weight': isNaN(source.dpw) ? 0 : source.dpw,
      serviceLocation: serviceLocation
    }
  }

  function removeUnusedPeriodAttributes () {
    if (manifest.Period && manifest.Period.BaseURL) delete manifest.Period.BaseURL
    if (manifest.Period && manifest.Period.BaseURL_asArray) delete manifest.Period.BaseURL_asArray
  }

  function isBaseUrlAbsolute (baseUrl) {
    return baseUrl && baseUrl.match(/^https?:\/\//)
  }

  function setAbsoluteBaseUrl (baseUrl) {
    const newBaseUrl = generateBaseUrl(baseUrl, 0, sources[0])

    manifest.BaseURL_asArray = [newBaseUrl]

    if (manifest.BaseURL || manifest.Period && manifest.Period.BaseURL) {
      manifest.BaseURL = newBaseUrl
    }
  }

  function setBaseUrlsFromBaseUrl (baseUrl) {
    manifest.BaseURL_asArray = sources.map((source, priority) => {
      const sourceUrl = new URL(baseUrl, source)

      return generateBaseUrl(sourceUrl.href, priority, source)
    })
  }

  function setBaseUrlsFromSource () {
    manifest.BaseURL_asArray = sources.map((source, priority) => {
      return generateBaseUrl(source, priority, source)
    })
  }
}

export default {
  filter: filter,
  extractBaseUrl: extractBaseUrl,
  generateBaseUrls: generateBaseUrls
}
