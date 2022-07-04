function LoadUrl (url, opts) {
  const xhr = new XMLHttpRequest()

  if (opts.timeout) {
    xhr.timeout = opts.timeout
  }

  if (opts.onTimeout) {
    xhr.ontimeout = opts.onTimeout
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      xhr.onreadystatechange = null
      if (xhr.status >= 200 && xhr.status < 300) {
        if (opts.onLoad) {
          opts.onLoad(xhr.responseXML, xhr.responseText, xhr.status)
        }
      } else {
        if (opts.onError) {
          opts.onError({errorType: 'NON_200_ERROR', statusCode: xhr.status})
        }
      }
    }
  }

  try {
    xhr.open(opts.method || 'GET', url, true)
    // TODO The opts protection in the following expression is redundant as there are lots of other places an undefined opts will cause TypeError to be thrown
    if (opts && opts.headers) {
      for (const header in opts.headers) {
        if (opts.headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, opts.headers[header])
        }
      }
    }
    xhr.send(opts.data || null)
  } catch (ex) {
    if (opts.onError) {
      opts.onError({errorType: ex.name, statusCode: xhr.status})
    }
  }
}

export default LoadUrl
