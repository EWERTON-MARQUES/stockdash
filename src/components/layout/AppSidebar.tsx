import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Box, Menu, X, TrendingUp, DollarSign, Sparkles, Shield } from 'lucide-react';
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
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/25">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground flex items-center gap-1.5">
            StockPro
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </span>
          <span className="text-xs text-muted-foreground">Gestão Avançada</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {menuItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              onClick={() => setMobileOpen(false)} 
              className={cn('sidebar-item group', isActive && 'sidebar-item-active')}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className={cn(
                "font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center border border-primary/20">
            <span className="text-sm font-semibold text-primary">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Admin</span>
            <span className="text-xs text-muted-foreground">Sistema Ativo</span>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
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
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-card/80 backdrop-blur-xl border border-border text-foreground lg:hidden shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-sidebar/95 backdrop-blur-xl flex flex-col transform transition-transform duration-300 lg:hidden border-r border-sidebar-border', 
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button 
          onClick={() => setMobileOpen(false)} 
          className="absolute top-5 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border">
        <SidebarContent />
      </aside>
    </>
  );
}
