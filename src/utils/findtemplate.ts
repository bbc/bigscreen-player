const SEGMENT_TEMPLATE_MATCHER = /\$[A-Za-z]+\$/g

export default function findSegmentTemplate(url: string) {
  const matches = url.match(SEGMENT_TEMPLATE_MATCHER)

  if (matches == null) {
    return null
  }

  return matches[matches.length - 1]
}
