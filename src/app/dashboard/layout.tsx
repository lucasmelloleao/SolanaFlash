'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Zap, LayoutDashboard, LogOut, History, Play, Pause, Activity } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [botMode, setBotMode] = useState<'simulated' | 'live'>('simulated');
  const [botOnline, setBotOnline] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      });

    // Fetch system status
    fetch('/api/system/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.botMode) setBotMode(data.botMode);
        if (data.botOnline !== undefined) setBotOnline(data.botOnline);
      })
      .catch(console.error);

    // Poll system status every 15s to check if bot is online
    const interval = setInterval(() => {
      fetch('/api/system/status', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.botMode) setBotMode(data.botMode);
          if (data.botOnline !== undefined) setBotOnline(data.botOnline);
        })
        .catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

  const toggleBotMode = async () => {
    setLoadingStatus(true);
    const newMode = botMode === 'simulated' ? 'live' : 'simulated';
    try {
      const res = await fetch('/api/system/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ botMode: newMode })
      });
      if (res.ok) {
        const data = await res.json();
        setBotMode(data.botMode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500">Loading...</div>;

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/wallets', label: 'Wallets', icon: Wallet },
    { href: '/dashboard/transactions', label: 'Transactions', icon: History },
    { href: '/dashboard/flash-loan', label: 'Flash Loans', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />
            Solana Flash
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}>
                <Icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8">
          <h2 className="text-lg font-medium text-white">Dashboard</h2>
          
          {/* Bot Status Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-slate-400">Engine Status:</span>
              {botOnline ? (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs border border-emerald-400/20">
                  <Activity className="w-3 h-3 animate-pulse" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full text-xs border border-rose-400/20">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Offline
                </span>
              )}
            </div>
            
            <div className="h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Mode:</span>
              <button
                onClick={toggleBotMode}
                disabled={loadingStatus}
                className={clsx(
                  "relative inline-flex h-8 items-center rounded-full w-32 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900",
                  botMode === 'live' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600',
                  loadingStatus && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="sr-only">Toggle Bot Mode</span>
                <span
                  className={clsx(
                    "inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center",
                    botMode === 'live' ? 'translate-x-[6.5rem]' : 'translate-x-1'
                  )}
                >
                  {botMode === 'live' ? <Pause className="w-3 h-3 text-rose-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                </span>
                <span className={clsx(
                  "absolute text-xs font-bold text-white transition-opacity",
                  botMode === 'live' ? 'left-3' : 'left-9'
                )}>
                  {botMode === 'live' ? 'LIVE (DANGER)' : 'SIMULATED'}
                </span>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
