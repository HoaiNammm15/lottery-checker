const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const dayjs = require("dayjs");

const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel ? "/tmp/lottery.sqlite" : path.join(__dirname, "lottery.sqlite");

let db;

const PRIZE_ORDER = ["DB", "SubDB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"];

const STATION_REGIONS = {
  // Miền Nam
  xsag: "nam",
  xsbaclieu: "nam",
  xsbentre: "nam",
  xsbinhduong: "nam",
  xsbinhphuoc: "nam",
  xsbinhthuan: "nam",
  xscamau: "nam",
  xscantho: "nam",
  xsdalat: "nam",
  xsdongnai: "nam",
  xsdongthap: "nam",
  xshaugiang: "nam",
  xshcm: "nam",
  xskiengiang: "nam",
  xslongan: "nam",
  xssoctrang: "nam",
  xstayninh: "nam",
  xstiengiang: "nam",
  xstravinh: "nam",
  xsvinhlong: "nam",
  xsvungtau: "nam",
  
  // Miền Trung
  xsquangbinh: "trung",
  xsquangtri: "trung",
  xshue: "trung",
  xsdanang: "trung",
  xsquangnam: "trung",
  xsquangngai: "trung",
  xsbinhdinh: "trung",
  xsphuyen: "trung",
  xskhanhhoa: "trung",
  xsninhthuan: "trung",
  xsdaklak: "trung",
  xsdaknong: "trung",
  xsgialai: "trung",
  xskontum: "trung",
  
  // Miền Bắc
  xsmb: "bac",
  
  // Short aliases
  xsct: "nam",
  xsdn: "nam",
  xstg: "nam",
  xstn: "nam",
  xsst: "nam",
  xsvl: "nam",
  xstv: "nam",
  xsla: "nam",
  xsbp: "nam",
  xsbl: "nam",
  xsbtr: "nam",
  xsbd: "nam",
  xscm: "nam",
  xsdt: "nam",
  xshg: "nam",
  xskg: "nam",
  xsdl: "nam",
  xsdlk: "trung",
  xsdno: "trung",
  xsgl: "trung",
  xskt: "trung"
};

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

  const rows = await connection.all(
    `SELECT prize, number
     FROM lottery_results
     WHERE date = ? AND station = ?`,
    [date, station]
  );

  const ticket = String(number).trim();
  const matchedPrizes = new Set();
  
  const region = STATION_REGIONS[station] || "nam";

  // Group rows by prize for easy lookup
  const prizes = {};
  for (const row of rows) {
    if (!prizes[row.prize]) {
      prizes[row.prize] = [];
    }
    prizes[row.prize].push(String(row.number).trim());
  }

  // 1. Check Special Prize (DB) and its consolation prizes (SubDB, KK)
  const dbNumbers = prizes.DB || [];
  const dbNumber = dbNumbers[0] ? String(dbNumbers[0]).trim() : null;

  if (dbNumber) {
    if (ticket === dbNumber) {
      matchedPrizes.add("DB");
    } else {
      if (region === "bac") {
        // Northern SubDB: 5 digits, matches last 4 digits of DB, differs in 1st digit
        if (ticket.length === 5 && dbNumber.length === 5) {
          if (ticket.slice(1) === dbNumber.slice(1) && ticket[0] !== dbNumber[0]) {
            matchedPrizes.add("SubDB");
          }
        }
        // Northern KK: 5 digits, ends with last 2 digits of DB (excluding SubDB/DB wins)
        if (ticket.length === 5 && dbNumber.length === 5) {
          if (ticket.slice(3) === dbNumber.slice(3) && !matchedPrizes.has("SubDB")) {
            matchedPrizes.add("KK");
          }
        }
      } else {
        // Southern/Central SubDB: 6 digits, matches last 5 digits of DB, differs in 1st digit
        if (ticket.length === 6 && dbNumber.length === 6) {
          if (ticket.slice(1) === dbNumber.slice(1) && ticket[0] !== dbNumber[0]) {
            matchedPrizes.add("SubDB");
          }
        }
        // Southern/Central KK: 6 digits, same 1st digit, and exactly 1 digit different among the remaining 5 digits
        if (ticket.length === 6 && dbNumber.length === 6) {
          if (ticket[0] === dbNumber[0]) {
            let diffCount = 0;
            for (let i = 1; i < 6; i++) {
              if (ticket[i] !== dbNumber[i]) {
                diffCount++;
              }
            }
            if (diffCount === 1) {
              matchedPrizes.add("KK");
            }
          }
        }
      }
    }
  }

  // 2. Check main prizes G1 to G8
  const mainPrizeCategories = region === "bac"
    ? ["G1", "G2", "G3", "G4", "G5", "G6", "G7"]
    : ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];

  for (const prize of mainPrizeCategories) {
    const list = prizes[prize] || [];
    for (const num of list) {
      const resultNumber = String(num).trim();
      const isSuffixMatch = ticket.length >= resultNumber.length && ticket.endsWith(resultNumber);
      if (isSuffixMatch) {
        matchedPrizes.add(prize);
      }
    }
  }

  if (matchedPrizes.size === 0) {
    return { hit: false };
  }

  // Sort matched prizes by PRIZE_ORDER to determine best_prize and return list
  const prizesList = PRIZE_ORDER.filter((prize) => matchedPrizes.has(prize));

  return {
    hit: true,
    best_prize: prizesList[0],
    prizes: prizesList,
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

  return map;
}

module.exports = {
  initDb,
  saveResults,
  checkNumber,
  getResultsByDateStation,
  PRIZE_ORDER,
  STATION_REGIONS,
};
