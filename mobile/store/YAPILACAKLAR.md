# Creator OS — Yayına çıkmadan önce yapılacaklar

Hazırlanma tarihi: 24 Eylül 2026. Kod ve dosya tarafındaki işler bitti; aşağıdakiler
**senin** yapman gereken (hesap, anahtar, karar, gerçek cihaz testi) işlerdir.
Sıra önerilen sıradır. ⏱ = tahmini bekleme/süre.

Uygulama kimliği (iOS bundle / Android paket): `com.creatoros.app` · sürüm `1.0` (build/versionCode `1`)

---

## 1. Hesaplar (önce bunlar — bazıları günler sürer)

- [ ] **Apple Developer Program** üyeliği (yıllık ücretli) ⏱ onay 1–2 gün
- [ ] **Google Play Console** hesabı (tek seferlik ücret + kimlik doğrulama) ⏱ 1–3 gün
- [ ] **RevenueCat** hesabı (Pro aboneliği için; başlangıç planı ücretsiz)
- [ ] **Gizlilik politikası için bir web adresi** (GitHub Pages, kendi alan adın vb.)

## 2. Aboneliği (Pro) kurmak — bu olmadan Pro satılamaz

- [ ] App Store Connect'te uygulamayı oluştur (`com.creatoros.app`) ve **auto-renewable subscription** ürününü tanımla
- [ ] Play Console'da uygulamayı oluştur ve aynı şekilde **abonelik** ürününü tanımla
- [ ] RevenueCat'te iki mağazayı bağla, `pro` adında bir **entitlement** ve bir **offering** oluştur
- [ ] RevenueCat'in iki **API anahtarını** al ve şuraya yaz: `mobile/src/entitlements.js`
      → `REVENUECAT_API_KEY` içindeki `REPLACE_WITH_REVENUECAT_IOS_API_KEY` ve `..._ANDROID_API_KEY`
      (Şu an boş olduğu için uygulama herkesi ücretsiz sürümde gösteriyor.)
- [ ] Fiyatı sen belirle (kodda fiyat yok, mağazadan geliyor)
- [ ] Sandbox / test hesabıyla satın alma ve **geri yükleme** akışını gerçek cihazda dene

## 3. Gizlilik politikası ve mağaza formları

Dosyalar: `mobile/store/`

- [x] Gizlilik politikasındaki geliştirici adı ve iletişim e-postası dolduruldu (Gökhan TURHAN, gokhanturhan71@gmail.com)
- [x] Politika web sitesinde yayınlanır: `/privacy` ve `/tr/privacy` (site: `website/`, Vercel). Bu adresi iki mağazaya da gir
- [ ] **Vercel Web Analytics'i aç:** vercel.com → `creator-os` projesi → Analytics → Enable (kod hazır; açmadan veri gelmez)
- [ ] Siteyi Google Search Console'a ekle ve `/sitemap.xml` adresini gönder
- [ ] Mağazalar için posta adresi istenirse politikaya ekle; sonra `python3 website/build.py` çalıştırıp siteyi yeniden yayınla
- [ ] `store-privacy-answers.md` dosyasına göre **Apple "Uygulama Gizliliği"** ve **Google "Data safety"** formlarını doldur
- [ ] ⚠ İki maddeye kendin karar ver: (a) Pro'da OpenAI'a giden mesaj içeriğini "toplanan veri" olarak bildirmek,
      (b) RevenueCat'in topladığı veriler → RevenueCat'in kendi gizlilik rehberiyle karşılaştır

## 4. Mağaza sayfası

- [ ] Ekran görüntüleri hazır: `store/screenshots/ios-6.9in/{tr,en}` ve `android-phone/{tr,en}` (7'şer adet). Sırayı `README.md` anlatıyor
- [ ] Açıklama metinlerini yaz (başlık, alt başlık, uzun açıklama, anahtar kelimeler) — TR ve EN
- [ ] **Açıklamada gerçek Instagram/e-posta kutusuna bağlandığını söyleme.** Uygulama bugün gerçek hesaplara bağlı değil;
      gelen kutusu örnek verilerle çalışıyor. Doğru anlatım: yanıt taslağı, teklif/anlaşma takibi, randevu, link paketleri;
      yanıtı Instagram'a veya posta uygulamasına sen gönderirsin
- [ ] **Asistan**, **Linkler**, **bildirim kuralları**, **takvim aktarımı**, **Siri kısayolları** Pro özellikleri; açıklamada "Pro" diye işaretle
- [ ] Örnek verilerin **kurgusal** olduğunu belirt
- [ ] Yaş sınırı / içerik derecelendirme anketlerini doldur (çocuklara yönelik değil)
- [ ] Destek e-postası ve (istenirse) destek sayfası adresi

## 5. Çeviriler — yayından önce ana dili konuşan biri baksın

7 dil var: Türkçe, İngilizce, Almanca, Fransızca, İtalyanca, İspanyolca, Arapça.
Hepsini ben yazdım; Türkçe ve İngilizce dışındakiler kesin gözden geçirme ister.

- [ ] Almanca · [ ] Fransızca · [ ] İtalyanca · [ ] İspanyolca · [ ] Arapça
- Özellikle: Arapça çoğul ve sayı kalıpları ("1 مواعيد" gibi), mail şablonu metinleri, asistan cevap cümleleri
- Dosyalar: `mobile/src/i18n-extra.js`, `i18n-extra-more.js`, `assistant.js`, `ai-draft-generator.js`, `ios/App/App/*.lproj`, `android/.../values-*`

## 6. Gerçek cihazda denemen gerekenler (simülatörde yapılamadı)

- [ ] **Siri**: sesli komutlar ve Kısayollar uygulamasında cevaplar (Türkçe/İngilizce dışındaki diller dahil)
- [ ] Android **başlatıcı kısayolları** (uzun basma) ve uygulama dil ayarı
- [ ] **Bildirimler** (Pro kuralları) gerçek telefonda
- [ ] **RevenueCat sandbox** satın alma / geri yükleme
- [ ] **OpenAI** ile gerçek YZ taslağı ve asistan cevabı (kendi anahtarınla; hesabında kredi olmalı — daha önce kredi yoktu)
- [ ] Posta uygulamasının açılması, Instagram'a geçiş, takvim (.ics) aktarımı
- [ ] Bir de küçük ekranlı ve eski bir telefonda kabaca bak

## 7. Yayın paketleri (derleme)

- [ ] **iOS**: Xcode'da Team (imza) seç → Archive → TestFlight'a yükle → dahili test → incelemeye gönder
- [ ] **Android**: bir **imza anahtarı (keystore)** oluştur ve **güvenli yerde yedekle** (kaybedersen güncelleme atamazsın) →
      `AAB` üret → Play Console'da iç test → üretime çıkar
- [ ] Yeni sürümde `versionCode` / build numarasını artır (şu an ikisi de `1`)
- [ ] Mağaza sürümünde geliştirme kalıntısı olmadığını kontrol et: `grep -rn "TEMP DEBUG" mobile/src` boş dönmeli
      (son kontrolde boştu; ekran görüntüsü için açtığım geçici Pro geçişi kaldırıldı)

## 8. Sonraya bıraktıklarımız (bilinçli kararlar)

- **YouTube yorum entegrasyonu** çıkarıldı; çalışan hâli `mobile/_parked-youtube/` içinde, geri getirme adımları orada.
  Geri getirmek için önce Google Cloud'da OAuth kimlikleri ve Google'ın "hassas kapsam" doğrulaması gerekir (haftalar sürebilir).
- **Gerçek Instagram / e-posta / TikTok / WhatsApp gelen kutusu bağlantısı yok.** Sunucu gerektiren bildirimler ve otomatik
  alma ancak ayrı bir sunucu taraflı iş olarak eklenebilir; bu bir ürün kararı.
- **Kur çevirisi yok:** anlaşma tutarları girildiği para biriminde kalır, dil değişince çevrilmez.
- Yeni dillerin (İtalyanca, İspanyolca) Siri ve Android kısayollarının cihazda denenmesi.

## 9. Faydalı yollar

| Ne | Nerede |
|---|---|
| Uygulama kodu | `mobile/src/` |
| Derleme | `cd mobile && pnpm run build && npx cap sync` |
| iOS projesi | `mobile/ios/App/App.xcodeproj` |
| Android projesi | `mobile/android/` (JDK 21 gerekir) |
| Mağaza dosyaları | `mobile/store/` |
| Park edilen YouTube işi | `mobile/_parked-youtube/` |
