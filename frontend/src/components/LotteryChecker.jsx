import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Table2, X } from "lucide-react";

const stationsNam = [
  { value: "xsag", label: "An Giang (xsag)" },
  { value: "xsbaclieu", label: "Bạc Liêu (xsbaclieu)" },
  { value: "xsbentre", label: "Bến Tre (xsbentre)" },
  { value: "xsbinhduong", label: "Bình Dương (xsbinhduong)" },
  { value: "xsbinhphuoc", label: "Bình Phước (xsbinhphuoc)" },
  { value: "xsbinhthuan", label: "Bình Thuận (xsbinhthuan)" },
  { value: "xscamau", label: "Cà Mau (xscamau)" },
  { value: "xscantho", label: "Cần Thơ (xscantho)" },
  { value: "xsdalat", label: "Đà Lạt (xsdalat)" },
  { value: "xsdongnai", label: "Đồng Nai (xsdongnai)" },
  { value: "xsdongthap", label: "Đồng Tháp (xsdongthap)" },
  { value: "xshaugiang", label: "Hậu Giang (xshaugiang)" },
  { value: "xshcm", label: "Hồ Chí Minh (xshcm)" },
  { value: "xskiengiang", label: "Kiên Giang (xskiengiang)" },
  { value: "xslongan", label: "Long An (xslongan)" },
  { value: "xssoctrang", label: "Sóc Trăng (xssoctrang)" },
  { value: "xstayninh", label: "Tây Ninh (xstayninh)" },
  { value: "xstiengiang", label: "Tiền Giang (xstiengiang)" },
  { value: "xstravinh", label: "Trà Vinh (xstravinh)" },
  { value: "xsvinhlong", label: "Vĩnh Long (xsvinhlong)" },
  { value: "xsvungtau", label: "Vũng Tàu (xsvungtau)" },
];

const stationsTrung = [
  { value: "xsquangbinh", label: "Quảng Bình (xsquangbinh)" },
  { value: "xsquangtri", label: "Quảng Trị (xsquangtri)" },
  { value: "xshue", label: "Thừa Thiên Huế (xshue)" },
  { value: "xsdanang", label: "Đà Nẵng (xsdanang)" },
  { value: "xsquangnam", label: "Quảng Nam (xsquangnam)" },
  { value: "xsquangngai", label: "Quảng Ngãi (xsquangngai)" },
  { value: "xsbinhdinh", label: "Bình Định (xsbinhdinh)" },
  { value: "xsphuyen", label: "Phú Yên (xsphuyen)" },
  { value: "xskhanhhoa", label: "Khánh Hòa (xskhanhhoa)" },
  { value: "xsninhthuan", label: "Ninh Thuận (xsninhthuan)" },
  { value: "xsdaklak", label: "Đắk Lắk (xsdaklak)" },
  { value: "xsdaknong", label: "Đắk Nông (xsdaknong)" },
  { value: "xsgialai", label: "Gia Lai (xsgialai)" },
  { value: "xskontum", label: "Kon Tum (xskontum)" },
];

const stationsBac = [];

const prizeOrder = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"];
const TAX_EXEMPTION_PER_TICKET = 10000000;
const TAX_RATE = 0.1;

const prizeAmounts = {
  DB: 2000000000,
  G1: 30000000,
  G2: 15000000,
  G3: 10000000,
  G4: 3000000,
  G5: 1000000,
  G6: 400000,
  G7: 200000,
  G8: 100000,
  KK: 50000000,
};

const prizeLabels = {
  DB: "Giải đặc biệt",
  G1: "Giải nhất",
  G2: "Giải nhì",
  G3: "Giải ba",
  G4: "Giải tư",
  G5: "Giải năm",
  G6: "Giải sáu",
  G7: "Giải bảy",
  G8: "Giải tám",
  KK: "Giải khuyến khích",
};

const CRAWL_SWITCH_HOUR = 17;
const CRAWL_SWITCH_MINUTE = 30;

function getDefaultDate() {
  const now = new Date();
  const switched =
    now.getHours() > CRAWL_SWITCH_HOUR ||
    (now.getHours() === CRAWL_SWITCH_HOUR && now.getMinutes() >= CRAWL_SWITCH_MINUTE);

  if (!switched) {
    now.setDate(now.getDate() - 1);
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRealtime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

async function readJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi từ server không phải JSON: ${text.slice(0, 120)}`);
  }
}

function LotteryChecker() {
  const [region, setRegion] = useState("nam");
  const [date, setDate] = useState(getDefaultDate());
  const [station, setStation] = useState("xshcm");
  const [number, setNumber] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState("1");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState(null);
  const [availableStations, setAvailableStations] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const tableScrollRef = useRef(null);

  const stations = useMemo(() => {
    switch (region) {
      case "trung":
        return stationsTrung;
      case "bac":
        return stationsBac;
      case "nam":
      default:
        return stationsNam;
    }
  }, [region]);

  const stationValues = useMemo(() => new Set(stations.map((item) => item.value)), [stations]);

  const regionInfo = useMemo(() => {
    const info = {
      nam: {
        label: "Miền Nam",
        title: "Kiểm Tra Kết Quả Xổ Số Miền Nam",
        description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.",
        prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Nam.",
      },
      trung: {
        label: "Miền Trung",
        title: "Kiểm Tra Kết Quả Xổ Số Miền Trung",
        description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.",
        prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Trung.",
      },
      bac: {
        label: "Miền Bắc",
        title: "Kiểm Tra Kết Quả Xổ Số Miền Bắc",
        description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.",
        prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Bắc.",
      },
    };

    return info[region];
  }, [region]);

  const canCheck = useMemo(() => number.trim().length > 0, [number]);

  const quantityValue = useMemo(() => {
    const parsed = Number.parseInt(ticketQuantity, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [ticketQuantity]);

  const stationAvailabilityMap = useMemo(() => {
    const map = {};
    for (const item of availableStations) {
      map[item.station] = item;
    }
    return map;
  }, [availableStations]);

  const sortedStations = useMemo(() => {
    const withStatus = stations.map((item) => {
      const info = stationAvailabilityMap[item.value];
      const available = info ? info.available : false;
      return { ...item, available };
    });

    return withStatus.sort((a, b) => Number(b.available) - Number(a.available));
  }, [stations, stationAvailabilityMap]);

  const availableToday = useMemo(
    () => availableStations.filter((item) => item.available && stationValues.has(item.station)),
    [availableStations, stationValues]
  );

  const selectedStationInfo = stationAvailabilityMap[station];

  const matchedPrizeSet = useMemo(
    () => new Set(result?.hit ? result.prizes || [] : []),
    [result]
  );

  const winningAmount = result?.hit ? prizeAmounts[result.best_prize] || 0 : 0;
  const totalWinningAmount = winningAmount * quantityValue;
  const taxableAmountPerTicket = Math.max(0, winningAmount - TAX_EXEMPTION_PER_TICKET);
  const taxPerTicket = Math.round(taxableAmountPerTicket * TAX_RATE);
  const totalTaxAmount = taxPerTicket * quantityValue;
  const netAmountPerTicket = Math.max(0, winningAmount - taxPerTicket);
  const totalNetAmount = netAmountPerTicket * quantityValue;

  async function loadAvailableStations(selectedDate) {
    setLoadingStations(true);
    try {
      const query = new URLSearchParams({ date: selectedDate }).toString();
      const response = await fetch(`/api/available-stations?${query}`);
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Tải danh sách đài thất bại.");
      }

      const list = data.stations || [];
      setAvailableStations(list);

      const current = list.find((item) => item.station === station);
      if (current && !current.available) {
        const firstAvailable = list.find(
          (item) => item.available && stationValues.has(item.station)
        );
        if (firstAvailable) {
          setStation(firstAvailable.station);
        }
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingStations(false);
    }
  }

  async function loadBoard() {
    setLoadingBoard(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ date, station }).toString();
      const response = await fetch(`/api/results?${query}`);
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Tải bảng kết quả thất bại.");
      }

      setBoard(data.prizes || {});
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingBoard(false);
    }
  }

  async function handleCheck() {
    if (!canCheck) {
      setMessage("Vui lòng nhập số vé cần kiểm tra.");
      return;
    }

    setLoadingCheck(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        date,
        station,
        number: number.trim(),
      }).toString();
      const response = await fetch(`/api/check?${query}`);
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Kiểm tra kết quả thất bại.");
      }

      setResult(data);
      if (!board) {
        await loadBoard();
      }
    } catch (error) {
      setMessage(error.message);
      setResult(null);
    } finally {
      setLoadingCheck(false);
    }
  }

  function handleDateChange(value) {
    setDate(value);
    setResult(null);
    setBoard(null);
    setMessage("");
  }

  function handleRegionChange(newRegion) {
    setRegion(newRegion);
    setResult(null);
    setBoard(null);
    setMessage("");

    if (newRegion === "trung" && stationsTrung.length > 0) {
      setStation(stationsTrung[0].value);
    } else if (newRegion === "bac" && stationsBac.length > 0) {
      setStation(stationsBac[0].value);
    } else {
      setStation(stationsNam[0].value);
    }
  }

  function handleStationChange(value) {
    setStation(value);
    setResult(null);
    setBoard(null);
    setMessage("");
  }

  function isMatchedNumber(value) {
    const ticket = number.trim();
    const target = String(value);
    return ticket === target || (ticket.length >= target.length && ticket.endsWith(target));
  }

  useEffect(() => {
    loadAvailableStations(date);
  }, [date, region]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!result?.hit || !result.best_prize) {
      return;
    }

    const container = tableScrollRef.current;
    if (!container) {
      return;
    }

    const target = container.querySelector(`[data-prize-row="${result.best_prize}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [result]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_500px_at_10%_0%,#c7f0ff_0%,transparent_55%),radial-gradient(900px_500px_at_90%_100%,#ffe6b5_0%,transparent_58%),linear-gradient(135deg,#e7f4ff_0%,#eef2f7_40%,#f6efe2_100%)] px-4 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(15,23,42,0.16),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.06),transparent_18%,transparent_82%,rgba(15,23,42,0.1))]" />
      <div className="pointer-events-none absolute -left-20 top-2 h-72 w-72 rounded-full bg-cyan-300/45 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-300/45 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="mx-auto w-full max-w-[1180px] animate-fade-up">
        <div className="p-2 md:p-3">
          <header className="mb-5">
            <div className="mb-5 inline-flex w-full items-center gap-1 rounded-2xl bg-gradient-to-r from-slate-100/85 to-slate-50/85 p-1.5 shadow-inner">
              <button
                onClick={() => handleRegionChange("nam")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  region === "nam"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white/70"
                }`}
              >
                {stationsNam.length > 0 && "Miền Nam"}
              </button>
              <button
                onClick={() => handleRegionChange("trung")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  region === "trung"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white/70"
                }`}
              >
                {stationsTrung.length > 0 && "Miền Trung"}
              </button>
              <button
                onClick={() => handleRegionChange("bac")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  region === "bac"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white/70"
                }`}
              >
                {stationsBac.length > 0 && "Miền Bắc"}
              </button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="pt-1 text-2xl font-extrabold leading-[1.2] text-slate-900 md:text-4xl">
                  {regionInfo.title}
                </h1>
                <p className="mt-1 text-sm text-slate-700">{regionInfo.description}</p>
              </div>
              <p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
                Thời gian hiện tại: <span className="font-semibold">{formatRealtime(now)}</span>
              </p>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày quay</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Đài xổ số</label>
                <select
                  value={station}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                >
                  {sortedStations.map((item) => {
                    const info = stationAvailabilityMap[item.value];
                    const disabled = info ? !info.available : false;
                    return (
                      <option key={item.value} value={item.value} disabled={disabled}>
                        {item.label} {info ? (info.available ? "- Có kết quả" : "- Chưa có") : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {loadingStations
                    ? "Đang kiểm tra đài có kết quả..."
                    : selectedStationInfo
                      ? selectedStationInfo.available
                        ? "Đài đang chọn có kết quả trong ngày này."
                        : "Đài đang chọn chưa có kết quả trong ngày này."
                      : "Chọn ngày để kiểm tra đài có kết quả."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Đài mở thưởng trong ngày
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {loadingStations && <span className="text-xs text-slate-500">Đang tải...</span>}
                  {!loadingStations && availableToday.length === 0 && (
                    <span className="text-xs text-slate-500">
                      Chưa xác định được đài nào có kết quả.
                    </span>
                  )}
                  {!loadingStations &&
                    availableToday.map((item) => (
                      <button
                        key={item.station}
                        type="button"
                        onClick={() => handleStationChange(item.station)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          station === item.station
                            ? "border-cyan-300 bg-cyan-100 text-cyan-800"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.station}
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Số vé</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 138170"
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Số lượng vé
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={ticketQuantity}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setTicketQuantity(digits === "" ? "" : String(Math.max(1, Number(digits))));
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setIsPrizeModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500"
                >
                  <Table2 className="mr-2 h-4 w-4" />
                  Bảng tiền thưởng
                </button>

                <button
                  onClick={handleCheck}
                  disabled={loadingCheck}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-600/90 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loadingCheck ? "Đang kiểm tra..." : "Kiểm tra kết quả"}
                </button>

                <button
                  onClick={loadBoard}
                  disabled={loadingBoard}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Table2 className="mr-2 h-4 w-4" />
                  {loadingBoard ? "Đang tải..." : "Tải bảng kết quả"}
                </button>
              </div>

              {message && (
                <div className="animate-fade-up rounded-xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}

              {result && result.hit && (
                <div className="animate-fade-up rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-emerald-900">
                  <p className="text-sm font-semibold">Chúc mừng! Vé trúng giải.</p>
                  <p className="mt-1 text-sm">
                    Vé trúng giải:{" "}
                    <span className="font-bold">
                      {prizeLabels[result.best_prize] || result.best_prize}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    Tiền thưởng 1 vé: <span className="font-bold">{formatCurrency(winningAmount)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Thuế TNCN 1 vé: <span className="font-bold">{formatCurrency(taxPerTicket)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Nhận về 1 vé:{" "}
                    <span className="font-bold">{formatCurrency(netAmountPerTicket)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Tổng thưởng ({quantityValue} vé):{" "}
                    <span className="font-bold">{formatCurrency(totalWinningAmount)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Tổng thuế: <span className="font-bold">{formatCurrency(totalTaxAmount)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Tổng nhận: <span className="font-bold">{formatCurrency(totalNetAmount)}</span>
                  </p>
                  <p className="mt-2 text-xs text-emerald-800/80">
                    Ghi chú: Thuế tính trên phần giá trị trúng vượt 10.000.000đ/vé.
                  </p>
                </div>
              )}

              {result && !result.hit && (
                <div className="animate-fade-up rounded-xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
                  Rất tiếc, vé của bạn không trúng giải nào.
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 shadow-[0_10px_35px_-25px_rgba(15,23,42,0.45)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="tracking-tight text-lg font-bold text-slate-800">Bảng kết quả</h2>
                <span className="text-sm text-slate-500">
                  {station} | {date}
                </span>
              </div>

              <div
                ref={tableScrollRef}
                className="max-h-[430px] overflow-auto rounded-xl border border-slate-300 bg-white"
              >
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-slate-200">
                    <tr>
                      <th className="border-b border-slate-300 px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">
                        Giải
                      </th>
                      <th className="border-b border-slate-300 px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">
                        Số trúng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeOrder.map((prize) => {
                      const numbers = board?.[prize] || [];
                      const rowHit = matchedPrizeSet.has(prize);
                      return (
                        <tr key={prize} data-prize-row={prize} className="align-top">
                          <td
                            className={`border-b border-slate-200 px-3 py-2 text-base font-semibold ${
                              rowHit ? "bg-emerald-50 text-emerald-800" : "text-slate-700"
                            }`}
                          >
                            {prize}
                          </td>
                          <td
                            className={`border-b border-slate-200 px-3 py-2 text-lg ${
                              rowHit ? "bg-emerald-50 text-emerald-800" : "text-slate-700"
                            }`}
                          >
                            {numbers.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {numbers.map((item) => {
                                  const numberHit = rowHit && isMatchedNumber(item);
                                  return (
                                    <span
                                      key={`${prize}-${item}`}
                                      className={`rounded-md px-2 py-0.5 text-base ${
                                        numberHit
                                          ? "bg-emerald-200 font-semibold text-emerald-900"
                                          : "bg-transparent"
                                      }`}
                                    >
                                      {item}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>

      {isPrizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="absolute inset-0" onClick={() => setIsPrizeModalOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bảng tiền thưởng</h3>
                <p className="mt-1 text-sm text-slate-600">{regionInfo.prizeModalDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrizeModalOpen(false)}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-5 py-4">
              {result?.hit && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p>
                    Vé của bạn trúng{" "}
                    <span className="font-bold">
                      {prizeLabels[result.best_prize] || result.best_prize}
                    </span>
                    .
                  </p>
                  <p className="mt-1">
                    Tiền 1 vé: <span className="font-bold">{formatCurrency(winningAmount)}</span>
                  </p>
                  <p className="mt-1">
                    Số lượng vé: <span className="font-bold">{quantityValue}</span>
                  </p>
                  <p className="mt-1">
                    Thuế 1 vé: <span className="font-bold">{formatCurrency(taxPerTicket)}</span>
                  </p>
                  <p className="mt-1">
                    Nhận về 1 vé:{" "}
                    <span className="font-bold">{formatCurrency(netAmountPerTicket)}</span>
                  </p>
                  <p className="mt-1">
                    Tổng thưởng: <span className="font-bold">{formatCurrency(totalWinningAmount)}</span>
                  </p>
                  <p className="mt-1">
                    Tổng thuế: <span className="font-bold">{formatCurrency(totalTaxAmount)}</span>
                  </p>
                  <p className="mt-1">
                    Tổng nhận: <span className="font-bold">{formatCurrency(totalNetAmount)}</span>
                  </p>
                  <p className="mt-2 text-xs text-emerald-800/80">
                    Thuế tính theo phần vượt 10.000.000đ/vé.
                  </p>
                </div>
              )}

              {!result?.hit && number.trim() && (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Vé hiện tại chưa có kết quả trúng. Bạn vẫn có thể xem cơ cấu tiền thưởng bên dưới.
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Mã giải
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Tên giải
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Tiền thưởng / vé
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeOrder.map((prize) => {
                      const isBestPrize = result?.best_prize === prize;
                      return (
                        <tr key={prize} className={isBestPrize ? "bg-emerald-50" : "bg-white"}>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                            {prize}
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                            {prizeLabels[prize]}
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(prizeAmounts[prize])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default LotteryChecker;
