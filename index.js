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
  version: "1.1.0",
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

// 1. Katalog Listesi (URL'leri ID içine şifreliyoruz)
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
      let href = $(element).attr('href');
      
      if (title && href && title.length > 2) {
        if (!href.startsWith('http')) {
          href = 'https://belgeselx.com' + (href.startsWith('/') ? '' : '/') + href;
        }

        // URL'yi base64 formatına çevirip ID yapıyoruz (Hafıza derdi bitiyor)
        const encodedId = Buffer.from(href).toString('base64');

        if (!metas.some(m => m.id === encodedId)) {
          metas.push({
            id: encodedId,
            type: 'movie',
            name: title,
            poster: 'https://belgeselx.com/logo.png',
            description: title + ' - BelgeselX'
          });
        }
      }
    });

    res.json({ metas: metas.slice(0, 50) });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 2. Meta (Detay) Sayfası
app.get('/meta/:type/:id.json', async (req, res) => {
  const encodedId = req.params.id;
  let targetUrl = '';
  try {
    targetUrl = Buffer.from(encodedId, 'base64').toString('utf8');
  } catch (e) {}

  res.json({
    meta: {
      id: encodedId,
      type: 'movie',
      name: 'BelgeselX Arşiv İçeriği',
      poster: 'https://belgeselx.com/logo.png',
      description: targetUrl ? `Kaynak Bağlantı: ${targetUrl}` : 'BelgeselX Arşiv'
    }
  });
});

// 3. Stream (Oynatma Kaynakları) - Tıkladığında Linkleri Döken Kısım
app.get('/stream/:type/:id.json', async (req, res) => {
  const encodedId = req.params.id;
  let targetUrl = '';
  
  try {
    // ID içerisindeki şifrelenmiş URL'yi geri çözelim
    targetUrl = Buffer.from(encodedId, 'base64').toString('utf8');
  } catch (e) {}

  let streams = [];

  if (targetUrl) {
    try {
      const response = await axios.get(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const $ = cheerio.load(response.data);
      
      // Sayfadaki doğrudan video dosyalarını bul (.mp4 vb.)
      $('video, source').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) {
          streams.push({
            title: `BelgeselX - Doğrudan Video Kaynağı ${i + 1}`,
            url: src
          });
        }
      });

      // Sayfadaki gömülü oynatıcıları (iframe) bul
      $('iframe').each((i, el) => {
        let iframeSrc = $(el).attr('src') || $(el).attr('data-src');
        if (iframeSrc) {
          if (iframeSrc.startsWith('//')) {
            iframeSrc = 'https:' + iframeSrc;
          }
          streams.push({
            title: `BelgeselX - Oynatıcı Kaynağı ${i + 1}`,
            url: iframeSrc
          });
        }
      });

    } catch (e) {}
  }

  // Eğer sayfadan otomatik video çekilemediyse, orijinal site linkini stream olarak ekle ki tıklayınca açılsın
  if (streams.length === 0 && targetUrl) {
    streams.push({
      title: "BelgeselX - Web Sitesinde Oynat / Aç",
      url: targetUrl
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
