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
  version: "1.2.0",
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

// 1. Katalog Listesi
app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const response = await axios.get('https://belgeselx.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://belgeselx.com/'
      }
    });
    const $ = cheerio.load(response.data);
    const metas = [];

    $('a').each((i, element) => {
      const title = $(element).text().trim();
      let href = $(element).attr('href');
      
      if (title && href && title.length > 3) {
        if (!href.startsWith('http')) {
          href = 'https://belgeselx.com' + (href.startsWith('/') ? '' : '/') + href;
        }

        if (href !== 'https://belgeselx.com/' && !href.includes('tag') && !href.includes('kategori')) {
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
      name: 'BelgeselX Belgeseli',
      poster: 'https://belgeselx.com/logo.png',
      description: targetUrl ? `Kaynak Bağlantı: ${targetUrl}` : 'BelgeselX Arşivi'
    }
  });
});

// 3. Stream (Oynatıcı ve Kaynak Listesi) - İstediğin Gibi Tüm Önerileri Döken Kısım
app.get('/stream/:type/:id.json', async (req, res) => {
  const encodedId = req.params.id;
  let targetUrl = '';
  
  try {
    targetUrl = Buffer.from(encodedId, 'base64').toString('utf8');
  } catch (e) {}

  let streams = [];

  if (targetUrl) {
    try {
      const response = await axios.get(targetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://belgeselx.com/'
        }
      });
      const html = response.data;
      const $ = cheerio.load(html);
      
      // A) Sayfadaki tüm iframe ve gömülü oynatıcıları yakala (src, data-src vb. ne varsa)
      $('iframe').each((i, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-url');
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.startsWith('http')) {
            streams.push({
              title: `BelgeselX - Oynatıcı Kaynağı ${i + 1}`,
              url: src
            });
          }
        }
      });

      // B) Doğrudan video dosyalarını yakala (.mp4 vb.)
      $('video, source').each((i, el) => {
        let src = $(el).attr('src');
        if (src && src.startsWith('http')) {
          streams.push({
            title: `BelgeselX - Doğrudan Video ${i + 1}`,
            url: src
          });
        }
      });

      // C) Sayfa kaynağında gizli kalan embed/video linklerini regex ile avla
      const linkRegex = /src=["'](https?:\/\/[^"'\s]+\/embed\/[^"'\s]+|https?:\/\/[^"'\s]+\.mp4[^"'\s]*)["']/g;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const foundUrl = match[1];
        if (!streams.some(s => s.url === foundUrl)) {
          streams.push({
            title: `BelgeselX - Gömülü Alternatif`,
            url: foundUrl
          });
        }
      }

    } catch (e) {}
  }

  // Eğer siteden otomatik video/oynatıcı çekilemediyse, oynatıcı ekranında boş kalmasın diye 
  // hem site bağlantısını hem de alternatif oynatılabilir akış seçeneğini sunalım
  if (streams.length === 0 && targetUrl) {
    streams.push({
      title: "BelgeselX - Orijinal Oynatıcı Linki",
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
