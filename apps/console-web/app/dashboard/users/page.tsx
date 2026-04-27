"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { getApiUrl } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"

type PatientItem = {
  _id: string
  fullName: string | null
  gender: "male" | "female" | null
  age: number | null
  phone: string | null
  email: string | null
  telegram: string | null
  city: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
}

export default function UsersPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [cityFilter, setCityFilter] = useState<string>("all")
  const [items, setItems] = useState<PatientItem[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        gender: genderFilter,
        city: cityFilter,
      })
      const res = await fetch(`${apiUrl}/v1/users/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setItems(json.data?.items ?? [])
        setCities(json.data?.cities ?? [])
      } else {
        setItems([])
        setCities([])
      }
    } catch {
      setItems([])
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, cityFilter, genderFilter, search, statusFilter, token])

  useEffect(() => {
    load()
  }, [load])

  const statusPretty = (status: string | null) => {
    if (status === "active") return "bg-green-100 text-green-800"
    if (status === "blocked") return "bg-rose-100 text-rose-700"
    return "bg-slate-100 text-slate-700"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600 mt-1">All patients from database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-sm text-muted-foreground">Narrow down the user list</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gender</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("")
                setStatusFilter("all")
                setGenderFilter("all")
                setCityFilter("all")
              }}
            >
              Clear filters
            </Button>
            <Button variant="outline" onClick={load}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
          <p className="text-sm text-muted-foreground">{loading ? "Loading..." : `${items.length} users`}</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs">{p._id}</TableCell>
                    <TableCell className="font-medium">{p.fullName || "-"}</TableCell>
                    <TableCell>{p.email || "-"}</TableCell>
                    <TableCell>{p.phone || "-"}</TableCell>
                    <TableCell>{p.telegram || "-"}</TableCell>
                    <TableCell>{p.gender || "-"}</TableCell>
                    <TableCell>{p.city || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusPretty(p.status)}`}>
                        {p.status || "unknown"}
                      </span>
                    </TableCell>
                    <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))}
                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
