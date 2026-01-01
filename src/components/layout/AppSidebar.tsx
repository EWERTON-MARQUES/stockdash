import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Box, Menu, X, TrendingUp, DollarSign, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/'
  },
  {
    icon: Package,
    label: 'Catálogo',
    path: '/catalogo'
  },
  {
    icon: TrendingUp,
    label: 'Curva ABC',
    path: '/curva-abc'
  },
  {
    icon: DollarSign,
    label: 'Financeiro',
    path: '/financeiro'
  },
  {
    icon: ShoppingCart,
    label: 'Pedidos',
    path: '/pedidos'
  },
  {
    icon: BarChart3,
    label: 'Relatórios',
    path: '/relatorios'
  },
  {
    icon: Bell,
    label: 'Alertas Telegram',
    path: '/telegram'
  },
  {
    icon: Settings,
    label: 'Configurações',
    path: '/configuracoes'
  }
];

export function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-primary">
          <Box className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-primary-foreground">StockPro</span>
          <span className="text-xs text-sidebar-muted">Gestão de Estoque</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              onClick={() => setMobileOpen(false)} 
              className={cn('sidebar-item', isActive && 'sidebar-item-active')}
            >
              <item.icon className="w-5 h-5 text-white" />
              <span className="font-medium text-primary-foreground">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-white">
            <span className="text-sm font-medium text-sidebar-foreground">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin</span>
            <span className="text-xs text-white">admin@empresa.com</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setMobileOpen(true)} 
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground lg:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-300 lg:hidden', 
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button 
          onClick={() => setMobileOpen(false)} 
          className="absolute top-4 right-4 p-1 text-sidebar-muted hover:text-sidebar-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar">
        <SidebarContent />
      </aside>
    </>
  );
}
