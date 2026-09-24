import AppIntents
import Foundation
import SQLite3

// Siri / Shortcuts commands (Pro). They read the same on-device SQLite file the
// web layer writes, so answers can be spoken without launching the UI. The
// answers mirror src/assistant.js; keep the two in step when a command changes.
// Titles/descriptions are English keys translated via Localizable.strings; the
// spoken answers are chosen in code (see Pack) so the app's language setting wins.

// ---- Answer language ----
// The user's in-app language (mirrored into UserDefaults by app.js as
// "creatoros_lang"); before they ever chose one, the device language; else English.
// Answers mirror src/assistant.js — keep the two in step when a command changes.

private struct Pack {
    let locale: String
    let channels: [String: String]
    let proOnly: String
    let openAppFirst: String
    let unknown: String
    let noPending: String
    let pending: (_ total: Int, _ byChannel: String, _ top: String) -> String
    let noOffers: String
    let offers: (_ count: Int, _ sender: String, _ message: String) -> String
    let noBookings: String
    let bookings: (_ count: Int, _ lines: String) -> String
    let bookingLine: (_ day: String, _ time: String, _ title: String) -> String
    let noDeals: String
    let deals: (_ count: Int, _ total: String) -> String
    let noOverdue: String
    let overdue: (_ count: Int, _ lines: String) -> String
    let noLinks: String
    let links: (_ week: Int, _ total: Int) -> String
}

private let packs: [String: Pack] = [
    "tr": Pack(
        locale: "tr_TR",
        channels: ["INSTAGRAM_DM": "Instagram DM", "INSTAGRAM_COMMENT": "Instagram yorum", "EMAIL": "e-posta"],
        proOnly: "Asistan komutları Creator OS Pro özelliği. Profil'den yükseltebilirsin.",
        openAppFirst: "Önce Creator OS uygulamasını bir kez aç, sonra tekrar sor.",
        unknown: "bilinmeyen",
        noPending: "Cevap bekleyen mesaj yok.",
        pending: { "\($0) mesaj cevap bekliyor: \($1). En yeniler: \($2)." },
        noOffers: "Yeni marka teklifi yok.",
        offers: { "\($0) cevaplanmamış marka teklifi var. En yenisi \($1): \($2)" },
        noBookings: "Yaklaşan randevu yok.",
        bookings: { "\($0) yaklaşan randevu var. \($1)." },
        bookingLine: { "\($0) saat \($1), \($2)" },
        noDeals: "Açık anlaşma yok.",
        deals: { "\($0) açık anlaşma var, toplam \($1)." },
        noOverdue: "Geciken teslimat yok.",
        overdue: { "\($0) teslimat gecikti. \($1)." },
        noLinks: "Henüz link paketi gönderilmedi.",
        links: { "Son 7 günde \($0), toplamda \($1) link paketi gönderdin." }
    ),
    "en": Pack(
        locale: "en_US",
        channels: ["INSTAGRAM_DM": "Instagram DM", "INSTAGRAM_COMMENT": "Instagram comment", "EMAIL": "email"],
        proOnly: "Assistant commands are a Creator OS Pro feature. You can upgrade in Profile.",
        openAppFirst: "Open the Creator OS app once first, then ask again.",
        unknown: "unknown",
        noPending: "No messages are waiting for a reply.",
        pending: { "\($0) message\($0 == 1 ? "" : "s") waiting for a reply: \($1). Latest: \($2)." },
        noOffers: "No new brand offers.",
        offers: { "\($0) unanswered brand offer\($0 == 1 ? "" : "s"). Latest from \($1): \($2)" },
        noBookings: "No upcoming bookings.",
        bookings: { "\($0) upcoming booking\($0 == 1 ? "" : "s"). \($1)." },
        bookingLine: { "\($0) at \($1), \($2)" },
        noDeals: "No open deals.",
        deals: { "\($0) open deal\($0 == 1 ? "" : "s"), \($1) in total." },
        noOverdue: "No overdue deliverables.",
        overdue: { "\($0) overdue deliverable\($0 == 1 ? "" : "s"). \($1)." },
        noLinks: "No link bundles sent yet.",
        links: { "You sent \($0) link bundle\($0 == 1 ? "" : "s") in the last 7 days, \($1) in total." }
    ),
    "de": Pack(
        locale: "de_DE",
        channels: ["INSTAGRAM_DM": "Instagram-DM", "INSTAGRAM_COMMENT": "Instagram-Kommentar", "EMAIL": "E-Mail"],
        proOnly: "Assistenten-Befehle sind eine Creator-OS-Pro-Funktion. Du kannst im Profil upgraden.",
        openAppFirst: "Öffne zuerst einmal die Creator-OS-App und frage dann erneut.",
        unknown: "unbekannt",
        noPending: "Keine Nachrichten warten auf eine Antwort.",
        pending: { "\($0) Nachricht\($0 == 1 ? "" : "en") \($0 == 1 ? "wartet" : "warten") auf eine Antwort: \($1). Neueste: \($2)." },
        noOffers: "Keine neuen Markenangebote.",
        offers: { "\($0) unbeantwortete Markenangebote. Neuestes von \($1): \($2)" },
        noBookings: "Keine anstehenden Termine.",
        bookings: { "\($0) anstehende Termine. \($1)." },
        bookingLine: { "\($0) um \($1), \($2)" },
        noDeals: "Keine offenen Deals.",
        deals: { "\($0) offene Deals, insgesamt \($1)." },
        noOverdue: "Keine überfälligen Lieferungen.",
        overdue: { "\($0) Lieferung\($0 == 1 ? "" : "en") überfällig. \($1)." },
        noLinks: "Noch keine Link-Pakete gesendet.",
        links: { "In den letzten 7 Tagen hast du \($0) Link-Pakete gesendet, insgesamt \($1)." }
    ),
    "fr": Pack(
        locale: "fr_FR",
        channels: ["INSTAGRAM_DM": "DM Instagram", "INSTAGRAM_COMMENT": "commentaire Instagram", "EMAIL": "e-mail"],
        proOnly: "Les commandes de l'assistant sont une fonctionnalité Creator OS Pro. Vous pouvez passer à Pro dans le profil.",
        openAppFirst: "Ouvrez d'abord l'application Creator OS une fois, puis redemandez.",
        unknown: "inconnu",
        noPending: "Aucun message en attente de réponse.",
        pending: { "\($0) message\($0 == 1 ? "" : "s") en attente de réponse : \($1). Les plus récents : \($2)." },
        noOffers: "Aucune nouvelle offre de marque.",
        offers: { "\($0) offre\($0 == 1 ? "" : "s") de marque sans réponse. La plus récente de \($1) : \($2)" },
        noBookings: "Aucun rendez-vous à venir.",
        bookings: { "\($0) rendez-vous à venir. \($1)." },
        bookingLine: { "\($0) à \($1), \($2)" },
        noDeals: "Aucun accord en cours.",
        deals: { "\($0) accord\($0 == 1 ? "" : "s") en cours, \($1) au total." },
        noOverdue: "Aucun livrable en retard.",
        overdue: { "\($0) livrable\($0 == 1 ? "" : "s") en retard. \($1)." },
        noLinks: "Aucun lot de liens envoyé pour l'instant.",
        links: { "Vous avez envoyé \($0) lot\($0 == 1 ? "" : "s") de liens ces 7 derniers jours, \($1) au total." }
    ),
    "it": Pack(
        locale: "it_IT",
        channels: ["INSTAGRAM_DM": "DM Instagram", "INSTAGRAM_COMMENT": "commento Instagram", "EMAIL": "e-mail"],
        proOnly: "I comandi dell'assistente sono una funzione Creator OS Pro. Puoi passare a Pro dal Profilo.",
        openAppFirst: "Apri prima una volta l'app Creator OS, poi chiedi di nuovo.",
        unknown: "sconosciuto",
        noPending: "Nessun messaggio in attesa di risposta.",
        pending: { "\($0) messaggi\($0 == 1 ? "o" : "") in attesa di risposta: \($1). I più recenti: \($2)." },
        noOffers: "Nessuna nuova offerta dei brand.",
        offers: { "\($0) offert\($0 == 1 ? "a" : "e") di brand senza risposta. La più recente da \($1): \($2)" },
        noBookings: "Nessun appuntamento in arrivo.",
        bookings: { "\($0) appuntament\($0 == 1 ? "o" : "i") in arrivo. \($1)." },
        bookingLine: { "\($0) alle \($1), \($2)" },
        noDeals: "Nessun accordo aperto.",
        deals: { "\($0) accord\($0 == 1 ? "o aperto" : "i aperti"), \($1) in totale." },
        noOverdue: "Nessuna consegna in ritardo.",
        overdue: { "\($0) consegn\($0 == 1 ? "a" : "e") in ritardo. \($1)." },
        noLinks: "Nessun pacchetto di link inviato finora.",
        links: { "Negli ultimi 7 giorni hai inviato \($0) pacchett\($0 == 1 ? "o" : "i") di link, \($1) in totale." }
    ),
    "es": Pack(
        locale: "es_ES",
        channels: ["INSTAGRAM_DM": "DM de Instagram", "INSTAGRAM_COMMENT": "comentario de Instagram", "EMAIL": "correo"],
        proOnly: "Los comandos del asistente son una función de Creator OS Pro. Puedes mejorar a Pro desde Perfil.",
        openAppFirst: "Abre primero la app Creator OS una vez y vuelve a preguntar.",
        unknown: "desconocido",
        noPending: "No hay mensajes esperando respuesta.",
        pending: { "\($0) mensaje\($0 == 1 ? "" : "s") en espera de respuesta: \($1). Los más recientes: \($2)." },
        noOffers: "No hay ofertas nuevas de marcas.",
        offers: { "\($0) oferta\($0 == 1 ? "" : "s") de marcas sin responder. La más reciente, de \($1): \($2)" },
        noBookings: "No hay citas próximas.",
        bookings: { "\($0) cita\($0 == 1 ? "" : "s") próxima\($0 == 1 ? "" : "s"). \($1)." },
        bookingLine: { "\($0) a las \($1), \($2)" },
        noDeals: "No hay acuerdos abiertos.",
        deals: { "\($0) acuerdo\($0 == 1 ? "" : "s") abierto\($0 == 1 ? "" : "s"), \($1) en total." },
        noOverdue: "No hay entregas atrasadas.",
        overdue: { "\($0) entrega\($0 == 1 ? "" : "s") atrasada\($0 == 1 ? "" : "s"). \($1)." },
        noLinks: "Aún no se ha enviado ningún paquete de enlaces.",
        links: { "En los últimos 7 días enviaste \($0) paquete\($0 == 1 ? "" : "s") de enlaces, \($1) en total." }
    ),
    "ar": Pack(
        locale: "ar_EG",
        channels: ["INSTAGRAM_DM": "رسائل إنستغرام", "INSTAGRAM_COMMENT": "تعليقات إنستغرام", "EMAIL": "البريد الإلكتروني"],
        proOnly: "أوامر المساعد ميزة في Creator OS Pro. يمكنك الترقية من الملف الشخصي.",
        openAppFirst: "افتح تطبيق Creator OS مرة واحدة أولًا ثم اسأل مجددًا.",
        unknown: "غير معروف",
        noPending: "لا توجد رسائل بانتظار الرد.",
        pending: { "\($0) رسائل بانتظار الرد: \($1). الأحدث: \($2)." },
        noOffers: "لا توجد عروض جديدة من العلامات التجارية.",
        offers: { "\($0) عروض من العلامات التجارية بلا رد. أحدثها من \($1): \($2)" },
        noBookings: "لا توجد مواعيد قادمة.",
        bookings: { "\($0) مواعيد قادمة. \($1)." },
        bookingLine: { "\($0) الساعة \($1)، \($2)" },
        noDeals: "لا توجد صفقات مفتوحة.",
        deals: { "\($0) صفقات مفتوحة، بإجمالي \($1)." },
        noOverdue: "لا توجد تسليمات متأخرة.",
        overdue: { "\($0) تسليمات متأخرة. \($1)." },
        noLinks: "لم تُرسل أي حزمة روابط بعد.",
        links: { "أرسلت \($0) حزمة روابط خلال آخر 7 أيام، وإجمالًا \($1)." }
    ),
]

private var pack: Pack {
    let supported = ["tr", "en", "de", "fr", "it", "es", "ar"]
    if let saved = UserDefaults.standard.string(forKey: "CapacitorStorage.creatoros_lang"), supported.contains(saved), let p = packs[saved] {
        return p
    }
    for tag in Locale.preferredLanguages {
        let base = String(tag.lowercased().split(separator: "-").first ?? "")
        if supported.contains(base), let p = packs[base] { return p }
    }
    return packs["en"]!
}

private enum LocalData {
    static var dbURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("creatorosSQLite.db")
    }

    // The web layer mirrors its Pro state here (see mirrorProFlag in entitlements.js).
    static var isPro: Bool {
        UserDefaults.standard.string(forKey: "CapacitorStorage.creatoros_is_pro") == "1"
    }

    static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static func iso(_ date: Date) -> String { isoFormatter.string(from: date) }

    static func rows(_ sql: String, _ binds: [String] = []) -> [[String: Any]]? {
        guard FileManager.default.fileExists(atPath: dbURL.path) else { return nil }
        var db: OpaquePointer?
        guard sqlite3_open_v2(dbURL.path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_close(db) }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_finalize(stmt) }
        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        for (i, value) in binds.enumerated() {
            sqlite3_bind_text(stmt, Int32(i + 1), value, -1, transient)
        }
        var out: [[String: Any]] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            var row: [String: Any] = [:]
            for c in 0..<sqlite3_column_count(stmt) {
                let name = String(cString: sqlite3_column_name(stmt, c))
                switch sqlite3_column_type(stmt, c) {
                case SQLITE_INTEGER: row[name] = Int(sqlite3_column_int64(stmt, c))
                case SQLITE_FLOAT: row[name] = sqlite3_column_double(stmt, c)
                case SQLITE_TEXT: row[name] = String(cString: sqlite3_column_text(stmt, c))
                default: break
                }
            }
            out.append(row)
        }
        return out
    }

    static func number(_ row: [String: Any]?, _ key: String) -> Double {
        if let i = row?[key] as? Int { return Double(i) }
        return (row?[key] as? Double) ?? 0
    }

    // Each deal keeps its own currency, so totals are written per currency
    // ("45.000 ₺ + 2.000 $") and never added across currencies.
    static func money(_ value: Double, currency: String) -> String {
        let f = NumberFormatter()
        f.locale = Locale(identifier: pack.locale)
        f.numberStyle = .currency
        f.currencyCode = currency
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? "\(Int(value)) \(currency)"
    }

    static func day(_ isoString: String) -> String {
        guard let date = isoFormatter.date(from: isoString) else { return isoString }
        let f = DateFormatter()
        f.locale = Locale(identifier: pack.locale)
        f.setLocalizedDateFormatFromTemplate("dMMMMEEEE")
        return f.string(from: date)
    }

    static func clip(_ s: String, _ n: Int) -> String { s.count > n ? String(s.prefix(n - 1)) + "…" : s }

    // Runs `body` only when the user is Pro and the database exists yet.
    static func answer(_ body: () -> String) -> String {
        guard isPro else { return pack.proOnly }
        guard FileManager.default.fileExists(atPath: dbURL.path) else { return pack.openAppFirst }
        return body()
    }
}

private func pendingMessages() -> String {
    LocalData.answer {
        let sql = "FROM thread WHERE status = 'PENDING' AND intent != 'SPAM'"
        let total = Int(LocalData.number(LocalData.rows("SELECT COUNT(*) AS c \(sql)")?.first, "c"))
        if total == 0 { return pack.noPending }
        let byChannel = (LocalData.rows("SELECT channel, COUNT(*) AS c \(sql) GROUP BY channel") ?? [])
            .map { "\(Int(LocalData.number($0, "c"))) \(pack.channels[$0["channel"] as? String ?? ""] ?? "")" }
            .joined(separator: ", ")
        let top = (LocalData.rows("SELECT sender \(sql) ORDER BY received_at DESC LIMIT 3") ?? [])
            .compactMap { $0["sender"] as? String }.joined(separator: ", ")
        return pack.pending(total, byChannel, top)
    }
}

private func brandOffers() -> String {
    LocalData.answer {
        let rows = LocalData.rows("SELECT sender, full_message FROM thread WHERE status = 'PENDING' AND intent IN ('BRAND_DEAL', 'COLLABORATION') ORDER BY received_at DESC") ?? []
        guard let latest = rows.first else { return pack.noOffers }
        let sender = latest["sender"] as? String ?? pack.unknown
        let message = LocalData.clip(latest["full_message"] as? String ?? "", 110)
        return pack.offers(rows.count, sender, message)
    }
}

private func upcomingBookings() -> String {
    LocalData.answer {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        let rows = (LocalData.rows("SELECT date, start_time, end_time, title FROM booking ORDER BY date ASC") ?? []).filter {
            guard let s = $0["date"] as? String, let d = LocalData.isoFormatter.date(from: s) else { return false }
            return Calendar.current.startOfDay(for: d) >= startOfToday
        }
        if rows.isEmpty { return pack.noBookings }
        let lines = rows.prefix(4).map {
            pack.bookingLine(LocalData.day($0["date"] as? String ?? ""), $0["start_time"] as? String ?? "", $0["title"] as? String ?? "")
        }
        return pack.bookings(rows.count, lines.joined(separator: ". "))
    }
}

private func openDeals() -> String {
    LocalData.answer {
        let rows = LocalData.rows("SELECT currency, COUNT(*) AS c, COALESCE(SUM(amount), 0) AS total FROM deal WHERE stage != 'SIGNED' GROUP BY currency") ?? []
        let count = rows.reduce(0) { $0 + Int(LocalData.number($1, "c")) }
        if count == 0 { return pack.noDeals }
        let total = rows
            .map { LocalData.money(LocalData.number($0, "total"), currency: $0["currency"] as? String ?? "TRY") }
            .joined(separator: " + ")
        return pack.deals(count, total)
    }
}

private func overdueDeliverables() -> String {
    LocalData.answer {
        let rows = LocalData.rows(
            "SELECT d.brand AS brand, x.type AS type FROM deal_deliverable x JOIN deal d ON d.id = x.deal_id WHERE x.status = 'PENDING' AND x.due_date < ?",
            [LocalData.iso(Date())]
        ) ?? []
        if rows.isEmpty { return pack.noOverdue }
        let lines = rows.prefix(4).map { "\($0["brand"] as? String ?? ""): \($0["type"] as? String ?? "")" }
        return pack.overdue(rows.count, lines.joined(separator: ". "))
    }
}

private func linksThisWeek() -> String {
    LocalData.answer {
        let total = Int(LocalData.number(LocalData.rows("SELECT COUNT(*) AS c FROM link_send")?.first, "c"))
        if total == 0 { return pack.noLinks }
        let since = LocalData.iso(Date().addingTimeInterval(-7 * 86_400))
        let week = Int(LocalData.number(LocalData.rows("SELECT COUNT(*) AS c FROM link_send WHERE sent_at >= ?", [since])?.first, "c"))
        return pack.links(week, total)
    }
}

@available(iOS 16.0, *)
struct PendingMessagesIntent: AppIntent {
    static var title: LocalizedStringResource = "Pending Messages"
    static var description = IntentDescription("Tells you which DMs, comments and emails are waiting for a reply.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(pendingMessages())") }
}

@available(iOS 16.0, *)
struct BrandOffersIntent: AppIntent {
    static var title: LocalizedStringResource = "Brand Offers"
    static var description = IntentDescription("Tells you about unanswered brand offers.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(brandOffers())") }
}

@available(iOS 16.0, *)
struct UpcomingBookingsIntent: AppIntent {
    static var title: LocalizedStringResource = "Upcoming Bookings"
    static var description = IntentDescription("Tells you about your upcoming bookings.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(upcomingBookings())") }
}

@available(iOS 16.0, *)
struct OpenDealsIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Deals"
    static var description = IntentDescription("Tells you about open deals and their total value.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(openDeals())") }
}

@available(iOS 16.0, *)
struct OverdueDeliverablesIntent: AppIntent {
    static var title: LocalizedStringResource = "Overdue Deliverables"
    static var description = IntentDescription("Tells you about deliverables past their due date.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(overdueDeliverables())") }
}

@available(iOS 16.0, *)
struct LinksThisWeekIntent: AppIntent {
    static var title: LocalizedStringResource = "Links Sent"
    static var description = IntentDescription("Tells you how many link bundles you sent this week.")
    func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "\(linksThisWeek())") }
}

@available(iOS 16.0, *)
struct CreatorOSShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PendingMessagesIntent(),
            phrases: ["Pending messages in \(.applicationName)", "How many messages are waiting in \(.applicationName)"],
            shortTitle: "Pending Messages",
            systemImageName: "envelope.badge"
        )
        AppShortcut(
            intent: BrandOffersIntent(),
            phrases: ["Brand offers in \(.applicationName)", "Any new brand offers in \(.applicationName)"],
            shortTitle: "Brand Offers",
            systemImageName: "star"
        )
        AppShortcut(
            intent: UpcomingBookingsIntent(),
            phrases: ["Upcoming bookings in \(.applicationName)", "My appointments in \(.applicationName)"],
            shortTitle: "Upcoming Bookings",
            systemImageName: "calendar"
        )
        AppShortcut(
            intent: OpenDealsIntent(),
            phrases: ["Open deals in \(.applicationName)", "My deals in \(.applicationName)"],
            shortTitle: "Open Deals",
            systemImageName: "briefcase"
        )
        AppShortcut(
            intent: OverdueDeliverablesIntent(),
            phrases: ["Overdue deliverables in \(.applicationName)", "Late deliverables in \(.applicationName)"],
            shortTitle: "Overdue Deliverables",
            systemImageName: "clock.badge.exclamationmark"
        )
        AppShortcut(
            intent: LinksThisWeekIntent(),
            phrases: ["Links sent this week in \(.applicationName)", "Link stats in \(.applicationName)"],
            shortTitle: "Links Sent",
            systemImageName: "link"
        )
    }
}
