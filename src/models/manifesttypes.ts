export const ManifestTypes = {
  STATIC: "static",
  DYNAMIC: "dynamic",
} as const

export type ManifestTypes = (typeof ManifestTypes)[keyof typeof ManifestTypes]

export default ManifestTypes
