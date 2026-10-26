const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('BelgeselX Scraper Aktif!');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda calisiyor.`);
});
