import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const CONFIG_PATH = path.resolve(process.cwd(), 'keys.local.json');
const OUTPUT_DIR = path.resolve(process.cwd(), 'qr-codes');

const CANTEENS = [
  { slug: 'fruit-canteen', name: 'Fruit Canteen' },
  { slug: 'main-canteen', name: 'Main Canteen' },
  { slug: 'staff-canteen', name: 'Staff Canteen' },
];

async function main() {
  console.log('\n[Canteen Crowd] Generating Physical QR Codes...\n');

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('ERROR: "keys.local.json" configuration file not found!');
    console.error('Please create "keys.local.json" by copying "keys.local.example.json":');
    console.error('  cp keys.local.example.json keys.local.json\n');
    console.error('Then retrieve the three active canteen keys from your Supabase SQL editor:');
    console.error('  SELECT c.slug, c.name, s.qr_key FROM canteens c JOIN canteen_secrets s ON s.canteen_id = c.id;\n');
    process.exit(1);
  }

  let config;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error('ERROR: Unable to parse "keys.local.json". Please verify it is valid JSON.', err.message);
    process.exit(1);
  }

  const { baseUrl, keys } = config;

  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) {
    console.error('ERROR: "baseUrl" is missing or empty in keys.local.json.');
    console.error('Example: "baseUrl": "https://canteen-crowd.vercel.app"');
    process.exit(1);
  }

  if (!keys || typeof keys !== 'object') {
    console.error('ERROR: "keys" map is missing in keys.local.json.');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cleanedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const generatedItems = [];

  for (const canteen of CANTEENS) {
    const key = keys[canteen.slug];

    if (!key || typeof key !== 'string' || !key.trim()) {
      console.error(`ERROR: Missing or empty secret key for "${canteen.name}" (${canteen.slug}) in keys.local.json.`);
      process.exit(1);
    }

    const reportUrl = `${cleanedBaseUrl}/c/${canteen.slug}?k=${encodeURIComponent(key.trim())}`;
    const pngFilename = `${canteen.slug}.png`;
    const pngPath = path.join(OUTPUT_DIR, pngFilename);

    // High error correction ('H' ~30% recovery) allows posters to still scan even if creased or smudged
    // Margin of 4 ensures standard required quiet zone around the QR matrix
    await QRCode.toFile(pngPath, reportUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 4,
      width: 600,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    console.log(`  ✓ Generated QR code: ${canteen.name} -> qr-codes/${pngFilename}`);
    generatedItems.push({
      ...canteen,
      pngFilename,
      reportUrl,
    });
  }

  // Generate printable HTML poster
  const printHtmlPath = path.join(OUTPUT_DIR, 'print.html');
  const printHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Canteen Crowd - Printable QR Posters</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2rem;
    }
    .print-actions {
      max-width: 800px;
      margin: 0 auto 2rem;
      text-align: center;
    }
    .print-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }
    .poster-grid {
      display: flex;
      flex-direction: column;
      gap: 3rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .poster-card {
      background: white;
      border: 3px solid #0f172a;
      border-radius: 16px;
      padding: 3rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-after: always;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .poster-brand {
      font-size: 1.25rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #2563eb;
      margin-bottom: 0.5rem;
    }
    .poster-title {
      font-size: 2.75rem;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 0.75rem;
      line-height: 1.1;
    }
    .poster-subtitle {
      font-size: 1.5rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 2rem;
    }
    .poster-qr-frame {
      padding: 1.5rem;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      background: #ffffff;
      margin-bottom: 2rem;
    }
    .poster-qr-img {
      width: 320px;
      height: 320px;
      display: block;
    }
    .poster-hint {
      font-size: 1.1rem;
      color: #64748b;
      max-width: 480px;
      line-height: 1.4;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .print-actions {
        display: none;
      }
      .poster-grid {
        gap: 0;
      }
      .poster-card {
        box-shadow: none;
        border: 2px solid #000;
        height: 100vh;
        justify-content: center;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">Print Posters (Ctrl / Cmd + P)</button>
  </div>

  <div class="poster-grid">
    ${generatedItems
      .map(
        (item) => `
    <article class="poster-card">
      <div class="poster-brand">Canteen Crowd</div>
      <h1 class="poster-title">${item.name}</h1>
      <p class="poster-subtitle">Scan to report the queue</p>
      <div class="poster-qr-frame">
        <img class="poster-qr-img" src="${item.pngFilename}" alt="QR code for ${item.name}" />
      </div>
      <p class="poster-hint">
        Point your phone camera here to report live queue times anonymously with one tap.
      </p>
    </article>`
      )
      .join('\n')}
  </div>
</body>
</html>`;

  fs.writeFileSync(printHtmlPath, printHtmlContent, 'utf-8');
  console.log(`  ✓ Generated printable posters: qr-codes/print.html\n`);
  console.log('All QR codes and printable poster page generated successfully!\n');
}

main().catch((err) => {
  console.error('Unexpected error generating QR codes:', err);
  process.exit(1);
});
