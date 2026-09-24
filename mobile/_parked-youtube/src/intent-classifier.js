// On-device rule-based intent classifier. Keyword rules exist for every
// supported language (tr, en, de, fr, it, es, ar) and are matched together: the
// message's language is not detected, all lists are simply checked. Both the
// message and the keywords are folded with normalize() (no accents, lowercase),
// so "Bütçe", "butce" and "BUTCE" are the same. Enum values (FAN, BRAND_DEAL,
// COLLABORATION, BOOKING_REQUEST, SPAM) are unchanged so nothing else in the
// app (data.js's INTENT_META, db.js) needs to know about languages.

import { normalize } from "./i18n.js";

const RULES = [
  {
    intent: "SPAM",
    keywords: [
      // tr
      "garantili", "hemen tikla", "tikla", "bit.ly", "sinirli teklif", "kacirma", "takipci kazan",
      // en
      "click here", "click now", "guaranteed", "limited offer", "don't miss", "free followers", "get followers", "buy followers", "win a free",
      // de
      "jetzt klicken", "hier klicken", "garantiert", "begrenztes angebot", "nicht verpassen", "gratis follower", "follower kaufen",
      // fr
      "cliquez", "garanti", "offre limitee", "ne manquez pas", "abonnes gratuits", "gagnez des abonnes",
      // it
      "clicca qui", "clicca ora", "garantito", "offerta limitata", "non perdere", "follower gratis", "compra follower",
      // es
      "haz clic aqui", "haga clic", "garantizado", "oferta limitada", "no te lo pierdas", "seguidores gratis", "comprar seguidores",
      // ar
      "اضغط هنا", "اضغط الان", "مضمون", "عرض محدود", "لا تفوت", "متابعين مجانا", "زيادة المتابعين",
    ],
  },
  {
    intent: "COLLABORATION",
    keywords: [
      // "collab" also covers collaboration/collaborer/collaborare/collaborazione
      "is birligi", "isbirligi", "ortaklik",
      "collab", "partnership", "partner up", "work together",
      "zusammenarbeit", "kooperation", "partnerschaft", "zusammenarbeiten",
      "partenariat", "travailler ensemble",
      "lavorare insieme",
      "colaboracion", "colaborar", "alianza", "trabajar juntos",
      "تعاون", "شراكه", "نعمل معا", "العمل معا",
    ],
  },
  {
    intent: "BRAND_DEAL",
    keywords: [
      "butce", "sponsor", "teklif ediyoruz", "urun hediyesi", "lansman", "reels", "story icin",
      "budget", "sponsorship", "sponsored", "we offer", "product gift", "gifted", "launch", "paid post", "brand ambassador", "fee",
      "sponsoring", "wir bieten", "produktgeschenk", "produkteinfuhrung", "honorar", "gesponsert", "markenbotschafter", "vergutung",
      "budget", "parrainage", "sponsorise", "nous proposons", "cadeau produit", "lancement", "remuneration", "ambassadeur", "cachet",
      "budget", "sponsorizzazione", "sponsorizzato", "offriamo", "regalo prodotto", "lancio", "compenso", "ambasciatore", "post a pagamento",
      "presupuesto", "patrocinio", "patrocinado", "ofrecemos", "regalo de producto", "lanzamiento", "honorarios", "embajador", "publicacion pagada",
      "ميزانيه", "رعايه", "برعاية", "نقدم لك", "هديه", "اطلاق", "سفير", "اجر", "مدفوع",
    ],
  },
  {
    intent: "BOOKING_REQUEST",
    keywords: [
      // tr
      "gorusme", "ayarlayabilir miyiz", "uygun mu", "uygun musun",
      "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar",
      // en
      "meeting", "call", "schedule", "are you available", "available on", "book a", "appointment", "catch up",
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
      // de
      "besprechung", "termin", "haben sie zeit", "hast du zeit", "verfugbar", "gesprach", "telefonat",
      "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag",
      // fr
      "reunion", "rendez-vous", "rendez vous", "etes-vous disponible", "es-tu disponible", "disponible", "appel", "entretien",
      "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
      // it
      "riunione", "appuntamento", "sei disponibile", "e disponibile", "disponibile", "chiamata", "incontro", "fissare",
      "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica",
      // es
      "reunion", "cita", "estas disponible", "disponible", "llamada", "quedar", "agendar",
      "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
      // ar
      "اجتماع", "موعد", "مكالمه", "هل انت متاح", "متاح", "لقاء", "نرتب",
      "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعه", "السبت", "الاحد",
    ],
  },
  {
    intent: "FAN",
    keywords: [
      "cok tatli", "yakismis", "harika", "super", "bayildim", "tebrikler", "muhtesem",
      "love it", "love you", "so cute", "amazing", "awesome", "great", "congrats", "congratulations", "beautiful", "gorgeous", "you look",
      "so suss", "toll", "wunderschon", "super", "klasse", "gluckwunsch", "liebe es", "hinreissend", "grossartig",
      "j'adore", "magnifique", "genial", "felicitations", "bravo", "trop beau", "superbe", "tu es", "canon",
      "adoro", "bravissima", "bellissimo", "fantastico", "complimenti", "stupendo", "meraviglioso",
      "me encanta", "genial", "precioso", "felicidades", "enhorabuena", "increible", "guapa", "espectacular", "te quiero",
      "رائع", "جميل", "مبروك", "احبك", "مذهل", "ممتاز", "تجنن", "خرافي", "ما شاء الله",
    ],
  },
];

// Pre-fold the keywords once (the same fold as the message).
const FOLDED_RULES = RULES.map((rule) => ({ intent: rule.intent, keywords: [...new Set(rule.keywords.map(normalize))] }));

const BASE_CONFIDENCE = 0.6;
const CONFIDENCE_PER_MATCH = 0.1;
const MAX_CONFIDENCE = 0.97;
const DEFAULT_INCONCLUSIVE_CONFIDENCE = 0.5;
export const FALLBACK_THRESHOLD = 0.6;

// Short Latin keywords ("call", "fee", "toll", "tu es") would otherwise match
// inside longer words ("calling", "coffee", "stollen"), so they must start at
// a word boundary. Arabic and multi-word/punctuated keywords match anywhere.
const isArabic = (s) => /[؀-ۿ]/.test(s);
const startsAtBoundary = (haystack, keyword) => {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(keyword, from);
    if (at === -1) return false;
    if (at === 0 || !/[a-z0-9]/.test(haystack[at - 1])) return true;
    from = at + 1;
  }
};
const matches = (haystack, keyword) => (isArabic(keyword) ? haystack.includes(keyword) : startsAtBoundary(haystack, keyword));

function classifyRuleBased(text) {
  const haystack = normalize(text);

  let best = null;
  for (const rule of FOLDED_RULES) {
    const count = rule.keywords.filter((keyword) => matches(haystack, keyword)).length;
    if (count > 0 && (!best || count > best.matches)) {
      best = { intent: rule.intent, matches: count };
    }
  }

  if (!best) {
    return { intent: "FAN", confidence: DEFAULT_INCONCLUSIVE_CONFIDENCE, source: "RULE_BASED" };
  }

  const confidence = Math.min(BASE_CONFIDENCE + best.matches * CONFIDENCE_PER_MATCH, MAX_CONFIDENCE);
  return { intent: best.intent, confidence, source: "RULE_BASED" };
}

// Mirrors HybridIntentClassifier: only consults the (optional) LLM fallback
// when the rule-based pass is inconclusive. `llmFallback` is injected so
// db.js can pass a real OpenAI-backed fallback for Pro users, or omit it
// entirely for the free tier (falls back to the inconclusive rule-based guess).
export async function classify(text, llmFallback) {
  const ruleBasedResult = classifyRuleBased(text);
  if (ruleBasedResult.confidence >= FALLBACK_THRESHOLD || !llmFallback) {
    return ruleBasedResult;
  }
  return llmFallback(text);
}
