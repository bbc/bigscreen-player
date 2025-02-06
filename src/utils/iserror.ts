export default function isError(obj: unknown): obj is Error {
  return obj != null && typeof obj === "object" && "name" in obj && "message" in obj
}
