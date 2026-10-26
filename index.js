const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

// Tüm Nuvio/Stremio istekleri için CORS başlıkları
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Nuvio / Stremio uyumlu Manifest
const manifest = {
  id: "org.belgeselx.addon",
  version: "1.0.0",
  name: "BelgeselX",
  description: "BelgeselX arşiv eklentisi",
  resources: ["catalog"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "belgeselx_catalog",
      name: "BelgeselX Arşivi"
    }
  ]
};

// Manifest endpoint'i
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// Katalog endpoint'i
app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const response = await axios.get('https://belgeselx.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const metas = [];

    $('a').each((i, element) => {
      const title = $(element).text().trim();
      const href = $(element).attr('href');
      
      if (title && href && href.length > 5 && href.startsWith('http')) {
        metas.push({
          id: 'bx_' + i,
          type: 'movie',
          name: title,
          poster: 'https://belgeselx.com/logo.png',
          description: title
        });
      }
    });

    res.json({ metas: metas.slice(0, 50) });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send('BelgeselX Addon Aktif!');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
