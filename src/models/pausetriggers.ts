export const PauseTriggers = {
  USER: 1,
  APP: 2,
  DEVICE: 3,
} as const

export type PauseTriggers = (typeof PauseTriggers)[keyof typeof PauseTriggers]
