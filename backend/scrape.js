const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");
const { PRIZE_ORDER } = require("./db");

const BASE_URL = "https://xosodaiphat.com";
const STATION_ALIASES = {
  // Miền Nam
  xscantho: "xsct",
  xsdongnai: "xsdn",
  xstiengiang: "xstg",
  xstayninh: "xstn",
  xssoctrang: "xsst",
  xsvinhlong: "xsvl",
  xstravinh: "xstv",
  xslongan: "xsla",
  xsbinhphuoc: "xsbp",
  xsbaclieu: "xsbl",
  xsbentre: "xsbtr",
  xsbinhduong: "xsbd",
  xscamau: "xscm",
  xsdongthap: "xsdt",
  xshaugiang: "xshg",
  xskiengiang: "xskg",
  xsdalat: "xsdl",
  xsvungtau: "xsvt",
  xsbinhthuan: "xsbt",
  xsangiang: "xsag",
  // Miền Trung
  xsquangbinh: "xsqb",
  xsquangtri: "xsqt",
  xshue: "xshue",
  xsdanang: "xsda",
  xsquangnam: "xsqna",
  xsquangngai: "xsqng",
  xsbinhdinh: "xsbdi",
  xsphuyen: "xspy",
  xskhanhhoa: "xskh",
  xsninhthuan: "xsnt",
  xsdaklak: "xsdlk",
  xsdaknong: "xsdno",
  xsgialai: "xsgl",
  xskontum: "xskt",
};

function normalizeStationCode(station) {
  const key = String(station || "").toLowerCase().trim();
  return STATION_ALIASES[key] || key;
}

function buildResultUrl(date, station) {
  const dateText = dayjs(date).format("DD-MM-YYYY");
  const stationCode = normalizeStationCode(station);
  return `${BASE_URL}/${stationCode}-${dateText}.html`;
}

function normalizePrize(raw) {
  if (!raw) {
    return "";
  }

  const cleaned = raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace("ĐB", "DB")
    .replace("GIẢI", "G")
    .replace("GIAI", "G");

  if (cleaned.includes("KHUYENKHICH") || cleaned === "KK" || cleaned === "GK" || cleaned === "GKK") {
    return "KK";
  }

  return cleaned;
}

function extractNumbers(text) {
  if (!text) {
    return [];
  }

  const matches = text.match(/\d{2,6}/g);
  return matches ? [...new Set(matches)] : [];
}

function parseFromTable($) {
  const results = {};

  $("tr").each((_, row) => {
    const cells = $(row).find("th, td");
    if (cells.length < 2) {
      return;
    }

    const prizeText = normalizePrize($(cells[0]).text());
    if (!PRIZE_ORDER.includes(prizeText)) {
      return;
    }

    const numberText = cells
      .toArray()
      .slice(1)
      .map((cell) => $(cell).text())
      .join(" ");

    const numbers = extractNumbers(numberText);
    if (numbers.length > 0) {
      results[prizeText] = numbers;
    }
  });

  return results;
}

function parseFromWholeText($) {
  const results = {};
  const text = $("body").text().replace(/\s+/g, " ");

  for (const prize of PRIZE_ORDER) {
    const aliases =
      prize === "DB"
        ? ["DB", "ĐB"]
        : prize === "KK"
          ? ["KK", "GK", "KHUYENKHICH", "GIAIKK", "GKK"]
          : [prize];
    const pattern = new RegExp(
      `(?:${aliases.join("|")})\\s*[:\\-]?\\s*([0-9\\s-]{2,120})`,
      "i"
    );
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const numbers = extractNumbers(match[1]);
    if (numbers.length > 0) {
      results[prize] = numbers;
    }
  }

  return results;
}

async function crawlLottery(date, station) {
  const url = buildResultUrl(date, station);

  let response;
  try {
    response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
  } catch (error) {
    error.crawlUrl = url;
    throw error;
  }

  const $ = cheerio.load(response.data);

  // Remove scripts/styles to make fallback text parsing cleaner.
  $("script, style, noscript").remove();

  const parsedTable = parseFromTable($);
  const parsedText = parseFromWholeText($);

  const merged = {};
  for (const prize of PRIZE_ORDER) {
    const numbers = parsedTable[prize] || parsedText[prize] || [];
    if (numbers.length > 0) {
      merged[prize] = numbers;
    }
  }

  return {
    url,
    results: merged,
  };
}

module.exports = {
  crawlLottery,
  buildResultUrl,
};
