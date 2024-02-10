export const exhaustivenessMatchingGuard = (_: never) => {
  throw new Error("Should not be possible to reach")
}
