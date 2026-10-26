const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const manifest = {
  id: "org.belgeselx.addon",
  version: "1.0.0",
  name: "BelgeselX",
  description: "BelgeselX arşiv eklentisi",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "belgeselx_catalog",
      name: "BelgeselX Arşivi"
    }
  ]
};

app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

let cachedItems = [];

// 1. Katalog Listesini Çek
app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const response = await axios.get('https://belgeselx.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    cachedItems = [];

    $('a').each((i, element) => {
      const title = $(element).text().trim();
      let href = $(element).attr('href');
      
      if (title && href && title.length > 2) {
        if (!href.startsWith('http')) {
          href = 'https://belgeselx.com' + (href.startsWith('/') ? '' : '/') + href;
        }

        if (!cachedItems.some(item => item.name === title)) {
          cachedItems.push({
            id: 'bx_' + i,
            type: 'movie',
            name: title,
            poster: 'https://belgeselx.com/logo.png',
            description: title + ' - BelgeselX',
            url: href
          });
        }
      }
    });

    const metas = cachedItems.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      poster: item.poster,
      description: item.description
    }));

    res.json({ metas: metas.slice(0, 50) });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 2. Detay Sayfası
app.get('/meta/:type/:id.json', (req, res) => {
  const id = req.params.id;
  const item = cachedItems.find(i => i.id === id) || {
    id: id,
    type: 'movie',
    name: 'BelgeselX İçeriği',
    poster: 'https://belgeselx.com/logo.png',
    description: 'BelgeselX Arşiv'
  };

  res.json({
    meta: {
      id: item.id,
      type: item.type,
      name: item.name,
      poster: item.poster,
      description: item.description
    }
  });
});

// 3. Çoklu Kaynak (Stream) Tarayıcı - İstediğin Gibi Birden Fazla Link Döker
app.get('/stream/:type/:id.json', async (req, res) => {
  const id = req.params.id;
  const item = cachedItems.find(i => i.id === id);
  
  let streams = [];

  if (item && item.url) {
    try {
      const response = await axios.get(item.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const $ = cheerio.load(response.data);
      
      // Sayfadaki doğrudan video dosyalarını bul (.mp4 vb.)
      $('video, source').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) {
          streams.push({
            title: `BelgeselX - Doğrudan Kaynak ${i + 1}`,
            url: src
          });
        }
      });

      // Sayfadaki gömülü oynatıcıları (iframe) bul (YouTube, Mail.ru, Ok.ru vb.)
      $('iframe').each((i, el) => {
        let iframeSrc = $(el).attr('src') || $(el).attr('data-src');
        if (iframeSrc) {
          if (iframeSrc.startsWith('//')) {
            iframeSrc = 'https:' + iframeSrc;
          }
          streams.push({
            title: `BelgeselX Oynatıcı Kaynağı ${i + 1}`,
            url: iframeSrc
          });
        }
      });

    } catch (e) {}
  }

  // Eğer sayfadan otomatik video çekilemediyse, belgeselin kendi orijinal web sitesi linkini alternatif kaynak olarak ekle
  if (streams.length === 0 && item && item.url) {
    streams.push({
      title: "BelgeselX - Orijinal Web Kaynağı",
      url: item.url
    });
  }

  res.json({ streams });
});

app.get('/', (req, res) => {
  res.send('BelgeselX Addon Aktif!');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
