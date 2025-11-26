'use client'

import { CallLog } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Phone, Clock, AlertCircle } from 'lucide-react'

interface CallStatusCardProps {
  callLogs: CallLog[]
  isWaitingForResponse?: boolean
}

export default function CallStatusCard({ callLogs, isWaitingForResponse }: CallStatusCardProps) {
  const latestCall = callLogs[0]

  const getOutcomeVariant = (outcome: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (outcome) {
      case 'ACCEPTED':
        return 'default'
      case 'REJECTED':
      case 'FAILED':
        return 'destructive'
      case 'NO_ANSWER':
      case 'BUSY':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Call Status</CardTitle>
        <CardDescription>Ringg.ai call logs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isWaitingForResponse && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Waiting for response...
            </span>
          </div>
        )}

        {!latestCall && !isWaitingForResponse ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Phone className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No calls initiated yet</p>
          </div>
        ) : latestCall ? (
          <div className="space-y-3">
            {/* Latest Call */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Latest Call</span>
                  <Badge variant={getOutcomeVariant(latestCall.outcome)}>
                    {latestCall.outcome.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Load ID:</span>
                    <span className="font-mono">{latestCall.loadId}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Time:</span>
                    <span>{format(new Date(latestCall.createdAt), 'HH:mm:ss')}</span>
                  </div>
                  {latestCall.duration && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duration:</span>
                      <span>{latestCall.duration}s</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Call History */}
            {callLogs.length > 1 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Call History</span>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-2 pr-4">
                      {callLogs.slice(1).map((call) => (
                        <div key={call.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(new Date(call.createdAt), 'HH:mm')}
                            </span>
                          </div>
                          <Badge variant={getOutcomeVariant(call.outcome)} className="text-xs">
                            {call.outcome}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

