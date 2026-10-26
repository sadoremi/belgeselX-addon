const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

// Nuvio / Stremio uyumlu Manifest (Eklenti Bilgileri)
const manifest = {
  id: "org.belgeselx.addon",
  version: "1.0.0",
  name: "BelgeselX",
  description: "BelgeselX üzerinden belgesel ve içerikleri listeleyen eklenti",
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "belgeselx_catalog",
      name: "BelgeselX Arşivi"
    }
  ],
  resources: ["catalog"]
};

// Manifest endpoint'i
app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(manifest);
});

// Katalog verilerini çeken endpoint
app.get('/catalog/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const response = await axios.get('https://belgeselx.com/');
    const $ = cheerio.load(response.data);
    const metas = [];

    $('a').each((i, element) => {
      const title = $(element).text().trim();
      const href = $(element).attr('href');
      
      if (title && href && href.length > 5 && !href.includes('iletisim') && !href.includes('hakkimizda')) {
        metas.push({
          id: 'bx_' + i,
          type: 'movie',
          name: title,
          poster: 'https://belgeselx.com/logo.png', // Varsayılan görsel
          description: href
        });
      }
    });

    res.json({ metas: metas.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ metas: [], error: error.message });
  }
});

// Ana sayfa test mesajı
app.get('/', (req, res) => {
  res.send('BelgeselX Nuvio Addon Aktif! Manifest adresi: /manifest.json');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
