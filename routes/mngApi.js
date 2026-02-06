const express = require('express');
const router = express.Router();
const MngKargoService = require('../services/mngKargoService');
const { ayarlar, gonderiler, loglar } = require('../services/database');

// MNG servisini ayarlardan oluştur
async function getMngService() {
  const config = await ayarlar.getMngConfig();
  return new MngKargoService(config);
}

// Bağlantı testi
router.post('/test-baglanti', async (req, res) => {
  try {
    const mng = await getMngService();
    const result = await mng.testConnection();
    
    await loglar.ekle({
      islemTipi: 'baglanti_testi',
      durum: result.success ? 'basarili' : 'hata',
      yanit: result
    });

    res.json(result);
  } catch (error) {
    console.error('Baglanti test hatasi:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Token al
router.post('/token', async (req, res) => {
  try {
    const mng = await getMngService();
    const result = await mng.getToken();
    
    await loglar.ekle({
      islemTipi: 'token_al',
      durum: result.success ? 'basarili' : 'hata',
      yanit: { success: result.success, expireDate: result.expireDate }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tek seferde sipariş + barkod
router.post('/gonderi-olustur', async (req, res) => {
  try {
    const mng = await getMngService();
    const data = req.body;
    const referenceId = (data.referenceId || `GND${Date.now()}`).toUpperCase();
    data.referenceId = referenceId;

    // Veritabanına kaydet
    try {
      await gonderiler.ekle({
        referenceId: referenceId,
        siparisNo: data.siparisNo,
        aliciAdSoyad: data.aliciAdSoyad,
        aliciTelefon: data.aliciCepTel,
        aliciEmail: data.aliciEmail,
        aliciAdres: data.aliciAdres,
        aliciIl: data.aliciIl,
        aliciIlce: data.aliciIlce,
        icerik: data.icerik,
        desi: data.desi || 1,
        kg: data.kg || 1,
        parcaSayisi: data.parcaSayisi || 1,
        kapidaOdeme: data.kapidaOdeme,
        kapidaOdemeTutar: data.kapidaOdemeTutar,
        kaynak: data.kaynak || 'manuel'
      });
    } catch (dbError) {
      console.log('DB kayit notu:', dbError.message);
    }

    // 1. Sipariş oluştur
    const orderResult = await mng.createOrder(data);
    
    if (!orderResult.success) {
      await gonderiler.guncelle(referenceId, {
        durum: 'hata',
        hataMesaji: 'Siparis hatasi: ' + orderResult.error
      });

      await loglar.ekle({
        islemTipi: 'gonderi_olustur',
        referenceId: referenceId,
        durum: 'hata',
        hataMesaji: orderResult.error
      });

      return res.json({
        success: false,
        step: 'order',
        error: typeof orderResult.error === 'object' ? JSON.stringify(orderResult.error) : orderResult.error
      });
    }

    // 2. Barkod oluştur
    const barcodeData = {
      referenceId: referenceId,
      irsaliyeNo: data.irsaliyeNo,
      kapidaOdeme: data.kapidaOdeme,
      kapidaOdemeTutar: data.kapidaOdemeTutar,
      paketTipi: data.paketTipi || 3,
      parcalar: data.parcalar || [{ desi: data.desi || 1, kg: data.kg || 1, icerik: data.icerik }]
    };

    const barcodeResult = await mng.createBarcode(barcodeData);

    if (!barcodeResult.success) {
      await gonderiler.guncelle(referenceId, {
        mngOrderId: orderResult.data[0]?.orderInvoiceId,
        durum: 'barkod_hatasi',
        hataMesaji: 'Barkod hatasi: ' + barcodeResult.error
      });

      return res.json({
        success: false,
        step: 'barcode',
        orderCreated: true,
        orderId: orderResult.data[0]?.orderInvoiceId,
        error: barcodeResult.error
      });
    }

    // Başarılı
    await gonderiler.guncelle(referenceId, {
      mngOrderId: orderResult.data[0]?.orderInvoiceId,
      mngShipmentId: barcodeResult.shipmentId,
      mngInvoiceId: barcodeResult.invoiceId,
      zplBarkod: barcodeResult.zplContent,
      durum: 'basarili'
    });

    await loglar.ekle({
      islemTipi: 'gonderi_olustur',
      referenceId: referenceId,
      durum: 'basarili',
      yanit: {
        orderId: orderResult.data[0]?.orderInvoiceId,
        shipmentId: barcodeResult.shipmentId
      }
    });

    res.json({
      success: true,
      referenceId: referenceId,
      orderId: orderResult.data[0]?.orderInvoiceId,
      shipmentId: barcodeResult.shipmentId,
      invoiceId: barcodeResult.invoiceId,
      zplContent: barcodeResult.zplContent,
      barcodes: barcodeResult.barcodes
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gönderi durumu sorgula
router.get('/durum/:referenceId', async (req, res) => {
  try {
    const mng = await getMngService();
    const result = await mng.getShipmentStatus(req.params.referenceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
