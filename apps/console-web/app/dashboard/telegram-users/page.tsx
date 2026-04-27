"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { Send, Search } from "lucide-react"
import { getApiUrl } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type TelegramUserItem = {
  _id: string
  tgChatId: number | string | null
  name: string | null
  phoneNumber: string | null
  aiBonusBank: number
  aiQuestionsTotal: number
  aiUsedToday: number
  aiUsedTodayDate: string | null
  messagesCount: number
  updatedAt: string | null
}

export default function TelegramUsersPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TelegramUserItem[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ search: search.trim() })
      const res = await fetch(`${apiUrl}/v1/users/telegram?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setItems(res.ok && json?.success ? json.data?.items ?? [] : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, search, token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Telegram Users</h1>
        <p className="text-slate-600 mt-1">Users from `telegram_users` collection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, phone, chat id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={load}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
          <p className="text-sm text-muted-foreground">{loading ? "Loading..." : `${items.length} users`}</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>AI Total</TableHead>
                  <TableHead>AI Today</TableHead>
                  <TableHead>Bonus Bank</TableHead>
                  <TableHead>Today Date</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-mono text-xs">{u._id}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-sky-600" />
                        {u.tgChatId ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{u.name || "-"}</TableCell>
                    <TableCell>{u.phoneNumber || "-"}</TableCell>
                    <TableCell>{u.messagesCount}</TableCell>
                    <TableCell>{u.aiQuestionsTotal}</TableCell>
                    <TableCell>{u.aiUsedToday}</TableCell>
                    <TableCell>{u.aiBonusBank}</TableCell>
                    <TableCell>{u.aiUsedTodayDate || "-"}</TableCell>
                    <TableCell>{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))}
                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                      No telegram users found
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
