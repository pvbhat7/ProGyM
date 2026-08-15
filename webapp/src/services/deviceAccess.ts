import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { API_BASE } from '../api/config'

const FP_CACHE_KEY = 'progym_device_fp'

export type DeviceStatus = 'approved' | 'pending' | 'rejected' | 'not_found'

export interface DeviceStatusResult {
  found: boolean
  status: DeviceStatus
  email?: string
  ticket_id?: string
  device_info?: string
  requested_at?: string
  updated_at?: string
}

export interface DeviceRecord {
  id: number
  fingerprint: string
  email: string
  label: string
  ticket_id: string
  device_info: string
  ip_address: string
  status: DeviceStatus
  requested_at: string
  updated_at: string
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent
  let browser = 'Unknown Browser'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'

  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Mac')) os = 'Mac'
  else if (ua.includes('Linux')) os = 'Linux'

  const res = `${screen.width}x${screen.height}`
  return `${browser} on ${os} · ${res}`
}

export async function getFingerprint(): Promise<string> {
  const cached = sessionStorage.getItem(FP_CACHE_KEY)
  if (cached) return cached

  const fp = await FingerprintJS.load()
  const result = await fp.get()
  sessionStorage.setItem(FP_CACHE_KEY, result.visitorId)
  return result.visitorId
}

export async function checkDeviceStatus(): Promise<DeviceStatusResult> {
  const fingerprint = await getFingerprint()
  const res = await fetch(`${API_BASE}/approvedDevices/checkStatus.php?fingerprint=${encodeURIComponent(fingerprint)}`)
  return res.json()
}

export async function requestDeviceAccess(email: string): Promise<{ success: boolean; status: DeviceStatus; ticket_id?: string }> {
  const fingerprint = await getFingerprint()
  const res = await fetch(`${API_BASE}/approvedDevices/requestAccess.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fingerprint,
      email: email.trim(),
      device_info: getDeviceInfo(),
    }),
  })
  return res.json()
}

export async function fetchAllDevices(): Promise<DeviceRecord[]> {
  const res = await fetch(`${API_BASE}/approvedDevices/getAll.php`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function approveDevice(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/approvedDevices/approve.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json()
  return data.success === true
}

export async function rejectDevice(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/approvedDevices/reject.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json()
  return data.success === true
}

export async function deleteDevice(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/approvedDevices/delete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json()
  return data.success === true
}

export async function updateDeviceLabel(id: number, label: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/approvedDevices/updateLabel.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, label }),
  })
  const data = await res.json()
  return data.success === true
}
