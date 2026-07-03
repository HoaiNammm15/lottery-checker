const express = require("express");
const cors = require("cors");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const axios = require("axios");
const path = require("path");
const { initDb, saveResults, checkNumber, getResultsByDateStation, STATION_REGIONS } = require("./db");
const { crawlLottery, buildResultUrl } = require("./scrape");

const app = express();
const PORT = process.env.PORT || 3001;

const STATIONS = [
  // Miền Nam
  "xsag",
  "xsbaclieu",
  "xsbentre",
  "xsbinhduong",
  "xsbinhphuoc",
  "xsbinhthuan",
  "xscamau",
  "xscantho",
  "xsdalat",
  "xsdongnai",
  "xsdongthap",
  "xshaugiang",
  "xshcm",
  "xskiengiang",
  "xslongan",
  "xssoctrang",
  "xstayninh",
  "xstiengiang",
  "xstravinh",
  "xsvinhlong",
  "xsvungtau",
  // Miền Trung
  "xsquangbinh",
  "xsquangtri",
  "xshue",
  "xsdanang",
  "xsquangnam",
  "xsquangngai",
  "xsbinhdinh",
  "xsphuyen",
  "xskhanhhoa",
  "xsninhthuan",
  "xsdaklak",
  "xsdaknong",
  "xsgialai",
  "xskontum",
  // Miền Bắc
  "xsmb",
  // backward-compatible short aliases
  "xsct",
  "xsdn",
  "xstg",
  "xstn",
  "xsst",
  "xsvl",
  "xstv",
  "xsla",
  "xsbp",
  "xsbl",
  "xsbtr",
  "xsbd",
  "xscm",
  "xsdt",
  "xshg",
  "xskg",
  "xsdl",
  "xsdlk",
  "xsdno",
  "xsgl",
  "xskt",
];

const CANONICAL_STATIONS = [
  // Miền Nam
  "xsag",
  "xsbaclieu",
  "xsbentre",
  "xsbinhduong",
  "xsbinhphuoc",
  "xsbinhthuan",
  "xscamau",
  "xscantho",
  "xsdalat",
  "xsdongnai",
  "xsdongthap",
  "xshaugiang",
  "xshcm",
  "xskiengiang",
  "xslongan",
  "xssoctrang",
  "xstayninh",
  "xstiengiang",
  "xstravinh",
  "xsvinhlong",
  "xsvungtau",
  // Miền Trung
  "xsquangbinh",
  "xsquangtri",
  "xshue",
  "xsdanang",
  "xsquangnam",
  "xsquangngai",
  "xsbinhdinh",
  "xsphuyen",
  "xskhanhhoa",
  "xsninhthuan",
  "xsdaklak",
  "xsdaknong",
  "xsgialai",
  "xskontum",
  // Miền Bắc
  "xsmb",
];

const STATION_CANONICAL_ALIASES = {
  xsct: "xscantho",
  xsdn: "xsdongnai",
  xstg: "xstiengiang",
  xstn: "xstayninh",
  xsst: "xssoctrang",
  xsvl: "xsvinhlong",
  xstv: "xstravinh",
  xsla: "xslongan",
  xsbp: "xsbinhphuoc",
  xsbl: "xsbaclieu",
  xsbtr: "xsbentre",
  xsbd: "xsbinhduong",
  xscm: "xscamau",
  xsdt: "xsdongthap",
  xshg: "xshaugiang",
  xskg: "xskiengiang",
  xsdl: "xsdalat",
  xsdlk: "xsdaklak",
  xsdno: "xsdaknong",
  xsgl: "xsgialai",
  xskt: "xskontum",
};

const WEEKLY_SCHEDULE = {
  // Sunday
  0: {
    nam: ["xstiengiang", "xskiengiang", "xsdalat"],
    trung: ["xskhanhhoa", "xskontum", "xshue"],
    bac: ["xsmb"],
  },
  // Monday
  1: {
    nam: ["xshcm", "xsdongthap", "xscamau"],
    trung: ["xshue", "xsphuyen"],
    bac: ["xsmb"],
  },
  // Tuesday
  2: {
    nam: ["xsbentre", "xsvungtau", "xsbaclieu"],
    trung: ["xsdaklak", "xsquangnam"],
    bac: ["xsmb"],
  },
  // Wednesday
  3: {
    nam: ["xsdongnai", "xscantho", "xssoctrang"],
    trung: ["xsdanang", "xskhanhhoa"],
    bac: ["xsmb"],
  },
  // Thursday
  4: {
    nam: ["xstayninh", "xsag", "xsbinhthuan"],
    trung: ["xsbinhdinh", "xsquangtri", "xsquangbinh"],
    bac: ["xsmb"],
  },
  // Friday
  5: {
    nam: ["xsvinhlong", "xsbinhduong", "xstravinh"],
    trung: ["xsgialai", "xsninhthuan"],
    bac: ["xsmb"],
  },
  // Saturday
  6: {
    nam: ["xshcm", "xslongan", "xsbinhphuoc", "xshaugiang"],
    trung: ["xsdanang", "xsquangngai", "xsdaknong"],
    bac: ["xsmb"],
  },
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const AUTO_CRAWL_ENABLED = process.env.AUTO_CRAWL !== "false";
const AUTO_CRAWL_INTERVAL_MINUTES = Number(process.env.AUTO_CRAWL_INTERVAL_MINUTES || 1440);
const CRAWL_SWITCH_HOUR = 17;
const CRAWL_SWITCH_MINUTE = 30;

let autoCrawlRunning = false;

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const parsed = dayjs(value);
  return parsed.isValid() && parsed.format("YYYY-MM-DD") === value;
}

function normalizeRequestedStation(value) {
  const key = String(value || "").toLowerCase().trim();
  return STATION_CANONICAL_ALIASES[key] || key;
}

function getCrawlDate(now = dayjs().utcOffset(7)) {
  const switched =
    now.hour() > CRAWL_SWITCH_HOUR ||
    (now.hour() === CRAWL_SWITCH_HOUR && now.minute() >= CRAWL_SWITCH_MINUTE);

  return switched
    ? now.format("YYYY-MM-DD")
    : now.subtract(1, "day").format("YYYY-MM-DD");
}

function hasPrizeData(prizes) {
  if (!prizes || typeof prizes !== "object") {
    return false;
  }

  return Object.values(prizes).some((numbers) => Array.isArray(numbers) && numbers.length > 0);
}

async function ensureLatestResults(date, station) {
  try {
    await crawlAndStore(date, station);
  } catch (error) {
    const cachedPrizes = await getResultsByDateStation(date, station);
    if (!hasPrizeData(cachedPrizes)) {
      throw error;
    }
  }
}

async function crawlAndStore(date, station) {
  const { url, results } = await crawlLottery(date, station);

  if (Object.keys(results).length === 0) {
    const err = new Error("Could not parse lottery results from source page");
    err.statusCode = 404;
    err.url = url;
    throw err;
  }

  const inserted = await saveResults(date, station, results);
  return { url, results, inserted };
}

async function runAutoCrawl() {
  if (autoCrawlRunning) {
    return;
  }

  autoCrawlRunning = true;
  const date = getCrawlDate();
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  console.log(`[auto-crawl] start for ${date}`);

  for (const station of CANONICAL_STATIONS) {
    try {
      await crawlAndStore(date, station);
      successCount += 1;
    } catch (error) {
      const notFound = error.response?.status === 404 || error.statusCode === 404;
      if (notFound) {
        skippedCount += 1;
        continue;
      }
      failedCount += 1;
      console.error(`[auto-crawl] failed ${station}: ${error.message}`);
    }
  }

  console.log(
    `[auto-crawl] done for ${date} | success=${successCount}, skipped=${skippedCount}, failed=${failedCount}`
  );

  autoCrawlRunning = false;
}

app.use(cors());
app.use(express.json());

// Serve static files from React build directory
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    service: "checkxoso-backend",
    time: new Date().toISOString(),
  });
});

app.post("/api/crawl", async (req, res) => {
  try {
    const { date, station } = req.body || {};
    const canonicalStation = normalizeRequestedStation(station);

    if (!date || !station) {
      return res.status(400).json({
        error: "date and station are required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        error: "date must be in YYYY-MM-DD format",
      });
    }

    if (!STATIONS.includes(canonicalStation)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    const { url, results, inserted } = await crawlAndStore(date, canonicalStation);

    return res.json({
      success: true,
      url,
      inserted,
      station: canonicalStation,
      prizes: results,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Chưa có kết quả cho ngày/đài này trên nguồn dữ liệu.",
        detail: `Không tìm thấy trang kết quả: ${error.crawlUrl || ""}`.trim(),
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: "Không đọc được dữ liệu từ trang kết quả.",
        detail: error.url || error.message,
      });
    }

    return res.status(500).json({
      error: "crawl failed",
      detail: error.message,
    });
  }
});

app.get("/api/check", async (req, res) => {
  try {
    const { date, station, number } = req.query;
    const canonicalStation = normalizeRequestedStation(station);

    if (!date || !station || !number) {
      return res.status(400).json({
        error: "date, station and number are required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        error: "date must be in YYYY-MM-DD format",
      });
    }

    if (!STATIONS.includes(canonicalStation)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    await ensureLatestResults(date, canonicalStation);

    const result = await checkNumber(date, canonicalStation, String(number).trim());
    return res.json(result);
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Chưa có kết quả cho ngày/đài này trên nguồn dữ liệu.",
        detail: `Không tìm thấy trang kết quả: ${error.crawlUrl || ""}`.trim(),
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: "Không đọc được dữ liệu từ trang kết quả.",
        detail: error.url || error.message,
      });
    }

    return res.status(500).json({
      error: "check failed",
      detail: error.message,
    });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const { date, station } = req.query;
    const canonicalStation = normalizeRequestedStation(station);

    if (!date || !station) {
      return res.status(400).json({
        error: "date and station are required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        error: "date must be in YYYY-MM-DD format",
      });
    }

    if (!STATIONS.includes(canonicalStation)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    await ensureLatestResults(date, canonicalStation);
    const prizes = await getResultsByDateStation(date, canonicalStation);

    return res.json({
      date,
      station: canonicalStation,
      prizes,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Chưa có kết quả cho ngày/đài này trên nguồn dữ liệu.",
        detail: `Không tìm thấy trang kết quả: ${error.crawlUrl || ""}`.trim(),
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: "Không đọc được dữ liệu từ trang kết quả.",
        detail: error.url || error.message,
      });
    }

    return res.status(500).json({
      error: "load results failed",
      detail: error.message,
    });
  }
});

app.get("/api/available-stations", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "date is required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        error: "date must be in YYYY-MM-DD format",
      });
    }

    const dayOfWeek = dayjs(date).day();
    const schedule = WEEKLY_SCHEDULE[dayOfWeek];
    if (!schedule) {
      return res.status(400).json({ error: "Lịch ngày không hợp lệ" });
    }

    const nowVn = dayjs().utcOffset(7);
    const todayStr = nowVn.format("YYYY-MM-DD");
    const isToday = date === todayStr;
    const isPast = dayjs(date).isBefore(dayjs(todayStr));

    const checkAvailability = (stationCode) => {
      if (isPast) return true;
      if (!isToday) return false; // Future date

      const region = STATION_REGIONS[stationCode] || "nam";
      const hour = nowVn.hour();
      const minute = nowVn.minute();

      if (region === "nam") {
        return hour > 16 || (hour === 16 && minute >= 35);
      }
      if (region === "trung") {
        return hour > 17 || (hour === 17 && minute >= 35);
      }
      if (region === "bac") {
        return hour > 18 || (hour === 18 && minute >= 35);
      }
      return false;
    };

    const stationsList = [];

    for (const st of schedule.nam) {
      stationsList.push({
        station: st,
        available: checkAvailability(st),
        url: buildResultUrl(date, st),
      });
    }
    for (const st of schedule.trung) {
      stationsList.push({
        station: st,
        available: checkAvailability(st),
        url: buildResultUrl(date, st),
      });
    }
    for (const st of schedule.bac) {
      stationsList.push({
        station: st,
        available: checkAvailability(st),
        url: buildResultUrl(date, st),
      });
    }

    return res.json({
      date,
      stations: stationsList,
    });
  } catch (error) {
    return res.status(500).json({
      error: "load available stations failed",
      detail: error.message,
    });
  }
});

// React Client routing fallback for production deployment
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    return next();
  }
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });

    if (AUTO_CRAWL_ENABLED) {
      const minutes = Math.max(5, AUTO_CRAWL_INTERVAL_MINUTES);
      const intervalMs = minutes * 60 * 1000;
      runAutoCrawl().catch((error) => {
        console.error(`[auto-crawl] initial run failed: ${error.message}`);
      });
      setInterval(() => {
        runAutoCrawl().catch((error) => {
          console.error(`[auto-crawl] scheduled run failed: ${error.message}`);
        });
      }, intervalMs);
      console.log(`[auto-crawl] enabled, interval=${minutes} minutes`);
    } else {
      console.log("[auto-crawl] disabled");
    }
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });
