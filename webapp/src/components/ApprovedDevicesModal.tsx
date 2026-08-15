import { useState, useEffect } from 'react'
import { fetchAllDevices, approveDevice, rejectDevice, deleteDevice, updateDeviceLabel } from '../services/deviceAccess'
import type { DeviceRecord, DeviceStatus } from '../services/deviceAccess'

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

interface Props {
  onClose: () => void
}

const STATUS_STYLES: Record<DeviceStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  not_found: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<DeviceStatus, string> = {
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  not_found: 'Unknown',
}

export default function ApprovedDevicesModal({ onClose }: Props) {
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('all')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [editingLabel, setEditingLabel] = useState<{ id: number; value: string } | null>(null)
  const [labelSaving, setLabelSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllDevices()
      setDevices(data)
    } catch {
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: number) {
    setActionLoading(id)
    const ok = await approveDevice(id)
    if (ok) setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d))
    setActionLoading(null)
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    const ok = await rejectDevice(id)
    if (ok) setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d))
    setActionLoading(null)
  }

  async function handleSaveLabel() {
    if (!editingLabel) return
    setLabelSaving(true)
    const ok = await updateDeviceLabel(editingLabel.id, editingLabel.value)
    if (ok) setDevices(prev => prev.map(d => d.id === editingLabel.id ? { ...d, label: editingLabel.value } : d))
    setLabelSaving(false)
    setEditingLabel(null)
  }

  async function handleDelete(id: number) {
    setActionLoading(id)
    const ok = await deleteDevice(id)
    if (ok) setDevices(prev => prev.filter(d => d.id !== id))
    setActionLoading(null)
  }

  const tabs: FilterTab[] = ['all', 'pending', 'approved', 'rejected']
  const counts: Record<FilterTab, number> = {
    all:      devices.length,
    pending:  devices.filter(d => d.status === 'pending').length,
    approved: devices.filter(d => d.status === 'approved').length,
    rejected: devices.filter(d => d.status === 'rejected').length,
  }

  const filtered = tab === 'all' ? devices : devices.filter(d => d.status === tab)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>📱</span> Approved Devices
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage device access to the public dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-1 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {counts[t] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📱</p>
              <p className="text-gray-400 text-sm">
                {tab === 'pending' ? 'No pending requests' : `No ${tab} devices`}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(device => (
                <li
                  key={device.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Device info row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {device.device_info || 'Unknown Device'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[device.status]}`}>
                          {STATUS_LABELS[device.status]}
                        </span>
                        {device.ticket_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-600 border border-indigo-200">
                            #{device.ticket_id}
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      {editingLabel?.id === device.id ? (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={editingLabel.value}
                            onChange={e => setEditingLabel({ id: device.id, value: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') setEditingLabel(null) }}
                            placeholder="e.g. Reception Tablet"
                            className="flex-1 text-xs border border-orange-300 rounded-lg px-2 py-1 outline-none focus:border-orange-500"
                          />
                          <button
                            onClick={handleSaveLabel}
                            disabled={labelSaving}
                            className="text-xs px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                          >
                            {labelSaving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingLabel(null)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-xs ${device.label ? 'text-gray-600 font-medium' : 'text-gray-300 italic'}`}>
                            🏷️ {device.label || 'No label'}
                          </span>
                          <button
                            onClick={() => setEditingLabel({ id: device.id, value: device.label || '' })}
                            className="text-xs text-orange-400 hover:text-orange-600"
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {/* Email */}
                      {device.email && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          ✉️ {device.email}
                        </p>
                      )}

                      {/* IP + timestamps */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {device.ip_address && (
                          <span className="text-xs text-gray-400">IP: {device.ip_address}</span>
                        )}
                        {device.requested_at && (
                          <span className="text-xs text-gray-400">Requested: {device.requested_at}</span>
                        )}
                        {device.status !== 'pending' && device.updated_at && (
                          <span className="text-xs text-gray-400">Updated: {device.updated_at}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {device.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(device.id)}
                            disabled={actionLoading === device.id}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            {actionLoading === device.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(device.id)}
                            disabled={actionLoading === device.id}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            {actionLoading === device.id ? '...' : 'Reject'}
                          </button>
                        </>
                      )}
                      {device.status === 'approved' && (
                        <button
                          onClick={() => handleReject(device.id)}
                          disabled={actionLoading === device.id}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                        >
                          {actionLoading === device.id ? '...' : 'Revoke'}
                        </button>
                      )}
                      {device.status === 'rejected' && (
                        <button
                          onClick={() => handleApprove(device.id)}
                          disabled={actionLoading === device.id}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-green-100 hover:text-green-600 disabled:opacity-50 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                        >
                          {actionLoading === device.id ? '...' : 'Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(device.id)}
                        disabled={actionLoading === device.id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-400 hover:text-gray-600 text-xs font-medium rounded-lg transition-colors"
                      >
                        {actionLoading === device.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending badge at bottom */}
        {counts.pending > 0 && tab !== 'pending' && (
          <div className="px-5 pb-4 pt-2 flex-shrink-0 border-t border-gray-100">
            <button
              onClick={() => setTab('pending')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {counts.pending}
              </span>
              pending request{counts.pending > 1 ? 's' : ''} awaiting approval
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
