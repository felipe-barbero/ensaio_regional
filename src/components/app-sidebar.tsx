import { Coffee, LayoutDashboard, UtensilsCrossed } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Ensaio } from '@/data/ensaio'
import { formatData } from '@/lib/format'

export function ensaioNavItems(slug: string) {
  return [
    { title: 'Resumo', short: 'Resumo', to: `/e/${slug}`, icon: LayoutDashboard },
    { title: 'Café da Manhã', short: 'Café', to: `/e/${slug}/cafe`, icon: Coffee },
    { title: 'Almoço', short: 'Almoço', to: `/e/${slug}/almoco`, icon: UtensilsCrossed },
  ]
}

export function AppSidebar({ ensaio }: { ensaio: Ensaio }) {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const navItems = ensaioNavItems(ensaio.slug)

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold tracking-tight">
            {ensaio.nome}
          </span>
          <span className="text-xs text-muted-foreground">
            {ensaio.regiao.nome} · {formatData(ensaio.data)}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={location.pathname === item.to}
                  >
                    <Link
                      to={item.to}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false)
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
