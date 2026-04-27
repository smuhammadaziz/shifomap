"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiUrl } from "@/lib/api"
import { Users, Building2, CreditCard, Activity, Bot, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type DashboardStats = {
  usersCount: number
  clinicsCount: number
  paidClinicsCount: number
  dailyActiveCount: number
  aiConversationsTotal: number
  paidClinics: Array<{ _id: string; name: string; plan: string; status: string }>
  dailyActiveUsers: Array<{ _id: string; name: string; lastActive: string | null }>
}

export default function DashboardPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    usersCount: 0,
    clinicsCount: 0,
    paidClinicsCount: 0,
    dailyActiveCount: 0,
    aiConversationsTotal: 0,
    paidClinics: [],
    dailyActiveUsers: [],
  })

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/users/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setStats(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Overview of your platform</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.usersCount}</div>
            <p className="text-xs text-muted-foreground">Total patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clinics</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.clinicsCount}</div>
            <p className="text-xs text-muted-foreground">Registered clinics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Clinics</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.paidClinicsCount}</div>
            <p className="text-xs text-muted-foreground">On paid plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.dailyActiveCount}</div>
            <p className="text-xs text-muted-foreground">Active today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Chats</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.aiConversationsTotal}</div>
            <p className="text-xs text-muted-foreground">Total AI conversations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paid Clinics</CardTitle>
            <p className="text-sm text-muted-foreground">Clinics on paid subscription plans</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {stats.paidClinics.map((c) => (
                <li
                  key={c._id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {c.plan}
                  </span>
                </li>
              ))}
              {!loading && stats.paidClinics.length === 0 && (
                <li className="text-sm text-muted-foreground py-4">No paid clinics</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
            <p className="text-sm text-muted-foreground">Recently active patients</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {stats.dailyActiveUsers.map((u) => (
                <li
                  key={u._id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.lastActive ? new Date(u.lastActive).toLocaleTimeString() : "-"}
                  </span>
                </li>
              ))}
              {!loading && stats.dailyActiveUsers.length === 0 ? (
                <li className="text-sm text-muted-foreground py-4">No active users today</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
