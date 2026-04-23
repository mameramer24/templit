import fs from "fs";

async function download(url, dest) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    console.log(`Downloaded ${dest}`);
  } catch (err) {
    console.error(`Failed to download ${dest}:`, err);
  }
}

async function run() {
  await download("https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf", "public/fonts/dubai.ttf");
  await download("https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf", "public/fonts/bein.ttf");
}

run();
