import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import { mkdir, stat } from "fs/promises"
import { join, extname } from "path"
import { getDb, FILES_COLLECTION } from "@/db/mongo"
import { requireAuth } from "@/common/middleware/auth"
import { toObjectId } from "@/common/utils/id"
import { badRequest, notFound } from "@/common/errors"
import { mapFileToPublic, type FileDoc } from "./files.model"

const UPLOAD_DIR = join(process.cwd(), "uploads")

async function ensureUploadDir() {
  try {
    await stat(UPLOAD_DIR)
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]

export const filesRoutes = new Elysia({ prefix: "/files" })
  .get("/:id", async ({ params, set }) => {
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return new Response(JSON.stringify({ success: false, error: "Invalid id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }
    const db = getDb()
    const doc = await db
      .collection<FileDoc>(FILES_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!doc) {
      set.status = 404
      return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    }
    const file = Bun.file(doc.storagePath)
    if (!(await file.exists())) {
      set.status = 404
      return new Response(JSON.stringify({ success: false, error: "File missing on disk" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    }
    set.headers["content-type"] = doc.mimeType
    set.headers["cache-control"] = "public, max-age=86400"
    return file
  })
  .use(requireAuth)
  .post("/", async ({ request, auth, set }) => {
    try {
      await ensureUploadDir()
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        set.status = 400
        throw badRequest("file is required")
      }
      if (file.size <= 0) throw badRequest("Empty file")
      if (file.size > 15 * 1024 * 1024) throw badRequest("File too large (max 15MB)")
      const mimeType = file.type || "application/octet-stream"
      if (!ALLOWED_MIME.includes(mimeType)) {
        throw badRequest(`Unsupported mime type: ${mimeType}`)
      }
      const id = new ObjectId()
      const ext = extname(file.name) || (mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : ".bin")
      const storagePath = join(UPLOAD_DIR, `${id.toHexString()}${ext}`)
      const buffer = await file.arrayBuffer()
      await Bun.write(storagePath, buffer)

      const db = getDb()
      const doc: FileDoc = {
        _id: id,
        ownerId: auth.sub ? toObjectId(auth.sub) : null,
        ownerRole: (auth.role as FileDoc["ownerRole"]) ?? "public",
        originalName: file.name || `upload${ext}`,
        mimeType,
        size: file.size,
        storagePath,
        createdAt: new Date(),
        deletedAt: null,
      }
      await db.collection<FileDoc>(FILES_COLLECTION).insertOne(doc)
      set.status = 201
      return { success: true, data: mapFileToPublic(doc) }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string }
      if (err.statusCode) {
        set.status = err.statusCode
        return { success: false, error: err.message }
      }
      set.status = 500
      return { success: false, error: err.message || "Upload failed" }
    }
  })
