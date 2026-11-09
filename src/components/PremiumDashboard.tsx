import React, { useState, useEffect } from 'react';
import { safeCapture } from '../lib/posthog';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Calendar, ChevronDown, TrendingUp, ShoppingCart, Eye, DollarSign, Globe, Users, Loader2, Link } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const chartData = [
  { time: '08:00', views: 1200, carts: 50, purchases: 5 },
  { time: '10:00', views: 2100, carts: 80, purchases: 25 },
  { time: '12:00', views: 1800, carts: 60, purchases: 15 },
  { time: '14:00', views: 2900, carts: 90, purchases: 35 },
  { time: '16:00', views: 4200, carts: 120, purchases: 45 },
  { time: '18:00', views: 5100, carts: 180, purchases: 60 },
  { time: '20:00', views: 6300, carts: 250, purchases: 90 },
];

const topProducts = [
  { id: 1, name: "Asus Zenbook S 14", views: 4200, purchases: 142, image: "https://via.placeholder.com/40" },
  { id: 2, name: "HP ProBook 440 G10", views: 2890, purchases: 115, image: "https://via.placeholder.com/40" },
  { id: 3, name: "La Roche-Posay Cicaplast", views: 5600, purchases: 320, image: "https://via.placeholder.com/40" },
  { id: 4, name: "Audio-Technica AT2020", views: 2100, purchases: 89, image: "https://via.placeholder.com/40" },
  { id: 5, name: "Multi-Collagen Peptide", views: 3100, purchases: 275, image: "https://via.placeholder.com/40" },
];

const countries = [
  { name: 'Georgia', code: 'GE', users: 18450, percentage: 65, flag: '🇬🇪' },
  { name: 'United States', code: 'US', users: 4250, percentage: 15, flag: '🇺🇸' },
  { name: 'Germany', code: 'DE', users: 2830, percentage: 10, flag: '🇩🇪' },
  { name: 'United Kingdom', code: 'GB', users: 1700, percentage: 6, flag: '🇬🇧' },
  { name: 'Ukraine', code: 'UA', users: 1130, percentage: 4, flag: '🇺🇦' },
];

export default function PremiumDashboard() {
  const [dateFilter, setDateFilter] = useState('last7d');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { adminSecretSlug } = useStore();

  useEffect(() => {
    safeCapture('$pageview');
    
    setLoading(true);
    console.log('Sending X-Admin-Slug:', adminSecretSlug);
    fetch(`/api/admin/dashboard-stats?dateRange=${dateFilter}&adminSlug=${encodeURIComponent(adminSecretSlug)}`, {
      headers: { 'X-Admin-Slug': adminSecretSlug }
    })
      .then(async r => {
        if (!r.ok) {
           const text = await r.text();
           console.error('API Error Response:', text);
           throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then(d => {
        if (d.success) setStats(d.stats);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard stats:', err);
      })
      .finally(() => setLoading(false));
  }, [dateFilter, adminSecretSlug]);

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: 'last7d', label: 'Last 7 Days' },
    { id: 'last30d', label: 'Last 30 Days' },
    { id: 'last60d', label: 'Last 60 Days' },
    { id: 'last90d', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] border border-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              <Calendar className="w-4 h-4 text-blue-400"/>
              {filterOptions.find(o => o.id === dateFilter)?.label}
              <ChevronDown className="w-4 h-4 ml-2 text-slate-400"/>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 max-h-[300px] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => { setDateFilter(option.id); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-[#1a1f2e] transition-colors text-white"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Revenue', value: loading ? <Loader2 className="animate-spin w-6 h-6"/> : `$${stats?.total_revenue?.toLocaleString() || '0.00'}`, trend: '+12.5%', icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Total Visitors', value: '35,900', trend: '+18.2%', icon: Users, color: 'text-purple-400' },
            { label: 'Add to Cart', value: '3,730', trend: '+14.8%', icon: ShoppingCart, color: 'text-pink-400' },
            { label: 'Purchases', value: loading ? <Loader2 className="animate-spin w-6 h-6"/> : stats?.total_sales || 0, trend: '+8.4%', icon: DollarSign, color: 'text-emerald-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111621] border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white mb-4">{stat.value}</h3>
              </div>
              <div className="flex justify-between items-center">
                <div className="px-3 py-1 rounded-lg bg-[#064e3b] text-[#10b981] text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {stat.trend} <span className="text-slate-400 font-normal">vs last period</span>
                </div>
                <div className={`p-3 rounded-2xl bg-[#1a2030] ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Chart */}
        <div className="bg-[#111621] border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-xl font-semibold text-white mb-6">Views, Carts & Purchases</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="time" stroke="#475569" axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}/>
                <Bar dataKey="views" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Page Views" barSize={30}/>
                <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="Purchases" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Trending Products */}
          <div className="bg-[#111621] border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400"/> Top Trending Products
            </h3>
            <div className="space-y-6">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg bg-slate-800" />
                    <span className="font-medium text-white">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Views: <span className="text-white">{product.views.toLocaleString()}</span></div>
                    <div className="text-sm font-bold text-[#10b981]">Purchases: {product.purchases}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geo & Traffic Sources */}
          <div className="space-y-8">
            <div className="bg-[#111621] border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400"/> Sessions by Country
              </h3>
              <div className="space-y-5">
                {countries.map((country) => (
                  <div key={country.code}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white flex items-center gap-2 font-medium">{country.flag} {country.name}</span>
                      <span className="text-slate-400">{country.users.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-[#3b82f6] h-2 rounded-full" style={{ width: `${country.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111621] border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Link className="w-5 h-5 text-pink-400"/> Traffic Sources
              </h3>
              <div className="space-y-5">
                {[
                  { name: 'Google', percentage: 45, color: 'bg-[#3b82f6]' },
                  { name: 'Facebook', percentage: 30, color: 'bg-[#a855f7]' },
                  { name: 'Instagram', percentage: 15, color: 'bg-[#ec4899]' },
                  { name: 'Direct', percentage: 10, color: 'bg-[#94a3b8]' },
                ].map((source) => (
                  <div key={source.name}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white font-medium">{source.name}</span>
                      <span className="text-slate-400">{source.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className={`${source.color} h-2 rounded-full`} style={{ width: `${source.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
