"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AdminNavItem {
  href: string
  label: string
}

interface AdminNavTabsProps {
  items: AdminNavItem[]
}

function AdminNavTabs({ items }: AdminNavTabsProps) {
  const pathname = usePathname()

  const active =
    items.find(
      (item) => pathname === item.href || (item.href !== items[0]?.href && pathname.startsWith(item.href))
    )?.href ?? items[0]?.href ?? ""

  return (
    <Tabs value={active} className="w-full">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border bg-card p-1">
        {items.map((item) => (
          <TabsTrigger
            key={item.href}
            value={item.href}
            asChild
            className={cn("h-8 px-3")}
          >
            <Link href={item.href}>{item.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export type { AdminNavItem }
export { AdminNavTabs }
