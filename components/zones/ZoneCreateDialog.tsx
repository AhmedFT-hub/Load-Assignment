'use client'

import { useState } from 'react'
import { ZoneCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoneCreateDialogProps {
  coordinates: Array<{ lat: number; lng: number }>
  onSave: (data: { name: string; category: ZoneCategory; description?: string }) => void
  onCancel: () => void
}

const CATEGORIES: ZoneCategory[] = [
  'THEFT',
  'PILFERAGE',
  'STOPPAGE',
  'HIGH_RISK',
  'ACCIDENT_PRONE',
  'TRAFFIC_CONGESTION',
  'CUSTOM',
]

const CATEGORY_LABELS: Record<ZoneCategory, string> = {
  THEFT: 'Theft',
  PILFERAGE: 'Pilferage',
  STOPPAGE: 'Stoppage',
  HIGH_RISK: 'High Risk',
  ACCIDENT_PRONE: 'Accident Prone',
  TRAFFIC_CONGESTION: 'Traffic Congestion',
  CUSTOM: 'Custom',
}

export default function ZoneCreateDialog({
  coordinates,
  onSave,
  onCancel,
}: ZoneCreateDialogProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ZoneCategory>('HIGH_RISK')
  const [description, setDescription] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a zone name')
      return
    }
    onSave({ name: name.trim(), category, description: description.trim() || undefined })
  }

  return (
    <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Create Zone</CardTitle>
            <CardDescription>{coordinates.length} points selected</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Zone Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Highway 101 - High Risk Area"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "h-9 rounded-md border text-sm font-medium transition-colors",
                  category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional notes..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Create Zone
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

