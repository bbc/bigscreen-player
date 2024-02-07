const TransportControlPosition = {
  /** No transport controls are visible. */
  NONE: 0,
  /** The basic transport controls are visible. */
  CONTROLS_ONLY: 1,
  /** The transport controls are visible with an expanded info area. */
  CONTROLS_WITH_INFO: 2,
  /** The left-hand onwards navigation carousel is visible. */
  LEFT_CAROUSEL: 4,
  /** The bottom-right onwards navigation carousel is visible. */
  BOTTOM_CAROUSEL: 8,
  /** The whole screen is obscured by a navigation menu. */
  FULLSCREEN: 16,
} as const

export type TransportControlPosition = (typeof TransportControlPosition)[keyof typeof TransportControlPosition]

/**
 * Provides an enumeration of on-screen transport control positions, which can be combined as flags.
 */
export default TransportControlPosition
