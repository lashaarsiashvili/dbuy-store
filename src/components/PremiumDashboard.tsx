import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Calendar, ChevronDown, TrendingUp, ShoppingCart, Activity, DollarSign, Loader2 } from 'lucide-react';

export default function PremiumDashboard() {
  const [dateFilter, setDateFilter] = useState('last7d');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [realStats, setRealStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: '1d_ago', label: 'Yesterday' },
    { id: '2d_ago', label: '2 Days Ago' },
    { id: '7d_ago', label: '7 Days Ago' },
    { id: 'last7d', label: 'Last 7 Days' },
    { id: 'last30d', label: 'Last 30 Days' },
    { id: 'last90d', label: 'Last 90 Days' },
  ];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/dashboard-stats?dateRange=${dateFilter}`, {
          headers: {
            'x-admin-slug': 'lasha-admin-x98'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setRealStats(data.stats);
          
          // გრაფიკის თარიღების გალამაზება (მაგ: "2026-11-09" -> "Nov 09")
          const formattedChartData = (data.chartData || []).map(item => {
            const d = new Date(item.time);
            return {
              ...item,
              time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              carts: item.carts || 0,
              purchases: item.purchases || 0
            };
          });
          setChartData(formattedChartData);
        } else {
          setError(data.error || 'Failed to load data');
        }
      } catch (err) {
        setError('Connection error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [dateFilter]);

  const kpiCards = [
    { 
      label: 'Total Revenue', 
      value: realStats ? `$${(realStats.total_revenue || 0).toLocaleString()}` : '$0', 
      trend: 'Paid', icon: DollarSign, color: 'text-emerald-400' 
    },
    { 
      label: 'Total Orders (Paid)', 
      value: realStats ? (realStats.total_sales || 0) : '0', 
      trend: 'Completed', icon: ShoppingCart, color: 'text-blue-400' 
    },
    { 
      label: 'Initiated Checkouts', 
      value: realStats ? (realStats.total_initiated_checkouts || 0) : '0', 
      trend: realStats ? `${realStats.total_abandoned || 0} abandoned` : '0 abandoned', icon: Activity, color: 'text-amber-400' 
    },
    { 
      label: 'Conversion Rate', 
      value: realStats ? `${realStats.conversion_rate || 0}%` : '0%', 
      trend: 'Order / Checkout', icon: TrendingUp, color: 'text-purple-400' 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Overview</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time transactional data from Cloudflare D1</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium transition-all"
            >
              <Calendar className="w-4 h-4 text-blue-400"/>
              {filterOptions.find(o => o.id === dateFilter)?.label}
              <ChevronDown className="w-4 h-4 ml-2 text-slate-400"/>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 max-h-[300px] overflow-y-auto bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => { setDateFilter(option.id); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors first:border-t-0 border-t border-white/5"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
            Error loading data: {error}
          </div>
        )}

        {/* Dynamic KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-2xl relative overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-slate-400">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Real Main Chart */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-2xl relative">
          {isLoading && (
             <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
          )}
          <h3 className="text-lg font-semibold text-white mb-6">Checkout & Sales Dynamics</h3>
          
          {chartData.length === 0 && !isLoading ? (
            <div className="h-[350px] w-full flex items-center justify-center text-slate-500">
              No data available for the selected period.
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCarts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#e2e8f0' }}/>
                  <Bar dataKey="carts" name="Initiated Checkouts" fill="url(#colorCarts)" radius={[4, 4, 0, 0]} maxBarSize={40}/>
                  <Line type="monotone" dataKey="purchases" name="Completed Purchases" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
