const express = require('express');
const router = express.Router();
const { gonderiler, loglar } = require('../services/database');

// Tüm gönderileri listele
router.get('/liste', async (req, res) => {
  try {
    const filtre = {
      durum: req.query.durum,
      kaynak: req.query.kaynak,
      baslangicTarihi: req.query.baslangic,
      bitisTarihi: req.query.bitis,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const liste = await gonderiler.listele(filtre);
    res.json({ success: true, data: liste, toplam: liste.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tek gönderi getir
router.get('/detay/:referenceId', async (req, res) => {
  try {
    const gonderi = await gonderiler.getir(req.params.referenceId);
    if (!gonderi) {
      return res.status(404).json({ success: false, error: 'Gonderi bulunamadi' });
    }
    res.json({ success: true, data: gonderi });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// İstatistikler
router.get('/istatistikler', async (req, res) => {
  try {
    const stats = await gonderiler.istatistikler();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Son gönderiler (Dashboard için)
router.get('/son-gonderiler', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const liste = await gonderiler.listele({ limit });
    res.json({ success: true, data: liste });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// İşlem logları
router.get('/loglar', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const liste = await loglar.listele(limit);
    res.json({ success: true, data: liste });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
