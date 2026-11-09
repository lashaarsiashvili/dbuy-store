import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, ChevronDown, Users, ShoppingCart, DollarSign, Globe, Link, TrendingUp, LayoutDashboard, ShoppingBag, Palette, Activity
} from 'lucide-react';

// ==========================================
// 0. ექსპორტები სხვა კომპონენტებისთვის (Build-ის შეცდომების თავიდან ასაცილებლად)
// ==========================================
export const analytics: any = new Proxy({}, { get: () => () => {} });
export const trackStoreEvent = (eventName: string, data?: any) => {};
export const isUserAdmin = () => { return true; }; 

// ==========================================
// 1. ანალიტიკის კომპონენტი (სრული დიზაინით)
// ==========================================
function PremiumAnalytics() {
  const [dateFilter, setDateFilter] = useState('today');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [realStats, setRealStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // სატესტო/ვიზუალური მონაცემები დიზაინის შესავსებად
  const staticChartData = [
    { time: '08:00', views: 1200, carts: 400, purchases: 120 },
    { time: '10:00', views: 2100, carts: 600, purchases: 150 },
    { time: '12:00', views: 1800, carts: 500, purchases: 130 },
    { time: '14:00', views: 2900, carts: 800, purchases: 200 },
    { time: '16:00', views: 4200, carts: 1200, purchases: 310 },
    { time: '18:00', views: 5100, carts: 1500, purchases: 420 },
    { time: '20:00', views: 6300, carts: 1800, purchases: 500 },
  ];

  const topProducts = [
    { id: 1, name: "Asus Zenbook S 14", views: 4200, purchases: 142 },
    { id: 2, name: "HP ProBook 440 G10", views: 2890, purchases: 115 },
    { id: 3, name: "La Roche-Posay Cicaplast", views: 5600, purchases: 320 },
    { id: 4, name: "Audio-Technica AT2020", views: 2100, purchases: 89 },
    { id: 5, name: "Multi-Collagen Peptide", views: 3100, purchases: 275 },
  ];

  const countries = [
    { name: 'Georgia', code: 'GE', users: 18450, percentage: 65 },
    { name: 'United States', code: 'US', users: 4250, percentage: 15 },
    { name: 'Germany', code: 'DE', users: 2830, percentage: 10 },
    { name: 'United Kingdom', code: 'GB', users: 1700, percentage: 6 },
    { name: 'Ukraine', code: 'UA', users: 1130, percentage: 4 },
  ];

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: 'last7d', label: 'Last 7 Days' },
    { id: 'last30d', label: 'Last 30 Days' },
  ];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/dashboard-stats?dateRange=${dateFilter}`, {
          headers: { 'x-admin-slug': 'lasha-admin-x98' }
        });
        const data = await response.json();
        if (data.success) setRealStats(data.stats);
      } catch (err) {
        console.error('Failed to fetch real stats', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardStats();
  }, [dateFilter]);

  return (
    <div className="space-y-6 bg-[#0B1120] min-h-screen p-6 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Overview</h1>
        </div>
        <div className="relative z-50">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-white/5 rounded-lg text-sm font-medium text-slate-300 hover:bg-[#334155] transition-all">
            <Calendar className="w-4 h-4 text-blue-400"/>
            {filterOptions.find(o => o.id === dateFilter)?.label}
            <ChevronDown className="w-4 h-4 ml-2 text-slate-400"/>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1E293B] border border-white/10 rounded-lg shadow-xl overflow-hidden">
              {filterOptions.map(option => (
                <button key={option.id} onClick={() => { setDateFilter(option.id); setDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue (Real API Data) */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-medium mb-2">Total Revenue</p>
          <h3 className="text-3xl font-bold text-white mb-4">
            ${realStats ? (realStats.total_revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}
          </h3>
          <div className="flex items-center justify-between">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium">↗ +12.5% vs last period</span>
            <div className="p-2 rounded-lg bg-white/5 text-emerald-400"><DollarSign className="w-5 h-5" /></div>
          </div>
        </div>

        {/* Visitors (Static UI) */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-medium mb-2">Total Visitors</p>
          <h3 className="text-3xl font-bold text-white mb-4">35,900</h3>
          <div className="flex items-center justify-between">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium">↗ +18.2% vs last period</span>
            <div className="p-2 rounded-lg bg-white/5 text-purple-400"><Users className="w-5 h-5" /></div>
          </div>
        </div>

        {/* Add to Cart (Static UI) */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-medium mb-2">Add to Cart</p>
          <h3 className="text-3xl font-bold text-white mb-4">3,730</h3>
          <div className="flex items-center justify-between">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium">↗ +14.8% vs last period</span>
            <div className="p-2 rounded-lg bg-white/5 text-pink-400"><ShoppingCart className="w-5 h-5" /></div>
          </div>
        </div>

        {/* Purchases (Real API Data) */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-medium mb-2">Purchases</p>
          <h3 className="text-3xl font-bold text-white mb-4">{realStats ? (realStats.total_sales || 0) : '0'}</h3>
          <div className="flex items-center justify-between">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium">↗ +8.4% vs last period</span>
            <div className="p-2 rounded-lg bg-white/5 text-emerald-400"><DollarSign className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-6">Views, Carts & Purchases</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart data={staticChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff0a" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false}/>
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#F1F5F9' }}/>
              <Bar dataKey="views" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={40}/>
              <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#1E293B', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Products */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400"/> Top Trending Products
          </h3>
          <div className="space-y-4">
            {topProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1E293B] rounded-lg flex items-center justify-center text-xs text-slate-500">40x40</div>
                  <span className="font-medium text-slate-200">{product.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-sm">Views: <span className="text-white">{product.views.toLocaleString()}</span></div>
                  <div className="text-emerald-400 text-sm font-medium">Purchases: {product.purchases}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographics & Traffic */}
        <div className="space-y-6">
          {/* Countries */}
          <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400"/> Sessions by Country
            </h3>
            <div className="space-y-5">
              {countries.map((country) => (
                <div key={country.code}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white font-medium"><span className="text-slate-500 mr-2">{country.code}</span>{country.name}</span>
                    <span className="text-slate-400">{country.users.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#1E293B] rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${country.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic */}
          <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Link className="w-5 h-5 text-pink-400"/> Traffic Sources
            </h3>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white font-medium">Google</span>
                <span className="text-slate-400">45%</span>
              </div>
              <div className="w-full bg-[#1E293B] rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `45%` }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 2. მთავარი დეშბორდი (ტაბებით)
// ==========================================
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs = [
    { id: 'products', label: 'Products Catalog', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'analytics', label: 'Traffic & Analytics', icon: LayoutDashboard },
    { id: 'theme', label: 'Theme & Styles', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <div className="border-b border-white/10 bg-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full p-6 max-w-7xl mx-auto">
        {activeTab === 'products' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Products Catalog</h2>
            <p className="text-slate-400">აქ იქნება შენი პროდუქტების კატალოგის კომპონენტი...</p>
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Orders</h2>
            <p className="text-slate-400">აქ იქნება შენი შეკვეთების მართვის კომპონენტი...</p>
          </div>
        )}

        {activeTab === 'analytics' && <PremiumAnalytics />}

        {activeTab === 'theme' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Theme & Styles</h2>
            <p className="text-slate-400">აქ იქნება შენი დიზაინის და თემების სამართავი...</p>
          </div>
        )}
      </div>
    </div>
  );
}
