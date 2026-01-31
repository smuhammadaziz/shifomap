"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, Loader2, Play, Search } from "lucide-react"
import { getApiUrl } from "@/lib/api"
import Cookies from "js-cookie"
import ClinicDetailsDialog from "@/components/clinic-details-dialog"
import { formatDate, formatDateTime } from "@/lib/format-date"
import { toast } from "sonner"

interface Clinic {
  _id: string
  clinicDisplayName: string
  clinicUniqueName: string
  status: string
  plan?: { type: string; startedAt: string; expiresAt: string | null }
  ranking?: { score: number; boosted: boolean }
  rating?: { avg: number; count: number }
  owners?: Array<{
    _id: string
    displayName: string
    userName: string
    role: string
    lastLoginAt: string | null
  }>
  stats?: {
    branchesCount: number
    servicesCount: number
    doctorsCount: number
    adminsCount: number
  }
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Detail view
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<any | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [activatingClinicId, setActivatingClinicId] = useState<string | null>(null)

  // Create form
  const [formData, setFormData] = useState({
    clinicDisplayName: "",
    clinicUniqueName: "",
    ownerUserName: "",
    ownerDisplayName: "",
    ownerPassword: "",
    plan: "starter",
  })

  // Fetch clinics on mount
  useEffect(() => {
    fetchClinics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        setSearchLoading(true)
        fetchClinics(searchQuery)
      } else {
        fetchClinics()
      }
    }, 1000) // 1.2 seconds debounce

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const fetchClinics = async (search?: string) => {
    if (!search) setLoading(true)
    try {
      const token = Cookies.get("console_auth_token")
      if (!token) {
        setError("Not authenticated")
        setLoading(false)
        setSearchLoading(false)
        return
      }

      const apiUrl = getApiUrl()
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ""
      const response = await fetch(`${apiUrl}/v1/clinics?limit=100${searchParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success && data.data?.clinics) {
        setClinics(data.data.clinics)
      }
    } catch (err) {
      setError("Failed to load clinics")
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCreating(true)

    try {
      const token = Cookies.get("console_auth_token")
      if (!token) {
        setError("Not authenticated")
        setCreating(false)
        return
      }

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/v1/clinics/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to create clinic")
        setCreating(false)
        return
      }

      // Success - refresh list and close dialog
      await fetchClinics()
      setCreateOpen(false)
      setFormData({
        clinicDisplayName: "",
        clinicUniqueName: "",
        ownerUserName: "",
        ownerDisplayName: "",
        ownerPassword: "",
        plan: "starter",
      })
    } catch (err) {
      setError("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  const handleViewDetails = async (clinicId: string) => {
    setLoadingDetails(true)
    setDetailsOpen(true)
    setSelectedClinic(null)

    try {
      const token = Cookies.get("console_auth_token")
      if (!token) return

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/v1/clinics/${clinicId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success && data.data) {
        setSelectedClinic(data.data)
      }
    } catch (err) {
      console.error("Failed to load clinic details:", err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleActivateClinic = async (clinicId: string, clinicName: string) => {
    setActivatingClinicId(clinicId)
    try {
      const token = Cookies.get("console_auth_token")
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/v1/clinics/${clinicId}/activate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Clinic Activated", {
          description: `${clinicName} has been activated successfully.`,
        })
        fetchClinics()
      } else {
        toast.error("Failed to Activate", {
          description: data.error || "Could not activate the clinic.",
        })
      }
    } catch (error) {
      toast.error("Network Error", {
        description: "Failed to connect to the server.",
      })
    } finally {
      setActivatingClinicId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinics</h1>
          <p className="text-slate-600 mt-1">Manage all clinics ({clinics.length})</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clinics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create clinic
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create new clinic</DialogTitle>
              <p className="text-sm text-muted-foreground">Add a new clinic to the platform</p>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              {error && (
                <div className="bg-red-50 text-red-800 border border-red-200 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="clinicDisplayName">Clinic Display Name *</Label>
                <Input
                  id="clinicDisplayName"
                  placeholder="City Medical Center"
                  value={formData.clinicDisplayName}
                  onChange={(e) => setFormData({ ...formData, clinicDisplayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicUniqueName">Clinic Unique Name *</Label>
                <Input
                  id="clinicUniqueName"
                  placeholder="city-medical-center"
                  value={formData.clinicUniqueName}
                  onChange={(e) => setFormData({ ...formData, clinicUniqueName: e.target.value })}
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, _ and -"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Only letters, numbers, underscores and hyphens
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerUserName">Owner Username *</Label>
                <Input
                  id="ownerUserName"
                  placeholder="johndoe"
                  value={formData.ownerUserName}
                  onChange={(e) => setFormData({ ...formData, ownerUserName: e.target.value })}
                  pattern="[a-zA-Z0-9_-]+"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerDisplayName">Owner Display Name *</Label>
                <Input
                  id="ownerDisplayName"
                  placeholder="John Doe"
                  value={formData.ownerDisplayName}
                  onChange={(e) => setFormData({ ...formData, ownerDisplayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Owner Password *</Label>
                <Input
                  id="ownerPassword"
                  type="password"
                  placeholder="Min 8 characters"
                  value={formData.ownerPassword}
                  onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All clinics</CardTitle>
          <p className="text-sm text-muted-foreground">{clinics.length} total clinics</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Unique Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No clinics found. Create your first clinic!
                    </TableCell>
                  </TableRow>
                ) : (
                  clinics.map((clinic) => (
                    <TableRow key={clinic._id}>
                      <TableCell className="font-medium">{clinic.clinicDisplayName}</TableCell>
                      <TableCell className="font-mono text-xs">@{clinic.clinicUniqueName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            clinic.status === "active"
                              ? "default"
                              : clinic.status === "suspended"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {clinic.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{clinic.plan?.type || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{clinic.ranking?.score || 0}</TableCell>
                      <TableCell>
                        {clinic.rating?.avg ? `${clinic.rating.avg.toFixed(1)} (${clinic.rating.count})` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {clinic.owners?.[0] ? (
                          <div>
                            <p className="text-sm font-medium">{clinic.owners[0].displayName}</p>
                            <p className="text-xs text-muted-foreground">@{clinic.owners[0].userName}</p>
                            {clinic.owners[0].lastLoginAt && (
                              <p className="text-xs text-muted-foreground">
                                Last: {formatDateTime(clinic.owners[0].lastLoginAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <p>Branches: {clinic.stats?.branchesCount || 0}</p>
                          <p>Services: {clinic.stats?.servicesCount || 0}</p>
                          <p>Doctors: {clinic.stats?.doctorsCount || 0}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(clinic.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(clinic.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {clinic.status === "inactive" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleActivateClinic(clinic._id, clinic.clinicDisplayName)}
                              disabled={activatingClinicId === clinic._id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {activatingClinicId === clinic._id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Activate
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(clinic._id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Clinic Details Dialog */}
      <ClinicDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        clinic={loadingDetails ? null : selectedClinic}
        onRefresh={() => fetchClinics()}
      />
    </div>
  )
}
