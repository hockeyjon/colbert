const { chromium } = require('playwright');
const twilio = require('twilio');

const url = 'https://1iota.com/show/536/the-late-show-with-stephen-colbert';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  ALERT_TO_PHONE
} = process.env;

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing required env var: ${name}`);
}

requireEnv('TWILIO_ACCOUNT_SID');
requireEnv('TWILIO_AUTH_TOKEN');
requireEnv('TWILIO_PHONE_NUMBER');
requireEnv('ALERT_TO_PHONE');

async function sendSms(message) {
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const res = await client.messages.create({
    from: TWILIO_PHONE_NUMBER,
    to: ALERT_TO_PHONE,
    body: message
  });
  return res.sid;
}

async function main() {
  const month = process.argv[2];
  const numberofChecks = parseInt(process.argv[3], 10) || 1;
  if (!month) {
    console.error('Usage: node check_april_tickets.js <MONTH>');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    let count = 0;
    while (numberofChecks > count) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

      // Selector: class attribute contains the substring.
      // If you meant "fa-calendar-plus" (with an 'e'), change it here.
      const iconSelector = '[class*="fa-calandar-plus"]';

      await page.waitForSelector(iconSelector, { timeout: 15000 });
      await page.click(iconSelector);

      // Give the page a moment to update after the click.
      // If the click triggers navigation, waiting for load state helps.
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);

      const text = await page.innerText('body');

      if (text.includes(month.toUpperCase())) {
        const sid = await sendSms(`${month} tickets are available`);
        console.log(`${month} found. SMS sent. SID:`, sid);
      } else {
        console.log(`${month} not found. No SMS sent.`);
      }
      await sleep(30000); // Wait 30 seconds before the next check.
      count++;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});