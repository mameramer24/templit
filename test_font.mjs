import fs from "fs";
import sharp from "sharp";

async function run() {
  const cssRes = await fetch("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.59.10 (KHTML, like Gecko) Version/5.1.9 Safari/534.59.10"
    }
  });
  const cssText = await cssRes.text();
  console.log("CSS TEXT:", cssText);
  // Extract the first ttf url
  const ttfUrl = cssText.match(/url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
  console.log("TTF URL:", ttfUrl);

  if (!ttfUrl) return;

  const fontRes = await fetch(ttfUrl);
  const fontBuffer = await fontRes.arrayBuffer();
  const fontBase64 = Buffer.from(fontBuffer).toString("base64");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <defs>
    <style>
      @font-face {
        font-family: 'Cairo';
        src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
      }
    </style>
  </defs>
  <rect width="400" height="200" fill="gray"/>
  <text x="200" y="100" fill="white" font-size="40" font-family="Cairo" text-anchor="middle">مرحباً بالعالم</text>
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync("test_arabic.png", png);
  console.log("Done");
}
run();
