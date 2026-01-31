"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth-store"
import { Lock, Eye, EyeOff, User } from "lucide-react"
import { getApiUrl } from "@/lib/api"
import Cookies from "js-cookie"

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Profile update state
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [username, setUsername] = useState(user?.username || "")
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)

    // Frontend validation
    if (!displayName.trim()) {
      setProfileMessage({ type: "error", text: "Display name is required" })
      return
    }
    if (!username.trim()) {
      setProfileMessage({ type: "error", text: "Username is required" })
      return
    }
    if (username.length < 2) {
      setProfileMessage({ type: "error", text: "Username must be at least 2 characters" })
      return
    }

    setProfileLoading(true)

    try {
      // Get auth token from cookies
      const token = Cookies.get("console_auth_token")
      if (!token) {
        setProfileMessage({ type: "error", text: "Not authenticated. Please login again." })
        setProfileLoading(false)
        return
      }

      // Call API to update profile
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/v1/auth/updateProfile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        // Show exact error message from backend
        const errorMsg = data.error || data.message || "Failed to update profile"
        console.error("Profile update error:", data)
        setProfileMessage({ type: "error", text: errorMsg })
        setProfileLoading(false)
        return
      }

      // Success - update local user state
      if (data.data) {
        setUser(data.data)
        setDisplayName(data.data.displayName)
        setUsername(data.data.username)
      }
      setProfileMessage({ type: "success", text: "Profile updated successfully!" })
    } catch (error) {
      setProfileMessage({ type: "error", text: "Something went wrong. Please try again." })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    // Frontend validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters." })
      return
    }

    setPasswordLoading(true)

    try {
      // Get auth token from cookies
      const token = Cookies.get("console_auth_token")
      if (!token) {
        setPasswordMessage({ type: "error", text: "Not authenticated. Please login again." })
        setPasswordLoading(false)
        return
      }

      // Call API to change password
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/v1/auth/changePassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        // Handle error response
        const errorMsg = data.error || data.message || "Failed to update password"
        setPasswordMessage({ type: "error", text: errorMsg })
        setPasswordLoading(false)
        return
      }

      // Success
      setPasswordMessage({ type: "success", text: "Password updated successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowCurrent(false)
      setShowNew(false)
      setShowConfirm(false)
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Something went wrong. Please try again." })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your display name and username
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {profileMessage && (
                <div
                  className={`rounded-md px-4 py-3 text-sm ${
                    profileMessage.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Super Admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, underscores and hyphens"
                  required
                />
                <p className="text-xs text-slate-500">
                  Only letters, numbers, underscores (_) and hyphens (-) allowed
                </p>
              </div>
              <Button type="submit" disabled={profileLoading}>
                {profileLoading ? "Updating…" : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change password
          </CardTitle>
          <CardDescription>
            Update your admin account password. You must enter your current password correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMessage && (
              <div
                className={`rounded-md px-4 py-3 text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
