"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ImagePlus, Plus, Trash2, Pencil, X } from "lucide-react"

type Story = {
  _id: string
  title: string
  imageUrl: string
  order: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

function resolveUrl(apiUrl: string, url: string): string {
  if (!url) return ""
  if (url.startsWith("http")) return url
  if (url.startsWith("/v1/")) return apiUrl + url
  return url
}

export default function StoriesAdminPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [items, setItems] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Story | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/stories/admin`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      setItems(res.ok && json?.success ? json.data?.items ?? [] : [])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id: string) => {
    if (!token) return
    await fetch(`${apiUrl}/v1/stories/admin/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stories</h1>
          <p className="text-slate-500 mt-2 text-sm">Mobile story ribbon content</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New story
        </Button>
      </div>

      {loading ? (
        <div className="text-slate-400 py-16 text-center">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveUrl(apiUrl, s.imageUrl)} alt="" className="w-full aspect-[9/16] object-contain bg-slate-100" />
              <div className="p-3">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500 mt-1">order: {s.order} · {s.isActive ? "active" : "inactive"}</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(s._id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <StoryEditor
          apiUrl={apiUrl}
          token={token}
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
      )}
    </div>
  )
}

function StoryEditor({
  apiUrl,
  token,
  existing,
  onClose,
  onSaved,
}: {
  apiUrl: string
  token: string | null
  existing: Story | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(existing?.title ?? "")
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "")
  const [order, setOrder] = useState(String(existing?.order ?? 0))
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ? existing.expiresAt.slice(0, 16) : "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
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
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Upload failed")
      setImageUrl(json.data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!token) return
    if (!title.trim() || !imageUrl.trim()) {
      setError("title and image are required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        order: parseInt(order || "0", 10) || 0,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      const res = await fetch(`${apiUrl}/v1/stories/admin${existing ? `/${existing._id}` : ""}`, {
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
          <h2 className="text-lg font-semibold text-slate-900">{existing ? "Edit story" : "New story"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Image</label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2 aspect-[9/16]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveUrl(apiUrl, imageUrl)} alt="" className="w-full h-full object-contain bg-slate-100" />
                <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[9/16] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">{uploading ? "Uploading..." : "Upload story image"}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ""
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Order</label>
              <input value={order} onChange={(e) => setOrder(e.target.value)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Expires at</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>

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
