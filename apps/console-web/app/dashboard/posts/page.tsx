"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ImagePlus, Heart, MessageCircle, Trash2, Pencil, Plus, X } from "lucide-react"

type Post = {
  _id: string
  imageUrl: string
  caption: string
  tags: string[]
  likesCount: number
  commentsCount: number
  createdAt: string
}

function resolveUrl(apiUrl: string, url: string): string {
  if (!url) return ""
  if (url.startsWith("http")) return url
  if (url.startsWith("/v1/")) return apiUrl + url
  return url
}

export default function PostsAdminPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [items, setItems] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/posts?limit=50`)
      const json = await res.json()
      setItems(res.ok && json?.success ? json.data?.items ?? [] : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    load()
  }, [load])

  const onDelete = async (id: string) => {
    if (!token) return
    if (!confirm("Delete this post?")) return
    await fetch(`${apiUrl}/v1/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Posts</h1>
          <p className="text-sm text-slate-500 mt-1">Feed posts shown in mobile app</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New post
        </Button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-16">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <ImagePlus className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No posts yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first post for the mobile feed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveUrl(apiUrl, p.imageUrl)} alt="" className="w-full aspect-square object-cover" />
              <div className="p-4">
                {p.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {p.tags.slice(0, 4).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.caption ? (
                  <p className="text-sm text-slate-700 line-clamp-2">{p.caption}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No caption</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {p.likesCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.commentsCount}
                  </span>
                  <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDelete(p._id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating || editing ? (
        <PostEditor
          token={token}
          apiUrl={apiUrl}
          existing={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      ) : null}
    </div>
  )
}

function PostEditor({
  token,
  apiUrl,
  existing,
  onClose,
  onSaved,
}: {
  token: string | null
  apiUrl: string
  existing: Post | null
  onClose: () => void
  onSaved: () => void
}) {
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "")
  const [caption, setCaption] = useState(existing?.caption ?? "")
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(", "))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickFile = async (file: File) => {
    if (!token) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${apiUrl}/v1/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Upload failed")
      }
      setImageUrl(json.data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!token) return
    if (!imageUrl.trim()) {
      setError("Image is required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        imageUrl: imageUrl.trim(),
        caption: caption.trim(),
        tags: tagsText
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      }
      const res = await fetch(`${apiUrl}/v1/posts${existing ? `/${existing._id}` : ""}`, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Save failed")
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{existing ? "Edit post" : "New post"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Image</label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveUrl(apiUrl, imageUrl)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">
                  {uploading ? "Uploading..." : "Click to upload image"}
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPickFile(f)
                e.target.value = ""
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write something..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={2000}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Tags (comma-separated)</label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="health, wellness, tips"
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} className="flex-1" disabled={saving || uploading}>
            {saving ? "Saving..." : existing ? "Save changes" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  )
}
