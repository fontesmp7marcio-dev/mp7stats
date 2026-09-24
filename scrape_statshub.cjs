const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://www.statshub.com/pt/fixture/levski-sofia-vs-red-bull-salzburg-mu505h/417598', { waitUntil: 'networkidle2' });
  
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src.includes('images.statshub.com/player'));
  });
  
  const text = await page.evaluate(() => document.body.innerText);
  
  console.log("IMAGES:", images);
  // console.log("TEXT:", text.substring(0, 500));
  
  await browser.close();
})();
