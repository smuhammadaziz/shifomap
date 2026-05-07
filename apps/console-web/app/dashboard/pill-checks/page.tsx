"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"
import { PillBottle } from "lucide-react"

type Row = {
  patientName: string
  patientPhone: string
  pillName: string
  reminderId: string
  takenCount: number
  skippedCount: number
  lastTakenAt: string | null
}

export default function PillChecksPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [q, setQ] = useState("")

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (from) sp.set("from", from)
      if (to) sp.set("to", to)
      if (q.trim()) sp.set("q", q.trim())
      const res = await fetch(`${apiUrl}/v1/admin/pill-check-stats?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setRows(res.ok && json?.success ? json.data?.rows ?? [] : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, from, to, q, token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pill check-ins</h1>
          <p className="text-sm text-slate-500 mt-1">Custom reminder “Ichdim” events (taken / skipped)</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-2 text-sm bg-white"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 block mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, phone, pill…"
              className="h-10 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <PillBottle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">No pill check-ins in this range</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3 font-semibold">Patient</th>
                <th className="p-3 font-semibold">Phone</th>
                <th className="p-3 font-semibold">Pill</th>
                <th className="p-3 font-semibold text-right">Taken</th>
                <th className="p-3 font-semibold text-right">Skipped</th>
                <th className="p-3 font-semibold">Last taken</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.patientPhone}-${r.reminderId}`} className="border-t border-slate-100">
                  <td className="p-3 text-slate-900 font-medium">{r.patientName}</td>
                  <td className="p-3 text-slate-600">{r.patientPhone}</td>
                  <td className="p-3 text-slate-800">{r.pillName}</td>
                  <td className="p-3 text-right tabular-nums">{r.takenCount}</td>
                  <td className="p-3 text-right tabular-nums">{r.skippedCount}</td>
                  <td className="p-3 text-slate-600">
                    {r.lastTakenAt ? new Date(r.lastTakenAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
