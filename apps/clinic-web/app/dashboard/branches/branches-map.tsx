'use client'

import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401] // Tashkent
const DEFAULT_ZOOM = 12

function escapeHtml(str: string): string {
  if (str == null) return ''
  const s = String(str)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BranchForMap {
  _id: string
  name: string
  phone: string
  address: {
    city: string
    street: string
    geo: { lat: number; lng: number }
  }
}

function createIcon() {
  return L.divIcon({
    className: 'branch-marker',
    html: `<div style="width:24px;height:24px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

interface BranchesMapProps {
  branches: BranchForMap[]
  className?: string
}

export function BranchesMap({ branches, className = '' }: BranchesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const validBranches = useMemo(
    () => branches.filter((b) => b?.address?.geo?.lat != null && b?.address?.geo?.lng != null),
    [branches]
  )

  // Create map once when container is available; cleanup on unmount prevents "already initialized" on remount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = []
    }
  }, [])

  // Update markers and fit bounds when branches change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    validBranches.forEach((branch) => {
      const { lat, lng } = branch.address.geo
      const marker = L.marker([lat, lng], { icon: createIcon() })
      marker.bindPopup(
        `<div class="text-sm">
          <p class="font-semibold text-gray-900">${escapeHtml(branch.name)}</p>
          <p class="text-gray-600">${escapeHtml(branch.phone)}</p>
          <p class="text-gray-500">${escapeHtml(branch.address.street)}, ${escapeHtml(branch.address.city)}</p>
        </div>`
      )
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    if (validBranches.length === 1) {
      const { lat, lng } = validBranches[0].address.geo
      map.setView([lat, lng], 14)
    } else if (validBranches.length >= 2) {
      const bounds = L.latLngBounds(
        validBranches.map((b) => [b.address.geo.lat, b.address.geo.lng] as [number, number])
      )
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
    }
  }, [validBranches])

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 ${className}`}
      style={{ minHeight: 400 }}
    />
  )
}
