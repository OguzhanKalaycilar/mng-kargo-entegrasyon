const express = require('express');
const router = express.Router();
const { ayarlar } = require('../services/database');

// Tüm ayarları getir
router.get('/', async (req, res) => {
  try {
    const tumAyarlar = await ayarlar.getAll();
    // Şifreleri maskele
    const guvenliAyarlar = tumAyarlar.map(a => ({
      ...a,
      deger: a.anahtar.includes('password') || a.anahtar.includes('secret') 
        ? (a.deger ? '********' : '') 
        : a.deger
    }));
    res.json({ success: true, data: guvenliAyarlar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tek ayar getir
router.get('/:anahtar', async (req, res) => {
  try {
    const deger = await ayarlar.get(req.params.anahtar);
    res.json({ success: true, anahtar: req.params.anahtar, deger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ayar güncelle
router.post('/guncelle', async (req, res) => {
  try {
    const { anahtar, deger } = req.body;
    
    if (!anahtar) {
      return res.status(400).json({ success: false, error: 'Anahtar gerekli' });
    }

    await ayarlar.set(anahtar, deger);
    res.json({ success: true, message: 'Ayar guncellendi', anahtar, deger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MNG ayarlarını getir (güvenli)
router.get('/mng/config', async (req, res) => {
  try {
    const config = await ayarlar.getMngConfig();
    res.json({
      success: true,
      data: {
        testMode: config.testMode,
        clientId: config.clientId ? '****' + config.clientId.slice(-4) : '',
        clientSecret: config.clientSecret ? '********' : '',
        customerNumber: config.customerNumber,
        password: config.password ? '********' : ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MNG ayarlarını kaydet
router.post('/mng/kaydet', async (req, res) => {
  try {
    const { testMode, clientId, clientSecret, customerNumber, password } = req.body;

    if (testMode !== undefined) await ayarlar.set('mng_test_mode', testMode ? 'true' : 'false');
    if (clientId) await ayarlar.set('mng_client_id', clientId);
    if (clientSecret) await ayarlar.set('mng_client_secret', clientSecret);
    if (customerNumber) await ayarlar.set('mng_customer_number', customerNumber);
    if (password) await ayarlar.set('mng_password', password);

    res.json({ success: true, message: 'MNG ayarlari kaydedildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DİA ayarlarını kaydet
router.post('/dia/kaydet', async (req, res) => {
  try {
    const { apiUrl, apiKey, firmaKodu, kullanici } = req.body;

    if (apiUrl) await ayarlar.set('dia_api_url', apiUrl);
    if (apiKey) await ayarlar.set('dia_api_key', apiKey);
    if (firmaKodu) await ayarlar.set('dia_firma_kodu', firmaKodu);
    if (kullanici) await ayarlar.set('dia_kullanici', kullanici);

    res.json({ success: true, message: 'DIA ayarlari kaydedildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
