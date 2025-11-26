'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MapPin, PackageSearch, Truck, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const headerRef = useRef<HTMLElement>(null)

  const navigation = [
    {
      name: 'Simulation',
      href: '/',
      icon: Truck,
      description: 'Real-time journey tracking'
    },
    {
      name: 'Journeys',
      href: '/journeys',
      icon: MapPin,
      description: 'Manage routes'
    },
    {
      name: 'Loads',
      href: '/loads',
      icon: PackageSearch,
      description: 'Available cargo'
    },
    {
      name: 'Zones',
      href: '/zones',
      icon: Layers,
      description: 'Manage risk zones'
    },
  ]

  // Ensure header is always on top
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.style.zIndex = '9999'
      headerRef.current.style.pointerEvents = 'auto'
    }
  }, [])

  const handleClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    console.log('Navigating to:', href)
    
    // Use window.location for reliable navigation
    if (href === pathname) {
      return // Already on this page
    }
    
    // Force navigation
    window.location.href = href
  }

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-[9999] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ 
        position: 'sticky', 
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="container flex h-16 items-center justify-center px-4 md:px-8" 
        style={{ 
          position: 'relative', 
          zIndex: 10000,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <nav 
          className="flex items-center space-x-1" 
          style={{ 
            position: 'relative', 
            zIndex: 10001,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <button
                key={item.href}
                type="button"
                onClick={(e) => handleClick(e, item.href)}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                }}
                className={cn(
                  "group inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                style={{ 
                  position: 'relative', 
                  zIndex: 10002,
                  pointerEvents: 'auto'
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

