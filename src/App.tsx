/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Activity, Bell, Search, Settings, Shield, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [persistentWatchlist, setPersistentWatchlist] = useState<any[]>([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [screenerProgress, setScreenerProgress] = useState<any>(null);
  const [trackerProgress, setTrackerProgress] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error(err));

    fetch('/api/watchlist')
      .then(res => res.json())
      .then(data => {
        const stocks = Array.isArray(data) ? data : (data.stocks || []);
        setWatchlist(stocks);
      })
      .catch(err => console.error(err));

    fetch('/api/persistent-watchlist')
      .then(res => res.json())
      .then(data => {
        setPersistentWatchlist(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  }, []);

  // Poll for progress always to detect scheduled tasks
  useEffect(() => {
    const interval = setInterval(() => {
      // Screener Progress
      fetch('/api/screener-progress')
        .then(res => res.json())
        .then(data => {
          setScreenerProgress(data);
          if (data.status === 'idle' && screenerLoading) {
            setScreenerLoading(false);
            fetch('/api/watchlist')
              .then(res => res.json())
              .then(data => {
                const stocks = Array.isArray(data) ? data : (data.stocks || []);
                setWatchlist(stocks);
              })
              .catch(err => console.error(err));
          } 
          else if (data.status === 'running' && !screenerLoading) {
            setScreenerLoading(true);
          }
          if (data.status === 'error' && screenerLoading) {
            setScreenerLoading(false);
            alert('Tarayıcı sırasında hata oluştu.');
          }
        });

      // Tracker Progress
      fetch('/api/tracker-progress')
        .then(res => res.json())
        .then(data => {
          setTrackerProgress(data);
          if (data.status === 'idle' && trackerLoading) {
            setTrackerLoading(false);
            // Refresh persistent watchlist after tracker finish
            fetch('/api/persistent-watchlist')
              .then(res => res.json())
              .then(data => setPersistentWatchlist(Array.isArray(data) ? data : []));
          }
          else if (data.status === 'running' && !trackerLoading) {
            setTrackerLoading(true);
          }
          if (data.status === 'error' && trackerLoading) {
            setTrackerLoading(false);
            alert('Takipçi sırasında hata oluştu.');
          }
        });
    }, 2000);
    return () => clearInterval(interval);
  }, [screenerLoading, trackerLoading]);

  const triggerScreener = async () => {
    if (screenerLoading) return;
    
    setScreenerLoading(true);
    setScreenerProgress((prev: any) => ({ 
      ...(prev || {}), 
      current: 0, 
      total: 1, 
      symbol: 'Başlatılıyor...', 
      status: 'running' 
    }));
    try {
      await fetch('/api/trigger-screener');
    } catch (err) {
      alert('Tarama başlatılamadı.');
      setScreenerLoading(false);
    }
  };

  const triggerTracker = async () => {
    if (trackerLoading) return;
    setTrackerLoading(true);
    setTrackerProgress({ current: 0, total: 1, symbol: 'Başlatılıyor...', status: 'running' });
    try {
      await fetch('/api/trigger-tracker');
    } catch (err) {
      alert('Takip başlatılamadı.');
      setTrackerLoading(false);
    }
  };

  const screenerPercent = screenerProgress?.total > 0 ? Math.round((screenerProgress.current / screenerProgress.total) * 100) : 0;
  const trackerPercent = trackerProgress?.total > 0 ? Math.round((trackerProgress.current / trackerProgress.total) * 100) : 0;
  
  const lastScreenerTime = screenerProgress?.lastRun ? new Date(screenerProgress.lastRun).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '---';
  const lastTrackerTime = trackerProgress?.lastRun ? new Date(trackerProgress.lastRun).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '---';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">BIST Keskin Nişancı</h1>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Algorithmic Trading Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-medium">{health ? 'Sistem Aktif' : 'Bağlanıyor...'}</span>
            </div>
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Activity className="text-blue-500" /> Sistem Kontrolü
                </h2>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase">Son Taracı</p>
                    <p className="text-xs font-mono text-amber-400">{lastScreenerTime}</p>
                  </div>
                  <div className="text-right border-l border-slate-800 pl-4">
                    <p className="text-[10px] text-slate-500 uppercase">Son Takip</p>
                    <p className="text-xs font-mono text-emerald-400">{lastTrackerTime}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono border-l border-slate-800 pl-4">{health?.time ? new Date(health.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Search className="text-amber-500 w-5 h-5" />
                    <h3 className="font-medium">Gece Avcısı (Screener)</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">400+ BIST hissesini tarar ve watchlist oluşturur.</p>
                  
                  {screenerLoading ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-blue-400 animate-pulse">{screenerProgress?.symbol || 'Bekleniyor...'}</span>
                        <span className="text-slate-500">{screenerProgress?.current}/{screenerProgress?.total}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          className="bg-blue-500 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${screenerPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-slate-500 uppercase tracking-tighter">İşlem devam ediyor...</p>
                    </div>
                  ) : (
                    <button 
                      onClick={triggerScreener}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      Şimdi Tara
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell className="text-emerald-500 w-5 h-5" />
                    <h3 className="font-medium">Gündüz Keskin Nişancısı (Bot)</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Watchlist'teki hisselerde sinyal arar.</p>
                  
                  {trackerLoading ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-400 animate-pulse">{trackerProgress?.symbol || 'Bekleniyor...'}</span>
                        <span className="text-slate-500">{trackerProgress?.current}/{trackerProgress?.total}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          className="bg-emerald-500 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${trackerPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-slate-500 uppercase tracking-tighter">Hisseler kontrol ediliyor...</p>
                    </div>
                  ) : (
                    <button 
                      onClick={triggerTracker}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Botu Tetikle
                    </button>
                  )}

                  {persistentWatchlist.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase mb-2 font-semibold">Takip Edilen Sinyalli Hisseler</p>
                      <div className="flex flex-wrap gap-2">
                        {persistentWatchlist.map(stock => (
                          <div key={stock.symbol} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-mono text-emerald-400">
                            {stock.symbol}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Watchlist Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" /> İzleme Listesi (Watchlist)
                </h2>
                <span className="px-2.5 py-0.5 bg-slate-800 rounded-full text-xs font-mono text-slate-400">
                  {watchlist.length} Hisse
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Hisse Kodu</th>
                      <th className="px-6 py-4 font-medium">Son Tepe (Peak)</th>
                      <th className="px-6 py-4 font-medium">Son Dip (Dip)</th>
                      <th className="px-6 py-4 font-medium text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {watchlist.length > 0 ? watchlist.map((stock, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4 font-bold text-blue-400">{stock.symbol}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{stock.peak.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{stock.dip.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-slate-500 group-hover:text-emerald-400 transition-colors">Takip Ediliyor</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                          İzleme listesi boş. Taramayı başlatın.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Strategy Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Shield className="text-blue-500" /> Strateji Kuralları
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Likidite Filtresi</p>
                    <p className="text-xs text-slate-500">10 günlük ortalama hacim {'>'} 100M TL</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Trend Onayı</p>
                    <p className="text-xs text-slate-500">Fiyat EMA 200 üzerinde ve kısa vadeli düzeltmede</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Fibonacci 61.8</p>
                    <p className="text-xs text-slate-500">Golden Zone yukarı yönlü hacimli kırılım</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">RSI Filtresi</p>
                    <p className="text-xs text-slate-500">RSI(14) {'<'} 70 (Aşırı alım kontrolü)</p>
                  </div>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-400 leading-relaxed">
                  Sistem Telegram üzerinden anlık bildirim gönderir. Lütfen .env dosyasında bot token ve chat id bilgilerini yapılandırın.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Otomatik Çalışma</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Screener</span>
                  <span className="text-amber-400 font-mono">18:30 (Her Gün)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Tracker</span>
                  <span className="text-emerald-400 font-mono">10:15 - 17:45 (H.İçi)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-tight">
                  * Otomatik işlemler sunucu tarafında (cron) gerçekleşir. Tarayıcı kapalı olsa bile sistem çalışmaya devam eder.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
