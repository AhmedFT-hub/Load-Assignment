'use client'

import { useEffect, useState } from 'react'

interface AlertCardProps {
  show: boolean
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  onClose?: () => void
  autoClose?: number // milliseconds
}

export default function AlertCard({
  show,
  title,
  message,
  type = 'info',
  onClose,
  autoClose,
}: AlertCardProps) {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
    
    if (show && autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoClose)
      
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, onClose])

  if (!isVisible) return null

  const typeStyles = {
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    success: 'bg-green-50 border-green-500 text-green-900',
    warning: 'bg-orange-50 border-orange-500 text-orange-900',
    error: 'bg-red-50 border-red-500 text-red-900',
  }

  const iconStyles = {
    info: '📞',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${typeStyles[type]} border-l-4 rounded-lg shadow-xl p-4 max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{iconStyles[type]}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-sm opacity-90">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={() => {
                setIsVisible(false)
                onClose()
              }}
              className="text-xl opacity-50 hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

