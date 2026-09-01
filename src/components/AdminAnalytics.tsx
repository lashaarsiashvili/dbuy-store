import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Globe, 
  Users, 
  Smartphone, 
  Monitor, 
  Tablet, 
  TrendingUp, 
  Clock, 
  RotateCcw, 
  Download, 
  Compass, 
  Activity, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const { analyticsData, clearAnalytics, addToast, language } = useStore();
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');
  const isKa = language === 'ka';

  const {
    totalVisitorsToday,
    uniqueVisitorsToday,
    growthPercent,
    totalAllTime,
    countryStatsToday,
    countryStatsAllTime,
    deviceCounts,
    dailyStats,
    hourlyCounts,
    recentLogs,
  } = analyticsData;

  const currentCountryStats = timeFilter === 'today' ? countryStatsToday : countryStatsAllTime;
  const topCountry = currentCountryStats[0] || {
    country: 'Georgia',
    countryCode: 'GE',
    flag: '🇬🇪',
    visitors: totalVisitorsToday,
    percentage: 100,
  };

  const mobileCount = Number(deviceCounts['Mobile'] || 0);
  const desktopCount = Number(deviceCounts['Desktop'] || 0);
  const tabletCount = Number(deviceCounts['Tablet'] || 0);
  const totalDeviceVisits = mobileCount + desktopCount + tabletCount || 1;
  const mobilePercent = Math.round((mobileCount / totalDeviceVisits) * 100);
  const desktopPercent = Math.round((desktopCount / totalDeviceVisits) * 100);
  const tabletPercent = Math.round((tabletCount / totalDeviceVisits) * 100);

  // Maximum count in hourly distribution to scale bars
  const maxHourlyCount = Math.max(...hourlyCounts, 1);
  const maxDailyCount = Math.max(...dailyStats.map(d => d.visitors), 1);

  // Export analytics to CSV
  const handleExportCSV = () => {
    try {
      const headers = 'ID,Date,Time,Country,CountryCode,City,Device,Browser,Page\n';
      const rows = recentLogs
        .map(l => {
          const dateObj = new Date(l.timestamp);
          const time = dateObj.toLocaleTimeString();
          return `"${l.id}","${l.dateString}","${time}","${l.country}","${l.countryCode}","${l.city || ''}","${l.device}","${l.browser}","${l.page}"`;
        })
        .join('\n');
      
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `store_visitors_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(isKa ? 'ტრაფიკის რეპორტი ექსპორტირებულია CSV ფაილში!' : 'Traffic report exported to CSV successfully!', 'success');
    } catch {
      addToast(isKa ? 'CSV ექსპორტი ვერ მოხერხდა' : 'Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner & Action Controls */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {isKa ? 'ვიზიტორების და ქვეყნების ანალიტიკა' : 'Traffic & Country Analytics'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ● {isKa ? 'პირდაპირი მონიტორინგი' : 'Live Tracking'}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            {isKa 
              ? 'თვალყური ადევნეთ დღის განმავლობაში შემოსულ ვიზიტორებს, უნიკალურ ნახვებს და ქვეყნების გეოგრაფიულ განაწილებას რეალურ დროში.' 
              : 'Track real-time store visitors, unique views, and geographic distribution across countries.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Timeframe Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeFilter === 'today'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKa ? 'დღეს' : 'Today'}
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKa ? 'სრული' : 'All Time'}
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKa ? 'CSV ექსპორტი' : 'Export CSV'}</span>
          </button>

          {/* Reset button */}
          <button
            onClick={() => {
              if (window.confirm(isKa ? 'დარწმუნებული ხართ, რომ გსურთ ვიზიტორების ისტორიის გასუფთავება?' : 'Are you sure you want to clear the visitor analytics log?')) {
                clearAnalytics();
              }
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors cursor-pointer"
            title={isKa ? 'გასუფთავება' : 'Clear Analytics'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Visitors */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {timeFilter === 'today' 
                ? (isKa ? 'დღევანდელი ვიზიტები' : "Today's Visitors") 
                : (isKa ? 'სრული ვიზიტები' : 'All-Time Visitors')}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-black text-slate-900">
              {timeFilter === 'today' ? totalVisitorsToday : totalAllTime}
            </h3>
            {timeFilter === 'today' && growthPercent !== 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center ${
                growthPercent > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              ~{timeFilter === 'today' ? uniqueVisitorsToday : Math.round(totalAllTime * 0.75)}{' '}
              {isKa ? 'უნიკალური ვიზიტორი' : 'unique visitors'}
            </span>
          </p>
        </div>

        {/* Card 2: Top Country */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isKa ? 'ლიდერი ქვეყანა' : 'Top Country'}
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{topCountry.flag}</span>
            <h3 className="text-xl font-black text-slate-900 truncate">
              {topCountry.country}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {topCountry.visitors} {isKa ? 'ვიზიტორი' : 'visitors'} ({topCountry.percentage}% {isKa ? 'წილი' : 'share'})
          </p>
        </div>

        {/* Card 3: Devices Distribution */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isKa ? 'მოწყობილობები' : 'Devices'}
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
              <span>📱 Mobile:</span>
              <span className="text-blue-600 font-extrabold">{mobilePercent}%</span>
            </span>
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
              <span>💻 Desktop:</span>
              <span className="text-slate-600 font-extrabold">{desktopPercent}%</span>
            </span>
          </div>
          {/* Visual Device Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div style={{ width: `${mobilePercent}%` }} className="bg-blue-600 h-full" title={`Mobile: ${mobilePercent}%`} />
            <div style={{ width: `${desktopPercent}%` }} className="bg-slate-400 h-full" title={`Desktop: ${desktopPercent}%`} />
            <div style={{ width: `${tabletPercent}%` }} className="bg-amber-400 h-full" title={`Tablet: ${tabletPercent}%`} />
          </div>
        </div>

        {/* Card 4: Storefront Activity */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isKa ? 'სულ ქვეყნები' : 'Total Countries'}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-black text-slate-900">
              {currentCountryStats.length}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {isKa ? 'გლობალური ლოკაცია' : 'Global Locations'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isKa ? 'საქართველო, აშშ, გერმანია და სხვა' : 'Georgia, US, Germany & more'}
          </p>
        </div>

      </div>

      {/* Main Grid: Countries Breakdown (Left) + Hourly / 7-Day Dynamics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Countries Breakdown List (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>
                  {isKa 
                    ? `ქვეყნების რეიტინგი (${timeFilter === 'today' ? 'დღეს' : 'სრული'})` 
                    : `Country Breakdown (${timeFilter === 'today' ? 'Today' : 'All-Time'})`}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKa ? 'საიდან შემოდიან თქვენი მაღაზიის მყიდველები' : 'Where your storefront shoppers originate from'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {currentCountryStats.length} {isKa ? 'ქვეყანა' : 'Countries'}
            </span>
          </div>

          {currentCountryStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {isKa ? 'ჯერჯერობით ვიზიტები არ დაფიქსირებულა.' : 'No visitor records recorded yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {currentCountryStats.map((stat, idx) => (
                <div key={stat.countryCode} className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="w-5 text-center font-bold text-slate-400 text-[11px]">
                        #{idx + 1}
                      </span>
                      <span className="text-xl shrink-0">{stat.flag}</span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{stat.country}</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">({stat.countryCode})</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">{stat.visitors}</span>
                      <span className="text-xs text-slate-500 ml-1">{isKa ? 'ვიზიტი' : 'visits'}</span>
                      <span className="text-xs font-bold text-blue-600 ml-2">({stat.percentage}%)</span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, stat.percentage)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 
                          ? 'bg-blue-600' 
                          : idx === 1 
                          ? 'bg-indigo-500' 
                          : idx === 2 
                          ? 'bg-emerald-500' 
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: 24-Hour & 7-Day Charts (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Today's 24-Hour Activity Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{isKa ? 'დღევანდელი საათობრივი აქტივობა' : "Today's Hourly Activity"}</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">00:00 - 23:00</span>
            </div>

            {/* 24-Hour Bar Graph */}
            <div className="h-32 flex items-end justify-between gap-1 pt-4 border-b border-slate-100 pb-2">
              {hourlyCounts.map((count, hour) => {
                const heightPercent = Math.round((count / maxHourlyCount) * 100);
                const isCurrentHour = new Date().getHours() === hour;
                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:flex px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded-md font-bold whitespace-nowrap z-20 shadow-md">
                      {hour}:00 — {count} {isKa ? 'ვიზიტი' : 'visits'}
                    </div>
                    <div
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrentHour
                          ? 'bg-blue-600 ring-2 ring-blue-400/40'
                          : count > 0
                          ? 'bg-blue-400/70 group-hover:bg-blue-600'
                          : 'bg-slate-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
              <span>00:00 {isKa ? '(ღამე)' : '(Night)'}</span>
              <span>12:00 {isKa ? '(შუადღე)' : '(Noon)'}</span>
              <span>18:00 {isKa ? '(საღამო)' : '(Evening)'}</span>
              <span>23:00</span>
            </div>
          </div>

          {/* 7-Day History Trend Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{isKa ? 'ბოლო 7 დღის დინამიკა' : '7-Day Trend Dynamics'}</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">{isKa ? 'ყოველდღიური ტრაფიკი' : 'Daily Traffic'}</span>
            </div>

            {/* 7 Days Bars */}
            <div className="space-y-2.5 pt-1">
              {dailyStats.map((d, idx) => {
                const widthPercent = Math.round((d.visitors / maxDailyCount) * 100);
                const isToday = idx === dailyStats.length - 1;
                return (
                  <div key={d.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isToday ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                        {d.label} {isToday && (isKa ? ' (დღეს)' : ' (Today)')}
                      </span>
                      <span className="font-bold text-slate-900">
                        {d.visitors} <span className="text-slate-400 font-normal">{isKa ? 'ვიზიტორი' : 'visitors'}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(4, widthPercent)}%` }}
                        className={`h-full rounded-full ${isToday ? 'bg-blue-600' : 'bg-slate-400'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Live Visitor Activity Stream Log */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>{isKa ? 'ბოლო ვიზიტების რეალური ჟურნალი' : 'Live Visitor Stream Log'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKa ? 'უახლესი შემოსული მომხმარებლების სია, ლოკაცია და მოწყობილობა' : 'Recent visitors, geographic location and device details'}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {recentLogs.length} {isKa ? 'ჩანაწერი' : 'Records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">{isKa ? 'დრო' : 'Time'}</th>
                <th className="p-4">{isKa ? 'ქვეყანა / ლოკაცია' : 'Country / Location'}</th>
                <th className="p-4">{isKa ? 'ქალაქი' : 'City'}</th>
                <th className="p-4">{isKa ? 'მოწყობილობა' : 'Device'}</th>
                <th className="p-4">{isKa ? 'ბრაუზერი' : 'Browser'}</th>
                <th className="p-4">{isKa ? 'მონახულებული გვერდი' : 'Page Visited'}</th>
                <th className="p-4">{isKa ? 'IP (დაცული)' : 'IP (Masked)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {isKa ? 'ვიზიტების ჟურნალი ცარიელია.' : 'Visitor log is currently empty.'}
                  </td>
                </tr>
              ) : (
                recentLogs.slice(0, 25).map((log) => {
                  const logDate = new Date(log.timestamp);
                  const isToday = log.dateString === new Date().toISOString().split('T')[0];
                  const formattedTime = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-600 font-mono text-[11px]">
                        <span className="font-bold text-slate-900">{formattedTime}</span>
                        {!isToday && <span className="text-slate-400 ml-1.5">({log.dateString})</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{log.flag}</span>
                          <span className="font-bold text-slate-900">{log.country}</span>
                          <span className="text-[10px] text-slate-400 font-mono">[{log.countryCode}]</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {log.city || 'Tbilisi'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          log.device === 'Mobile' 
                            ? 'bg-blue-50 text-blue-700' 
                            : log.device === 'Tablet'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.device === 'Mobile' ? (
                            <Smartphone className="w-3 h-3" />
                          ) : log.device === 'Tablet' ? (
                            <Tablet className="w-3 h-3" />
                          ) : (
                            <Monitor className="w-3 h-3" />
                          )}
                          <span>{log.device}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {log.browser}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {log.page}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {log.ipMasked}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
