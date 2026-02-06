const axios = require('axios');

class MngKargoService {
  constructor(config = {}) {
    this.isTestMode = config.testMode !== false;
    this.baseUrl = this.isTestMode 
      ? 'https://testapi.mngkargo.com.tr/mngapi/api'
      : 'https://api.mngkargo.com.tr/mngapi/api';
    
    // Varsayılan Sandbox bilgileri
    const DEFAULT_CLIENT_ID = '7fd724286af5cbdcf97e25fd063e0281';
    const DEFAULT_CLIENT_SECRET = 'c1c8cfeda81ff8753d4b0d26a49d132d';
    const DEFAULT_CUSTOMER_NUMBER = '2326821076';
    const DEFAULT_PASSWORD = '2326821076..!!';
    
    this.clientId = config.clientId || process.env.MNG_CLIENT_ID || DEFAULT_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.MNG_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
    this.customerNumber = config.customerNumber || process.env.MNG_CUSTOMER_NUMBER || DEFAULT_CUSTOMER_NUMBER;
    this.password = config.password || process.env.MNG_PASSWORD || DEFAULT_PASSWORD;
    
    this.token = null;
    this.tokenExpireDate = null;
  }

  // Token alma
  async getToken() {
    // Token hala geçerliyse mevcut token'ı kullan
    if (this.token && this.tokenExpireDate && new Date() < new Date(this.tokenExpireDate)) {
      return {
        success: true,
        token: this.token,
        expireDate: this.tokenExpireDate
      };
    }

    // Gerekli bilgileri kontrol et
    if (!this.clientId || !this.clientSecret || !this.customerNumber || !this.password) {
      return {
        success: false,
        error: 'API bilgileri eksik. Lütfen tüm alanları doldurun.'
      };
    }

    try {
      console.log('Token isteği gönderiliyor:', this.baseUrl + '/token');
      console.log('Client ID:', this.clientId);
      console.log('Customer Number:', this.customerNumber);
      
      const response = await axios.post(`${this.baseUrl}/token`, {
        customerNumber: this.customerNumber,
        password: this.password,
        identityType: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-ibm-client-id': this.clientId,
          'x-ibm-client-secret': this.clientSecret
        },
        timeout: 30000
      });

      this.token = response.data.jwt;
      this.tokenExpireDate = response.data.jwtExpireDate;
      
      return {
        success: true,
        token: this.token,
        expireDate: this.tokenExpireDate,
        refreshToken: response.data.refreshToken
      };
    } catch (error) {
      console.error('Token alma hatası:', error.response?.data || error.message);
      
      let errorMessage = 'Bilinmeyen hata';
      
      if (error.response) {
        // API'den dönen hata
        errorMessage = error.response.data?.message 
          || error.response.data?.error 
          || error.response.data?.description
          || JSON.stringify(error.response.data)
          || `HTTP ${error.response.status} hatası`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'API sunucusuna bağlanılamadı';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımına uğradı';
      } else {
        errorMessage = error.message || 'Bağlantı hatası';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Sipariş oluşturma
  async createOrder(orderData) {
    const tokenResult = await this.getToken();
    if (!tokenResult.success && !this.token) {
      return { success: false, error: 'Token alınamadı: ' + tokenResult.error };
    }

    try {
      // ReferenceId buyuk harf olmali
      const referenceId = (orderData.referenceId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      const requestBody = {
        order: {
          referenceId: referenceId,
          barcode: referenceId,
          billOfLandingId: orderData.irsaliyeNo || '',
          isCOD: orderData.kapidaOdeme ? 1 : 0,
          codAmount: orderData.kapidaOdeme ? (orderData.kapidaOdemeTutar || 0) : 0,
          shipmentServiceType: orderData.teslimatTipi || 1,
          packagingType: orderData.paketTipi || 3,
          content: orderData.icerik || 'Urun',
          smsPreference1: 0,
          smsPreference2: 0,
          smsPreference3: 0,
          paymentType: 1,
          deliveryType: 1,
          "description": "Açıklama 1",
          marketPlaceShortCode: '',
          marketPlaceSaleCode: ''
        },
        orderPieceList: [{
          barcode: referenceId,
          desi: orderData.desi || 1,
          kg: orderData.kg || 1,
          content: orderData.icerik || 'Urun'
        }],
        recipient: {
          customerId: '',
          refCustomerId: '',
          cityCode: 0,
          cityName: (orderData.aliciIl || 'ISTANBUL').toUpperCase(),
          districtCode: 0,
          districtName: (orderData.aliciIlce || '').toUpperCase(),
          address: orderData.aliciAdres || 'Adres',
          bussinessPhoneNumber: '',
          email: orderData.aliciEmail || '',
          taxOffice: '',
          taxNumber: '',
          fullName: orderData.aliciAdSoyad || 'Alici',
          homePhoneNumber: '',
          mobilePhoneNumber: (orderData.aliciCepTel || '').replace(/\D/g, '')
        }
      };

      console.log('CreateOrder Request:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(`${this.baseUrl}/standardcmdapi/createOrder`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-ibm-client-id': this.clientId,
          'x-ibm-client-secret': this.clientSecret,
          'Authorization': `Bearer ${this.token}`
        }
      });

      return {
        success: true,
        data: response.data,
        orderInvoiceId: response.data[0]?.orderInvoiceId,
        referenceId: referenceId
      };
    } catch (error) {
      console.error('Siparis olusturma hatasi:', error.response?.data || error.message);
      
      let errorMsg = 'Bilinmeyen hata';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (error.response.data.errorMessage) {
          errorMsg = error.response.data.errorMessage;
        } else if (Array.isArray(error.response.data) && error.response.data[0]?.message) {
          errorMsg = error.response.data[0].message;
        } else {
          errorMsg = JSON.stringify(error.response.data);
        }
      } else {
        errorMsg = error.message;
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Barkod olusturma
  async createBarcode(barcodeData) {
    const tokenResult = await this.getToken();
    if (!tokenResult.success && !this.token) {
      return { success: false, error: 'Token alınamadı: ' + tokenResult.error };
    }

    try {
      const referenceId = (barcodeData.referenceId || '').toUpperCase();
      
      const requestBody = {
        referenceId: referenceId,
        billOfLandingId: barcodeData.irsaliyeNo || '',
        isCOD: barcodeData.kapidaOdeme ? 1 : 0,
        codAmount: barcodeData.kapidaOdemeTutar || 0,
        packagingType: barcodeData.paketTipi || 3,
        printReferenceBarcodeOnError: 1,
        message: '',
        additionalContent1: barcodeData.ekIcerik1 || '',
        additionalContent2: barcodeData.ekIcerik2 || '',
        additionalContent3: barcodeData.ekIcerik3 || '',
        additionalContent4: '',
        orderPieceList: (barcodeData.parcalar || [{ desi: 1, kg: 1 }]).map((parca, index) => ({
          barcode: `${referenceId}-P${index + 1}`,
          desi: parca.desi || 1,
          kg: parca.kg || 1,
          content: parca.icerik || 'Ürün'
        }))
      };

      const response = await axios.post(`${this.baseUrl}/barcodecmdapi/createbarcode`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-ibm-client-id': this.clientId,
          'x-ibm-client-secret': this.clientSecret,
          'Authorization': `Bearer ${this.token}`
        }
      });

      const result = response.data[0];
      
      return {
        success: true,
        data: result,
        shipmentId: result?.shipmentId,
        invoiceId: result?.invoiceId,
        barcodes: result?.barcodes || [],
        zplContent: result?.barcodes?.[0]?.value || null
      };
    } catch (error) {
      console.error('Barkod oluşturma hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data || error.message
      };
    }
  }

  // Gönderi sorgulama
  async getShipmentStatus(referenceId) {
    const tokenResult = await this.getToken();
    if (!tokenResult.success && !this.token) {
      return { success: false, error: 'Token alınamadı: ' + tokenResult.error };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/standardqueryapi/trackshipment/${referenceId.toUpperCase()}`, {
        headers: {
          'x-ibm-client-id': this.clientId,
          'x-ibm-client-secret': this.clientSecret,
          'Authorization': `Bearer ${this.token}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Gönderi sorgulama hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Sipariş detayı getirme
  async getOrder(referenceId) {
    const tokenResult = await this.getToken();
    if (!tokenResult.success && !this.token) {
      return { success: false, error: 'Token alınamadı: ' + tokenResult.error };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/standardqueryapi/getorder/${referenceId.toUpperCase()}`, {
        headers: {
          'x-ibm-client-id': this.clientId,
          'x-ibm-client-secret': this.clientSecret,
          'Authorization': `Bearer ${this.token}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Sipariş getirme hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Bağlantı testi
  async testConnection() {
    const result = await this.getToken();
    return {
      success: result.success,
      message: result.success ? 'Bağlantı başarılı!' : 'Bağlantı hatası: ' + result.error,
      tokenExpire: result.expireDate || null
    };
  }
}

module.exports = MngKargoService;
