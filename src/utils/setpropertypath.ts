export default function setPropertyPath<Key extends string>(
  target: Record<Key, unknown>,
  path: Key | Key[],
  value: unknown
) {
  if (target == null || (typeof target !== "object" && typeof target !== "function")) {
    throw new TypeError(`Target must be an object. (got ${target as any})`)
  }

  const keysDesc = typeof path === "string" ? path.split(".") : path

  if (keysDesc.length === 0) {
    throw new TypeError("Empty path provided. (got [])")
  }

  const key = keysDesc.shift()

  if (key == null) {
    throw new TypeError(`Cannot index object with key. (got key '${key}')`)
  }

  if (keysDesc.length === 0) {
    target[key as Key] = value

    return
  }

  let next = target[key as Key]

  if (next != null && typeof next !== "object" && typeof next !== "function") {
    throw new TypeError(`Cannot assign to primitive value. (got '${next as string}')`)
  }

  next ??= {}
  target[key as Key] = next

  setPropertyPath(next as Record<Key, unknown>, keysDesc as Key | Key[], value)
}
