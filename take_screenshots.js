import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport to nice mobile-style portrait aspect ratio
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('🌐 Opening Arrow Buddies on dev port 5174...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });

  // 1. Wait for boot loader to complete and transition to Menu
  console.log('⏳ Waiting for boot loader...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('📸 Taking Menu screenshot...');
  await page.screenshot({ path: 'assets/menu.png' });

  // 2. Click Play Game button
  // In 540x960 viewport, the Play button is around x=270, y=500.
  console.log('👉 Clicking Play Game...');
  await page.mouse.click(270, 500);
  await new Promise(r => setTimeout(r, 1500));

  console.log('📸 Taking World Select screenshot...');
  await page.screenshot({ path: 'assets/world_select.png' });

  // 3. Click the first world card "Jelly Hills"
  // In World Select, first card is around x=270, y=410.
  console.log('👉 Clicking World card...');
  await page.mouse.click(270, 410);
  await new Promise(r => setTimeout(r, 1500));

  // 4. Click Level 1
  // In Level Select, Level 1 row is around x=270, y=280.
  console.log('👉 Clicking Level 1...');
  await page.mouse.click(270, 280);
  await new Promise(r => setTimeout(r, 2500));

  console.log('📸 Taking Gameplay screenshot...');
  await page.screenshot({ path: 'assets/gameplay.png' });

  console.log('📸 Creating Banner from gameplay screenshot...');
  await page.screenshot({ path: 'assets/banner.png' });

  console.log('🏁 Screenshot capture complete!');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
