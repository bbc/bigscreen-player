export const Timeline = {
  AVAILABILITY_TIME: "availabilityTime",
  MEDIA_SAMPLE_TIME: "mediaSampleTime",
  PRESENTATION_TIME: "presentationTime",
} as const

export type Timeline = (typeof Timeline)[keyof typeof Timeline]
