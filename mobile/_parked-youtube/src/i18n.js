// Language registry shared by the UI (app.js), the assistant, the intent
// classifier and the draft generator. Adding a language means: one entry in
// LANGS, its strings in i18n-extra.js, and a pack in assistant.js /
// ai-draft-generator.js / intent-classifier.js (each falls back to English).

export const LANGS = [
  { code: "tr", name: "Türkçe", locale: "tr-TR", dir: "ltr", currency: "TRY" },
  { code: "en", name: "English", locale: "en-US", dir: "ltr", currency: "USD" },
  { code: "de", name: "Deutsch", locale: "de-DE", dir: "ltr", currency: "EUR" },
  { code: "fr", name: "Français", locale: "fr-FR", dir: "ltr", currency: "EUR" },
  { code: "it", name: "Italiano", locale: "it-IT", dir: "ltr", currency: "EUR" },
  { code: "es", name: "Español", locale: "es-ES", dir: "ltr", currency: "EUR" },
  { code: "ar", name: "العربية", locale: "ar-EG", dir: "rtl", currency: "SAR" },
];

// Currencies a deal can be entered in. Each deal stores its own currency (no
// conversion happens anywhere); the UI language only picks the default for new
// deals and how every amount is written (digits, separators, symbol position).
export const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "SAR", "AED"];
export const defaultCurrency = (code) => langInfo(code).currency;

export function formatMoney(amount, currency, code = current) {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(langInfo(code).locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString(langInfo(code).locale)} ${currency}`;
  }
}

// Sum amounts per currency ("45.000 ₺ + 2.000 $") — never mixes currencies.
export function formatMoneyTotals(items, code = current) {
  const totals = new Map();
  for (const { amount, currency } of items) totals.set(currency || "TRY", (totals.get(currency || "TRY") ?? 0) + Number(amount));
  return [...totals].map(([cur, sum]) => formatMoney(sum, cur, code)).join(" + ");
}

export const DEFAULT_LANG = "en";
let current = DEFAULT_LANG;
export const LANG_STORAGE_KEY = "creatoros_lang";

const CODES = LANGS.map((l) => l.code);
export const isSupported = (code) => CODES.includes(code);
export const langInfo = (code) => LANGS.find((l) => l.code === code) ?? LANGS.find((l) => l.code === DEFAULT_LANG);

// First supported language among the device's preferred languages ("de-AT"
// counts as "de"); English when the device uses none of ours.
export function detectDeviceLang(nav = typeof navigator !== "undefined" ? navigator : null) {
  const preferred = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (isSupported(base)) return base;
  }
  return DEFAULT_LANG;
}

export function readStoredLang() {
  try {
    const value = localStorage.getItem(LANG_STORAGE_KEY);
    return isSupported(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLang(code) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    // storage unavailable — the choice just won't survive a restart
  }
}

// Current UI language, readable from modules that don't hold app state
// (draft generator, assistant). app.js keeps it in sync via setCurrentLang.
export const getCurrentLang = () => current;
export function setCurrentLang(code) {
  if (isSupported(code)) current = code;
}

// Lowercase and fold text so keyword matching ignores accents and casing:
// Latin diacritics are stripped (ü→u, é→e, ş→s), Turkish dotless ı→i, ß→ss,
// and Arabic diacritics/hamza/ta-marbuta variants are unified.
export function normalize(text) {
  return String(text ?? "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}
