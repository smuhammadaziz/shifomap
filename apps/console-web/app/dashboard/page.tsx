"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MOCK_PATIENTS, MOCK_CLINICS, PAID_CLINICS, DAILY_ACTIVE_USERS } from "@/lib/mock-data"
import { Users, Building2, CreditCard, Activity } from "lucide-react"

export default function DashboardPage() {
  const usersCount = MOCK_PATIENTS.length
  const clinicsCount = MOCK_CLINICS.length
  const paidCount = PAID_CLINICS.length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount}</div>
            <p className="text-xs text-muted-foreground">Total patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clinics</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clinicsCount}</div>
            <p className="text-xs text-muted-foreground">Registered clinics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Clinics</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount}</div>
            <p className="text-xs text-muted-foreground">On paid plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{DAILY_ACTIVE_USERS.length}</div>
            <p className="text-xs text-muted-foreground">Active today</p>
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
              {PAID_CLINICS.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {c.plan}
                  </span>
                </li>
              ))}
              {PAID_CLINICS.length === 0 && (
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
              {DAILY_ACTIVE_USERS.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.lastActive).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
