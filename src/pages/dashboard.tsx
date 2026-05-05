import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Users, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    customers: 0,
    completedToday: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Simulating some distinct counts for now. In a real app, complex queries or views are better.
      const [{ count: totalOrders }, { count: customers }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        totalOrders: totalOrders || 0,
        activeOrders: Math.floor((totalOrders || 0) * 0.4), // Mock for now
        customers: customers || 0,
        completedToday: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Orders</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalOrders}</span>
            <span className="text-[10px] text-slate-400">All time</span>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Orders</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.activeOrders}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Currently processing</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Customers</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.customers}</span>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Completed Today</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#FF6A00]">{stats.completedToday}</span>
            <span className="text-[10px] text-white font-bold bg-[#FF6A00] px-1.5 rounded">Today</span>
          </div>
        </div>
      </div>
      
      {/* Recent Orders Table could go here */}
      <div className="flex-1 bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white/30">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><span>📦</span> Recent Activity Overview</h2>
        </div>
        <div className="p-5">
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-white/50 rounded-md">
            <p className="text-muted-foreground">More detailed reports coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
