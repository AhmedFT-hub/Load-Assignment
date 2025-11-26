'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, PackageSearch, Truck, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Header() {
  const pathname = usePathname()

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-center px-4 md:px-8">
        <nav className="flex items-center space-x-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

