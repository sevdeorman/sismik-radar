# 🌐 SismikRadar TR - Canlı Deprem Radarı & Acil Durum Tahliye Analizi

Türkiye genelinde meydana gelen sismik aktiviteleri anlık olarak takip eden, görselleştiren ve kullanıcılara afet anında en yakın toplanma alanlarını gösteren interaktif web tabanlı bir deprem takip paneli.

---

## ✨ Özellikler

* **Canlı Veri Entegrasyonu:** Kandilli Rasathanesi verileri üzerinden Türkiye genelindeki anlık deprem akışı.
* **Çift Görünüm Modu:**
  * **Noktasal Harita:** Depremlerin merkez üssü, büyüklük ve derinlik odaklı interaktif işaretçiler.
  * **Isı Haritası (Heatmap):** Sismik yoğunluğu ve fay kırılım kümelenmelerini gösteren ısı katmanı.
* **Kullanıcı Konum Analizi:** Haversine formülü ile kullanıcının son depremlere olan kuş uçuşu mesafesinin anlık hesabı.
* **🛡️ Acil Toplanma Alanları & Tahliye Rotası:** Kullanıcının bulunduğu koordinat çevresindeki güvenli toplanma alanlarını listeler ve en yakın alana kesikli tahliye rotası çizer.
* **Dinamik Filtreleme & Arama:** Şehir/bölge bazlı metin araması ve minimum büyüklük aralığı belirleme (Slider).
* **Modern Bordo/Mürdüm Arayüz:** Gözü yormayan, karanlık tema destekli profesyonel kontrol paneli.

---

## 🛠️ Kullanılan Teknolojiler

* **HTML5 & CSS3** (Custom UI, Flexbox, Responsive Grid)
* **JavaScript (ES6+)** (Fetch API, Asenkron Veri Yönetimi, DOM Manipülasyonu)
* **Leaflet.js** (İnteraktif Coğrafi Harita Motoru)
* **Leaflet.heat** (Sismik Yoğunluk Isı Haritası Kütüphanesi)
* **OpenStreetMap** (Açık Kaynak Harita Katmanları)

---

## 🚀 Canlı Önizleme

Projeyi canlı olarak test etmek için:
👉 **[SismikRadar TR Canlı Demo](https://sevdeorman.github.io/sismik-radar/)**