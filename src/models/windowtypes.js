/**
 * Enums for WindowTypes
 * @readonly
 * @enum {string}
 */
const WindowTypes = {
  /** Media with a duration */
  STATIC: "staticWindow",
  /** Media with a start time but without a duration until an indeterminate time in the future */
  GROWING: "growingWindow",
  /** Media with a rewind window that progresses through a media timeline */
  SLIDING: "slidingWindow",
}

export default WindowTypes
