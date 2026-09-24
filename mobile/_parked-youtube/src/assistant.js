// In-app assistant (Pro). Two layers:
//  1. Local command engine — fixed commands answered straight from the
//     on-device data. No key, no network, no cost. A question is recognised
//     in ANY supported language (keyword stems below, folded to plain
//     letters), and the answer is written in the user's UI language.
//  2. AI layer — only when no local command matches (or the question asks for
//     judgement) AND the user saved their own OpenAI key: a compact data
//     summary (not the whole inbox) goes to the model, with a prompt in the
//     user's language. The app puts no limit on it; usage is billed by the
//     user's own provider account.

import { getOpenAiKey } from "./entitlements.js";
import { chat } from "./ai-draft-generator.js";
import { getCurrentLang, langInfo, normalize, formatMoney, formatMoneyTotals } from "./i18n.js";

const DAY = 86_400_000;

// ---- keyword stems (folded: no accents, lowercase) — union of all languages ----
// Latin stems match token prefixes; Arabic stems match anywhere in the token
// (Arabic attaches "ال" and other prefixes directly to the word).
const STEMS = {
  help: ["yardim", "neler", "komut", "help", "command", "hilfe", "befehl", "aide", "commande", "مساعده", "اوامر", "aiuto", "comandi", "ayuda", "comandos"],
  deliverable: ["teslimat", "deliverable", "lieferung", "liefergegenstand", "livrable", "تسليم", "مخرجات", "consegn", "entrega"],
  late: ["gecik", "kalan", "bekle", "overdue", "late", "behind", "verspat", "uberfall", "ruckstand", "retard", "متاخر", "تاخر", "ritard", "scadut", "atrasad", "retras", "vencid"],
  link: ["link", "lien", "رابط", "روابط", "enlace"],
  booking: ["randevu", "toplanti", "gorusme", "booking", "appointment", "meeting", "schedule", "calendar", "termin", "besprechung", "buchung", "rendez", "rdv", "reunion", "reservation", "موعد", "مواعيد", "اجتماع", "appuntament", "riunion", "incontr", "calendario", "cita", "agenda"],
  today: ["bugun", "today", "heute", "aujourd", "اليوم", "oggi", "hoy"],
  tomorrow: ["yarin", "tomorrow", "morgen", "demain", "غدا", "domani", "manana"],
  deal: ["anlasma", "deal", "vereinbarung", "vertrag", "geschaft", "accord", "contrat", "contract", "صفقه", "صفقات", "اتفاق", "accord", "affar", "contratt", "acuerd", "trato", "contrat"],
  offer: ["teklif", "marka", "offer", "brand", "sponsor", "angebot", "marke", "offre", "marque", "proposition", "عرض", "عروض", "علامه", "offert", "marchi", "brand", "patrocin", "oferta", "marca"],
  message: ["dm", "mesaj", "bekle", "cevap", "yorum", "message", "waiting", "unanswered", "reply", "comment", "inbox", "nachricht", "unbeantwortet", "antwort", "warte", "attente", "reponse", "commentaire", "رسائل", "رساله", "رسال", "رد", "تعليق", "messagg", "risposta", "rispond", "commenti", "mensaj", "respuest", "respond", "comentari"],
  onlyDm: ["dm", "دي ام"],
};
// Multi-word cues for "judgement / writing" questions (checked on the folded text).
const ANALYSIS_STEMS = [
  "hangisi", "oner", "tavsiye", "neden", "kazan", "oncelik", "karsilas", "sence", "yaz", "taslak", "strateji", "mantikli",
  "best", "should", "recommend", "advice", "why", "prioriti", "compar", "draft", "write", "strategy", "worth",
  "beste", "sollte", "empfehl", "warum", "vergleich", "entwurf", "schreib", "strategie",
  "meilleur", "devrais", "recommand", "pourquoi", "brouillon", "ecri", "lequel", "laquelle",
  "migliore", "dovrei", "consigli", "perche", "confronta", "bozza", "scrivi", "strategia", "conviene",
  "mejor", "deberia", "recomiend", "porque", "compar", "borrador", "escrib", "estrategia", "priorid",
  "افضل", "انصح", "لماذا", "اكتب", "مسوده", "استراتيجيه", "اولويه", "قارن", "ايهما",
];
const ANALYSIS_PHRASES = ["ne cevap", "which one", "what should", "was soll", "que dois", "ماذا يجب", "cosa devo", "que debo", "por que"];

function tokens(text) {
  return normalize(text)
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const isArabic = (stem) => /[؀-ۿ]/.test(stem);
const hasStem = (toks, list) => toks.some((tok) => list.some((s) => (isArabic(s) ? tok.includes(s) : tok.startsWith(s))));

// ---- per-language answer packs ----
const PACKS = {
  tr: {
    channels: { INSTAGRAM_DM: "Instagram DM", INSTAGRAM_COMMENT: "Instagram yorum", EMAIL: "e-posta", YOUTUBE_COMMENT: "YouTube yorumu" },
    stages: { OFFER_RECEIVED: "teklif alındı", UNDER_REVIEW: "değerlendiriliyor", AWAITING_CONTRACT: "sözleşme bekliyor" },
    what: (dm) => (dm ? "DM" : "mesaj"),
    noPending: (w) => `Cevap bekleyen ${w} yok. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} cevap bekliyor (${byChannel}).\n${top}`,
    noOffers: "Yeni marka teklifi yok.",
    offers: (n, sender, msg) => `${n} cevaplanmamış marka teklifi var. En yenisi ${sender}: ${msg}`,
    labels: { today: "Bugün", tomorrow: "Yarın", upcoming: "Yaklaşan" },
    noBookings: (label) => `${label} için randevu yok.`,
    bookings: (label, n, lines) => `${label} ${n} randevu:\n${lines}`,
    noDeals: "Açık anlaşma yok.",
    deals: (n, total, byStage) => `${n} açık anlaşma, toplam ${total} (${byStage}).`,
    noOverdue: "Geciken teslimat yok.",
    overdue: (n, lines) => `${n} teslimat gecikti:\n${lines}`,
    noLinks: "Henüz link paketi gönderilmedi.",
    links: (week, total, top) => `Son 7 günde ${week}, toplamda ${total} link paketi gönderdin.${top ? ` En çok gönderilen: ${top}.` : ""}`,
    help: "Şunları sorabilirsin:\n• Kaç cevaplanmamış DM var?\n• Yeni marka teklifi var mı?\n• Bugünkü / yarınki randevularım\n• Bekleyen anlaşmalarım\n• Hangi teslimatlar gecikti?\n• Bu hafta kaç link gönderdim?",
    noKey: "Bu soruyu yerel komutlarla cevaplayamadım. Profil'e kendi OpenAI anahtarını eklersen serbest sorulara da cevap verebilirim.",
    sysPrompt:
      "Sen bir içerik üreticisinin kişisel asistanısın. Yalnızca aşağıdaki veriye dayanarak, Türkçe ve kısa (en fazla 4 cümle) cevap ver. Veride olmayan bir şeyi uydurma; bilmiyorsan bilmediğini söyle. Mesaj göndermek veya bir işlem yapmak gibi bir yeteneğin yok.",
    summary: { pending: "CEVAP BEKLEYEN MESAJLAR", bookings: "YAKLAŞAN RANDEVULAR", deals: "AÇIK ANLAŞMALAR", none: "yok", question: "SORU" },
  },
  en: {
    channels: { INSTAGRAM_DM: "Instagram DM", INSTAGRAM_COMMENT: "Instagram comment", EMAIL: "email", YOUTUBE_COMMENT: "YouTube comment" },
    stages: { OFFER_RECEIVED: "offer received", UNDER_REVIEW: "under review", AWAITING_CONTRACT: "awaiting contract" },
    what: (dm, n = 0) => (dm ? (n === 1 ? "DM" : "DMs") : n === 1 ? "message" : "messages"),
    noPending: (w) => `No ${w} waiting for a reply. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} waiting for a reply (${byChannel}).\n${top}`,
    noOffers: "No new brand offers.",
    offers: (n, sender, msg) => `${n} unanswered brand offer${n === 1 ? "" : "s"}. Latest from ${sender}: ${msg}`,
    labels: { today: "Today", tomorrow: "Tomorrow", upcoming: "Upcoming" },
    noBookings: (label) => `${label}: no bookings.`,
    bookings: (label, n, lines) => `${label}: ${n} booking${n === 1 ? "" : "s"}:\n${lines}`,
    noDeals: "No open deals.",
    deals: (n, total, byStage) => `${n} open deal${n === 1 ? "" : "s"}, ${total} in total (${byStage}).`,
    noOverdue: "No overdue deliverables.",
    overdue: (n, lines) => `${n} overdue deliverable${n === 1 ? "" : "s"}:\n${lines}`,
    noLinks: "No link bundles sent yet.",
    links: (week, total, top) => `You sent ${week} link bundle${week === 1 ? "" : "s"} in the last 7 days, ${total} in total.${top ? ` Most sent: ${top}.` : ""}`,
    help: "You can ask:\n• How many unanswered DMs do I have?\n• Any new brand offers?\n• My bookings today / tomorrow\n• My open deals\n• Which deliverables are overdue?\n• How many links did I send this week?",
    noKey: "I couldn't answer that with the built-in commands. Add your own OpenAI key in Profile and I can answer free-form questions too.",
    sysPrompt:
      "You are a content creator's personal assistant. Answer briefly (at most 4 sentences), in English, using only the data below. Don't invent anything that isn't in the data; say so if you don't know. You cannot send messages or take actions.",
    summary: { pending: "MESSAGES WAITING FOR A REPLY", bookings: "UPCOMING BOOKINGS", deals: "OPEN DEALS", none: "none", question: "QUESTION" },
  },
  de: {
    channels: { INSTAGRAM_DM: "Instagram-DM", INSTAGRAM_COMMENT: "Instagram-Kommentar", EMAIL: "E-Mail", YOUTUBE_COMMENT: "YouTube-Kommentar" },
    stages: { OFFER_RECEIVED: "Angebot erhalten", UNDER_REVIEW: "in Prüfung", AWAITING_CONTRACT: "wartet auf Vertrag" },
    what: (dm, n = 0) => (dm ? (n === 1 ? "DM" : "DMs") : n === 1 ? "Nachricht" : "Nachrichten"),
    noPending: (w) => `Keine ${w} warten auf eine Antwort. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} ${n === 1 ? "wartet" : "warten"} auf eine Antwort (${byChannel}).\n${top}`,
    noOffers: "Keine neuen Markenangebote.",
    offers: (n, sender, msg) => `${n} unbeantwortete${n === 1 ? "s" : ""} Markenangebot${n === 1 ? "" : "e"}. Neuestes von ${sender}: ${msg}`,
    labels: { today: "Heute", tomorrow: "Morgen", upcoming: "Anstehend" },
    noBookings: (label) => `${label}: keine Termine.`,
    bookings: (label, n, lines) => `${label}: ${n} Termin${n === 1 ? "" : "e"}:\n${lines}`,
    noDeals: "Keine offenen Deals.",
    deals: (n, total, byStage) => `${n} offene${n === 1 ? "r Deal" : " Deals"}, insgesamt ${total} (${byStage}).`,
    noOverdue: "Keine überfälligen Lieferungen.",
    overdue: (n, lines) => `${n} Lieferung${n === 1 ? "" : "en"} überfällig:\n${lines}`,
    noLinks: "Noch keine Link-Pakete gesendet.",
    links: (week, total, top) => `In den letzten 7 Tagen hast du ${week} Link-Paket${week === 1 ? "" : "e"} gesendet, insgesamt ${total}.${top ? ` Am häufigsten: ${top}.` : ""}`,
    help: "Du kannst fragen:\n• Wie viele unbeantwortete DMs habe ich?\n• Gibt es neue Markenangebote?\n• Meine Termine heute / morgen\n• Meine offenen Deals\n• Welche Lieferungen sind überfällig?\n• Wie viele Links habe ich diese Woche gesendet?",
    noKey: "Das konnte ich mit den eingebauten Befehlen nicht beantworten. Füge im Profil deinen eigenen OpenAI-Schlüssel hinzu, dann kann ich auch freie Fragen beantworten.",
    sysPrompt:
      "Du bist der persönliche Assistent eines Content-Creators. Antworte kurz (höchstens 4 Sätze) auf Deutsch und nur anhand der folgenden Daten. Erfinde nichts, was nicht in den Daten steht; sage, wenn du etwas nicht weißt. Du kannst keine Nachrichten senden oder Aktionen ausführen.",
    summary: { pending: "NACHRICHTEN, DIE AUF ANTWORT WARTEN", bookings: "ANSTEHENDE TERMINE", deals: "OFFENE DEALS", none: "keine", question: "FRAGE" },
  },
  fr: {
    channels: { INSTAGRAM_DM: "DM Instagram", INSTAGRAM_COMMENT: "commentaire Instagram", EMAIL: "e-mail", YOUTUBE_COMMENT: "commentaire YouTube" },
    stages: { OFFER_RECEIVED: "offre reçue", UNDER_REVIEW: "en cours d'examen", AWAITING_CONTRACT: "en attente du contrat" },
    what: (dm) => (dm ? "DM" : "messages"),
    noPending: (w) => `Aucun ${w} en attente de réponse. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} en attente de réponse (${byChannel}).\n${top}`,
    noOffers: "Aucune nouvelle offre de marque.",
    offers: (n, sender, msg) => `${n} offre${n === 1 ? "" : "s"} de marque sans réponse. La plus récente de ${sender} : ${msg}`,
    labels: { today: "Aujourd'hui", tomorrow: "Demain", upcoming: "À venir" },
    noBookings: (label) => `${label} : aucun rendez-vous.`,
    bookings: (label, n, lines) => `${label} : ${n} rendez-vous :\n${lines}`,
    noDeals: "Aucun accord en cours.",
    deals: (n, total, byStage) => `${n} accord${n === 1 ? "" : "s"} en cours, ${total} au total (${byStage}).`,
    noOverdue: "Aucun livrable en retard.",
    overdue: (n, lines) => `${n} livrable${n === 1 ? "" : "s"} en retard :\n${lines}`,
    noLinks: "Aucun lot de liens envoyé pour l'instant.",
    links: (week, total, top) => `Vous avez envoyé ${week} lot${week === 1 ? "" : "s"} de liens ces 7 derniers jours, ${total} au total.${top ? ` Le plus envoyé : ${top}.` : ""}`,
    help: "Vous pouvez demander :\n• Combien de DM sans réponse ai-je ?\n• Y a-t-il de nouvelles offres de marques ?\n• Mes rendez-vous aujourd'hui / demain\n• Mes accords en cours\n• Quels livrables sont en retard ?\n• Combien de liens ai-je envoyés cette semaine ?",
    noKey: "Je n'ai pas pu répondre avec les commandes intégrées. Ajoutez votre propre clé OpenAI dans le profil et je pourrai aussi répondre aux questions libres.",
    sysPrompt:
      "Vous êtes l'assistant personnel d'un créateur de contenu. Répondez brièvement (4 phrases maximum), en français, en vous appuyant uniquement sur les données ci-dessous. N'inventez rien qui ne figure pas dans les données ; dites-le si vous ne savez pas. Vous ne pouvez ni envoyer de messages ni effectuer d'actions.",
    summary: { pending: "MESSAGES EN ATTENTE DE RÉPONSE", bookings: "RENDEZ-VOUS À VENIR", deals: "ACCORDS EN COURS", none: "aucun", question: "QUESTION" },
  },
  it: {
    channels: { INSTAGRAM_DM: "DM Instagram", INSTAGRAM_COMMENT: "commento Instagram", EMAIL: "e-mail", YOUTUBE_COMMENT: "commento YouTube" },
    stages: { OFFER_RECEIVED: "offerta ricevuta", UNDER_REVIEW: "in valutazione", AWAITING_CONTRACT: "in attesa del contratto" },
    what: (dm, n = 0) => (dm ? "DM" : n > 1 ? "messaggi" : "messaggio"),
    noPending: (w) => `Nessun ${w} in attesa di risposta. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} in attesa di risposta (${byChannel}).\n${top}`,
    noOffers: "Nessuna nuova offerta dei brand.",
    offers: (n, sender, msg) => `${n} ${n === 1 ? "offerta" : "offerte"} di brand senza risposta. La più recente da ${sender}: ${msg}`,
    labels: { today: "Oggi", tomorrow: "Domani", upcoming: "In arrivo" },
    noBookings: (label) => `${label}: nessun appuntamento.`,
    bookings: (label, n, lines) => `${label}: ${n} ${n === 1 ? "appuntamento" : "appuntamenti"}:\n${lines}`,
    noDeals: "Nessun accordo aperto.",
    deals: (n, total, byStage) => `${n} ${n === 1 ? "accordo aperto" : "accordi aperti"}, ${total} in totale (${byStage}).`,
    noOverdue: "Nessuna consegna in ritardo.",
    overdue: (n, lines) => `${n} ${n === 1 ? "consegna in ritardo" : "consegne in ritardo"}:\n${lines}`,
    noLinks: "Nessun pacchetto di link inviato finora.",
    links: (week, total, top) => `Negli ultimi 7 giorni hai inviato ${week} ${week === 1 ? "pacchetto" : "pacchetti"} di link, ${total} in totale.${top ? ` Il più inviato: ${top}.` : ""}`,
    help: "Puoi chiedere:\n• Quanti DM senza risposta ho?\n• Ci sono nuove offerte dei brand?\n• I miei appuntamenti di oggi / domani\n• I miei accordi aperti\n• Quali consegne sono in ritardo?\n• Quanti link ho inviato questa settimana?",
    noKey: "Non sono riuscito a rispondere con i comandi integrati. Aggiungi la tua chiave OpenAI nel Profilo e potrò rispondere anche a domande libere.",
    sysPrompt:
      "Sei l'assistente personale di un creator di contenuti. Rispondi in modo breve (al massimo 4 frasi), in italiano, usando solo i dati qui sotto. Non inventare nulla che non sia nei dati; dì se non lo sai. Non puoi inviare messaggi né eseguire azioni.",
    summary: { pending: "MESSAGGI IN ATTESA DI RISPOSTA", bookings: "APPUNTAMENTI IN ARRIVO", deals: "ACCORDI APERTI", none: "nessuno", question: "DOMANDA" },
  },
  es: {
    channels: { INSTAGRAM_DM: "DM de Instagram", INSTAGRAM_COMMENT: "comentario de Instagram", EMAIL: "correo", YOUTUBE_COMMENT: "comentario de YouTube" },
    stages: { OFFER_RECEIVED: "oferta recibida", UNDER_REVIEW: "en revisión", AWAITING_CONTRACT: "esperando contrato" },
    what: (dm, n = 0) => (dm ? "DM" : n > 1 ? "mensajes" : "mensaje"),
    noPending: (w) => `Ningún ${w} en espera de respuesta. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} ${n === 1 ? "espera" : "esperan"} respuesta (${byChannel}).\n${top}`,
    noOffers: "No hay ofertas nuevas de marcas.",
    offers: (n, sender, msg) => `${n} ${n === 1 ? "oferta de marca sin responder" : "ofertas de marcas sin responder"}. La más reciente, de ${sender}: ${msg}`,
    labels: { today: "Hoy", tomorrow: "Mañana", upcoming: "Próximas" },
    noBookings: (label) => `${label}: no hay citas.`,
    bookings: (label, n, lines) => `${label}: ${n} ${n === 1 ? "cita" : "citas"}:\n${lines}`,
    noDeals: "No hay acuerdos abiertos.",
    deals: (n, total, byStage) => `${n} ${n === 1 ? "acuerdo abierto" : "acuerdos abiertos"}, ${total} en total (${byStage}).`,
    noOverdue: "No hay entregas atrasadas.",
    overdue: (n, lines) => `${n} ${n === 1 ? "entrega atrasada" : "entregas atrasadas"}:\n${lines}`,
    noLinks: "Aún no se ha enviado ningún paquete de enlaces.",
    links: (week, total, top) => `En los últimos 7 días enviaste ${week} ${week === 1 ? "paquete" : "paquetes"} de enlaces, ${total} en total.${top ? ` El más enviado: ${top}.` : ""}`,
    help: "Puedes preguntar:\n• ¿Cuántos DM sin responder tengo?\n• ¿Hay nuevas ofertas de marcas?\n• Mis citas de hoy / mañana\n• Mis acuerdos abiertos\n• ¿Qué entregas están atrasadas?\n• ¿Cuántos enlaces envié esta semana?",
    noKey: "No pude responder con los comandos integrados. Añade tu propia clave de OpenAI en Perfil y también podré responder preguntas libres.",
    sysPrompt:
      "Eres el asistente personal de un creador de contenido. Responde de forma breve (máximo 4 frases), en español, usando solo los datos de abajo. No inventes nada que no esté en los datos; di que no lo sabes si es el caso. No puedes enviar mensajes ni realizar acciones.",
    summary: { pending: "MENSAJES ESPERANDO RESPUESTA", bookings: "PRÓXIMAS CITAS", deals: "ACUERDOS ABIERTOS", none: "ninguno", question: "PREGUNTA" },
  },
  ar: {
    channels: { INSTAGRAM_DM: "رسائل إنستغرام", INSTAGRAM_COMMENT: "تعليقات إنستغرام", EMAIL: "البريد الإلكتروني", YOUTUBE_COMMENT: "تعليقات يوتيوب" },
    stages: { OFFER_RECEIVED: "تم استلام العرض", UNDER_REVIEW: "قيد المراجعة", AWAITING_CONTRACT: "بانتظار العقد" },
    what: (dm) => (dm ? "رسائل مباشرة" : "رسائل"),
    noPending: (w) => `لا توجد ${w} بانتظار الرد. 🎉`,
    pending: (n, w, byChannel, top) => `${n} ${w} بانتظار الرد (${byChannel}).\n${top}`,
    noOffers: "لا توجد عروض جديدة من العلامات التجارية.",
    offers: (n, sender, msg) => `${n} عروض من العلامات التجارية بلا رد. أحدثها من ${sender}: ${msg}`,
    labels: { today: "اليوم", tomorrow: "غدًا", upcoming: "القادمة" },
    noBookings: (label) => `${label}: لا توجد مواعيد.`,
    bookings: (label, n, lines) => `${label}: ${n} مواعيد:\n${lines}`,
    noDeals: "لا توجد صفقات مفتوحة.",
    deals: (n, total, byStage) => `${n} صفقات مفتوحة، بإجمالي ${total} (${byStage}).`,
    noOverdue: "لا توجد تسليمات متأخرة.",
    overdue: (n, lines) => `${n} تسليمات متأخرة:\n${lines}`,
    noLinks: "لم تُرسل أي حزمة روابط بعد.",
    links: (week, total, top) => `أرسلت ${week} حزمة روابط خلال آخر 7 أيام، وإجمالًا ${total}.${top ? ` الأكثر إرسالًا: ${top}.` : ""}`,
    help: "يمكنك أن تسأل:\n• كم رسالة مباشرة بلا رد لدي؟\n• هل هناك عروض جديدة من العلامات التجارية؟\n• مواعيدي اليوم / غدًا\n• صفقاتي المفتوحة\n• ما هي التسليمات المتأخرة؟\n• كم رابطًا أرسلت هذا الأسبوع؟",
    noKey: "لم أستطع الإجابة عن هذا بالأوامر المدمجة. أضف مفتاح OpenAI الخاص بك في الملف الشخصي وسأجيب عن الأسئلة الحرة أيضًا.",
    sysPrompt:
      "أنت المساعد الشخصي لمنشئ محتوى. أجب باختصار (4 جمل كحد أقصى) وباللغة العربية، مستندًا فقط إلى البيانات أدناه. لا تخترع أي شيء غير موجود في البيانات، وقل إنك لا تعرف إذا لم تعرف. لا يمكنك إرسال رسائل أو تنفيذ إجراءات.",
    summary: { pending: "رسائل بانتظار الرد", bookings: "المواعيد القادمة", deals: "الصفقات المفتوحة", none: "لا شيء", question: "السؤال" },
  },
};

const pack = () => PACKS[getCurrentLang()] ?? PACKS.en;
const numberLocale = () => langInfo(getCurrentLang()).locale;
const fmtDay = (iso) => new Date(iso).toLocaleDateString(numberLocale(), { day: "numeric", month: "long", weekday: "long" });
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const pendingThreads = (data) => data.threads.filter((t) => t.status === "PENDING" && t.intent !== "SPAM");

function pendingReplies(toks, data) {
  const L = pack();
  const onlyDm = hasStem(toks, STEMS.onlyDm);
  const list = pendingThreads(data).filter((t) => (onlyDm ? t.channel === "INSTAGRAM_DM" : true));
  if (list.length === 0) return L.noPending(L.what(onlyDm));
  const what = L.what(onlyDm, list.length);
  const byChannel = Object.entries(list.reduce((acc, t) => ({ ...acc, [t.channel]: (acc[t.channel] ?? 0) + 1 }), {}))
    .map(([ch, n]) => `${n} ${L.channels[ch] ?? ch}`)
    .join(", ");
  const top = list.slice(0, 3).map((t) => `• ${t.sender}: ${clip(t.snippet, 60)}`).join("\n");
  return L.pending(list.length, what, byChannel, top);
}

function brandOffers(data) {
  const L = pack();
  const list = pendingThreads(data).filter((t) => t.intent === "BRAND_DEAL" || t.intent === "COLLABORATION");
  if (list.length === 0) return L.noOffers;
  return L.offers(list.length, list[0].sender, clip(list[0].fullMessage, 110));
}

function bookings(toks, data) {
  const L = pack();
  const today = startOfDay(Date.now());
  const wantTomorrow = hasStem(toks, STEMS.tomorrow);
  const wantToday = hasStem(toks, STEMS.today);
  const upcoming = data.bookings.filter((b) => startOfDay(b.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
  const target = wantTomorrow ? today + DAY : wantToday ? today : null;
  const list = target === null ? upcoming : upcoming.filter((b) => startOfDay(b.date) === target);
  const label = wantTomorrow ? L.labels.tomorrow : wantToday ? L.labels.today : L.labels.upcoming;
  if (list.length === 0) return L.noBookings(label);
  const lines = list.slice(0, 5).map((b) => `• ${fmtDay(b.date)} ${b.startTime}–${b.endTime}: ${b.title}`).join("\n");
  return L.bookings(label, list.length, lines);
}

function dealsSummary(data) {
  const L = pack();
  const open = data.deals.filter((d) => d.stage !== "SIGNED");
  if (open.length === 0) return L.noDeals;
  const byStage = Object.entries(open.reduce((acc, d) => ({ ...acc, [d.stage]: (acc[d.stage] ?? 0) + 1 }), {}))
    .map(([s, n]) => `${n} ${L.stages[s] ?? s}`)
    .join(", ");
  return L.deals(open.length, formatMoneyTotals(open), byStage);
}

function overdueDeliverables(data) {
  const L = pack();
  const now = Date.now();
  const late = data.deals.flatMap((d) =>
    (d.deliverables ?? [])
      .filter((x) => x.status === "PENDING" && new Date(x.dueDate).getTime() < now)
      .map((x) => `• ${d.brand}: ${x.type} (${fmtDay(x.dueDate)})`)
  );
  return late.length ? L.overdue(late.length, late.join("\n")) : L.noOverdue;
}

function linkSummary(data) {
  const L = pack();
  const s = data.linkStats;
  if (!s || s.total === 0) return L.noLinks;
  const top = s.byBundle.find((b) => b.count > 0);
  return L.links(s.last7, s.total, top ? `${top.name} (${top.count})` : "");
}

// Order matters: more specific topics first ("pending deals" must not be
// caught by the generic "pending messages" rule).
export function answerLocally(query, data) {
  const toks = tokens(query);
  if (hasStem(toks, STEMS.help)) return pack().help;
  if (hasStem(toks, STEMS.deliverable) && hasStem(toks, STEMS.late)) return overdueDeliverables(data);
  if (hasStem(toks, STEMS.link)) return linkSummary(data);
  if (hasStem(toks, STEMS.booking)) return bookings(toks, data);
  if (hasStem(toks, STEMS.deal)) return dealsSummary(data);
  if (hasStem(toks, STEMS.offer)) return brandOffers(data);
  if (hasStem(toks, STEMS.message)) return pendingReplies(toks, data);
  return null;
}

function buildSummary(data) {
  const S = pack().summary;
  const none = S.none;
  const pending = pendingThreads(data)
    .slice(0, 8)
    .map((t) => `- ${t.sender} [${t.intent}, ${pack().channels[t.channel] ?? t.channel}]: ${clip(t.snippet, 80)}`)
    .join("\n");
  const upcoming = data.bookings
    .filter((b) => startOfDay(b.date) >= startOfDay(Date.now()))
    .slice(0, 5)
    .map((b) => `- ${fmtDay(b.date)} ${b.startTime}: ${b.title}`)
    .join("\n");
  const deals = data.deals
    .filter((d) => d.stage !== "SIGNED")
    .slice(0, 8)
    .map((d) => `- ${d.brand} (${d.stage}): ${formatMoney(d.amount, d.currency)}, ${d.deliverablesSummary}`)
    .join("\n");
  return `${S.pending}:\n${pending || none}\n\n${S.bookings}:\n${upcoming || none}\n\n${S.deals}:\n${deals || none}`;
}

// Returns { text, source } where source is "local" | "ai" | "none".
export async function ask(query, data) {
  const L = pack();
  const apiKey = await getOpenAiKey();

  // Questions that ask for judgement or writing ("which offer is best?",
  // "what should I reply to Lumen?") mention the same nouns as the fixed
  // commands, so with a key they go to the AI instead of being answered by a
  // keyword rule that can't actually reason about them.
  const toks = tokens(query);
  const folded = normalize(query);
  const wantsAnalysis = hasStem(toks, ANALYSIS_STEMS) || ANALYSIS_PHRASES.some((p) => folded.includes(p));

  if (!(apiKey && wantsAnalysis)) {
    const local = answerLocally(query, data);
    if (local) return { text: local, source: "local" };
  }

  if (!apiKey) return { text: `${L.noKey}\n\n${L.help}`, source: "none" };

  const text = await chat({ system: L.sysPrompt, user: `${buildSummary(data)}\n\n${L.summary.question}: ${query}`, maxTokens: 260, temperature: 0.3 }, apiKey);
  return { text, source: "ai" };
}
