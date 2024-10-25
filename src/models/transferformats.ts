export const DASH = "dash" as const

export const HLS = "hls" as const

export const TransferFormat = { DASH, HLS } as const

export type DASH = typeof DASH

export type HLS = typeof HLS

export type TransferFormat = (typeof TransferFormat)[keyof typeof TransferFormat]

export default TransferFormat
