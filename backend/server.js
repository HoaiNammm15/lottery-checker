const express = require("express");
const cors = require("cors");
const dayjs = require("dayjs");
const axios = require("axios");
const { initDb, saveResults, checkNumber, getResultsByDateStation } = require("./db");
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
  "xsthanhhoa",
  "xsnghean",
  "xshatih",
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
  "xsthanhhoa",
  "xsnghean",
  "xshatih",
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
];

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

function getCrawlDate(now = dayjs()) {
  const switched =
    now.hour() > CRAWL_SWITCH_HOUR ||
    (now.hour() === CRAWL_SWITCH_HOUR && now.minute() >= CRAWL_SWITCH_MINUTE);

  return switched
    ? now.format("YYYY-MM-DD")
    : now.subtract(1, "day").format("YYYY-MM-DD");
}

function buildKhuyenKhichFromDb(dbNumbers = []) {
  if (!Array.isArray(dbNumbers) || dbNumbers.length === 0) {
    return [];
  }

  const db = String(dbNumbers[0]).trim();
  if (!/^\d{6}$/.test(db)) {
    return [];
  }

  const firstDigit = db[0];
  const lastFive = db.slice(1);
  const kk = [];

  for (let d = 0; d <= 9; d += 1) {
    const digit = String(d);
    if (digit === firstDigit) {
      continue;
    }
    kk.push(`${digit}${lastFive}`);
  }

  return kk;
}

async function crawlAndStore(date, station) {
  const { url, results } = await crawlLottery(date, station);

  if (!results.KK || results.KK.length === 0) {
    const generatedKk = buildKhuyenKhichFromDb(results.DB || []);
    if (generatedKk.length > 0) {
      results.KK = generatedKk;
    }
  }

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

    if (!STATIONS.includes(station)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    const { url, results, inserted } = await crawlAndStore(date, station);

    return res.json({
      success: true,
      url,
      inserted,
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

    if (!STATIONS.includes(station)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    const result = await checkNumber(date, station, String(number).trim());
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "check failed",
      detail: error.message,
    });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const { date, station } = req.query;

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

    if (!STATIONS.includes(station)) {
      return res.status(400).json({
        error: `station must be one of: ${STATIONS.join(", ")}`,
      });
    }

    const prizes = await getResultsByDateStation(date, station);

    return res.json({
      date,
      station,
      prizes,
    });
  } catch (error) {
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

    const checks = await Promise.all(
      CANONICAL_STATIONS.map(async (station) => {
        const url = buildResultUrl(date, station);
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: () => true,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            },
          });

          return {
            station,
            available: response.status === 200,
            status: response.status,
            url,
          };
        } catch {
          return {
            station,
            available: false,
            status: 0,
            url,
          };
        }
      })
    );

    return res.json({
      date,
      stations: checks,
    });
  } catch (error) {
    return res.status(500).json({
      error: "load available stations failed",
      detail: error.message,
    });
  }
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
