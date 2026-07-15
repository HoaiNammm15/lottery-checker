import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Table2, X, CalendarDays, MapPin, Star, Download, Award, Ticket, Hash, ChevronDown, Trophy, Frown, PartyPopper } from "lucide-react";

/* ────────────────── Confetti Component ────────────────── */

const CONFETTI_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6",
  "#14b8a6", "#f97316", "#06b6d4", "#e11d48", "#a855f7",
];

function ConfettiOverlay({ count = 40 }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.2}s`,
      duration: `${1.8 + Math.random() * 1.5}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 5 + Math.random() * 6,
      shape: Math.random() > 0.5 ? "50%" : "2px",
    }));
  }, [count]);

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────── Win Result Component ────────────────── */

function WinResult({ result, prizeLabels, winningAmount, taxPerTicket, netAmountPerTicket, quantityValue, totalWinningAmount, totalTaxAmount, totalNetAmount, formatCurrency, animKey }) {
  return (
    <div key={animKey} className="relative overflow-hidden">
      <ConfettiOverlay count={45} />
      <div className="animate-win-entrance animate-glow-pulse rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-5">
        {/* Header with trophy */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <span className="animate-trophy-bounce flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200">
              <Trophy className="h-6 w-6" />
            </span>
            {/* Sparkle dots */}
            <span className="sparkle-dot -right-1 -top-1 bg-amber-400" style={{ animationDelay: "0s" }} />
            <span className="sparkle-dot -left-1.5 top-2 bg-cyan-400" style={{ animationDelay: "0.5s" }} />
            <span className="sparkle-dot -bottom-0.5 right-0 bg-pink-400" style={{ animationDelay: "1s" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-extrabold text-emerald-900">Chúc mừng! Vé trúng giải! 🎉</p>
            </div>
            <p className="mt-0.5 text-sm text-emerald-700">
              Các giải trúng: <strong>{result.prizes.map((p) => prizeLabels[p] || p).join(", ")}</strong>
            </p>
          </div>
        </div>

        {/* Prize details with staggered count-up animation */}
        <div className="space-y-1.5 text-sm text-emerald-800">
          <p className="animate-count-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
            Tiền thưởng 1 vé: <strong className="text-emerald-900">{formatCurrency(winningAmount)}</strong>
          </p>
          <p className="animate-count-up" style={{ animationDelay: "0.35s", opacity: 0 }}>
            Thuế TNCN 1 vé: <strong>{formatCurrency(taxPerTicket)}</strong>
          </p>
          <p className="animate-count-up" style={{ animationDelay: "0.5s", opacity: 0 }}>
            Nhận về 1 vé: <strong>{formatCurrency(netAmountPerTicket)}</strong>
          </p>
          <div className="animate-count-up mt-3 border-t border-emerald-200/60 pt-3" style={{ animationDelay: "0.65s", opacity: 0 }}>
            <p>Tổng thưởng ({quantityValue} vé): <strong className="text-base">{formatCurrency(totalWinningAmount)}</strong></p>
            <p className="mt-1">Tổng thuế: <strong>{formatCurrency(totalTaxAmount)}</strong></p>
            <p className="mt-2 text-lg font-extrabold text-emerald-900">
              💰 Tổng nhận thực tế: {formatCurrency(totalNetAmount)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-emerald-700/70">Ghi chú: Thuế tính trên phần giá trị trúng vượt 10.000.000đ của mỗi giải lẻ trên vé.</p>
      </div>
    </div>
  );
}

/* ────────────────── Lose Result Component ────────────────── */

function LoseResult({ animKey }) {
  return (
    <div key={animKey} className="animate-lose-entrance">
      <div className="animate-shake rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-stone-50 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
            <Frown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-700">Rất tiếc, vé của bạn không trúng giải nào.</p>
            <p className="mt-0.5 text-xs text-slate-400">Chúc bạn may mắn lần sau! 🍀</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Station Data ────────────────── */

const stationsNam = [
  { value: "xsag", label: "An Giang" },
  { value: "xsbaclieu", label: "Bạc Liêu" },
  { value: "xsbentre", label: "Bến Tre" },
  { value: "xsbinhduong", label: "Bình Dương" },
  { value: "xsbinhphuoc", label: "Bình Phước" },
  { value: "xsbinhthuan", label: "Bình Thuận" },
  { value: "xscamau", label: "Cà Mau" },
  { value: "xscantho", label: "Cần Thơ" },
  { value: "xsdalat", label: "Đà Lạt" },
  { value: "xsdongnai", label: "Đồng Nai" },
  { value: "xsdongthap", label: "Đồng Tháp" },
  { value: "xshaugiang", label: "Hậu Giang" },
  { value: "xshcm", label: "Hồ Chí Minh" },
  { value: "xskiengiang", label: "Kiên Giang" },
  { value: "xslongan", label: "Long An" },
  { value: "xssoctrang", label: "Sóc Trăng" },
  { value: "xstayninh", label: "Tây Ninh" },
  { value: "xstiengiang", label: "Tiền Giang" },
  { value: "xstravinh", label: "Trà Vinh" },
  { value: "xsvinhlong", label: "Vĩnh Long" },
  { value: "xsvungtau", label: "Vũng Tàu" },
];

const stationsTrung = [
  { value: "xsquangbinh", label: "Quảng Bình" },
  { value: "xsquangtri", label: "Quảng Trị" },
  { value: "xshue", label: "Thừa Thiên Huế" },
  { value: "xsdanang", label: "Đà Nẵng" },
  { value: "xsquangnam", label: "Quảng Nam" },
  { value: "xsquangngai", label: "Quảng Ngãi" },
  { value: "xsbinhdinh", label: "Bình Định" },
  { value: "xsphuyen", label: "Phú Yên" },
  { value: "xskhanhhoa", label: "Khánh Hòa" },
  { value: "xsninhthuan", label: "Ninh Thuận" },
  { value: "xsdaklak", label: "Đắk Lắk" },
  { value: "xsdaknong", label: "Đắk Nông" },
  { value: "xsgialai", label: "Gia Lai" },
  { value: "xskontum", label: "Kon Tum" },
];

const stationsBac = [{ value: "xsmb", label: "Miền Bắc" }];

/* ────────────────── Prize Config ────────────────── */

const TAX_EXEMPTION_PER_TICKET = 10000000;
const TAX_RATE = 0.1;

const REGION_PRIZES = {
  nam: {
    amounts: { DB: 2000000000, SubDB: 50000000, G1: 30000000, G2: 15000000, G3: 10000000, G4: 3000000, G5: 1000000, G6: 400000, G7: 200000, G8: 100000, KK: 6000000 },
    labels: { DB: "Giải đặc biệt", SubDB: "Giải phụ đặc biệt", G1: "Giải nhất", G2: "Giải nhì", G3: "Giải ba", G4: "Giải tư", G5: "Giải năm", G6: "Giải sáu", G7: "Giải bảy", G8: "Giải tám", KK: "Giải khuyến khích" },
    order: ["DB", "SubDB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"],
  },
  trung: {
    amounts: { DB: 2000000000, SubDB: 50000000, G1: 30000000, G2: 15000000, G3: 10000000, G4: 3000000, G5: 1000000, G6: 400000, G7: 200000, G8: 100000, KK: 6000000 },
    labels: { DB: "Giải đặc biệt", SubDB: "Giải phụ đặc biệt", G1: "Giải nhất", G2: "Giải nhì", G3: "Giải ba", G4: "Giải tư", G5: "Giải năm", G6: "Giải sáu", G7: "Giải bảy", G8: "Giải tám", KK: "Giải khuyến khích" },
    order: ["DB", "SubDB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "KK"],
  },
  bac: {
    amounts: { DB: 500000000, SubDB: 25000000, G1: 10000000, G2: 5000000, G3: 1000000, G4: 400000, G5: 200000, G6: 100000, G7: 40000, KK: 40000 },
    labels: { DB: "Giải đặc biệt", SubDB: "Giải phụ đặc biệt", G1: "Giải nhất", G2: "Giải nhì", G3: "Giải ba", G4: "Giải tư", G5: "Giải năm", G6: "Giải sáu", G7: "Giải bảy", KK: "Giải khuyến khích" },
    order: ["DB", "SubDB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "KK"],
  },
};

/* ────────────────── Helpers ────────────────── */

const CRAWL_SWITCH_HOUR = 17;
const CRAWL_SWITCH_MINUTE = 30;

function getDefaultDate() {
  const now = new Date();
  const switched =
    now.getHours() > CRAWL_SWITCH_HOUR ||
    (now.getHours() === CRAWL_SWITCH_HOUR && now.getMinutes() >= CRAWL_SWITCH_MINUTE);
  if (!switched) now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatRealtime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

async function readJsonSafe(response) {
  const text = await response.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Phản hồi từ server không phải JSON: ${text.slice(0, 120)}`); }
}

/* ────────────────── Tiny SVG icons for region tabs ────────────────── */

const RegionIconSouth = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zm8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zm11.95-3.54a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM7.17 13.89a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zm9.78 3.06a.75.75 0 01-1.06 0l-1.06-1.06a.75.75 0 111.06-1.06l1.06 1.06a.75.75 0 010 1.06zM7.17 6.11a.75.75 0 01-1.06 0L5.05 5.05a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.06z" /></svg>
);
const RegionIconCentral = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145c.182-.1.422-.242.704-.427a14.5 14.5 0 002.196-1.846C15.34 14.59 17 12.25 17 9.5 17 5.634 13.866 2.5 10 2.5S3 5.634 3 9.5c0 2.75 1.66 5.09 3.485 6.904a14.5 14.5 0 002.196 1.846c.282.185.522.328.704.427a5.741 5.741 0 00.299.153l.006.003zM10 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" /></svg>
);
const RegionIconNorth = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" /></svg>
);

/* ────────────────── Component ────────────────── */

function LotteryChecker() {
  const [region, setRegion] = useState("nam");
  const [date, setDate] = useState(getDefaultDate());
  const [station, setStation] = useState("");
  const [number, setNumber] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState("1");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [resultAnimKey, setResultAnimKey] = useState(0);
  const [board, setBoard] = useState(null);
  const [availableStations, setAvailableStations] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const tableScrollRef = useRef(null);
  const stationSelectRef = useRef(null);

  const stations = useMemo(() => {
    switch (region) {
      case "trung": return stationsTrung;
      case "bac": return stationsBac;
      default: return stationsNam;
    }
  }, [region]);

  const maxDigits = useMemo(() => (region === "bac" ? 5 : 6), [region]);
  const stationValues = useMemo(() => new Set(stations.map((i) => i.value)), [stations]);

  const regionInfo = useMemo(() => {
    const m = {
      nam: { label: "Miền Nam", title: "Kiểm Tra Kết Quả Xổ Số Miền Nam", description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.", prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Nam." },
      trung: { label: "Miền Trung", title: "Kiểm Tra Kết Quả Xổ Số Miền Trung", description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.", prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Trung." },
      bac: { label: "Miền Bắc", title: "Kiểm Tra Kết Quả Xổ Số Miền Bắc", description: "Chọn ngày, đài và kiểm tra vé. Dữ liệu lấy từ nguồn công khai.", prizeModalDesc: "Cơ cấu giải thưởng tham khảo cho vé số kiến thiết miền Bắc." },
    };
    return m[region];
  }, [region]);

  const currentPrizes = useMemo(() => REGION_PRIZES[region], [region]);
  const prizeOrder = currentPrizes.order;
  const prizeAmounts = currentPrizes.amounts;
  const prizeLabels = currentPrizes.labels;

  const canCheck = useMemo(() => number.trim().length > 0, [number]);
  const quantityValue = useMemo(() => { const p = parseInt(ticketQuantity, 10); return Number.isFinite(p) && p > 0 ? p : 1; }, [ticketQuantity]);

  const stationAvailabilityMap = useMemo(() => {
    const map = {};
    for (const item of availableStations) map[item.station] = item;
    return map;
  }, [availableStations]);

  const sortedStations = useMemo(() => {
    return stations.map((item) => {
      const info = stationAvailabilityMap[item.value];
      return { ...item, available: info ? info.available : false };
    }).sort((a, b) => Number(b.available) - Number(a.available));
  }, [stations, stationAvailabilityMap]);

  const availableToday = useMemo(
    () => availableStations.filter((item) => item.available && stationValues.has(item.station)),
    [availableStations, stationValues]
  );

  const selectedStationInfo = stationAvailabilityMap[station];
  const matchedPrizeSet = useMemo(() => new Set(result?.hit ? result.prizes || [] : []), [result]);

  const winningAmount = useMemo(() => {
    if (!result?.hit || !result.prizes) return 0;
    return result.prizes.reduce((s, p) => s + (prizeAmounts[p] || 0), 0);
  }, [result, prizeAmounts]);

  const totalWinningAmount = winningAmount * quantityValue;

  const taxPerTicket = useMemo(() => {
    if (!result?.hit || !result.prizes) return 0;
    return result.prizes.reduce((s, p) => {
      const amt = prizeAmounts[p] || 0;
      return s + Math.round(Math.max(0, amt - TAX_EXEMPTION_PER_TICKET) * TAX_RATE);
    }, 0);
  }, [result, prizeAmounts]);

  const totalTaxAmount = taxPerTicket * quantityValue;
  const netAmountPerTicket = Math.max(0, winningAmount - taxPerTicket);
  const totalNetAmount = netAmountPerTicket * quantityValue;

  /* ── Actions ── */

  async function loadAvailableStations(selectedDate) {
    setLoadingStations(true);
    try {
      const r = await fetch(`/api/available-stations?${new URLSearchParams({ date: selectedDate })}`);
      const d = await readJsonSafe(r);
      if (!r.ok) throw new Error(d.detail || d.error || "Tải danh sách đài thất bại.");
      const list = d.stations || [];
      setAvailableStations(list);
      if (region === "bac") { setStation("xsmb"); }
      else {
        const cur = list.find((i) => i.station === station);
        if (!cur || !cur.available) setStation("");
      }
    } catch (e) { setMessage(e.message); }
    finally { setLoadingStations(false); }
  }

  async function loadBoard() {
    if (!station) { setMessage("Vui lòng chọn đài xổ số mở thưởng trong ngày để tải bảng kết quả!"); stationSelectRef.current?.focus(); return; }
    setLoadingBoard(true); setMessage("");
    try {
      const r = await fetch(`/api/results?${new URLSearchParams({ date, station })}`);
      const d = await readJsonSafe(r);
      if (!r.ok) throw new Error(d.detail || d.error || "Tải bảng kết quả thất bại.");
      setBoard(d.prizes || {});
    } catch (e) { setMessage(e.message); }
    finally { setLoadingBoard(false); }
  }

  async function handleCheck() {
    if (!station) { setMessage("Vui lòng chọn đài xổ số mở thưởng trong ngày để kiểm tra!"); stationSelectRef.current?.focus(); return; }
    if (!canCheck) { setMessage("Vui lòng nhập số vé cần kiểm tra."); return; }
    setLoadingCheck(true); setMessage("");
    try {
      const r = await fetch(`/api/check?${new URLSearchParams({ date, station, number: number.trim() })}`);
      const d = await readJsonSafe(r);
      if (!r.ok) throw new Error(d.detail || d.error || "Kiểm tra kết quả thất bại.");
      setResult(d);
      setResultAnimKey((k) => k + 1);
      if (!board) await loadBoard();
    } catch (e) { setMessage(e.message); setResult(null); }
    finally { setLoadingCheck(false); }
  }

  function handleDateChange(v) { setDate(v); setResult(null); setBoard(null); setMessage(""); }
  function handleRegionChange(r) { setRegion(r); setResult(null); setBoard(null); setMessage(""); setNumber(""); if (r === "trung") setStation(stationsTrung[0]?.value || ""); else if (r === "bac") setStation("xsmb"); else setStation(""); }
  function handleStationChange(v) { setStation(v); setResult(null); setBoard(null); setMessage(""); }
  function isMatchedNumber(v) { const t = number.trim(); const s = String(v); return t === s || (t.length >= s.length && t.endsWith(s)); }

  useEffect(() => { loadAvailableStations(date); }, [date, region]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!result?.hit || !result.best_prize) return;
    const c = tableScrollRef.current; if (!c) return;
    const t = c.querySelector(`[data-prize-row="${result.best_prize}"]`);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [result]);

  /* ── Find display label for current station ── */
  const stationLabel = useMemo(() => {
    const all = [...stationsNam, ...stationsTrung, ...stationsBac];
    return all.find((s) => s.value === station)?.label || station;
  }, [station]);

  /* ── Region tab config ── */
  const regionTabs = [
    { key: "nam", label: "Miền Nam", icon: <RegionIconSouth /> },
    { key: "trung", label: "Miền Trung", icon: <RegionIconCentral /> },
    { key: "bac", label: "Miền Bắc", icon: <RegionIconNorth /> },
  ];

  /* ── Board prize rows to display (exclude computed prizes) ── */
  const boardPrizes = prizeOrder.filter((p) => p !== "SubDB" && p !== "KK");

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#e8f4fc] via-[#f0f4f8] to-[#faf5eb] px-4 py-6 sm:px-6">
      {/* Soft ambient blobs */}
      <div className="pointer-events-none absolute -left-32 -top-20 h-[500px] w-[500px] rounded-full bg-cyan-200/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-32 h-[400px] w-[400px] rounded-full bg-amber-200/25 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-indigo-200/15 blur-[80px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1200px]">

        {/* ── Top Navigation Bar ── */}
        <nav className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-2xl bg-white/70 p-1 backdrop-blur-sm card-shadow">
            {regionTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleRegionChange(tab.key)}
                className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  region === tab.key
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {region === tab.key && (
                  <span className="nav-indicator absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400" />
                )}
              </button>
            ))}
          </div>

          {/* Time badge */}
          <div className="hidden items-center gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-xs text-slate-500 backdrop-blur-sm card-shadow sm:flex">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Thời gian hiện tại: <strong className="text-slate-700">{formatRealtime(now)}</strong></span>
          </div>
        </nav>

        {/* ── Headline ── */}
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
            {regionInfo.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{regionInfo.description}</p>
          {/* Mobile time */}
          <p className="mt-2 text-xs text-slate-400 sm:hidden">
            Thời gian hiện tại: <strong className="text-slate-600">{formatRealtime(now)}</strong>
          </p>
        </header>

        {/* ── Two-column grid ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">

          {/* ═══════════ LEFT: Input Card ═══════════ */}
          <section className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur-sm card-shadow-lg sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              <Ticket className="h-3.5 w-3.5" />
              Thông tin dò vé
            </h2>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày quay</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100/60"
                  />
                </div>
              </div>

              {/* Station selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Đài xổ số</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    ref={stationSelectRef}
                    value={station}
                    onChange={(e) => handleStationChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100/60"
                  >
                    <option value="">-- Chọn đài xổ số --</option>
                    {sortedStations.map((item) => {
                      const info = stationAvailabilityMap[item.value];
                      const disabled = info ? !info.available : false;
                      return (
                        <option key={item.value} value={item.value} disabled={disabled}>
                          {item.label} {info ? (info.available ? "✓" : "✗") : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {loadingStations
                    ? "Đang kiểm tra đài có kết quả..."
                    : selectedStationInfo
                      ? selectedStationInfo.available
                        ? "Đài đang chọn có kết quả trong ngày này."
                        : "Đài đang chọn chưa có kết quả trong ngày này."
                      : "Chọn ngày để kiểm tra đài có kết quả."}
                </p>
              </div>

              {/* Available stations pills */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Đài mở thưởng trong ngày
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {loadingStations && <span className="text-xs text-slate-400">Đang tải...</span>}
                  {!loadingStations && availableToday.length === 0 && (
                    <span className="text-xs text-slate-400">Chưa xác định được đài nào có kết quả.</span>
                  )}
                  {!loadingStations && availableToday.map((item) => (
                    <button
                      key={item.station}
                      type="button"
                      onClick={() => handleStationChange(item.station)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        station === item.station
                          ? "bg-slate-800 text-white shadow-sm"
                          : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                      }`}
                    >
                      {item.station}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket number & quantity */}
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Số vé</label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={region === "bac" ? "Ví dụ: 31854" : "Ví dụ: 138170"}
                      maxLength={maxDigits}
                      value={number}
                      onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100/60"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng vé</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={ticketQuantity}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      setTicketQuantity(d === "" ? "" : String(Math.max(1, Number(d))));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100/60"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setIsPrizeModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
                >
                  <Award className="h-4 w-4 text-amber-500" />
                  Bảng tiền thưởng
                </button>

                <button
                  onClick={handleCheck}
                  disabled={loadingCheck}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 text-sm font-semibold text-white shadow-md transition hover:bg-slate-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {loadingCheck ? "Đang kiểm tra..." : "Kiểm tra kết quả"}
                </button>

                <button
                  onClick={loadBoard}
                  disabled={loadingBoard}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4 text-cyan-500" />
                  {loadingBoard ? "Đang tải..." : "Tải bảng kết quả"}
                </button>
              </div>

              {/* Message */}
              {message && (
                <div className="animate-fade-up rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
                  <span className="mr-1.5 font-semibold">⚠</span> {message}
                </div>
              )}

              {/* Win result */}
              {result && result.hit && (
                <WinResult
                  result={result}
                  prizeLabels={prizeLabels}
                  winningAmount={winningAmount}
                  taxPerTicket={taxPerTicket}
                  netAmountPerTicket={netAmountPerTicket}
                  quantityValue={quantityValue}
                  totalWinningAmount={totalWinningAmount}
                  totalTaxAmount={totalTaxAmount}
                  totalNetAmount={totalNetAmount}
                  formatCurrency={formatCurrency}
                  animKey={resultAnimKey}
                />
              )}

              {result && !result.hit && (
                <LoseResult animKey={resultAnimKey} />
              )}
            </div>
          </section>

          {/* ═══════════ RIGHT: Results Table Card ═══════════ */}
          <section className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur-sm card-shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <Table2 className="h-3.5 w-3.5" />
                Bảng kết quả
              </h2>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {stationLabel || "—"} • {date}
              </span>
            </div>

            <div
              ref={tableScrollRef}
              className="scrollbar-thin max-h-[520px] overflow-auto rounded-xl border border-slate-100"
            >
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Giải
                    </th>
                    <th className="border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Số trúng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boardPrizes.map((prize, idx) => {
                    const numbers = board?.[prize] || [];
                    const rowHit = matchedPrizeSet.has(prize);
                    const isDB = prize === "DB";
                    return (
                      <tr
                        key={prize}
                        data-prize-row={prize}
                        className={`align-top transition-colors ${
                          rowHit ? "bg-emerald-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className={`border-b border-slate-100 px-4 py-2.5 text-sm font-semibold ${rowHit ? "text-emerald-700" : "text-slate-700"}`}>
                          <span className="inline-flex items-center gap-1.5">
                            {isDB && <Star className="h-3.5 w-3.5 text-amber-400" />}
                            {prize}
                          </span>
                        </td>
                        <td className={`border-b border-slate-100 px-4 py-2.5 ${rowHit ? "text-emerald-700" : "text-slate-700"}`}>
                          {numbers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {numbers.map((item) => {
                                const hit = rowHit && isMatchedNumber(item);
                                return (
                                  <span
                                    key={`${prize}-${item}`}
                                    className={`inline-block rounded-md px-2 py-0.5 font-mono text-sm tracking-wide ${
                                      hit
                                        ? "animate-number-highlight bg-emerald-200 font-bold text-emerald-900 ring-2 ring-emerald-300"
                                        : isDB
                                          ? "font-bold text-red-600"
                                          : ""
                                    }`}
                                  >
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
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

      {/* ═══════════ Prize Modal ═══════════ */}
      {isPrizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsPrizeModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white card-shadow-lg">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bảng tiền thưởng</h3>
                <p className="mt-0.5 text-sm text-slate-500">{regionInfo.prizeModalDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrizeModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scrollbar-thin max-h-[70vh] overflow-auto px-6 py-4">
              {result?.hit && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p>Vé của bạn trúng giải: <strong>{result.prizes.map((p) => prizeLabels[p] || p).join(", ")}</strong></p>
                  <p className="mt-1">Tiền 1 vé: <strong>{formatCurrency(winningAmount)}</strong></p>
                  <p className="mt-1">Số lượng vé: <strong>{quantityValue}</strong></p>
                  <p className="mt-1">Thuế 1 vé: <strong>{formatCurrency(taxPerTicket)}</strong></p>
                  <p className="mt-1">Nhận về 1 vé: <strong>{formatCurrency(netAmountPerTicket)}</strong></p>
                  <p className="mt-1">Tổng thưởng: <strong>{formatCurrency(totalWinningAmount)}</strong></p>
                  <p className="mt-1">Tổng thuế: <strong>{formatCurrency(totalTaxAmount)}</strong></p>
                  <p className="mt-1 font-bold">Tổng nhận: <strong className="text-emerald-800">{formatCurrency(totalNetAmount)}</strong></p>
                  <p className="mt-2 text-[11px] text-emerald-700/80">Thuế tính theo phần vượt 10.000.000đ của mỗi giải lẻ trúng trên vé.</p>
                </div>
              )}

              {!result?.hit && number.trim() && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Vé hiện tại chưa có kết quả trúng. Bạn vẫn có thể xem cơ cấu tiền thưởng bên dưới.
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Mã giải</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Tên giải</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Tiền thưởng / vé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeOrder.map((prize) => {
                      const hit = result?.prizes?.includes(prize);
                      return (
                        <tr key={prize} className={hit ? "bg-emerald-50" : "bg-white"}>
                          <td className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
                            <span className="inline-flex items-center gap-1.5">
                              {prize === "DB" && <Star className="h-3.5 w-3.5 text-amber-400" />}
                              {prize}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2.5 text-sm text-slate-600">{prizeLabels[prize]}</td>
                          <td className="border-b border-slate-100 px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{formatCurrency(prizeAmounts[prize])}</td>
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
