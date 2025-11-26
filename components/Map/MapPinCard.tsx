'use client'

import { Marker } from 'react-map-gl'
import { useEffect, useState } from 'react'

interface MapPinCardProps {
  position: { lat: number; lng: number }
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  show: boolean
  autoClose?: number
  onClose?: () => void
  actions?: Array<{ label: string; action: string }>
  onAction?: (action: string) => void
}

export default function MapPinCard({
  position,
  title,
  message,
  type = 'info',
  show,
  autoClose = 8000,
  onClose,
  actions,
  onAction,
}: MapPinCardProps) {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
    
    // Don't auto-close if there are actions (user needs to interact)
    if (show && autoClose && (!actions || actions.length === 0)) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoClose)
      
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, onClose, actions])

  if (!isVisible) return null

  const typeStyles = {
    info: {
      bg: 'bg-blue-600',
      border: 'border-blue-700',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      icon: '📞'
    },
    success: {
      bg: 'bg-green-600',
      border: 'border-green-700',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      icon: '✅'
    },
    warning: {
      bg: 'bg-orange-600',
      border: 'border-orange-700',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      icon: '⚠️'
    },
    error: {
      bg: 'bg-red-600',
      border: 'border-red-700',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      icon: '❌'
    },
  }

  const style = typeStyles[type]

  return (
    <Marker 
      longitude={position.lng} 
      latitude={position.lat}
      anchor="bottom"
    >
      <div className="flex flex-col items-center animate-bounce-subtle">
        {/* Card */}
        <div className={`${style.cardBg} rounded-lg shadow-2xl border-2 ${style.border} p-3 mb-2 max-w-xs`}>
          <div className="flex items-start gap-2">
            <div className="text-xl">{style.icon}</div>
            <div className="flex-1">
              <h3 className={`font-bold text-sm ${style.text} mb-0.5`}>{title}</h3>
              <p className="text-xs text-gray-700 mb-2">{message}</p>
              {actions && actions.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onAction?.(action.action)
                        setIsVisible(false)
                        onClose?.()
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                        action.action === 'detour' || action.action === 'accept-load'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : action.action === 'continue'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {onClose && (
              <button
                onClick={() => {
                  setIsVisible(false)
                  onClose()
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Pin pointing to location */}
        <div className="flex flex-col items-center">
          <div className={`w-1 h-8 ${style.bg}`}></div>
          <div className={`w-4 h-4 ${style.bg} rounded-full border-2 border-white shadow-lg`}></div>
        </div>
      </div>
    </Marker>
  )
}

