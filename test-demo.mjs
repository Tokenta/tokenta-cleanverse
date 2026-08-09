import puppeteer from 'puppeteer';

async function runTest(iteration) {
  console.log(`Starting Iteration ${iteration}`);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate to local dist server
  await page.goto('http://localhost:3000/cleanverse-demo', { waitUntil: 'networkidle0' });

  // Scene 1 -> 2
  const btn1 = await page.waitForSelector("::-p-text(View Verified Market)", { visible: true });
  await btn1.click();

  // Scene 2 -> 3
  const btn2 = await page.waitForSelector("::-p-text(Check Settlement Eligibility)", { visible: true });
  await btn2.click();

  // Scene 3 -> 4
  const btn3 = await page.waitForSelector("::-p-text(View Settlement Proof)", { visible: true });
  await btn3.click();

  // Scene 4 -> 5
  const btn4 = await page.waitForSelector("::-p-text(Test Ineligible Counterparty)", { visible: true });
  await btn4.click();

  // Scene 5 -> 6
  const btn5 = await page.waitForSelector("::-p-text(How Compliance Works)", { visible: true });
  await btn5.click();

  // Scene 6 -> 7
  const btn6 = await page.waitForSelector("::-p-text(View Final Summary)", { visible: true });
  await btn6.click();

  // Verify Scene 7
  await page.waitForSelector("::-p-text(Tokenta verifies the asset.)", { visible: true });
  console.log(`Iteration ${iteration} Passed!`);
  
  await browser.close();
}

async function main() {
  for (let i = 1; i <= 3; i++) {
    await runTest(i);
  }
  console.log("3/3 successful complete walkthroughs.");
}

main().catch(console.error);
