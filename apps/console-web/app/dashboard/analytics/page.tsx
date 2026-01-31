"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Platform analytics (coming soon)</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Charts and reports will be available here. Connect your data source to enable.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
            <p className="font-medium">No analytics data yet</p>
            <p className="text-sm mt-1">This section is a placeholder for future analytics.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
