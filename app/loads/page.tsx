'use client'

import { useState, useEffect } from 'react'
import { Load } from '@/types'
import { format } from 'date-fns'

export default function LoadsPage() {
  const [loads, setLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({
    pickupCity: '',
    dropCity: '',
    commodity: '',
    vehicleType: '',
    status: '',
    search: '',
  })

  const [formData, setFormData] = useState({
    pickupCity: '',
    dropCity: '',
    commodity: '',
    rate: '',
    expectedReportingTime: '',
    expectedUnloadingTime: '',
    mode: 'FTL',
    vehicleType: '32ft',
    specialInstructions: '',
    slaHours: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchLoads()
  }, [filters])

  const fetchLoads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/loads?${params.toString()}`)
      const data = await response.json()
      setLoads(data)
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create load')
      }

      // Reset form and refresh list
      setFormData({
        pickupCity: '',
        dropCity: '',
        commodity: '',
        rate: '',
        expectedReportingTime: '',
        expectedUnloadingTime: '',
        mode: 'FTL',
        vehicleType: '32ft',
        specialInstructions: '',
        slaHours: '',
      })
      setShowForm(false)
      fetchLoads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (loadId: string, loadRoute: string) => {
    if (!window.confirm(`Are you sure you want to delete the load "${loadRoute}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(loadId)
      const response = await fetch(`/api/loads/${loadId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete load')
      }

      // Refresh the list
      fetchLoads()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete load')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (load: Load) => {
    try {
      setDuplicatingId(load.id)
      
      // Convert dates to ISO strings if they're Date objects
      const expectedReportingTime = load.expectedReportingTime instanceof Date
        ? load.expectedReportingTime.toISOString().slice(0, 16)
        : new Date(load.expectedReportingTime).toISOString().slice(0, 16)
      
      const expectedUnloadingTime = load.expectedUnloadingTime
        ? (load.expectedUnloadingTime instanceof Date
            ? load.expectedUnloadingTime.toISOString().slice(0, 16)
            : new Date(load.expectedUnloadingTime).toISOString().slice(0, 16))
        : ''
      
      // Create a duplicate load with the same data but status set to AVAILABLE
      const response = await fetch('/api/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupCity: load.pickupCity,
          dropCity: load.dropCity,
          commodity: load.commodity,
          rate: load.rate,
          expectedReportingTime: expectedReportingTime,
          expectedUnloadingTime: expectedUnloadingTime || undefined,
          mode: load.mode,
          vehicleType: load.vehicleType,
          specialInstructions: load.specialInstructions || '',
          slaHours: load.slaHours || '',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to duplicate load')
      }

      // Refresh the list
      fetchLoads()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate load')
    } finally {
      setDuplicatingId(null)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800'
      case 'OFFERED':
        return 'bg-yellow-100 text-yellow-800'
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800'
      case 'EXHAUSTED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Load Management</h1>
              <p className="text-gray-600 mt-1">Create and manage available loads</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                ← Dashboard
              </a>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                {showForm ? 'Cancel' : '+ Create Load'}
              </button>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Load</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickupCity}
                  onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Delhi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Drop City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dropCity}
                  onChange={(e) => setFormData({ ...formData, dropCity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Bangalore"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commodity *
                </label>
                <input
                  type="text"
                  required
                  value={formData.commodity}
                  onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Electronics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate / Freight *
                </label>
                <input
                  type="number"
                  required
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Reporting Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.expectedReportingTime}
                  onChange={(e) => setFormData({ ...formData, expectedReportingTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Unloading Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.expectedUnloadingTime}
                  onChange={(e) => setFormData({ ...formData, expectedUnloadingTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mode *
                </label>
                <select
                  required
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="FTL">FTL (Full Truck Load)</option>
                  <option value="PTL">PTL (Part Truck Load)</option>
                  <option value="LTL">LTL (Less Than Truckload)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  required
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="32ft">32 ft</option>
                  <option value="24ft">24 ft</option>
                  <option value="20ft">20 ft</option>
                  <option value="14ft">14 ft</option>
                  <option value="10ft">10 ft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SLA Hours
                </label>
                <input
                  type="number"
                  value={formData.slaHours}
                  onChange={(e) => setFormData({ ...formData, slaHours: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="48"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Any special handling requirements..."
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Creating...' : 'Create Load'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Filters</h3>
          <div className="grid grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Pickup city..."
              value={filters.pickupCity}
              onChange={(e) => setFilters({ ...filters, pickupCity: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Drop city..."
              value={filters.dropCity}
              onChange={(e) => setFilters({ ...filters, dropCity: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Commodity..."
              value={filters.commodity}
              onChange={(e) => setFilters({ ...filters, commodity: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Vehicle type..."
              value={filters.vehicleType}
              onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OFFERED">Offered</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EXHAUSTED">Exhausted</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Load List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : loads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No loads found. Create your first load!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporting</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loads.map((load) => (
                    <tr key={load.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {load.pickupCity} → {load.dropCity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{load.commodity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">₹{load.rate.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{load.vehicleType}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{load.mode}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {format(new Date(load.expectedReportingTime), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(load.status)}`}>
                          {load.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDuplicate(load)}
                            disabled={duplicatingId === load.id || deletingId === load.id}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Duplicate load"
                          >
                            {duplicatingId === load.id ? 'Duplicating...' : 'Duplicate'}
                          </button>
                          <button
                            onClick={() => handleDelete(load.id, `${load.pickupCity} → ${load.dropCity}`)}
                            disabled={deletingId === load.id || duplicatingId === load.id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete load"
                          >
                            {deletingId === load.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



