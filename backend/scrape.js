const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const BASE_URL = "https://xosodaiphat.com";

const STATION_REGIONS = {
  // Miền Nam
  xsag: "nam", xsbaclieu: "nam", xsbentre: "nam", xsbinhduong: "nam",
  xsbinhphuoc: "nam", xsbinhthuan: "nam", xscamau: "nam", xscantho: "nam",
  xsdalat: "nam", xsdongnai: "nam", xsdongthap: "nam", xshaugiang: "nam",
  xshcm: "nam", xskiengiang: "nam", xslongan: "nam", xssoctrang: "nam",
  xstayninh: "nam", xstiengiang: "nam", xstravinh: "nam", xsvinhlong: "nam",
  xsvungtau: "nam",
  
  // Miền Trung
  xsquangbinh: "trung", xsquangtri: "trung", xshue: "trung", xsdanang: "trung",
  xsquangnam: "trung", xsquangngai: "trung", xsbinhdinh: "trung", xsphuyen: "trung",
  xskhanhhoa: "trung", xsninhthuan: "trung", xsdaklak: "trung", xsdaknong: "trung",
  xsgialai: "trung", xskontum: "trung",
  
  // Miền Bắc
  xsmb: "bac",
  
  // Short aliases
  xsct: "nam", xsdn: "nam", xstg: "nam", xstn: "nam", xsst: "nam",
  xsvl: "nam", xstv: "nam", xsla: "nam", xsbp: "nam", xsbl: "nam",
  xsbtr: "nam", xsbd: "nam", xscm: "nam", xsdt: "nam", xshg: "nam",
  xskg: "nam", xsdl: "nam", xsdlk: "trung", xsdno: "trung", xsgl: "trung",
  xskt: "trung"
};

const STATION_NAMES = {
  xsag: "An Giang",
  xsbaclieu: "Bạc Liêu",
  xsbentre: "Bến Tre",
  xsbinhduong: "Bình Dương",
  xsbinhphuoc: "Bình Phước",
  xsbinhthuan: "Bình Thuận",
  xscamau: "Cà Mau",
  xscantho: "Cần Thơ",
  xsdalat: "Đà Lạt",
  xsdongnai: "Đồng Nai",
  xsdongthap: "Đồng Tháp",
  xshaugiang: "Hậu Giang",
  xshcm: "TPHCM",
  xskiengiang: "Kiên Giang",
  xslongan: "Long An",
  xssoctrang: "Sóc Trăng",
  xstayninh: "Tây Ninh",
  xstiengiang: "Tiền Giang",
  xstravinh: "Trà Vinh",
  xsvinhlong: "Vĩnh Long",
  xsvungtau: "Vũng Tàu",

  xsquangbinh: "Quảng Bình",
  xsquangtri: "Quảng Trị",
  xshue: "Huế",
  xsdanang: "Đà Nẵng",
  xsquangnam: "Quảng Nam",
  xsquangngai: "Quảng Ngãi",
  xsbinhdinh: "Bình Định",
  xsphuyen: "Phú Yên",
  xskhanhhoa: "Khánh Hòa",
  xsninhthuan: "Ninh Thuận",
  xsdaklak: "Đắk Lắk",
  xsdaknong: "Đắk Nông",
  xsgialai: "Gia Lai",
  xskontum: "Kon Tum",

  xsmb: "Miền Bắc",
  
  // Short aliases
  xsct: "Cần Thơ", xsdn: "Đồng Nai", xstg: "Tiền Giang", xstn: "Tây Ninh",
  xsst: "Sóc Trăng", xsvl: "Vĩnh Long", xstv: "Trà Vinh", xsla: "Long An",
  xsbp: "Bình Phước", xsbl: "Bạc Liêu", xsbtr: "Bến Tre", xsbd: "Bình Dương",
  xscm: "Cà Mau", xsdt: "Đồng Tháp", xshg: "Hậu Giang", xskg: "Kiên Giang",
  xsdl: "Đà Lạt", xsdlk: "Đắk Lắk", xsdno: "Đắk Nông", xsgl: "Gia Lai",
  xskt: "Kon Tum"
};

const PRIZE_ORDER = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"];

function normalizePrize(raw) {
  if (!raw) return "";
  let cleaned = raw.toUpperCase().replace(/\s+/g, "").replace(/\./g, "");
  
  if (cleaned.includes("ĐB") || cleaned.includes("DB") || cleaned.includes("ĐẶCBIỆT") || cleaned.includes("DACBIET")) {
    return "DB";
  }
  
  cleaned = cleaned.replace("GIẢI", "G").replace("GIAI", "G");
  
  if (cleaned.includes("KHUYENKHICH") || cleaned === "KK" || cleaned === "GK" || cleaned === "GKK") {
    return "KK";
  }
  
  return cleaned;
}

function extractNumbers(text) {
  if (!text) return [];
  const matches = text.match(/\d{2,6}/g);
  return matches ? [...new Set(matches)] : [];
}

function buildResultUrl(date, station) {
  const region = STATION_REGIONS[station] || "nam";
  const todayStr = dayjs().utcOffset(7).format("YYYY-MM-DD");
  const isToday = date === todayStr;

  if (isToday) {
    if (region === "nam") return `${BASE_URL}/xsmn-xo-so-mien-nam.html`;
    if (region === "trung") return `${BASE_URL}/xsmt-xo-so-mien-trung.html`;
    return `${BASE_URL}/xsmb-xo-so-mien-bac.html`;
  } else {
    const dateText = dayjs(date).format("DD-MM-YYYY");
    if (region === "nam") return `${BASE_URL}/xsmn-${dateText}.html`;
    if (region === "trung") return `${BASE_URL}/xsmt-${dateText}.html`;
    return `${BASE_URL}/xsmb-${dateText}.html`;
  }
}

function parseFromTable($, targetStationName) {
  const results = {};
  
  // Find the results table. For regional pages, it has table-xsmn or table-xsmt or table-xsmb.
  // We select the first table on the page.
  const mainTable = $("table").first();
  if (mainTable.length === 0) {
    return results;
  }
  
  const rows = mainTable.find("tr");
  if (rows.length === 0) {
    return results;
  }
  
  // Parse header row to find column index
  const headerRow = $(rows[0]);
  const headerCells = headerRow.find("th, td").toArray().map(cell => $(cell).text().trim().toLowerCase());
  
  let targetColIndex = -1;
  
  const normalize = (str) => {
    return str.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[đĐ]/g, "d")
              .replace(/\s+/g, "")
              .toLowerCase();
  };

  const normalizedTarget = normalize(targetStationName);
  
  for (let i = 1; i < headerCells.length; i++) {
    const cellText = headerCells[i];
    if (normalize(cellText).includes(normalizedTarget) || normalizedTarget.includes(normalize(cellText))) {
      targetColIndex = i;
      break;
    }
  }
  
  if (targetColIndex === -1) {
    if (headerCells.length === 2) {
      targetColIndex = 1;
    } else {
      return results; // Station not found in header
    }
  }
  
  // Parse prize rows
  for (let r = 1; r < rows.length; r++) {
    const cells = $(rows[r]).find("th, td");
    if (cells.length < headerCells.length) {
      continue;
    }
    
    const prizeText = normalizePrize($(cells[0]).text());
    if (!PRIZE_ORDER.includes(prizeText)) {
      continue;
    }
    
    const cellValue = $(cells[targetColIndex]).text().trim();
    const numbers = extractNumbers(cellValue);
    if (numbers.length > 0) {
      results[prizeText] = numbers;
    }
  }
  
  return results;
}

async function crawlLottery(date, station) {
  const url = buildResultUrl(date, station);
  const stationName = STATION_NAMES[station] || station;

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
  $("script, style, noscript").remove();

  const results = parseFromTable($, stationName);

  return {
    url,
    results,
  };
}

module.exports = {
  crawlLottery,
  buildResultUrl,
};
