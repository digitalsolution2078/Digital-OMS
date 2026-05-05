import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  LogOut,
  Briefcase,
  Settings,
  CreditCard,
  Menu,
  Activity,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Orders', icon: ShoppingCart, href: '/orders' },
    { label: 'Customers', icon: Users, href: '/customers' },
    ...(isAdmin ? [{ label: 'Services', icon: Briefcase, href: '/services' }] : []),
    ...(isAdmin ? [{ label: 'Payments', icon: CreditCard, href: '/payments' }] : []),
    // ...(isAdmin ? [{ label: 'Receipts', icon: FileText, href: '/receipts' }] : []),
    // ...(isAdmin ? [{ label: 'Activity Logs', icon: Activity, href: '/logs' }] : []),
    // ...(isAdmin ? [{ label: 'Settings', icon: Settings, href: '/settings' }] : []),
  ];

  const getPageTitle = () => {
    const activeItem = navItems.find(item => item.href === location.pathname);
    return activeItem ? activeItem.label : 'Overview';
  };

  return (
    <div className="flex min-h-screen w-full font-sans text-slate-800 bg-[#f4f2ff] relative">
      {/* Frosted Glass Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#6A0DAD] blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-[#FF6A00] blur-[100px]"></div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#1e1b4b] text-white shrink-0 sm:flex shadow-xl">
        <div className="p-6 border-b border-indigo-900/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#6A0DAD] to-[#FF6A00] flex items-center justify-center font-bold text-xl shadow-inner">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">Digital OMS</h1>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest mt-1">Office Management</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-4 px-3 flex flex-col">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/');
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white border border-white/5 shadow-sm' 
                      : 'text-indigo-100 hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5 opacity-70" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-indigo-900/50 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 bg-black/20 hover:bg-black/30 transition-colors rounded-lg text-left">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm hover:ring-2 hover:ring-indigo-400">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold truncate text-white">{profile?.full_name}</p>
                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider">{profile?.role}</p>
                </div>
                <div className="text-xs opacity-50 px-1">⚙️</div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-medium cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex flex-col flex-1 relative z-10 sm:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-white/60 backdrop-blur-md border-b border-white/20 px-4 sm:px-8 shadow-sm">
          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden bg-white/50 border-white/40">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-[200px]">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline">Home</span> 
            <span className="text-[10px] hidden sm:inline">/</span> 
            <span className="font-medium text-[#6A0DAD]">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/orders')} className="bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-md hidden sm:flex">
              + Create New Order
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
