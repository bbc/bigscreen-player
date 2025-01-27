import isError from "./iserror"

type LoadUrlOpts = {
  headers: { [key: string]: string }
  timeout?: number
  onTimeout?: XMLHttpRequest["ontimeout"]
  onLoad?: (responseXML: Document | null, responseText: string, status: number) => void
  onError?: (params: { errorType: string; statusCode: number }) => void
  method?: string
  data?: Document | XMLHttpRequestBodyInit | null
}

export default function LoadUrl(url: string | URL, opts: LoadUrlOpts) {
  const xhr = new XMLHttpRequest()

  if (opts.timeout) {
    xhr.timeout = opts.timeout
  }

  if (opts.onTimeout) {
    xhr.ontimeout = opts.onTimeout
  }

  xhr.addEventListener("readystatechange", function listener() {
    if (xhr.readyState === 4) {
      xhr.removeEventListener("readystatechange", listener)
      if (xhr.status >= 200 && xhr.status < 300) {
        if (opts.onLoad) {
          opts.onLoad(xhr.responseXML, xhr.responseText, xhr.status)
        }
      } else {
        if (opts.onError) {
          opts.onError({ errorType: "NON_200_ERROR", statusCode: xhr.status })
        }
      }
    }
  })

  try {
    xhr.open(opts.method || "GET", url, true)

    if (opts.headers) {
      for (const header in opts.headers) {
        if (Object.prototype.hasOwnProperty.call(opts.headers, header)) {
          xhr.setRequestHeader(header, opts.headers[header])
        }
      }
    }
    xhr.send(opts.data || null)
  } catch (error: unknown) {
    if (opts.onError) {
      opts.onError({ errorType: isError(error) ? error.name : "unknown", statusCode: xhr.status })
    }
  }
}
