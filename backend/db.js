const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const dayjs = require("dayjs");

const DB_PATH = path.join(__dirname, "lottery.sqlite");

let db;

const PRIZE_ORDER = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"];

function deriveKkFromDb(dbNumber) {
  const db = String(dbNumber || "").trim();
  if (!/^\d{6}$/.test(db)) {
    return [];
  }

  const firstDigit = db[0];
  const lastFive = db.slice(1);
  const kk = [];

  for (let d = 0; d <= 9; d += 1) {
    const digit = String(d);
    if (digit !== firstDigit) {
      kk.push(`${digit}${lastFive}`);
    }
  }

  return kk;
}

async function initDb() {
  if (db) {
    return db;
  }

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS lottery_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      station TEXT NOT NULL,
      prize TEXT NOT NULL,
      number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lottery_date_station
    ON lottery_results(date, station);

    CREATE INDEX IF NOT EXISTS idx_lottery_date_station_number
    ON lottery_results(date, station, number);
  `);

  return db;
}

async function saveResults(date, station, resultsMap) {
  const connection = await initDb();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const normalizedResults = { ...resultsMap };

  // Always ensure KK exists when DB is present.
  if ((!normalizedResults.KK || normalizedResults.KK.length === 0) && normalizedResults.DB?.[0]) {
    normalizedResults.KK = deriveKkFromDb(normalizedResults.DB[0]);
  }

  await connection.exec("BEGIN TRANSACTION");

  try {
    // Replace old data for the same date + station.
    await connection.run(
      "DELETE FROM lottery_results WHERE date = ? AND station = ?",
      [date, station]
    );

    const insertSql =
      "INSERT INTO lottery_results (date, station, prize, number, created_at) VALUES (?, ?, ?, ?, ?)";

    let inserted = 0;

    for (const [prize, numbers] of Object.entries(normalizedResults)) {
      for (const number of numbers) {
        await connection.run(insertSql, [date, station, prize, number, now]);
        inserted += 1;
      }
    }

    // Keep only last 30 days of data.
    const cutoffDate = dayjs().subtract(30, "day").format("YYYY-MM-DD");
    await connection.run("DELETE FROM lottery_results WHERE date < ?", [cutoffDate]);

    await connection.exec("COMMIT");
    return inserted;
  } catch (error) {
    await connection.exec("ROLLBACK");
    throw error;
  }
}

async function checkNumber(date, station, number) {
  const connection = await initDb();

  const dbRows = await connection.all(
    `SELECT prize, number
     FROM lottery_results
     WHERE date = ? AND station = ?`,
    [date, station]
  );
  const rows = [...dbRows];

  const hasKk = rows.some((row) => row.prize === "KK");
  const dbPrize = rows.find((row) => row.prize === "DB");
  if (!hasKk && dbPrize) {
    const derivedKk = deriveKkFromDb(dbPrize.number);
    for (const num of derivedKk) {
      rows.push({ prize: "KK", number: num });
    }
  }

  const ticket = String(number).trim();
  const matchedPrizes = new Set();

  for (const row of rows) {
    const resultNumber = String(row.number).trim();

    // VN lottery tickets are commonly 6 digits.
    // For shorter prizes (G8/G7/...), compare by ending digits.
    const isExact = ticket === resultNumber;
    const isSuffixMatch =
      ticket.length >= resultNumber.length && ticket.endsWith(resultNumber);

    if (isExact || isSuffixMatch) {
      matchedPrizes.add(row.prize);
    }
  }

  if (matchedPrizes.size === 0) {
    return { hit: false };
  }

  const prizes = PRIZE_ORDER.filter((prize) => matchedPrizes.has(prize));

  return {
    hit: true,
    best_prize: prizes[0],
    prizes,
  };
}

async function getResultsByDateStation(date, station) {
  const connection = await initDb();
  const rows = await connection.all(
    `SELECT prize, number
     FROM lottery_results
     WHERE date = ? AND station = ?
     ORDER BY id ASC`,
    [date, station]
  );

  const map = {};
  for (const prize of PRIZE_ORDER) {
    map[prize] = [];
  }

  for (const row of rows) {
    if (!map[row.prize]) {
      map[row.prize] = [];
    }
    map[row.prize].push(String(row.number));
  }

  // Backward compatible: old crawled days may miss KK in DB.
  if (map.KK.length === 0 && map.DB.length > 0) {
    map.KK = deriveKkFromDb(map.DB[0]);
  }

  return map;
}

module.exports = {
  initDb,
  saveResults,
  checkNumber,
  getResultsByDateStation,
  PRIZE_ORDER,
};
