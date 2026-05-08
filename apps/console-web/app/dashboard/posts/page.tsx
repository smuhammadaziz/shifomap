"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ImagePlus, Heart, MessageCircle, Trash2, Pencil, Plus, X, Search, MessagesSquare, Loader2 } from "lucide-react"

type Post = {
  _id: string
  imageUrl: string
  imageUrls?: string[]
  caption: string
  tags: string[]
  likesCount: number
  commentsCount: number
  createdAt: string
}

type AdminComment = {
  _id: string
  postId: string
  patientId: string
  patientName: string | null
  patientAvatar: string | null
  patientPhone?: string | null
  text: string
  createdAt: string
}

function commentDisplayName(c: AdminComment): string {
  const name = c.patientName?.trim()
  if (name) return name
  const phone = c.patientPhone?.trim()
  if (phone) return phone
  return "User"
}

function timeAgoShort(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diffSec = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`
  return new Date(iso).toLocaleDateString()
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
  const [viewingComments, setViewingComments] = useState<Post | null>(null)

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
            <div key={p._id} className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveUrl(apiUrl, p.imageUrls?.[0] || p.imageUrl)} alt="" className="w-full aspect-square object-cover" />
              {(p.imageUrls?.length ?? 0) > 1 ? (
                <div className="absolute right-2 top-2 bg-black/65 text-white text-[11px] px-2 py-1 rounded-full">
                  {p.imageUrls!.length} photos
                </div>
              ) : null}
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
                  <button
                    type="button"
                    onClick={() => setViewingComments(p)}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
                    title="View comments"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.commentsCount}
                  </button>
                  <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingComments(p)}>
                    <MessagesSquare className="h-3.5 w-3.5 mr-1.5" />
                    Comments
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

      {viewingComments ? (
        <CommentsViewer
          token={token}
          apiUrl={apiUrl}
          post={viewingComments}
          onClose={() => setViewingComments(null)}
          onCommentDeleted={() => {
            setItems((arr) =>
              arr.map((p) =>
                p._id === viewingComments._id
                  ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
                  : p,
              ),
            )
          }}
        />
      ) : null}
    </div>
  )
}

function CommentsViewer({
  token,
  apiUrl,
  post,
  onClose,
  onCommentDeleted,
}: {
  token: string | null
  apiUrl: string
  post: Post
  onClose: () => void
  onCommentDeleted: () => void
}) {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/v1/posts/${post._id}/comments-admin?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Failed to load")
      setComments(json.data ?? [])
    } catch (e) {
      setError((e as Error).message)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, post._id, token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return comments
    return comments.filter((c) => {
      const name = (c.patientName ?? "").toLowerCase()
      const phone = (c.patientPhone ?? "").toLowerCase()
      const text = c.text.toLowerCase()
      return name.includes(q) || phone.includes(q) || text.includes(q)
    })
  }, [comments, search])

  const onDelete = async (commentId: string) => {
    if (!token) return
    if (!confirm("Delete this comment? This cannot be undone.")) return
    setDeletingId(commentId)
    try {
      const res = await fetch(
        `${apiUrl}/v1/posts/${post._id}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Failed to delete")
      setComments((arr) => arr.filter((c) => c._id !== commentId))
      onCommentDeleted()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(apiUrl, post.imageUrls?.[0] || post.imageUrl)}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                Comments · {comments.length}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {post.caption?.trim() ? post.caption : "No caption"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, phone or comment text..."
              className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            ) : null}
          </div>
          {search ? (
            <p className="text-xs text-slate-500 mt-2">
              Showing {filtered.length} of {comments.length}
            </p>
          ) : null}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading comments...
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-rose-600 text-sm">{error}</p>
              <button
                onClick={load}
                className="mt-2 text-sm text-blue-600 font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <MessagesSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {comments.length === 0 ? "No comments yet" : "No matching comments"}
              </p>
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400 mt-1">
                  Comments from users will appear here
                </p>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const name = commentDisplayName(c)
                const initial = (name[0] ?? "?").toUpperCase()
                const avatar = c.patientAvatar ? resolveUrl(apiUrl, c.patientAvatar) : null
                const isDeleting = deletingId === c._id
                return (
                  <li key={c._id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover bg-slate-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{initial}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {name}
                        </span>
                        {c.patientPhone && c.patientName ? (
                          <span className="text-xs text-slate-400">{c.patientPhone}</span>
                        ) : null}
                        <span className="text-xs text-slate-400">{timeAgoShort(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 break-words whitespace-pre-wrap">
                        {c.text}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(c._id)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors flex-shrink-0"
                      title="Delete comment"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
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
  const [imageUrls, setImageUrls] = useState<string[]>(
    existing?.imageUrls?.length ? existing.imageUrls : existing?.imageUrl ? [existing.imageUrl] : []
  )
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
      setImageUrls((arr) => {
        if (arr.length >= 10) return arr
        return [...arr, json.data.url]
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!token) return
    if (!imageUrls.length) {
      setError("At least one image is required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        imageUrls: imageUrls.slice(0, 10),
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
            <label className="text-sm font-medium text-slate-700 block mb-2">Images (up to 10)</label>
            {imageUrls.length ? (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {imageUrls.map((u, i) => (
                  <div key={`${u}-${i}`} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveUrl(apiUrl, u)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImageUrls((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {imageUrls.length < 10 ? (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ImagePlus className="h-6 w-6" />
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">
                  {uploading ? "Uploading..." : "Click to upload image(s)"}
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
            <p className="text-xs text-slate-500 mt-1">{imageUrls.length}/10 images selected</p>
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
