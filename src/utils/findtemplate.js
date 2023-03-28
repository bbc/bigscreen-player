const SEGMENT_TEMPLATE_MATCHER = /\$[A-Za-z]+\$/g

function findSegmentTemplate(url) {
  const matches = url.match(SEGMENT_TEMPLATE_MATCHER)

  if (matches == null) {
    return null
  }

  return matches[matches.length - 1]
}

export default findSegmentTemplate
