#!/usr/bin/env python3
"""Generates the static Creator OS site into website/public/ (no dependencies).

    python3 website/build.py

Contact details come from website/site.json. The privacy pages are rendered from
mobile/store/privacy-policy.{en,tr}.md so the site and the repo never drift apart.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "public"
STORE = ROOT.parent / "mobile" / "store"
SITE = json.loads((ROOT / "site.json").read_text())
BASE = SITE["url"].rstrip("/")
DEV, MAIL = SITE["developer"], SITE["email"]
YEAR = SITE["year"]

# ---------------------------------------------------------------- content

C = {
    "en": {
        "lang": "en", "prefix": "", "other": "/tr", "other_label": "Türkçe", "label": "English",
        "nav": [("Features", "#features"), ("Privacy", "#privacy"), ("FAQ", "#faq")],
        "title": "Creator OS — Brand Deal Tracker & Inbox Assistant for Creators",
        "desc": "Creator OS helps influencers and content creators sort messages, draft replies in their own voice, and track brand deals, bookings and links — on your phone.",
        "h1": "The receptionist <em>for creators.</em>",
        "lead": "Sorts your messages by intent, drafts replies in your own voice, and keeps brand deals, bookings and link packs in order — all on your phone, with no server in the middle.",
        "appstore": ("Coming soon", "App Store"), "play": ("Coming soon", "Google Play"),
        "note": "Early access: the first version is being prepared for the stores. iOS 15+ and Android 7+.",
        "who_h": "Built for creators who run it all themselves",
        "who": [
            ("Influencers and content creators", "You get brand offers, collaboration requests and fan messages at the same time. Creator OS labels each one so the paid work is easy to spot."),
            ("Creators negotiating brand deals", "Track every brand collaboration from first offer to signed contract, delivery proof and payment — in one deal board instead of scattered notes."),
            ("Solo creators and small teams", "No manager, no agency, no monthly platform fee for a server. Everything runs on your phone and stays private."),
        ],
        "f_h": "What it does", "f_p": "Everything a creator's day-to-day inbox needs, without agency complexity.",
        "features": [
            ("Sorts by intent", "Fan message, brand deal, collaboration, booking request or spam — labelled automatically on the device."),
            ("Drafts in your voice", "Pick a persona and every reply starts as a draft in that tone. With Pro and your own OpenAI key, drafts are written by AI in the sender's language."),
            ("Deals, start to finish", "A board from offer to signature, deliverables with proof links, payments and results, and a confirmation e-mail to the other side."),
            ("Bookings and calendar", "Turn a booking request into an appointment and send it to any calendar app."),
            ("Link bundles", "Save a set of links once, add it to a reply with one tap, and see how often you send it."),
            ("Assistant", "Ask “how many DMs are waiting?” or “which deliverables are late?” — answered on your phone. Pro adds open questions with your own key."),
        ],
        "pro_tag": "Pro",
        "flow_h": "You stay in control",
        "flow": [
            ("It sorts", "Each message gets an intent label so brand offers don't sink under fan comments."),
            ("It drafts", "A reply is prepared in your persona's tone. Edit it, add a link bundle, or throw it away."),
            ("You send", "The app opens your mail app or Instagram with the text ready. Nothing is sent until you press send yourself."),
        ],
        "shots_h": "See it in action",
        "shots": [("01-inbox", "Inbox by intent"), ("02-reply-draft", "Reply draft"), ("03-deals", "Deals board"), ("04-bookings", "Bookings"), ("05-assistant", "Assistant"), ("06-links", "Link bundles"), ("07-persona", "Personas")],
        "shots_note": "Screens show fictional sample data.",
        "priv_h": "Your data stays on your phone",
        "priv_p": "Creator OS has no server of ours. Everything lives in a database inside the app.",
        "priv": [
            "No account to create, no sign-up.",
            "No ads, no analytics and no tracking inside the app.",
            "Data leaves your phone only for OpenAI (if you add your own key and ask for an AI draft) and RevenueCat (to manage the Pro subscription).",
            "Uninstall the app and your data is gone.",
        ],
        "priv_link": "Read the privacy policy",
        "plan_h": "Free and Pro",
        "plan_head": ("", "Free", "Pro"),
        "plan": [
            ("Accounts", "2", "Unlimited"), ("Deals", "5", "Unlimited"), ("Inbox, deals, bookings, personas", "✓", "✓"),
            ("AI reply drafts (your OpenAI key)", "—", "✓"), ("Assistant", "—", "✓"), ("Notification rules", "—", "✓"),
            ("Calendar export (.ics)", "—", "✓"), ("Link bundles: create and add to replies", "—", "✓"), ("Siri and Android shortcuts", "—", "✓"),
        ],
        "plan_note": "The Pro price is set in the App Store and Google Play.",
        "langs_h": "Seven languages",
        "langs_p": "Türkçe · English · Deutsch · Français · Italiano · Español · العربية (right-to-left). Menus, replies, assistant answers, numbers and currencies follow your language.",
        "faq_h": "Questions",
        "faq": [
            ("Is it available yet?", "Not yet. The first version is being prepared for the App Store and Google Play; this page will link to both when it is live."),
            ("Does it connect to my Instagram or e-mail?", "Not in this version. Replies are handed to your mail app or Instagram and you press send. Connecting live inboxes would need a server, which Creator OS deliberately does not have."),
            ("Do I need an OpenAI key?", "Only for AI-written drafts and open questions to the assistant, both part of Pro. Without a key the app uses its built-in reply templates and local answers."),
            ("Where is my data stored?", "In a database on your phone. Your OpenAI key sits in the system's secure storage (iOS Keychain / Android Keystore)."),
            ("Who makes it?", f"Creator OS is built by {DEV}. Questions are welcome at {MAIL}."),
        ],
        "cta_h": "Questions or feedback?",
        "cta_p": "Write to us — a person reads every message.",
        "cta_b": "Contact",
        "f_privacy": "Privacy policy", "f_support": "Support",
        "priv_page": "Privacy policy", "priv_desc": "How the Creator OS app and this website handle data: in the app everything stays on your device except two optional services.",
        "sup_page": "Support", "sup_desc": "Help and contact for Creator OS.",
        "support": {
            "h": "Support",
            "intro": f"Write to <a href=\"mailto:{MAIL}\">{MAIL}</a> and we will get back to you. Please include your device, the app version (Profile screen) and what you were doing.",
            "qs": [
                ("How do I delete my data?", "Everything is stored inside the app on your phone. Deleting the app removes it. Inside the app you can also delete individual accounts, deals, link bundles and your OpenAI key (Profile)."),
                ("My Pro purchase is missing.", "Open Profile and tap “Restore purchases”. Purchases are tied to your Apple ID or Google account."),
                ("AI drafts are not appearing.", "AI drafts need Pro and your own OpenAI API key with credit on your OpenAI account. Without them, the built-in templates are used."),
                ("How do I change the language?", "Use the language menu at the top of the app. By default it follows your phone's language."),
            ],
        },
    },
    "tr": {
        "lang": "tr", "prefix": "/tr", "other": "/", "other_label": "English", "label": "Türkçe",
        "nav": [("Özellikler", "#features"), ("Gizlilik", "#privacy"), ("SSS", "#faq")],
        "title": "Creator OS — Marka Anlaşması Takibi ve Mesaj Asistanı",
        "desc": "Influencer ve içerik üreticileri için: mesajları ayırır, yanıtları kendi üslubunla taslaklar, marka anlaşması ve randevuları telefonunda takip eder.",
        "h1": "İçerik üreticilerinin <em>resepsiyonisti.</em>",
        "lead": "Mesajlarını niyetine göre ayırır, yanıtları kendi üslubunla taslak olarak hazırlar; marka anlaşmalarını, randevuları ve link paketlerini düzenli tutar — hepsi telefonunda, arada sunucu olmadan.",
        "appstore": ("Yakında", "App Store"), "play": ("Yakında", "Google Play"),
        "note": "Erken erişim: ilk sürüm mağazalar için hazırlanıyor. iOS 15+ ve Android 7+.",
        "who_h": "Her şeyi kendi yöneten üreticiler için",
        "who": [
            ("Influencer ve içerik üreticileri", "Marka teklifleri, iş birliği talepleri ve hayran mesajları aynı anda gelir. Creator OS her birini etiketler; ücretli işler kolayca görünür."),
            ("Marka anlaşması yürütenler", "Her marka iş birliğini ilk tekliften imzaya, teslimat kanıtına ve ödemeye kadar dağınık notlar yerine tek bir anlaşma panosunda takip et."),
            ("Bireysel üreticiler ve küçük ekipler", "Menajer yok, ajans yok, sunucu için aylık ücret yok. Her şey telefonunda çalışır ve gizli kalır."),
        ],
        "f_h": "Ne yapar", "f_p": "Bir içerik üreticisinin günlük gelen kutusunun ihtiyacı olan her şey, ajans karmaşası olmadan.",
        "features": [
            ("Niyete göre ayırır", "Hayran mesajı, marka teklifi, iş birliği, randevu talebi ya da spam — cihazda otomatik etiketlenir."),
            ("Senin üslubunla taslak", "Bir persona seç; her yanıt o tonda bir taslakla başlar. Pro ve kendi OpenAI anahtarınla taslakları YZ, gönderenin dilinde yazar."),
            ("Anlaşma, baştan sona", "Tekliften imzaya bir pano, kanıt bağlantılı teslimatlar, ödemeler ve sonuçlar; karşı tarafa teyit e-postası."),
            ("Randevu ve takvim", "Randevu talebini randevuya çevir, istediğin takvim uygulamasına gönder."),
            ("Link paketleri", "Bir link setini bir kez kaydet, tek dokunuşla yanıta ekle, ne sıklıkla gönderdiğini gör."),
            ("Asistan", "“Kaç DM bekliyor?” ya da “Hangi teslimatlar gecikti?” diye sor — telefonunda cevaplanır. Pro, kendi anahtarınla açık soruları da ekler."),
        ],
        "pro_tag": "Pro",
        "flow_h": "Kontrol sende",
        "flow": [
            ("Ayırır", "Her mesaj bir niyet etiketi alır; marka teklifleri hayran yorumlarının altında kaybolmaz."),
            ("Taslak hazırlar", "Persona'nın tonunda bir yanıt hazırlanır. Düzenle, link paketi ekle ya da at."),
            ("Sen gönderirsin", "Uygulama, metin hazır olarak posta uygulamanı ya da Instagram'ı açar. Sen gönder tuşuna basana kadar hiçbir şey gönderilmez."),
        ],
        "shots_h": "Uygulamada görün",
        "shots": [("01-inbox", "Niyete göre gelen kutusu"), ("02-reply-draft", "Yanıt taslağı"), ("03-deals", "Anlaşma panosu"), ("04-bookings", "Randevular"), ("05-assistant", "Asistan"), ("06-links", "Link paketleri"), ("07-persona", "Persona'lar")],
        "shots_note": "Ekranlarda kurgusal örnek veriler görünür.",
        "priv_h": "Verilerin telefonunda kalır",
        "priv_p": "Creator OS'un bize ait bir sunucusu yok. Her şey uygulamanın içindeki bir veritabanında durur.",
        "priv": [
            "Hesap açmak, kayıt olmak yok.",
            "Uygulamanın içinde reklam, analitik ve izleme yok.",
            "Veriler telefonundan yalnızca OpenAI'a (kendi anahtarını girip YZ taslağı istersen) ve RevenueCat'e (Pro aboneliğini yönetmek için) gider.",
            "Uygulamayı silince verilerin de gider.",
        ],
        "priv_link": "Gizlilik politikasını oku",
        "plan_h": "Ücretsiz ve Pro",
        "plan_head": ("", "Ücretsiz", "Pro"),
        "plan": [
            ("Hesap", "2", "Sınırsız"), ("Anlaşma", "5", "Sınırsız"), ("Gelen kutusu, anlaşma, randevu, persona", "✓", "✓"),
            ("YZ yanıt taslakları (kendi OpenAI anahtarın)", "—", "✓"), ("Asistan", "—", "✓"), ("Bildirim kuralları", "—", "✓"),
            ("Takvim aktarımı (.ics)", "—", "✓"), ("Link paketleri: oluşturma ve yanıta ekleme", "—", "✓"), ("Siri ve Android kısayolları", "—", "✓"),
        ],
        "plan_note": "Pro fiyatı App Store ve Google Play'de belirlenir.",
        "langs_h": "Yedi dil",
        "langs_p": "Türkçe · English · Deutsch · Français · Italiano · Español · العربية (sağdan sola). Menüler, yanıtlar, asistan cevapları, sayılar ve para birimleri diline uyar.",
        "faq_h": "Sorular",
        "faq": [
            ("Şimdi indirebilir miyim?", "Henüz değil. İlk sürüm App Store ve Google Play için hazırlanıyor; yayına girince bu sayfadan ikisine de bağlantı vereceğiz."),
            ("Instagram'ıma veya e-postama bağlanıyor mu?", "Bu sürümde hayır. Yanıtlar posta uygulamana ya da Instagram'a verilir, gönder tuşuna sen basarsın. Canlı gelen kutularına bağlanmak bir sunucu gerektirir; Creator OS bilerek sunucusuzdur."),
            ("OpenAI anahtarı gerekli mi?", "Yalnızca YZ ile yazılan taslaklar ve asistana açık sorular için; ikisi de Pro'da. Anahtar yoksa uygulama hazır yanıt şablonlarını ve yerel cevapları kullanır."),
            ("Verilerim nerede tutuluyor?", "Telefonundaki bir veritabanında. OpenAI anahtarın sistemin güvenli deposunda (iOS Anahtar Zinciri / Android Keystore) durur."),
            ("Kim yapıyor?", f"Creator OS'u {DEV} geliştiriyor. Sorularını {MAIL} adresine yazabilirsin."),
        ],
        "cta_h": "Soru ya da geri bildirim?",
        "cta_p": "Bize yaz — her mesajı bir insan okur.",
        "cta_b": "İletişim",
        "f_privacy": "Gizlilik politikası", "f_support": "Destek",
        "priv_page": "Gizlilik politikası", "priv_desc": "Creator OS uygulaması ve bu web sitesi verileri nasıl işler: uygulamada iki isteğe bağlı servis dışında her şey cihazında kalır.",
        "sup_page": "Destek", "sup_desc": "Creator OS için yardım ve iletişim.",
        "support": {
            "h": "Destek",
            "intro": f"<a href=\"mailto:{MAIL}\">{MAIL}</a> adresine yaz, sana dönelim. Lütfen cihazını, uygulama sürümünü (Profil ekranı) ve ne yaparken olduğunu ekle.",
            "qs": [
                ("Verilerimi nasıl silerim?", "Her şey telefonundaki uygulamanın içinde durur. Uygulamayı silmek hepsini kaldırır. Uygulama içinde tek tek hesapları, anlaşmaları, link paketlerini ve OpenAI anahtarını da silebilirsin (Profil)."),
                ("Pro satın alımım görünmüyor.", "Profil'i aç ve “Satın alımları geri yükle”ye dokun. Satın alımlar Apple ID'ne veya Google hesabına bağlıdır."),
                ("YZ taslakları görünmüyor.", "YZ taslakları Pro ve OpenAI hesabında kredisi olan kendi API anahtarını gerektirir. Bunlar yoksa hazır şablonlar kullanılır."),
                ("Dili nasıl değiştiririm?", "Uygulamanın üstündeki dil menüsünü kullan. Varsayılan olarak telefonunun diline uyar."),
            ],
        },
    },
}

# ---------------------------------------------------------------- helpers

def e(s):
    return html.escape(s, quote=False)


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+|mailto:[^)\s]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
    return t


def md(text):
    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("# "):
            out.append(f"<h1>{inline(l[2:])}</h1>")
        elif l.startswith("## "):
            out.append(f"<h2>{inline(l[3:])}</h2>")
        elif l.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], rows[2:]
            out.append("<div class='tbl'><table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
            continue
        elif l.startswith("- "):
            items = []
            while i < len(lines) and (lines[i].startswith("- ") or lines[i].startswith("  ")):
                if lines[i].startswith("- "):
                    items.append(lines[i][2:])
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
            continue
        elif l.strip():
            para = [l]
            while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith(("#", "- ", "|")):
                i += 1
                para.append(lines[i])
            out.append("<p>" + "<br>".join(inline(x) for x in para) + "</p>")
        i += 1
    return "\n".join(out)


def fill_contact(text):
    text = text.replace("[GELİŞTİRİCİ / ŞİRKET ADI]", DEV).replace("[DEVELOPER / COMPANY NAME]", DEV)
    text = text.replace("[İLETİŞİM E-POSTASI]", MAIL).replace("[CONTACT EMAIL]", MAIL)
    text = re.sub(r" · \[POSTA ADRESİ, gerekiyorsa\]", "", text)
    text = re.sub(r" · \[POSTAL ADDRESS, if required\]", "", text)
    return text


def ld(data):
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>"


def page(c, path_en, path_tr, title, desc, body, og_type="website", jsonld=None, robots="index,follow,max-image-preview:large"):
    """Wrap `body` in the shared chrome. `path_*` are the site paths of this page in each language."""
    lang = c["lang"]
    here = path_en if lang == "en" else path_tr
    other = path_tr if lang == "en" else path_en
    home = "/" if lang == "en" else "/tr"
    nav = "".join(f'<a class="hide-sm" href="{(home if home != "/" else "") + href if href.startswith("#") else href}">{e(label)}</a>' for label, href in c["nav"])
    switch = (f'<div class="lang" aria-label="Language"><span>{e(c["label"])}</span><a href="{other}" hreflang="{"tr" if lang == "en" else "en"}" lang="{"tr" if lang == "en" else "en"}">{e(c["other_label"])}</a></div>')
    priv = "/privacy" if lang == "en" else "/tr/privacy"
    sup = "/support" if lang == "en" else "/tr/support"
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{BASE}{here}">
<link rel="alternate" hreflang="en" href="{BASE}{path_en}">
<link rel="alternate" hreflang="tr" href="{BASE}{path_tr}">
<link rel="alternate" hreflang="x-default" href="{BASE}{path_en}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Creator OS">
<meta property="og:locale" content="{"en_US" if lang == "en" else "tr_TR"}">
<meta property="og:locale:alternate" content="{"tr_TR" if lang == "en" else "en_US"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Creator OS — {html.escape(title.split("—")[-1].strip())}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{BASE}{here}">
<meta property="og:image" content="{BASE}/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fff6f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c1220" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" href="/img/favicon-64.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/fredoka-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
{"".join(ld(x) for x in (jsonld or []))}
</head>
<body>
<a class="skip" href="#main">{"Skip to content" if lang == "en" else "İçeriğe geç"}</a>
<header class="site"><div class="wrap">
  <a class="brand" href="{home}"><img src="/img/icon-96.png" width="32" height="32" alt="">Creator OS</a>
  <nav class="main" aria-label="Main">{nav}{switch}</nav>
</div></header>
<main id="main">
{body}
</main>
<footer class="site"><div class="wrap">
  <span>© {YEAR} {e(DEV)}</span>
  <nav aria-label="Footer"><a href="{priv}">{e(c["f_privacy"])}</a><a href="{sup}">{e(c["f_support"])}</a><a href="mailto:{MAIL}">{MAIL}</a></nav>
  <span class="end">{"Made for creators." if lang == "en" else "İçerik üreticileri için."}</span>
</div></footer>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
"""


def landing(c):
    L = c["lang"]
    p = "/img/" + L + "-"
    feats = ""
    for i, (h, t) in enumerate(c["features"]):
        tag = f'<span class="tag">{c["pro_tag"]}</span>' if i == 5 else ""
        feats += f'<div class="card"><h3>{e(h)}{tag}</h3><p>{e(t)}</p></div>'
    who = "".join(f'<div class="card"><h3>{e(h)}</h3><p>{e(t)}</p></div>' for h, t in c["who"])
    flow = "".join(f"<div><h3>{e(h)}</h3><p>{e(t)}</p></div>" for h, t in c["flow"])
    shots = "".join(
        f'<figure><div class="phone"><img src="{p}{n}.webp" width="560" height="1217" loading="lazy" alt="{html.escape(cap)}"></div><figcaption>{e(cap)}</figcaption></figure>'
        for n, cap in c["shots"])
    def cell(v):
        return '<td class="y">' + e(v) + "</td>" if v == "✓" else "<td>" + e(v) + "</td>"

    plan_rows = "".join("<tr><td>" + e(a) + "</td>" + cell(b) + cell(d) + "</tr>" for a, b, d in c["plan"])
    plan_head = "".join(f"<th>{e(x)}</th>" for x in c["plan_head"])
    ticks = "".join(f"<li>{e(x)}</li>" for x in c["priv"])
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in c["faq"])
    priv = "/privacy" if L == "en" else "/tr/privacy"
    return f"""
<section class="hero"><div class="wrap">
  <div>
    <h1>{c["h1"]}</h1>
    <p class="lead">{e(c["lead"])}</p>
    <div class="stores">
      <span class="store off" aria-disabled="true"><small>{e(c["appstore"][0])}</small><strong>{e(c["appstore"][1])}</strong></span>
      <span class="store off" aria-disabled="true"><small>{e(c["play"][0])}</small><strong>{e(c["play"][1])}</strong></span>
    </div>
    <p class="note muted">{e(c["note"])}</p>
  </div>
  <div class="phone"><img src="{p}01-inbox.webp" width="560" height="1217" fetchpriority="high" alt="{html.escape(c["shots"][0][1])}"></div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><h2>{e(c["who_h"])}</h2></div>
  <div class="grid c3">{who}</div>
</div></section>

<section id="features" class="alt"><div class="wrap">
  <div class="section-head"><h2>{e(c["f_h"])}</h2><p>{e(c["f_p"])}</p></div>
  <div class="grid c3">{feats}</div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><h2>{e(c["flow_h"])}</h2></div>
  <div class="flow">{flow}</div>
</div></section>

<section class="alt"><div style="max-width:var(--max);margin:0 auto;padding:0 20px"><div class="section-head"><h2>{e(c["shots_h"])}</h2><p>{e(c["shots_note"])}</p></div></div>
  <div class="strip" tabindex="0" role="region" aria-label="{e(c["shots_h"])}">{shots}</div>
</section>

<section id="privacy"><div class="wrap grid c2" style="align-items:start;gap:40px">
  <div><h2>{e(c["priv_h"])}</h2><p class="muted" style="margin-top:12px">{e(c["priv_p"])}</p>
    <p style="margin-top:20px"><a class="btn ghost" href="{priv}">{e(c["priv_link"])}</a></p></div>
  <ul class="ticks">{ticks}</ul>
</div></section>

<section class="alt"><div class="wrap">
  <div class="section-head"><h2>{e(c["plan_h"])}</h2></div>
  <div class="tbl"><table><thead><tr>{plan_head}</tr></thead><tbody>{plan_rows}</tbody></table></div>
  <p class="muted" style="margin-top:14px">{e(c["plan_note"])}</p>
</div></section>

<section><div class="wrap grid c2" style="align-items:start;gap:40px">
  <div><h2>{e(c["langs_h"])}</h2><p class="muted" style="margin-top:12px">{e(c["langs_p"])}</p></div>
  <div id="faq"><h2 style="margin-bottom:18px">{e(c["faq_h"])}</h2>{faq}</div>
</div></section>

<section class="alt"><div class="wrap" style="text-align:center">
  <h2>{e(c["cta_h"])}</h2><p class="muted" style="margin:12px 0 22px">{e(c["cta_p"])}</p>
  <a class="btn" href="mailto:{MAIL}">{e(c["cta_b"])}</a>
</div></section>
"""


def org():
    return {"@type": "Organization", "@id": f"{BASE}/#org", "name": "Creator OS", "url": BASE + "/", "logo": f"{BASE}/img/apple-touch-icon.png",
            "email": MAIL, "founder": {"@type": "Person", "name": DEV}}


def landing_ld(c):
    L = c["lang"]
    url = BASE + ("/" if L == "en" else "/tr")
    return [
        {"@context": "https://schema.org", "@type": "WebSite", "@id": f"{BASE}/#site", "name": "Creator OS", "url": url, "inLanguage": L, "publisher": {"@id": f"{BASE}/#org"}},
        {"@context": "https://schema.org", **org()},
        {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Creator OS", "url": url, "description": c["desc"],
         "applicationCategory": "BusinessApplication", "operatingSystem": "iOS 15+, Android 7+",
         "inLanguage": ["tr", "en", "de", "fr", "it", "es", "ar"], "author": {"@type": "Person", "name": DEV},
         "featureList": [h for h, _ in c["features"]], "image": f"{BASE}/img/og.png"},
        {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": L,
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faq"]]},
    ]


def doc_ld(c, name, path):
    L = c["lang"]
    home = BASE + ("/" if L == "en" else "/tr")
    return [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Creator OS", "item": home},
        {"@type": "ListItem", "position": 2, "name": name, "item": BASE + path}]}]


def doc_body(inner):
    return f'<article class="doc">\n{inner}\n</article>'


def support_body(c):
    s = c["support"]
    qs = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in s["qs"])
    return doc_body(f"<h1>{e(s['h'])}</h1><p>{s['intro']}</p><h2 style='margin-top:2em'>FAQ</h2>{qs}" if c["lang"] == "en"
                    else f"<h1>{e(s['h'])}</h1><p>{s['intro']}</p><h2 style='margin-top:2em'>SSS</h2>{qs}")


def write(rel, text):
    path = OUT / rel.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def main():
    for L in ("en", "tr"):
        c = C[L]
        home_path = "/" if L == "en" else "/tr"
        write("index.html" if L == "en" else "tr/index.html",
              page(c, "/", "/tr", c["title"], c["desc"], landing(c), jsonld=landing_ld(c)))
        policy = fill_contact((STORE / f"privacy-policy.{L}.md").read_text())
        write("privacy.html" if L == "en" else "tr/privacy.html",
              page(c, "/privacy", "/tr/privacy", f'{c["priv_page"]} — Creator OS', c["priv_desc"], doc_body(md(policy)), "article",
                   jsonld=doc_ld(c, c["priv_page"], "/privacy" if L == "en" else "/tr/privacy")))
        write("support.html" if L == "en" else "tr/support.html",
              page(c, "/support", "/tr/support", f'{c["sup_page"]} — Creator OS', c["sup_desc"], support_body(c), "article",
                   jsonld=doc_ld(c, c["sup_page"], "/support" if L == "en" else "/tr/support")))
    pairs = [("/", "/tr"), ("/privacy", "/tr/privacy"), ("/support", "/tr/support")]
    lastmod = SITE["lastmod"]
    entries = ""
    for en_path, tr_path in pairs:
        for path in (en_path, tr_path):
            entries += (f"  <url><loc>{BASE}{path}</loc><lastmod>{lastmod}</lastmod>"
                        f'<xhtml:link rel="alternate" hreflang="en" href="{BASE}{en_path}"/>'
                        f'<xhtml:link rel="alternate" hreflang="tr" href="{BASE}{tr_path}"/>'
                        f'<xhtml:link rel="alternate" hreflang="x-default" href="{BASE}{en_path}"/></url>\n')
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + entries + "</urlset>\n")
    nf = C["en"]
    write("404.html", page(nf, "/", "/tr", "Page not found — Creator OS", "This page does not exist.",
                           doc_body('<h1>Page not found</h1><p>The page you were looking for does not exist. <a href="/">Go to the Creator OS home page</a> · <a href="/tr">Türkçe ana sayfa</a></p>'),
                           robots="noindex,follow"))
    urls = [p for pair in pairs for p in pair]
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    print("built", len(urls), "pages →", OUT)


if __name__ == "__main__":
    main()
