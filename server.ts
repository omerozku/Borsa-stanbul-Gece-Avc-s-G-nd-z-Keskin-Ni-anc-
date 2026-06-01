import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import { runScreener } from "./src/services/screener";
import { runTracker } from "./src/services/tracker";
import { DateTime } from "luxon";

let screenerProgress = { current: 0, total: 0, symbol: '', status: 'idle', lastRun: null as string | null };
let trackerProgress = { current: 0, total: 0, symbol: '', status: 'idle', lastRun: null as string | null };

// Load last screener run from file if exists
const watchlistPath = path.join(process.cwd(), 'watchlist.json');
if (fs.existsSync(watchlistPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));
    if (data.updatedAt) {
      screenerProgress.lastRun = data.updatedAt;
    }
  } catch (e) {
    console.error("Failed to load watchlist metadata", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: DateTime.now().setZone('Europe/Istanbul').toISO() });
  });

  app.get("/api/screener-progress", (req, res) => {
    res.json(screenerProgress);
  });

  app.get("/api/tracker-progress", (req, res) => {
    res.json(trackerProgress);
  });

  // Manual trigger for testing
  app.get("/api/trigger-screener", (req, res) => {
    if (screenerProgress.status === 'running') {
      return res.status(400).json({ message: "Screener is already running" });
    }
    
    screenerProgress.status = 'running';
    // Start in background, do not await
    runScreener((current, total, symbol) => {
      screenerProgress = { ...screenerProgress, current, total, symbol, status: 'running' };
    }).then((result) => {
      screenerProgress.status = 'idle';
      screenerProgress.lastRun = DateTime.now().setZone('Europe/Istanbul').toISO();
      console.log(`Background screener finished. Found ${result.stocks.length} stocks.`);
    }).catch((error) => {
      console.error("Background screener failed:", error);
      screenerProgress.status = 'error';
    });

    res.json({ message: "Screener started in background" });
  });

  app.get("/api/watchlist", (req, res) => {
    const watchlistPath = path.join(process.cwd(), 'watchlist.json');
    if (fs.existsSync(watchlistPath)) {
      const data = fs.readFileSync(watchlistPath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  });

  app.get("/api/persistent-watchlist", (req, res) => {
    const persistentPath = path.join(process.cwd(), 'persistent_watchlist.json');
    if (fs.existsSync(persistentPath)) {
      try {
        const data = fs.readFileSync(persistentPath, 'utf-8');
        res.json(JSON.parse(data));
      } catch (e) {
        res.json([]);
      }
    } else {
      res.json([]);
    }
  });

  app.get("/api/trigger-tracker", (req, res) => {
    if (trackerProgress.status === 'running') {
      return res.status(400).json({ message: "Tracker is already running" });
    }

    trackerProgress.status = 'running';
    runTracker((current, total, symbol) => {
      trackerProgress = { ...trackerProgress, current, total, symbol, status: 'running' };
    }).then(() => {
      trackerProgress.status = 'idle';
      trackerProgress.lastRun = DateTime.now().setZone('Europe/Istanbul').toISO();
    }).catch((error) => {
      console.error("Tracker failed:", error);
      trackerProgress.status = 'error';
    });
    
    res.json({ message: "Tracker started in background" });
  });

  // CRON JOBS (Europe/Istanbul Timezone)
  // Screener: Every day at 18:30
  cron.schedule("30 18 * * *", () => {
    console.log("Running scheduled Screener...");
    if (screenerProgress.status === 'running') return;
    
    screenerProgress.status = 'running';
    runScreener((current, total, symbol) => {
      screenerProgress = { ...screenerProgress, current, total, symbol, status: 'running' };
    }).then((result) => {
      screenerProgress.status = 'idle';
      screenerProgress.lastRun = DateTime.now().setZone('Europe/Istanbul').toISO();
      console.log(`Scheduled screener finished. Found ${result.stocks.length} stocks.`);
    }).catch((error) => {
      console.error("Scheduled screener failed:", error);
      screenerProgress.status = 'error';
    });
  }, {
    timezone: "Europe/Istanbul"
  });

  // Tracker: Weekdays 10:05 - 17:05 Every Hour
  cron.schedule("5 10-17 * * 1-5", () => {
    console.log(`Running hourly scheduled Tracker (${DateTime.now().setZone('Europe/Istanbul').toFormat('HH:mm')})...`);
    if (trackerProgress.status === 'running') return;
    trackerProgress.status = 'running';
    runTracker((current, total, symbol) => {
      trackerProgress = { ...trackerProgress, current, total, symbol, status: 'running' };
    }).then(() => {
      trackerProgress.status = 'idle';
      trackerProgress.lastRun = DateTime.now().setZone('Europe/Istanbul').toISO();
    });
  }, { timezone: "Europe/Istanbul" });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("BIST Bot initialized and schedules set.");
  });
}

startServer();
