# 🚚 MNG Kargo Entegrasyon Paneli

DİA ERP ve MNG Kargo (DHL eCommerce) arasında entegrasyon sağlayan web tabanlı yönetim paneli.

## ✨ Özellikler

- 📦 **Manuel Gönderi Oluşturma** - Web arayüzünden tek tek kargo oluşturma
- 🔄 **DİA ERP Entegrasyonu** - Otomatik sipariş aktarımı (yakında)
- 🏷️ **Barkod Oluşturma** - ZPL formatında barkod üretimi
- 📊 **Dashboard** - Anlık istatistikler ve özet bilgiler
- 🔍 **Gönderi Takip** - Kargo durumu sorgulama
- 📋 **İşlem Logları** - Tüm API işlemlerinin kaydı

## 🚀 Kurulum

### 1. Gereksinimler

- Node.js 18+
- npm veya yarn

### 2. Projeyi İndirin

```bash
git clone https://github.com/OguzhanKalaycilar/mng-kargo-entegrasyon.git
cd mng-kargo-entegrasyon
```

### 3. Bağımlılıkları Yükleyin

```bash
npm install
```

### 4. Ortam Değişkenlerini Ayarlayın

```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

### 5. Uygulamayı Başlatın

```bash
# Geliştirme
npm run dev

# Üretim
npm start
```

Tarayıcıda `http://localhost:3000` adresine gidin.

## ⚙️ MNG Kargo API Ayarları

1. https://sandbox.mngkargo.com.tr adresine kayıt olun
2. Yeni uygulama oluşturun
3. Client ID ve Client Secret bilgilerini alın
4. API ürünlerine abone olun (Identity, Standard Command, Barcode)
5. Panel → Ayarlar sayfasından bilgileri girin

## 📁 Proje Yapısı

```
mng-kargo-entegrasyon/
├── server.js           # Ana sunucu dosyası
├── package.json        # Proje bağımlılıkları
├── .env.example        # Ortam değişkenleri örneği
├── routes/
│   ├── mngApi.js       # MNG API route'ları
│   ├── siparis.js      # Sipariş route'ları
│   └── ayarlar.js      # Ayarlar route'ları
├── services/
│   ├── mngKargoService.js  # MNG API servisi
│   └── database.js         # Veritabanı işlemleri
├── public/
│   ├── index.html      # Ana sayfa
│   ├── css/style.css   # Stiller
│   └── js/app.js       # Frontend JavaScript
└── data/
    └── database.sqlite # SQLite veritabanı
```

## 🔗 API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/mng/test-baglanti` | POST | Bağlantı testi |
| `/api/mng/gonderi-olustur` | POST | Yeni gönderi oluştur |
| `/api/mng/durum/:referenceId` | GET | Gönderi durumu sorgula |
| `/api/siparis/liste` | GET | Tüm gönderileri listele |
| `/api/siparis/istatistikler` | GET | İstatistikleri getir |
| `/api/ayarlar/mng/kaydet` | POST | MNG ayarlarını kaydet |

## 🌐 Render.com'a Deploy

1. GitHub'a push edin
2. Render.com'da "New Web Service" oluşturun
3. GitHub repo'nuzu bağlayın
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Environment Variables ekleyin

## 📄 Lisans

MIT

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır!

---

**Not:** Bu proje test amaçlıdır. Üretim ortamında kullanmadan önce güvenlik önlemlerini gözden geçirin.
