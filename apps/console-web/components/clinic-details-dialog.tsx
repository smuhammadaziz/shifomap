"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Briefcase, Calendar, Shield, MapPin, Phone, Mail, Send, Ban, Trash2, Play } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format-date"
import { getApiUrl } from "@/lib/api"
import Cookies from "js-cookie"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface ClinicDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinic: any | null
  onRefresh: () => void
}

export default function ClinicDetailsDialog({ open, onOpenChange, clinic, onRefresh }: ClinicDetailsDialogProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const apiUrl = getApiUrl()

  const handleStopClinic = async () => {
    setActionLoading(true)
    try {
      const token = Cookies.get("console_auth_token")
      const response = await fetch(`${apiUrl}/v1/clinics/${clinic._id}/stop`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success("Clinic Stopped", {
          description: "The clinic has been stopped successfully. All owners cannot login.",
        })
        onRefresh()
        onOpenChange(false)
      } else {
        toast.error("Failed to Stop Clinic", {
          description: data.error || "An error occurred while stopping the clinic.",
        })
      }
    } catch (error) {
      toast.error("Network Error", {
        description: "Failed to connect to the server. Please try again.",
      })
    } finally {
      setActionLoading(false)
      setShowStopDialog(false)
    }
  }

  const handleActivateClinic = async () => {
    setActionLoading(true)
    try {
      const token = Cookies.get("console_auth_token")
      const response = await fetch(`${apiUrl}/v1/clinics/${clinic._id}/activate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success("Clinic Activated", {
          description: "The clinic has been activated successfully. Owners can now login.",
        })
        onRefresh()
        onOpenChange(false)
      } else {
        toast.error("Failed to Activate Clinic", {
          description: data.error || "An error occurred while activating the clinic.",
        })
      }
    } catch (error) {
      toast.error("Network Error", {
        description: "Failed to connect to the server. Please try again.",
      })
    } finally {
      setActionLoading(false)
      setShowActivateDialog(false)
    }
  }

  const handleDeleteClinic = async () => {
    setActionLoading(true)
    try {
      const token = Cookies.get("console_auth_token")
      const response = await fetch(`${apiUrl}/v1/clinics/${clinic._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success("Clinic Deleted", {
          description: "The clinic and all its data have been permanently deleted.",
        })
        onRefresh()
        onOpenChange(false)
      } else {
        toast.error("Failed to Delete Clinic", {
          description: data.error || "An error occurred while deleting the clinic.",
        })
      }
    } catch (error) {
      toast.error("Network Error", {
        description: "Failed to connect to the server. Please try again.",
      })
    } finally {
      setActionLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleChangePlan = async (newPlan: string) => {
    if (!newPlan) return
    
    setActionLoading(true)
    try {
      const token = Cookies.get("console_auth_token")
      const response = await fetch(`${apiUrl}/v1/clinics/${clinic._id}/plan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success("Plan Updated", {
          description: `Successfully changed plan to ${newPlan.toUpperCase()}.`,
        })
        onRefresh()
        setSelectedPlan("")
      } else {
        toast.error("Failed to Change Plan", {
          description: data.error || "An error occurred while changing the plan.",
        })
      }
    } catch (error) {
      toast.error("Network Error", {
        description: "Failed to connect to the server. Please try again.",
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (!clinic) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{clinic.clinicDisplayName}</DialogTitle>
            <p className="text-sm text-muted-foreground">@{clinic.clinicUniqueName}</p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinic Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {clinic.status === "active" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowStopDialog(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Stop Clinic
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowActivateDialog(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4" />
                      Activate Clinic
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Change Plan:</label>
                  <Select
                    value={selectedPlan}
                    onValueChange={(value) => {
                      setSelectedPlan(value)
                      handleChangePlan(value)
                    }}
                    disabled={actionLoading}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    Current: <Badge>{clinic.plan?.type || 'N/A'}</Badge>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={clinic.status === "active" ? "default" : "secondary"}>
                      {clinic.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <Badge variant={clinic.plan?.type === "pro" ? "default" : "outline"}>{clinic.plan?.type || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ranking</p>
                    <p className="text-sm font-medium">{clinic.ranking?.score || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-sm font-medium">
                      {clinic.rating?.avg ? `${clinic.rating.avg.toFixed(1)} ⭐ (${clinic.rating.count} reviews)` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatDateTime(clinic.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">{formatDateTime(clinic.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts */}
            {clinic.contacts && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {clinic.contacts.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{clinic.contacts.phone}</span>
                    </div>
                  )}
                  {clinic.contacts.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{clinic.contacts.email}</span>
                    </div>
                  )}
                  {clinic.contacts.telegram && (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{clinic.contacts.telegram}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            {clinic.stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Branches</p>
                      <p className="text-2xl font-bold">{clinic.stats.branchesCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Services</p>
                      <p className="text-2xl font-bold">{clinic.stats.servicesCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Doctors</p>
                      <p className="text-2xl font-bold">{clinic.stats.doctorsCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Owners */}
            {clinic.owners && clinic.owners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Owners ({clinic.owners.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinic.owners.map((owner: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{owner.displayName}</p>
                          <p className="text-sm text-muted-foreground">@{owner.userName}</p>
                          <Badge variant="outline" className="mt-1">
                            {owner.role}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {owner.lastLoginAt
                              ? `Last login: ${formatDateTime(owner.lastLoginAt)}`
                              : "Never logged in"}
                          </p>
                          <Badge variant={owner.isActive ? "default" : "secondary"} className="mt-1">
                            {owner.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Branches */}
            {clinic.branches && clinic.branches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Branches ({clinic.branches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinic.branches.map((branch: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium">{branch.name}</p>
                        {branch.address && (
                          <p className="text-sm text-muted-foreground">
                            {typeof branch.address === 'string' ? branch.address : `${branch.address.street}, ${branch.address.city}`}
                          </p>
                        )}
                        {branch.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3" />
                            <span className="text-sm">{branch.phone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {clinic.services && clinic.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Services ({clinic.services.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clinic.services.map((service: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium">{service.title}</p>
                        {service.category && (
                          <Badge variant="outline" className="mt-1">
                            {service.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Doctors */}
            {clinic.doctors && clinic.doctors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Doctors ({clinic.doctors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinic.doctors.map((doctor: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doctor.fullName}</p>
                          {doctor.specialty && (
                            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                          )}
                          {doctor.username && (
                            <p className="text-xs text-muted-foreground">@{doctor.username}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={doctor.isActive ? "default" : "secondary"}>
                            {doctor.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop Clinic Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Clinic?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the clinic inactive. All owners and staff will be unable to login.
              This is a soft delete and can be reversed by activating the clinic again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopClinic}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Stopping..." : "Stop Clinic"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Clinic Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Clinic?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the clinic active again. All owners and staff will be able to login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivateClinic}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Activating..." : "Activate Clinic"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Clinic Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clinic Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">⚠️ This action cannot be undone!</p>
              <p>
                This will permanently delete the clinic and all associated data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All owners and their credentials</li>
                <li>All branches</li>
                <li>All services</li>
                <li>All doctors</li>
                <li>All statistics and records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClinic}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
