import { ObjectId } from "mongodb"

/**
 * Convert string to ObjectId
 * Throws if invalid
 */
export function toObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid ObjectId")
  }
  return new ObjectId(value)
}

/**
 * Convert string to ObjectId or null if invalid/empty
 */
export function toObjectIdOrNull(value: string | undefined | null): ObjectId | null {
  if (value == null || value === "") return null
  if (!ObjectId.isValid(value)) return null
  return new ObjectId(value)
}

/**
 * Convert ObjectId to hex string
 */
export function objectIdToString(id: ObjectId): string {
  return id.toHexString()
}
