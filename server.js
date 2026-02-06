const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'mng-kargo-gizli-anahtar-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 saat
}));

// API Routes
const mngApiRoutes = require('./routes/mngApi');
const siparisRoutes = require('./routes/siparis');
const ayarlarRoutes = require('./routes/ayarlar');

app.use('/api/mng', mngApiRoutes);
app.use('/api/siparis', siparisRoutes);
app.use('/api/ayarlar', ayarlarRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check (Render için)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Sayfa bulunamadı' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Hata:', err);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚚 MNG Kargo Entegrasyon Paneli Başlatıldı!            ║
║                                                           ║
║   📍 Adres: http://localhost:${PORT}                       ║
║   🕐 Başlangıç: ${new Date().toLocaleString('tr-TR')}              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
