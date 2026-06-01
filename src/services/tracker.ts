import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)();
import fs from 'fs';
import path from 'path';
import { calculateFibonacciLevels, calculateRSI, StockData } from '../lib/strategy';
import { sendTelegramMessage } from '../lib/telegram';
import { DateTime } from 'luxon';

const WATCHLIST_PATH = path.join(process.cwd(), 'watchlist.json');
const PERSISTENT_WATCHLIST_PATH = path.join(process.cwd(), 'persistent_watchlist.json');

function getMergedWatchlist(): StockData[] {
  let watchlist: StockData[] = [];
  if (fs.existsSync(WATCHLIST_PATH)) {
    const fileData = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf-8'));
    watchlist = Array.isArray(fileData) ? fileData : (fileData.stocks || []);
  }

  let persistent: StockData[] = [];
  if (fs.existsSync(PERSISTENT_WATCHLIST_PATH)) {
    persistent = JSON.parse(fs.readFileSync(PERSISTENT_WATCHLIST_PATH, 'utf-8'));
  }

  // Merge and deduplicate by symbol
  const merged = [...watchlist];
  for (const p of persistent) {
    if (!merged.find(s => s.symbol === p.symbol)) {
      merged.push(p);
    }
  }
  return merged;
}

function addToPersistentWatchlist(stock: StockData) {
  let persistent: StockData[] = [];
  if (fs.existsSync(PERSISTENT_WATCHLIST_PATH)) {
    try {
      persistent = JSON.parse(fs.readFileSync(PERSISTENT_WATCHLIST_PATH, 'utf-8'));
    } catch (e) {
      persistent = [];
    }
  }

  if (!persistent.find(s => s.symbol === stock.symbol)) {
    persistent.push(stock);
    fs.writeFileSync(PERSISTENT_WATCHLIST_PATH, JSON.stringify(persistent, null, 2));
    console.log(`[Tracker] ${stock.symbol} added to persistent watchlist.`);
  }
}

export async function runTracker(onProgress?: (current: number, total: number, symbol: string) => void) {
  const watchlist = getMergedWatchlist();
  
  if (!watchlist || watchlist.length === 0) {
    console.log('[Tracker] No stocks to track. Skipping...');
    return;
  }

  console.log(`[${DateTime.now().toISO()}] Tracker started for ${watchlist.length} stocks (including persistent signals)...`);
  const total = watchlist.length;
  let current = 0;

  const signals = [];

  for (const stock of watchlist) {
    current++;
    if (onProgress) onProgress(current, total, stock.symbol);
    
    try {
      // Fetch 1h data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 15); // Last 15 days for enough 1h candles

      const result: any = await yahooFinance.chart(stock.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1h'
      });

      const quotes = result.quotes;
      if (quotes.length < 21) continue;

      const lastQuote = quotes[quotes.length - 1];
      const prevQuote = quotes[quotes.length - 2];
      const prices = quotes.map(q => q.close as number).filter(p => (p !== null && p !== undefined));
      const volumes = quotes.map(q => q.volume as number).filter(v => (v !== null && v !== undefined));

      if (!lastQuote.close || !prevQuote.close) continue;

      const fib = calculateFibonacciLevels(stock.peak, stock.dip);

      // 1. Fibonacci 61.8 Breakout
      const isBreakout = lastQuote.close > fib.level618 && prevQuote.close <= fib.level618;

      if (!isBreakout) continue;

      // 2. Volume Confirmation
      const last20Volumes = volumes.slice(-21, -1);
      const avgVolume20 = last20Volumes.reduce((a, b) => a + b, 0) / 20;
      const isVolumeConfirmed = (lastQuote.volume || 0) > (avgVolume20 * 1.5);

      if (!isVolumeConfirmed) continue;

      // 3. RSI Confirmation
      const rsi = calculateRSI(prices, 14);
      if (rsi >= 70) continue;

      // Sinyal oluştuysa kalıcı listeye ekle (listeden çıksa bile takip edilsin)
      addToPersistentWatchlist(stock);

      signals.push({
        symbol: stock.symbol,
        price: lastQuote.close,
        rsi: rsi.toFixed(2),
        stopLoss: fib.level500.toFixed(2),
        target1: fib.level786.toFixed(2),
        target2: fib.level100.toFixed(2)
      });

    } catch (error) {
      console.error(`[Tracker] Error tracking ${stock.symbol}:`, error);
    }
  }

  if (signals.length > 0) {
    const isCorrelated = signals.length > 1;
    for (const signal of signals) {
      const potProfit1 = (((parseFloat(signal.target1) / signal.price) - 1) * 100).toFixed(1);
      const potProfit2 = (((parseFloat(signal.target2) / signal.price) - 1) * 100).toFixed(1);

      let message = `🚀 *YENİ SİNYAL: [${signal.symbol}]*\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      message += `📥 *Giriş Fiyatı:* ${signal.price.toFixed(2)} TL\n`;
      message += `📊 *RSI (14):* ${signal.rsi}\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      message += `🛡️ *Stop Loss:* ${signal.stopLoss} TL\n`;
      message += `🎯 *Hedef 1:* ${signal.target1} TL (+%${potProfit1})\n`;
      message += `🎯 *Hedef 2:* ${signal.target2} TL (+%${potProfit2})\n`;
      message += `━━━━━━━━━━━━━━━\n`;

      if (isCorrelated) {
        message += `⚠️ *KORELASYON UYARISI:* Aynı anda birden fazla sinyal geldi. Risk yönetimi gereği pozisyon büyüklüğünüzü %50 azaltın.\n`;
      }
      
      message += `⏰ _${DateTime.now().setZone('Europe/Istanbul').toFormat('HH:mm')}_`;

      await sendTelegramMessage(message);
    }
  }

  console.log(`[${DateTime.now().toISO()}] Tracker finished. Signals found: ${signals.length}`);
}
