const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('BelgeselX Scraper Aktif ve Çalışıyor!');
});

// BelgeselX üzerindeki içerikleri çekeceğimiz test endpoint'i
app.get('/belgeseller', async (req, res) => {
  try {
    const response = await axios.get('https://belgeselx.com/');
    const $ = cheerio.load(response.data);
    const items = [];

    // Sitedeki başlıkları ve linkleri çekiyoruz
    $('a').each((i, element) => {
      const title = $(element).text().trim();
      const href = $(element).attr('href');
      if (title && href && href.length > 5) {
        items.push({ title, href });
      }
    });

    res.json({
      success: true,
      toplam_bulunan: items.length,
      icerikler: items.slice(0, 25) // İlk 25 içeriği listeleyelim
    });
  } catch (error) {
    res.status(500).json({ success: false, hata: error.message });
  }
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
