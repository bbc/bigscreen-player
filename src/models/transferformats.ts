const DASH = "dash" as const

const HLS = "hls" as const

const PLAIN = "plain" as const

export const TransferFormat = { DASH, HLS, PLAIN } as const

export type DASH = typeof DASH

export type HLS = typeof HLS

export type PLAIN = typeof PLAIN

export type TransferFormat = (typeof TransferFormat)[keyof typeof TransferFormat]
