const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let dbReady = false;
let initPromise = null;
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');

// Veritabanını başlat
async function initializeDatabase() {
  if (dbReady && db) return db;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      const SQL = await initSqlJs();
      
      // Data klasörünü oluştur
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Eğer mevcut veritabanı varsa yükle
      try {
        if (fs.existsSync(dbPath)) {
          const fileBuffer = fs.readFileSync(dbPath);
          db = new SQL.Database(fileBuffer);
        } else {
          db = new SQL.Database();
        }
      } catch (e) {
        console.log('Yeni veritabanı oluşturuluyor...');
        db = new SQL.Database();
      }

      // Tabloları oluştur
      db.run(`
        CREATE TABLE IF NOT EXISTS ayarlar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anahtar TEXT UNIQUE NOT NULL,
          deger TEXT,
          aciklama TEXT,
          guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS gonderiler (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference_id TEXT UNIQUE NOT NULL,
          siparis_no TEXT,
          alici_ad_soyad TEXT NOT NULL,
          alici_telefon TEXT,
          alici_email TEXT,
          alici_adres TEXT,
          alici_il TEXT,
          alici_ilce TEXT,
          icerik TEXT,
          desi REAL DEFAULT 1,
          kg REAL DEFAULT 1,
          parca_sayisi INTEGER DEFAULT 1,
          kapida_odeme INTEGER DEFAULT 0,
          kapida_odeme_tutar REAL DEFAULT 0,
          mng_order_id TEXT,
          mng_shipment_id TEXT,
          mng_invoice_id TEXT,
          zpl_barkod TEXT,
          durum TEXT DEFAULT 'beklemede',
          hata_mesaji TEXT,
          kaynak TEXT DEFAULT 'manuel',
          dia_siparis_key TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS islem_loglari (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          islem_tipi TEXT NOT NULL,
          reference_id TEXT,
          istek TEXT,
          yanit TEXT,
          durum TEXT,
          hata_mesaji TEXT,
          tarih TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Varsayılan ayarları ekle
      const varsayilanAyarlar = [
        ['mng_test_mode', 'true', 'MNG API Test Modu'],
        ['mng_client_id', '', 'MNG Client ID'],
        ['mng_client_secret', '', 'MNG Client Secret'],
        ['mng_customer_number', '', 'MNG Musteri Numarasi'],
        ['mng_password', '', 'MNG Sifre'],
        ['dia_api_url', '', 'DIA API URL'],
        ['dia_api_key', '', 'DIA API Key'],
        ['dia_firma_kodu', '', 'DIA Firma Kodu'],
        ['dia_kullanici', '', 'DIA Kullanici']
      ];

      varsayilanAyarlar.forEach(([anahtar, deger, aciklama]) => {
        try {
          const existing = db.exec('SELECT id FROM ayarlar WHERE anahtar = ?', [anahtar]);
          if (existing.length === 0 || existing[0].values.length === 0) {
            db.run('INSERT INTO ayarlar (anahtar, deger, aciklama) VALUES (?, ?, ?)', [anahtar, deger, aciklama]);
          }
        } catch (e) {}
      });

      saveDatabase();
      dbReady = true;
      console.log('Veritabani baslatildi');
      return db;
    } catch (error) {
      console.error('Veritabani baslatma hatasi:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

// Veritabanını dosyaya kaydet
function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Veritabani kaydetme hatasi:', e.message);
  }
}

// DB hazır olana kadar bekle
async function ensureDb() {
  if (!dbReady || !db) {
    await initializeDatabase();
  }
  return db;
}

// Ayar işlemleri
const ayarlar = {
  get: async (anahtar) => {
    const database = await ensureDb();
    if (!database) return null;
    try {
      const result = database.exec('SELECT deger FROM ayarlar WHERE anahtar = ?', [anahtar]);
      return result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null;
    } catch (e) {
      console.error('Ayar okuma hatasi:', e);
      return null;
    }
  },
  
  set: async (anahtar, deger) => {
    const database = await ensureDb();
    if (!database) return;
    try {
      database.run('DELETE FROM ayarlar WHERE anahtar = ?', [anahtar]);
      database.run('INSERT INTO ayarlar (anahtar, deger, guncelleme_tarihi) VALUES (?, ?, datetime("now"))', [anahtar, deger]);
      saveDatabase();
    } catch (e) {
      console.error('Ayar kaydetme hatasi:', e);
    }
  },
  
  getAll: async () => {
    const database = await ensureDb();
    if (!database) return [];
    try {
      const result = database.exec('SELECT * FROM ayarlar');
      if (result.length === 0) return [];
      return result[0].values.map(row => ({
        id: row[0],
        anahtar: row[1],
        deger: row[2],
        aciklama: row[3],
        guncelleme_tarihi: row[4]
      }));
    } catch (e) {
      console.error('Ayarlari listeleme hatasi:', e);
      return [];
    }
  },

  getMngConfig: async () => {
    return {
      testMode: (await ayarlar.get('mng_test_mode')) === 'true',
      clientId: await ayarlar.get('mng_client_id'),
      clientSecret: await ayarlar.get('mng_client_secret'),
      customerNumber: await ayarlar.get('mng_customer_number'),
      password: await ayarlar.get('mng_password')
    };
  }
};

// Gönderi işlemleri
const gonderiler = {
  ekle: async (gonderi) => {
    const database = await ensureDb();
    if (!database) return;
    try {
      database.run(`
        INSERT INTO gonderiler (
          reference_id, siparis_no, alici_ad_soyad, alici_telefon, alici_email,
          alici_adres, alici_il, alici_ilce, icerik, desi, kg, parca_sayisi,
          kapida_odeme, kapida_odeme_tutar, kaynak, dia_siparis_key, olusturma_tarihi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))
      `, [
        gonderi.referenceId,
        gonderi.siparisNo || null,
        gonderi.aliciAdSoyad,
        gonderi.aliciTelefon || null,
        gonderi.aliciEmail || null,
        gonderi.aliciAdres,
        gonderi.aliciIl,
        gonderi.aliciIlce,
        gonderi.icerik || 'Urun',
        gonderi.desi || 1,
        gonderi.kg || 1,
        gonderi.parcaSayisi || 1,
        gonderi.kapidaOdeme ? 1 : 0,
        gonderi.kapidaOdemeTutar || 0,
        gonderi.kaynak || 'manuel',
        gonderi.diaSiparisKey || null
      ]);
      saveDatabase();
    } catch (e) {
      console.error('Gonderi ekleme hatasi:', e);
    }
  },

  guncelle: async (referenceId, data) => {
    const database = await ensureDb();
    if (!database) return;
    
    const fieldMap = {
      mngOrderId: 'mng_order_id',
      mngShipmentId: 'mng_shipment_id',
      mngInvoiceId: 'mng_invoice_id',
      zplBarkod: 'zpl_barkod',
      durum: 'durum',
      hataMesaji: 'hata_mesaji'
    };

    try {
      Object.keys(data).forEach(key => {
        const dbKey = fieldMap[key] || key;
        database.run(`UPDATE gonderiler SET ${dbKey} = ?, guncelleme_tarihi = datetime("now") WHERE reference_id = ?`, [data[key], referenceId]);
      });
      saveDatabase();
    } catch (e) {
      console.error('Gonderi guncelleme hatasi:', e);
    }
  },

  getir: async (referenceId) => {
    const database = await ensureDb();
    if (!database) return null;
    try {
      const result = database.exec('SELECT * FROM gonderiler WHERE reference_id = ?', [referenceId]);
      if (result.length === 0 || result[0].values.length === 0) return null;
      
      const cols = result[0].columns;
      const row = result[0].values[0];
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return obj;
    } catch (e) {
      console.error('Gonderi getirme hatasi:', e);
      return null;
    }
  },

  listele: async (filtre = {}) => {
    const database = await ensureDb();
    if (!database) return [];
    
    try {
      let sql = 'SELECT * FROM gonderiler WHERE 1=1';
      const params = [];

      if (filtre.durum) {
        sql += ' AND durum = ?';
        params.push(filtre.durum);
      }

      if (filtre.kaynak) {
        sql += ' AND kaynak = ?';
        params.push(filtre.kaynak);
      }

      sql += ' ORDER BY id DESC';

      if (filtre.limit) {
        sql += ' LIMIT ?';
        params.push(filtre.limit);
      }

      const result = database.exec(sql, params);
      if (result.length === 0) return [];
      
      const cols = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    } catch (e) {
      console.error('Gonderileri listeleme hatasi:', e);
      return [];
    }
  },

  istatistikler: async () => {
    const database = await ensureDb();
    if (!database) return { bugunkuToplam: 0, bekleyen: 0, basarili: 0, hatali: 0, toplamGonderi: 0 };
    
    try {
      const bugun = new Date().toISOString().split('T')[0];
      
      const bugunku = database.exec(`SELECT COUNT(*) FROM gonderiler WHERE DATE(olusturma_tarihi) = ?`, [bugun]);
      const bekleyen = database.exec(`SELECT COUNT(*) FROM gonderiler WHERE durum = 'beklemede'`);
      const basarili = database.exec(`SELECT COUNT(*) FROM gonderiler WHERE durum = 'basarili'`);
      const hatali = database.exec(`SELECT COUNT(*) FROM gonderiler WHERE durum = 'hata'`);
      const toplam = database.exec(`SELECT COUNT(*) FROM gonderiler`);

      return {
        bugunkuToplam: bugunku[0]?.values[0]?.[0] || 0,
        bekleyen: bekleyen[0]?.values[0]?.[0] || 0,
        basarili: basarili[0]?.values[0]?.[0] || 0,
        hatali: hatali[0]?.values[0]?.[0] || 0,
        toplamGonderi: toplam[0]?.values[0]?.[0] || 0
      };
    } catch (e) {
      console.error('Istatistik hatasi:', e);
      return { bugunkuToplam: 0, bekleyen: 0, basarili: 0, hatali: 0, toplamGonderi: 0 };
    }
  }
};

// Log işlemleri
const loglar = {
  ekle: async (log) => {
    const database = await ensureDb();
    if (!database) return;
    try {
      database.run(`
        INSERT INTO islem_loglari (islem_tipi, reference_id, istek, yanit, durum, hata_mesaji, tarih)
        VALUES (?, ?, ?, ?, ?, ?, datetime("now"))
      `, [
        log.islemTipi,
        log.referenceId || null,
        typeof log.istek === 'object' ? JSON.stringify(log.istek) : log.istek,
        typeof log.yanit === 'object' ? JSON.stringify(log.yanit) : log.yanit,
        log.durum,
        log.hataMesaji || null
      ]);
      saveDatabase();
    } catch (e) {
      console.error('Log ekleme hatasi:', e);
    }
  },

  listele: async (limit = 100) => {
    const database = await ensureDb();
    if (!database) return [];
    try {
      const result = database.exec(`SELECT * FROM islem_loglari ORDER BY id DESC LIMIT ?`, [limit]);
      if (result.length === 0) return [];
      
      const cols = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    } catch (e) {
      console.error('Loglari listeleme hatasi:', e);
      return [];
    }
  }
};

// Modül yüklendiğinde veritabanını başlat
initializeDatabase().catch(console.error);

module.exports = {
  ayarlar,
  gonderiler,
  loglar,
  initializeDatabase
};
