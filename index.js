const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.get('/get-odds-link', async (req, res) => {
  const home = req.query.home?.trim();
  const away = req.query.away?.trim();

  if (!home || !away) {
    return res.status(400).json({ error: 'Missing home or away team' });
  }

  try {
    const link = await getOddsLink(home, away);
    if (link) {
      res.json({ oddsLink: link });
    } else {
      res.status(404).json({ error: 'Match not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

async function getOddsLink(homeTeam, awayTeam) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.totalcorner.com/match/today', { waitUntil: 'networkidle' });

  const rows = await page.$$('.table-main tbody tr');

  for (const row of rows) {
    const matchEl = await row.$('td:nth-child(2) a');
    const matchText = await matchEl?.innerText();
    if (!matchText) continue;

    const normalized = matchText.toLowerCase().replace(/\s+/g, ' ').trim();
    const expected = `${homeTeam.toLowerCase()} vs ${awayTeam.toLowerCase()}`;

    if (normalized === expected) {
      const oddsEl = await row.$('td:nth-child(5) a');
      const href = await oddsEl?.getAttribute('href');
      await browser.close();
      return href ? 'https://www.totalcorner.com' + href : null;
    }
  }

  await browser.close();
  return null;
}

app.listen(3000, () => console.log('Server running on port 3000'));
