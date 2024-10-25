export const ManifestType = {
  STATIC: "static",
  DYNAMIC: "dynamic",
} as const

export type ManifestType = (typeof ManifestType)[keyof typeof ManifestType]

export default ManifestType
