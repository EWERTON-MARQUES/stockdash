import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Box, Menu, X, TrendingUp, DollarSign, LogOut, ChevronDown, User, Building2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  submenu?: { icon: React.ElementType; label: string; path: string }[];
}

const menuItems: MenuItem[] = [
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
    submenu: [
      { icon: Wallet, label: 'Geral', path: '/financeiro' },
      { icon: User, label: 'Carteira PF', path: '/financeiro/pf' },
      { icon: Building2, label: 'Carteira PJ', path: '/financeiro/pj' },
    ]
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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(
    location.pathname.startsWith('/financeiro')
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    } finally {
      setLoggingOut(false);
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-primary">
          <Box className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-sidebar-foreground">StockPro</span>
          <span className="text-xs text-sidebar-muted">Gestão de Estoque</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map(item => {
          // Check if this item or any submenu item is active
          const isActive = item.path 
            ? location.pathname === item.path 
            : item.submenu?.some(sub => location.pathname === sub.path);
          
          // For items with submenu
          if (item.submenu) {
            return (
              <Collapsible 
                key={item.label} 
                open={financialOpen} 
                onOpenChange={setFinancialOpen}
              >
                <CollapsibleTrigger asChild>
                  <button 
                    className={cn(
                      'sidebar-item w-full justify-between',
                      isActive && 'sidebar-item-active'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-sidebar-foreground" />
                      <span className="font-medium text-sidebar-foreground">{item.label}</span>
                    </div>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-sidebar-muted transition-transform duration-200',
                      financialOpen && 'rotate-180'
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {item.submenu.map(subItem => {
                    const subIsActive = location.pathname === subItem.path;
                    return (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          subIsActive && 'sidebar-item-active'
                        )}
                      >
                        <subItem.icon className="w-4 h-4 text-sidebar-foreground" />
                        <span className="font-medium text-sidebar-foreground">{subItem.label}</span>
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // For items without submenu
          return (
            <NavLink 
              key={item.path} 
              to={item.path!} 
              onClick={() => setMobileOpen(false)} 
              className={cn('sidebar-item', isActive && 'sidebar-item-active')}
            >
              <item.icon className="w-5 h-5 text-sidebar-foreground" />
              <span className="font-medium text-sidebar-foreground">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sidebar-accent">
            <span className="text-sm font-medium text-sidebar-foreground">A</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">Admin</span>
            <span className="text-xs text-sidebar-muted truncate">Sessão: 10 min</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full gap-2 bg-destructive/10 border-destructive/30 text-sidebar-foreground hover:bg-destructive/20 hover:text-sidebar-foreground"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Saindo...' : 'Sair do Sistema'}
        </Button>
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
