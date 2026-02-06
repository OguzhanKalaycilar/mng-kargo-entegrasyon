/**
 * MNG Kargo Entegrasyon Paneli
 * Ana JavaScript Dosyası
 */

// Global Değişkenler
let currentPage = 'dashboard';

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  updateCurrentDate();
  setupEventListeners();
  loadPage('dashboard');
  checkConnection();
}

function updateCurrentDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('tr-TR', options);
}

function setupEventListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) loadPage(page);
    });
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadPage(currentPage);
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

// Sayfa Yönetimi
function loadPage(page) {
  currentPage = page;
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  const titles = {
    'dashboard': 'Gösterge Paneli',
    'manuel-gonderi': 'Manuel Gönderi Oluştur',
    'gonderiler': 'Tüm Gönderiler',
    'dia-entegrasyon': 'DİA Entegrasyonu',
    'takip': 'Gönderi Takip',
    'ayarlar': 'Ayarlar',
    'loglar': 'İşlem Logları'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'Sayfa';

  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'manuel-gonderi': loadManuelGonderi(); break;
    case 'gonderiler': loadGonderiler(); break;
    case 'dia-entegrasyon': loadDiaEntegrasyon(); break;
    case 'takip': loadTakip(); break;
    case 'ayarlar': loadAyarlar(); break;
    case 'loglar': loadLoglar(); break;
  }

  document.querySelector('.sidebar').classList.remove('open');
}

// Dashboard
async function loadDashboard() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-box"></i></div>
        <div class="stat-info">
          <div class="stat-value" id="statBugun">-</div>
          <div class="stat-label">Bugünkü Gönderi</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
        <div class="stat-info">
          <div class="stat-value" id="statBekleyen">-</div>
          <div class="stat-label">Bekleyen</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
        <div class="stat-info">
          <div class="stat-value" id="statBasarili">-</div>
          <div class="stat-label">Başarılı</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div>
        <div class="stat-info">
          <div class="stat-value" id="statHatali">-</div>
          <div class="stat-label">Hatalı</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-list"></i> Son Gönderiler</h3>
        <button class="btn btn-sm btn-secondary" onclick="loadPage('gonderiler')">Tümünü Gör <i class="fas fa-arrow-right"></i></button>
      </div>
      <div class="card-body">
        <div class="table-container">
          <table class="table" id="sonGonderilerTable">
            <thead><tr><th>Referans No</th><th>Alıcı</th><th>Şehir</th><th>Tarih</th><th>Durum</th><th>İşlemler</th></tr></thead>
            <tbody><tr><td colspan="6" class="text-center text-muted">Yükleniyor...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch('/api/siparis/istatistikler');
    const result = await response.json();
    if (result.success) {
      document.getElementById('statBugun').textContent = result.data.bugunkuToplam;
      document.getElementById('statBekleyen').textContent = result.data.bekleyen;
      document.getElementById('statBasarili').textContent = result.data.basarili;
      document.getElementById('statHatali').textContent = result.data.hatali;
    }
  } catch (error) { console.error('İstatistik hatası:', error); }

  try {
    const response = await fetch('/api/siparis/son-gonderiler?limit=10');
    const result = await response.json();
    const tbody = document.querySelector('#sonGonderilerTable tbody');
    
    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data.map(g => `
        <tr>
          <td><strong>${g.reference_id}</strong></td>
          <td>${g.alici_ad_soyad || '-'}</td>
          <td>${g.alici_il || '-'}</td>
          <td>${formatDate(g.olusturma_tarihi)}</td>
          <td>${getStatusBadge(g.durum)}</td>
          <td class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="showGonderiDetay('${g.reference_id}')"><i class="fas fa-eye"></i></button>
            ${g.zpl_barkod ? `<button class="btn btn-sm btn-primary" onclick="printBarcode('${g.reference_id}')"><i class="fas fa-print"></i></button>` : ''}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Henüz gönderi bulunmuyor</td></tr>';
    }
  } catch (error) { console.error('Gönderiler yüklenemedi:', error); }
}

// Manuel Gönderi
function loadManuelGonderi() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-plus-circle"></i> Yeni Gönderi Oluştur</h3>
      </div>
      <div class="card-body">
        <form id="gonderiForm" onsubmit="submitGonderi(event)">
          <h4 class="mb-2" style="color: var(--gray-700); font-size: 1rem;"><i class="fas fa-user"></i> Alıcı Bilgileri</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Ad Soyad</label>
              <input type="text" class="form-control" name="aliciAdSoyad" required placeholder="Alıcının adı soyadı">
            </div>
            <div class="form-group">
              <label class="form-label required">Cep Telefonu</label>
              <input type="tel" class="form-control" name="aliciCepTel" required placeholder="5XX XXX XX XX">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input type="email" class="form-control" name="aliciEmail" placeholder="ornek@email.com">
            </div>
            <div class="form-group">
              <label class="form-label">Sipariş No</label>
              <input type="text" class="form-control" name="siparisNo" placeholder="Kendi sipariş numaranız">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Adres</label>
            <textarea class="form-control" name="aliciAdres" required placeholder="Tam adres bilgisi" rows="2"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">İl</label>
              <input type="text" class="form-control" name="aliciIl" required placeholder="İstanbul">
            </div>
            <div class="form-group">
              <label class="form-label required">İlçe</label>
              <input type="text" class="form-control" name="aliciIlce" required placeholder="Kadıköy">
            </div>
          </div>

          <h4 class="mb-2 mt-3" style="color: var(--gray-700); font-size: 1rem;"><i class="fas fa-box"></i> Paket Bilgileri</h4>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">İçerik</label>
              <input type="text" class="form-control" name="icerik" required placeholder="Ürün açıklaması">
            </div>
            <div class="form-group">
              <label class="form-label">İrsaliye No</label>
              <input type="text" class="form-control" name="irsaliyeNo" placeholder="Opsiyonel">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Desi</label>
              <input type="number" class="form-control" name="desi" value="1" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Kg</label>
              <input type="number" class="form-control" name="kg" value="1" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label">Parça Sayısı</label>
              <input type="number" class="form-control" name="parcaSayisi" value="1" min="1">
            </div>
          </div>

          <h4 class="mb-2 mt-3" style="color: var(--gray-700); font-size: 1rem;"><i class="fas fa-credit-card"></i> Ödeme</h4>

          <div class="form-row">
            <div class="form-group">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="kapidaOdeme" name="kapidaOdeme" onchange="toggleKapidaOdeme()">
                <label class="form-check-label" for="kapidaOdeme">Kapıda Ödeme</label>
              </div>
            </div>
            <div class="form-group" id="kapidaOdemeTutarGroup" style="display: none;">
              <label class="form-label">Tutar (TL)</label>
              <input type="number" class="form-control" name="kapidaOdemeTutar" step="0.01" placeholder="0.00">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Teslimat Tipi</label>
              <select class="form-control" name="teslimatTipi">
                <option value="1">Standart</option>
                <option value="7">Gün İçi</option>
                <option value="8">Akşam</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Paket Tipi</label>
              <select class="form-control" name="paketTipi">
                <option value="3">Paket</option>
                <option value="1">Dosya</option>
                <option value="2">Mi</option>
              </select>
            </div>
          </div>

          <div class="mt-3">
            <button type="submit" class="btn btn-primary btn-lg"><i class="fas fa-paper-plane"></i> Gönderi Oluştur</button>
            <button type="reset" class="btn btn-secondary btn-lg"><i class="fas fa-undo"></i> Temizle</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function toggleKapidaOdeme() {
  const checkbox = document.getElementById('kapidaOdeme');
  document.getElementById('kapidaOdemeTutarGroup').style.display = checkbox.checked ? 'block' : 'none';
}

async function submitGonderi(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const data = {
    aliciAdSoyad: formData.get('aliciAdSoyad'),
    aliciCepTel: formData.get('aliciCepTel'),
    aliciEmail: formData.get('aliciEmail'),
    aliciAdres: formData.get('aliciAdres'),
    aliciIl: formData.get('aliciIl'),
    aliciIlce: formData.get('aliciIlce'),
    siparisNo: formData.get('siparisNo'),
    icerik: formData.get('icerik'),
    irsaliyeNo: formData.get('irsaliyeNo'),
    desi: parseInt(formData.get('desi')) || 1,
    kg: parseInt(formData.get('kg')) || 1,
    parcaSayisi: parseInt(formData.get('parcaSayisi')) || 1,
    kapidaOdeme: formData.get('kapidaOdeme') === 'on',
    kapidaOdemeTutar: parseFloat(formData.get('kapidaOdemeTutar')) || 0,
    teslimatTipi: parseInt(formData.get('teslimatTipi')),
    paketTipi: parseInt(formData.get('paketTipi')),
    kaynak: 'manuel'
  };

  showLoading();

  try {
    const response = await fetch('/api/mng/gonderi-olustur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    hideLoading();

    if (result.success) {
      showToast('success', 'Basarili!', 'Gonderi olusturuldu. Takip No: ' + (result.shipmentId || result.referenceId));
      form.reset();
      showBarcodeModal(result);
    } else {
      // Hata mesajini duzenle
      let errorMsg = result.error;
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg);
      }
      showToast('error', 'Hata!', errorMsg || 'Gonderi olusturulamadi');
    }
  } catch (error) {
    hideLoading();
    showToast('error', 'Baglanti Hatasi', error.message);
  }
}

function showBarcodeModal(result) {
  document.getElementById('modalTitle').textContent = 'Gönderi Oluşturuldu';
  document.getElementById('modalBody').innerHTML = `
    <div class="text-center mb-2"><i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success-500);"></i></div>
    <p><strong>Referans No:</strong> ${result.referenceId}</p>
    <p><strong>Gönderi No:</strong> ${result.shipmentId}</p>
    <p><strong>Fatura No:</strong> ${result.invoiceId}</p>
    ${result.zplContent ? `
      <div class="mt-2">
        <button class="btn btn-primary" onclick="printBarcode('${result.referenceId}')"><i class="fas fa-print"></i> Barkod Yazdır</button>
      </div>
    ` : ''}
  `;
  openModal();
}

// Tüm Gönderiler
async function loadGonderiler() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-filter"></i> Filtrele</h3></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Durum</label>
            <select class="form-control" id="filtreDurum" onchange="filterGonderiler()">
              <option value="">Tümü</option>
              <option value="beklemede">Beklemede</option>
              <option value="basarili">Başarılı</option>
              <option value="hata">Hatalı</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kaynak</label>
            <select class="form-control" id="filtreKaynak" onchange="filterGonderiler()">
              <option value="">Tümü</option>
              <option value="manuel">Manuel</option>
              <option value="dia">DİA</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-2">
      <div class="card-body">
        <div class="table-container">
          <table class="table" id="gonderilerTable">
            <thead><tr><th>Referans</th><th>Alıcı</th><th>İl/İlçe</th><th>Gönderi No</th><th>Kaynak</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
            <tbody><tr><td colspan="8" class="text-center">Yükleniyor...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  filterGonderiler();
}

async function filterGonderiler() {
  const durum = document.getElementById('filtreDurum')?.value || '';
  const kaynak = document.getElementById('filtreKaynak')?.value || '';
  const params = new URLSearchParams();
  if (durum) params.append('durum', durum);
  if (kaynak) params.append('kaynak', kaynak);

  try {
    const response = await fetch(`/api/siparis/liste?${params}`);
    const result = await response.json();
    const tbody = document.querySelector('#gonderilerTable tbody');

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data.map(g => `
        <tr>
          <td><strong>${g.reference_id}</strong></td>
          <td>${g.alici_ad_soyad || '-'}</td>
          <td>${g.alici_il || '-'}/${g.alici_ilce || '-'}</td>
          <td>${g.mng_shipment_id || '-'}</td>
          <td><span class="badge ${g.kaynak === 'dia' ? 'badge-info' : 'badge-secondary'}">${g.kaynak === 'dia' ? 'DİA' : 'Manuel'}</span></td>
          <td>${getStatusBadge(g.durum)}</td>
          <td>${formatDate(g.olusturma_tarihi)}</td>
          <td class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="showGonderiDetay('${g.reference_id}')"><i class="fas fa-eye"></i></button>
            ${g.zpl_barkod ? `<button class="btn btn-sm btn-primary" onclick="printBarcode('${g.reference_id}')"><i class="fas fa-print"></i></button>` : ''}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Gönderi bulunamadı</td></tr>';
    }
  } catch (error) { console.error('Gönderiler yüklenemedi:', error); }
}

// DİA Entegrasyonu
function loadDiaEntegrasyon() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-plug"></i> DİA ERP Entegrasyonu</h3></div>
      <div class="card-body">
        <div class="empty-state">
          <i class="fas fa-tools empty-state-icon"></i>
          <h3 class="empty-state-title">Yakında Aktif</h3>
          <p class="empty-state-text">DİA entegrasyonu için önce Ayarlar sayfasından bağlantı bilgilerini giriniz.</p>
          <button class="btn btn-primary" onclick="loadPage('ayarlar')"><i class="fas fa-cog"></i> Ayarlara Git</button>
        </div>
      </div>
    </div>
  `;
}

// Gönderi Takip
function loadTakip() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-search"></i> Gönderi Takip</h3></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group" style="flex: 2;">
            <label class="form-label">Referans No veya Gönderi No</label>
            <input type="text" class="form-control" id="takipNo" placeholder="Takip numarasını giriniz">
          </div>
          <div class="form-group" style="align-self: flex-end;">
            <button class="btn btn-primary btn-lg" onclick="sorgulaTakip()"><i class="fas fa-search"></i> Sorgula</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-2" id="takipSonucCard" style="display: none;">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-info-circle"></i> Sonuç</h3></div>
      <div class="card-body" id="takipSonuc"></div>
    </div>
  `;
}

async function sorgulaTakip() {
  const takipNo = document.getElementById('takipNo').value.trim();
  if (!takipNo) { showToast('warning', 'Uyarı', 'Takip numarası giriniz'); return; }

  showLoading();
  try {
    const response = await fetch(`/api/siparis/detay/${takipNo}`);
    const result = await response.json();
    hideLoading();

    document.getElementById('takipSonucCard').style.display = 'block';
    if (result.success) {
      const g = result.data;
      document.getElementById('takipSonuc').innerHTML = `
        <p><strong>Referans:</strong> ${g.reference_id}</p>
        <p><strong>Gönderi No:</strong> ${g.mng_shipment_id || '-'}</p>
        <p><strong>Alıcı:</strong> ${g.alici_ad_soyad}</p>
        <p><strong>Adres:</strong> ${g.alici_adres}, ${g.alici_ilce}/${g.alici_il}</p>
        <p><strong>Durum:</strong> ${getStatusBadge(g.durum)}</p>
      `;
    } else {
      document.getElementById('takipSonuc').innerHTML = '<p class="text-muted">Gönderi bulunamadı</p>';
    }
  } catch (error) { hideLoading(); showToast('error', 'Hata', error.message); }
}

// Ayarlar
function loadAyarlar() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-truck"></i> MNG Kargo API Ayarları</h3></div>
      <div class="card-body">
        <form id="mngAyarlarForm" onsubmit="saveMngAyarlar(event)">
          <div class="form-group">
            <div class="form-check">
              <input type="checkbox" class="form-check-input" id="mngTestMode" name="testMode" checked>
              <label class="form-check-label" for="mngTestMode">Test Modu (Sandbox)</label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Client ID</label>
              <input type="text" class="form-control" name="clientId" placeholder="Uygulamadan alınan Client ID">
            </div>
            <div class="form-group">
              <label class="form-label required">Client Secret</label>
              <input type="password" class="form-control" name="clientSecret" placeholder="Secret Key">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Müşteri Numarası</label>
              <input type="text" class="form-control" name="customerNumber" placeholder="2326821076">
            </div>
            <div class="form-group">
              <label class="form-label required">Şifre</label>
              <input type="password" class="form-control" name="password" placeholder="Şifre">
            </div>
          </div>
          <div class="mt-2 d-flex gap-1">
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Kaydet</button>
            <button type="button" class="btn btn-secondary" onclick="testMngBaglanti()"><i class="fas fa-plug"></i> Bağlantı Test</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveMngAyarlar(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/ayarlar/mng/kaydet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testMode: formData.get('testMode') === 'on',
        clientId: formData.get('clientId'),
        clientSecret: formData.get('clientSecret'),
        customerNumber: formData.get('customerNumber'),
        password: formData.get('password')
      })
    });
    const result = await response.json();
    showToast(result.success ? 'success' : 'error', result.success ? 'Başarılı' : 'Hata', result.message || result.error);
  } catch (error) { showToast('error', 'Hata', error.message); }
}

async function testMngBaglanti() {
  showLoading();
  try {
    const response = await fetch('/api/mng/test-baglanti', { method: 'POST' });
    const result = await response.json();
    hideLoading();
    showToast(result.success ? 'success' : 'error', result.success ? 'Bağlantı Başarılı!' : 'Bağlantı Hatası', result.message || result.error);
    updateConnectionStatus(result.success);
  } catch (error) { hideLoading(); showToast('error', 'Hata', error.message); }
}

// Loglar
async function loadLoglar() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-history"></i> İşlem Logları</h3>
        <button class="btn btn-sm btn-secondary" onclick="loadLoglar()"><i class="fas fa-sync-alt"></i></button>
      </div>
      <div class="card-body">
        <div class="table-container">
          <table class="table" id="loglarTable">
            <thead><tr><th>Tarih</th><th>İşlem</th><th>Referans</th><th>Durum</th></tr></thead>
            <tbody><tr><td colspan="4" class="text-center">Yükleniyor...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch('/api/siparis/loglar?limit=50');
    const result = await response.json();
    const tbody = document.querySelector('#loglarTable tbody');

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data.map(log => `
        <tr>
          <td>${formatDateTime(log.tarih)}</td>
          <td>${log.islem_tipi}</td>
          <td>${log.reference_id || '-'}</td>
          <td>${log.durum === 'basarili' ? '<span class="badge badge-success">Başarılı</span>' : '<span class="badge badge-danger">Hata</span>'}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Log kaydı yok</td></tr>';
    }
  } catch (error) { console.error('Loglar yüklenemedi:', error); }
}

// Yardımcı Fonksiyonlar
function formatDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR') : '-'; }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('tr-TR') : '-'; }

function getStatusBadge(s) {
  const b = {
    'beklemede': '<span class="badge badge-warning"><i class="fas fa-clock"></i> Beklemede</span>',
    'basarili': '<span class="badge badge-success"><i class="fas fa-check"></i> Başarılı</span>',
    'hata': '<span class="badge badge-danger"><i class="fas fa-times"></i> Hata</span>'
  };
  return b[s] || `<span class="badge badge-secondary">${s}</span>`;
}

function showLoading() { document.getElementById('loadingOverlay').classList.add('active'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('active'); }
function openModal() { document.getElementById('modalOverlay').classList.add('active'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]} toast-icon"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

async function checkConnection() {
  try {
    const response = await fetch('/api/mng/test-baglanti', { method: 'POST' });
    const result = await response.json();
    updateConnectionStatus(result.success);
  } catch (error) { updateConnectionStatus(false); }
}

function updateConnectionStatus(connected) {
  const status = document.getElementById('connectionStatus');
  status.querySelector('.status-dot').className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  status.querySelector('.status-text').textContent = connected ? 'MNG API Bağlı' : 'Bağlantı Yok';
}

async function showGonderiDetay(refId) {
  try {
    const response = await fetch(`/api/siparis/detay/${refId}`);
    const result = await response.json();
    if (result.success) {
      const g = result.data;
      document.getElementById('modalTitle').textContent = `Gönderi: ${g.reference_id}`;
      document.getElementById('modalBody').innerHTML = `
        <p><strong>Gönderi No:</strong> ${g.mng_shipment_id || '-'}</p>
        <p><strong>Alıcı:</strong> ${g.alici_ad_soyad}</p>
        <p><strong>Tel:</strong> ${g.alici_telefon || '-'}</p>
        <p><strong>Adres:</strong> ${g.alici_adres}, ${g.alici_ilce}/${g.alici_il}</p>
        <p><strong>İçerik:</strong> ${g.icerik || '-'}</p>
        <p><strong>Desi/Kg:</strong> ${g.desi}/${g.kg}</p>
        <p><strong>Durum:</strong> ${getStatusBadge(g.durum)}</p>
        ${g.hata_mesaji ? `<p class="text-danger"><strong>Hata:</strong> ${g.hata_mesaji}</p>` : ''}
      `;
      openModal();
    }
  } catch (error) { showToast('error', 'Hata', 'Detay yüklenemedi'); }
}

async function printBarcode(refId) {
  try {
    const response = await fetch(`/api/siparis/detay/${refId}`);
    const result = await response.json();
    if (result.success && result.data.zpl_barkod) {
      const win = window.open('', '_blank');
      win.document.write(`<html><head><title>ZPL - ${refId}</title></head><body style="font-family:monospace;padding:20px;"><h3>ZPL Barkod: ${refId}</h3><textarea style="width:100%;height:400px;">${result.data.zpl_barkod}</textarea><br><button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value);alert('Kopyalandı!')">Kopyala</button></body></html>`);
    } else { showToast('warning', 'Uyarı', 'Barkod bulunamadı'); }
  } catch (error) { showToast('error', 'Hata', 'Barkod yüklenemedi'); }
}
