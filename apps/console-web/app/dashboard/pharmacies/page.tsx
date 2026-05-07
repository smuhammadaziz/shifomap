"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"

type PharmacyRow = {
  id: string
  name: string
  phone: string | null
  city: string
  street: string
  lat: number | null
  lng: number | null
  workingHours: string | null
  photoUrl: string | null
  isActive: boolean
}

export default function PharmaciesAdminPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [items, setItems] = useState<PharmacyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [city, setCity] = useState("Tashkent")
  const [street, setStreet] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/pharmacies/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setItems(res.ok && json?.success ? json.data?.items ?? [] : [])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!token) return
    const body = {
      name: name.trim(),
      city: city.trim(),
      street: street.trim(),
      lat: Number(lat),
      lng: Number(lng),
    }
    const res = await fetch(`${apiUrl}/v1/pharmacies/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setName("")
      setStreet("")
      setLat("")
      setLng("")
      load()
    }
  }

  const remove = async (id: string) => {
    if (!token) return
    const res = await fetch(`${apiUrl}/v1/pharmacies/admin/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) load()
  }

  const seed = async () => {
    if (!token) return
    const res = await fetch(`${apiUrl}/v1/pharmacies/admin/seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) load()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900">Pharmacies</h1>
      <p className="text-slate-500 mt-2 text-sm">Manage pharmacy locations and seed nearest apteka data.</p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 grid sm:grid-cols-5 gap-2">
        <input className="h-10 px-3 rounded border border-slate-300 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="h-10 px-3 rounded border border-slate-300 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="h-10 px-3 rounded border border-slate-300 text-sm" placeholder="Street" value={street} onChange={(e) => setStreet(e.target.value)} />
        <input className="h-10 px-3 rounded border border-slate-300 text-sm" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} />
        <input className="h-10 px-3 rounded border border-slate-300 text-sm" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} />
        <div className="sm:col-span-5 flex gap-2">
          <button className="h-10 px-4 rounded bg-slate-900 text-white text-sm font-semibold" onClick={create}>Create</button>
          <button className="h-10 px-4 rounded bg-blue-600 text-white text-sm font-semibold" onClick={seed}>Seed 12 samples</button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">No pharmacies yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Address</th>
                <th className="p-3">Geo</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{it.name}</td>
                  <td className="p-3 text-slate-600">{[it.city, it.street].filter(Boolean).join(", ")}</td>
                  <td className="p-3 text-slate-600">{it.lat}, {it.lng}</td>
                  <td className="p-3">
                    <button className="px-2 py-1 rounded bg-red-50 text-red-700" onClick={() => remove(it.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
