// Free tier: fixed per-persona, per-intent templates (in the user's UI
// language). Pro tier: a real OpenAI chat-completion call using the user's
// own key (see entitlements.js) — never used unless entitlements.isPro()
// AND a key is actually saved, checked by the caller (db.js) before this
// module is asked to use it.

import { isPro, getOpenAiKey } from "./entitlements.js";
import { getCurrentLang } from "./i18n.js";

const name = (ctx) => ctx.senderName ?? "";
const when = (ctx, fallback) => `${ctx.bookingDate ?? fallback} ${ctx.bookingTime ?? ""}`.trim();

// TEMPLATES[lang][persona][intent]; persona ids are the seeded ones (samimi =
// friendly, profesyonel = professional, esprili = witty). Missing language →
// English; missing persona (custom) → the persona's own example text.
const TEMPLATES = {
  tr: {
    samimi: {
      FAN: () => "Teşekkürler canım! 🥹 çok tatlısın",
      BRAND_DEAL: (c) => `Merhaba ${name(c)}, teklifiniz için teşekkürler! Detaylara bakıp size dönüş yapacağım 🤍`,
      COLLABORATION: (c) => `Merhaba ${name(c)}, iş birliği teklifiniz için teşekkürler! Kısa süre içinde dönüş yapacağım 🤍`,
      BOOKING_REQUEST: (c) => `Merhaba ${name(c)}, ${when(c, "önerdiğiniz tarih")} tarafımda uygun görünüyor, takvime ekliyorum 🤍`,
    },
    profesyonel: {
      FAN: () => "İlginiz için teşekkür ederim.",
      BRAND_DEAL: (c) => `Merhaba ${name(c)}, ilginiz için teşekkür ederim. Teklifi değerlendirip kısa sürede dönüş yapacağım.`,
      COLLABORATION: (c) => `Merhaba ${name(c)}, iş birliği teklifiniz için teşekkür ederim. Detayları değerlendireceğim.`,
      BOOKING_REQUEST: (c) => `Merhaba ${name(c)}, ${when(c, "belirttiğiniz tarih")} tarafımda uygundur, takvime ekliyorum.`,
    },
    esprili: {
      FAN: () => "Hahaha çok tatlısın, teşekkürler! 😂",
      BRAND_DEAL: (c) => `Vay be ${name(c)}, teklif gelmiş! Şöyle bir göz atıp haber veririm 😄`,
      COLLABORATION: (c) => `${name(c)} iş birliği mi diyorsun, kulaklarım dikildi 😄 detaylara bakıyorum!`,
      BOOKING_REQUEST: (c) => `${when(c, "O gün")} bende müsait görünüyor, ajandaya not düştüm 📌`,
    },
  },
  en: {
    samimi: {
      FAN: () => "Thank you so much! 🥹 you're so sweet",
      BRAND_DEAL: (c) => `Hi ${name(c)}, thanks for your offer! I'll look through the details and get back to you 🤍`,
      COLLABORATION: (c) => `Hi ${name(c)}, thanks for the collaboration offer! I'll get back to you soon 🤍`,
      BOOKING_REQUEST: (c) => `Hi ${name(c)}, ${when(c, "the time you suggested")} works for me, I'm adding it to my calendar 🤍`,
    },
    profesyonel: {
      FAN: () => "Thank you for your kind words.",
      BRAND_DEAL: (c) => `Hello ${name(c)}, thank you for your interest. I will review the offer and respond shortly.`,
      COLLABORATION: (c) => `Hello ${name(c)}, thank you for the collaboration proposal. I will review the details.`,
      BOOKING_REQUEST: (c) => `Hello ${name(c)}, ${when(c, "the time you mentioned")} works for me. I am adding it to my calendar.`,
    },
    esprili: {
      FAN: () => "Hahaha you're too sweet, thank you! 😂",
      BRAND_DEAL: (c) => `Whoa ${name(c)}, an offer! Let me have a quick look and I'll get back to you 😄`,
      COLLABORATION: (c) => `${name(c)}, collab you say? My ears just perked up 😄 checking the details!`,
      BOOKING_REQUEST: (c) => `${when(c, "That day")} looks free on my end, it's in the diary 📌`,
    },
  },
  de: {
    samimi: {
      FAN: () => "Danke dir! 🥹 du bist so lieb",
      BRAND_DEAL: (c) => `Hallo ${name(c)}, danke für euer Angebot! Ich schaue mir die Details an und melde mich bei euch 🤍`,
      COLLABORATION: (c) => `Hallo ${name(c)}, danke für euer Kooperationsangebot! Ich melde mich bald bei euch 🤍`,
      BOOKING_REQUEST: (c) => `Hallo ${name(c)}, ${when(c, "der vorgeschlagene Termin")} passt bei mir, ich trage es in den Kalender ein 🤍`,
    },
    profesyonel: {
      FAN: () => "Vielen Dank für die netten Worte.",
      BRAND_DEAL: (c) => `Guten Tag ${name(c)}, vielen Dank für Ihr Interesse. Ich prüfe das Angebot und melde mich zeitnah.`,
      COLLABORATION: (c) => `Guten Tag ${name(c)}, vielen Dank für Ihren Kooperationsvorschlag. Ich werde die Details prüfen.`,
      BOOKING_REQUEST: (c) => `Guten Tag ${name(c)}, ${when(c, "der genannte Termin")} passt bei mir. Ich trage ihn in meinen Kalender ein.`,
    },
    esprili: {
      FAN: () => "Hahaha du bist zu lieb, danke! 😂",
      BRAND_DEAL: (c) => `Wow ${name(c)}, ein Angebot! Ich werfe kurz einen Blick drauf und melde mich 😄`,
      COLLABORATION: (c) => `${name(c)}, Zusammenarbeit? Da spitze ich die Ohren 😄 ich schaue mir die Details an!`,
      BOOKING_REQUEST: (c) => `${when(c, "An dem Tag")} sieht bei mir frei aus, ist im Kalender notiert 📌`,
    },
  },
  fr: {
    samimi: {
      FAN: () => "Merci beaucoup ! 🥹 tu es adorable",
      BRAND_DEAL: (c) => `Bonjour ${name(c)}, merci pour votre proposition ! Je regarde les détails et je reviens vers vous 🤍`,
      COLLABORATION: (c) => `Bonjour ${name(c)}, merci pour votre proposition de collaboration ! Je reviens vers vous très vite 🤍`,
      BOOKING_REQUEST: (c) => `Bonjour ${name(c)}, ${when(c, "la date proposée")} me convient, je l'ajoute à mon agenda 🤍`,
    },
    profesyonel: {
      FAN: () => "Je vous remercie pour votre message.",
      BRAND_DEAL: (c) => `Bonjour ${name(c)}, je vous remercie pour votre intérêt. J'étudie la proposition et reviens vers vous rapidement.`,
      COLLABORATION: (c) => `Bonjour ${name(c)}, je vous remercie pour votre proposition de collaboration. J'en étudierai les détails.`,
      BOOKING_REQUEST: (c) => `Bonjour ${name(c)}, ${when(c, "la date indiquée")} me convient. Je l'ajoute à mon agenda.`,
    },
    esprili: {
      FAN: () => "Hahaha tu es trop gentil(le), merci ! 😂",
      BRAND_DEAL: (c) => `Oh ${name(c)}, une proposition ! Je jette un œil et je vous dis ça 😄`,
      COLLABORATION: (c) => `${name(c)}, une collab ? J'ai dressé l'oreille 😄 je regarde les détails !`,
      BOOKING_REQUEST: (c) => `${when(c, "Ce jour-là")} a l'air libre de mon côté, c'est noté dans l'agenda 📌`,
    },
  },
  it: {
    samimi: {
      FAN: () => "Grazie mille! 🥹 sei un tesoro",
      BRAND_DEAL: (c) => `Ciao ${name(c)}, grazie per la vostra offerta! Guardo i dettagli e vi rispondo 🤍`,
      COLLABORATION: (c) => `Ciao ${name(c)}, grazie per la proposta di collaborazione! Vi rispondo presto 🤍`,
      BOOKING_REQUEST: (c) => `Ciao ${name(c)}, ${when(c, "la data proposta")} per me va bene, la segno in calendario 🤍`,
    },
    profesyonel: {
      FAN: () => "Grazie per le sue gentili parole.",
      BRAND_DEAL: (c) => `Buongiorno ${name(c)}, grazie per l'interesse. Valuterò l'offerta e vi risponderò a breve.`,
      COLLABORATION: (c) => `Buongiorno ${name(c)}, grazie per la proposta di collaborazione. Ne valuterò i dettagli.`,
      BOOKING_REQUEST: (c) => `Buongiorno ${name(c)}, ${when(c, "la data indicata")} per me va bene. La inserisco in calendario.`,
    },
    esprili: {
      FAN: () => "Ahahah sei troppo gentile, grazie! 😂",
      BRAND_DEAL: (c) => `Wow ${name(c)}, un'offerta! Do una sbirciata e ti faccio sapere 😄`,
      COLLABORATION: (c) => `${name(c)}, collaborazione? Ho drizzato le orecchie 😄 guardo i dettagli!`,
      BOOKING_REQUEST: (c) => `${when(c, "Quel giorno")} mi risulta libero, è già in agenda 📌`,
    },
  },
  es: {
    samimi: {
      FAN: () => "¡Muchas gracias! 🥹 eres un encanto",
      BRAND_DEAL: (c) => `Hola ${name(c)}, ¡gracias por vuestra oferta! Miro los detalles y os respondo 🤍`,
      COLLABORATION: (c) => `Hola ${name(c)}, ¡gracias por la propuesta de colaboración! Os respondo pronto 🤍`,
      BOOKING_REQUEST: (c) => `Hola ${name(c)}, ${when(c, "la fecha propuesta")} me viene bien, la añado al calendario 🤍`,
    },
    profesyonel: {
      FAN: () => "Gracias por sus amables palabras.",
      BRAND_DEAL: (c) => `Buenos días ${name(c)}, gracias por su interés. Estudiaré la oferta y les responderé en breve.`,
      COLLABORATION: (c) => `Buenos días ${name(c)}, gracias por la propuesta de colaboración. Revisaré los detalles.`,
      BOOKING_REQUEST: (c) => `Buenos días ${name(c)}, ${when(c, "la fecha indicada")} me viene bien. La añado a mi calendario.`,
    },
    esprili: {
      FAN: () => "Jajaja eres un sol, ¡gracias! 😂",
      BRAND_DEAL: (c) => `¡Vaya ${name(c)}, una oferta! Le echo un vistazo y te cuento 😄`,
      COLLABORATION: (c) => `${name(c)}, ¿una colaboración? He levantado las orejas 😄 ¡miro los detalles!`,
      BOOKING_REQUEST: (c) => `${when(c, "Ese día")} lo veo libre por mi parte, ya está en la agenda 📌`,
    },
  },
  ar: {
    samimi: {
      FAN: () => "شكرًا جزيلًا! 🥹 أنت لطيف جدًا",
      BRAND_DEAL: (c) => `مرحبًا ${name(c)}، شكرًا على عرضكم! سأطّلع على التفاصيل وأعود إليكم 🤍`,
      COLLABORATION: (c) => `مرحبًا ${name(c)}، شكرًا على عرض التعاون! سأعود إليكم قريبًا 🤍`,
      BOOKING_REQUEST: (c) => `مرحبًا ${name(c)}، ${when(c, "الموعد المقترح")} مناسب لي، سأضيفه إلى التقويم 🤍`,
    },
    profesyonel: {
      FAN: () => "أشكركم على كلماتكم اللطيفة.",
      BRAND_DEAL: (c) => `مرحبًا ${name(c)}، أشكركم على اهتمامكم. سأدرس العرض وأعود إليكم قريبًا.`,
      COLLABORATION: (c) => `مرحبًا ${name(c)}، أشكركم على عرض التعاون. سأدرس التفاصيل.`,
      BOOKING_REQUEST: (c) => `مرحبًا ${name(c)}، ${when(c, "الموعد المذكور")} مناسب لي. سأضيفه إلى التقويم.`,
    },
    esprili: {
      FAN: () => "هههه أنت لطيف جدًا، شكرًا! 😂",
      BRAND_DEAL: (c) => `واو ${name(c)}، عرض! سألقي نظرة سريعة وأخبرك 😄`,
      COLLABORATION: (c) => `${name(c)}، تعاون؟ انتبهتُ فورًا 😄 سأراجع التفاصيل!`,
      BOOKING_REQUEST: (c) => `${when(c, "ذلك اليوم")} يبدو فارغًا عندي، سجلته في الأجندة 📌`,
    },
  },
};

const SYSTEM_PROMPTS = {
  tr: (p) =>
    `Sen bir sosyal medya içerik üreticisinin YZ asistanısın. ${p.description} Örnek üslup: "${p.example}". ` +
    `Gelen mesaja bu üslupla, kısa (1-2 cümle) bir yanıt taslağı yaz. Yanıtı gelen mesajla aynı dilde yaz. ` +
    `Sadece yanıt metnini yaz, açıklama ekleme.`,
  en: (p) =>
    `You are the AI assistant of a social media content creator. ${p.description} Example tone: "${p.example}". ` +
    `Write a short (1-2 sentence) reply draft to the incoming message in this tone. Write the reply in the same language as the incoming message. ` +
    `Output only the reply text, no explanations.`,
  de: (p) =>
    `Du bist der KI-Assistent eines Social-Media-Content-Creators. ${p.description} Beispielton: "${p.example}". ` +
    `Schreibe im Stil dieses Tons einen kurzen (1–2 Sätze) Antwortentwurf auf die eingehende Nachricht. Schreibe die Antwort in derselben Sprache wie die eingehende Nachricht. ` +
    `Gib nur den Antworttext aus, keine Erklärungen.`,
  fr: (p) =>
    `Vous êtes l'assistant IA d'un créateur de contenu sur les réseaux sociaux. ${p.description} Exemple de ton : « ${p.example} ». ` +
    `Rédigez, dans ce ton, un court brouillon de réponse (1 à 2 phrases) au message reçu. Rédigez la réponse dans la même langue que le message reçu. ` +
    `N'écrivez que le texte de la réponse, sans explications.`,
  it: (p) =>
    `Sei l'assistente IA di un creator di contenuti sui social. ${p.description} Esempio di tono: "${p.example}". ` +
    `Scrivi, con questo tono, una breve bozza di risposta (1-2 frasi) al messaggio ricevuto. Scrivi la risposta nella stessa lingua del messaggio ricevuto. ` +
    `Scrivi solo il testo della risposta, senza spiegazioni.`,
  es: (p) =>
    `Eres el asistente de IA de un creador de contenido en redes sociales. ${p.description} Ejemplo de tono: "${p.example}". ` +
    `Escribe, con este tono, un breve borrador de respuesta (1-2 frases) al mensaje recibido. Escribe la respuesta en el mismo idioma que el mensaje recibido. ` +
    `Escribe solo el texto de la respuesta, sin explicaciones.`,
  ar: (p) =>
    `أنت مساعد ذكاء اصطناعي لمنشئ محتوى على وسائل التواصل الاجتماعي. ${p.description} مثال على الأسلوب: "${p.example}". ` +
    `اكتب مسودة رد قصيرة (جملة أو جملتان) على الرسالة الواردة بهذا الأسلوب. اكتب الرد بنفس لغة الرسالة الواردة. ` +
    `اكتب نص الرد فقط دون أي شرح.`,
};

const USER_LABELS = {
  tr: { channel: "Kanal", sender: "Gönderen", unknown: "bilinmiyor", message: "Mesaj" },
  en: { channel: "Channel", sender: "Sender", unknown: "unknown", message: "Message" },
  de: { channel: "Kanal", sender: "Absender", unknown: "unbekannt", message: "Nachricht" },
  fr: { channel: "Canal", sender: "Expéditeur", unknown: "inconnu", message: "Message" },
  it: { channel: "Canale", sender: "Mittente", unknown: "sconosciuto", message: "Messaggio" },
  es: { channel: "Canal", sender: "Remitente", unknown: "desconocido", message: "Mensaje" },
  ar: { channel: "القناة", sender: "المرسل", unknown: "غير معروف", message: "الرسالة" },
};

function generateTemplateDraft({ persona, intent, ...ctx }) {
  const lang = getCurrentLang();
  const template = (TEMPLATES[lang] ?? TEMPLATES.en)[persona.id]?.[intent];
  return { text: template ? template(ctx).trim() : persona.example, source: "TEMPLATE" };
}

// Shared chat-completion call (reply drafts and the assistant both use it).
export async function chat({ system, user, maxTokens, temperature }, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}

async function generateOpenAiDraft({ persona, intent, message, senderName }, apiKey) {
  const lang = getCurrentLang();
  const system = (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(persona);
  const L = USER_LABELS[lang] ?? USER_LABELS.en;
  const user = `${L.channel}: ${intent}\n${L.sender}: ${senderName ?? L.unknown}\n${L.message}: ${message}`;
  const text = await chat({ system, user, maxTokens: 120, temperature: 0.8 }, apiKey);
  return { text, source: "OPENAI" };
}

export async function generateDraft({ persona, intent, message, senderName, bookingDate, bookingTime }) {
  if (intent === "SPAM") {
    throw new Error("generateDraft should never be called for SPAM-classified messages");
  }

  if (isPro()) {
    const apiKey = await getOpenAiKey();
    if (apiKey) {
      try {
        return await generateOpenAiDraft({ persona, intent, message, senderName }, apiKey);
      } catch (err) {
        // Fail open to the free template rather than leaving the thread
        // without any draft — the caller/toast surfaces the error text.
        console.warn("OpenAI draft generation failed, falling back to template:", err.message);
      }
    }
  }

  return generateTemplateDraft({ persona, intent, senderName, bookingDate, bookingTime });
}
