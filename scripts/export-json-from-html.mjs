#!/usr/bin/env node
/**
 * Exportiert Lagerverwaltungs-Daten ohne Browser.
 * Nutzt den neuesten JSON-Export aus Downloads/Desktop oder die App-Standarddaten.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const htmlFile = path.join(projectDir, 'Lagerverwaltung.html');
const downloadsDir = path.join(process.env.HOME || '', 'Downloads');
const today = new Date().toISOString().slice(0, 10);
const outputFile = path.join(downloadsDir, `lagerverwaltung-backup_${today}.json`);

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

function newestMatching(dir, patterns) {
  const files = readdirSync(dir)
    .flatMap((name) => patterns.filter((pattern) => pattern.test(name)).map(() => path.join(dir, name)))
    .filter((file) => {
      try {
        return statSync(file).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] || null;
}

function loadSavedExport() {
  const dirs = [downloadsDir, path.join(process.env.HOME || '', 'Desktop')];
  const patterns = [/^lagerverwaltung-backup_.*\.json$/i, /^lagerverwaltung-\d{4}-\d{2}-\d{2}\.json$/i];

  for (const dir of dirs) {
    let latest;
    try {
      latest = newestMatching(dir, patterns);
    } catch {
      continue;
    }
    if (!latest || latest === outputFile) continue;

    try {
      const parsed = JSON.parse(readFileSync(latest, 'utf8'));
      if (parsed?.suppliers && parsed?.articles && parsed?.movements) {
        return { source: latest, data: parsed };
      }
    } catch {
      // ignore broken json
    }
  }

  return { source: null, data: null };
}

function extractDefaultState() {
  const html = readFileSync(htmlFile, 'utf8');
  const match = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('Konnte JavaScript aus Lagerverwaltung.html nicht lesen.');
  }

  let script = match[1];
  const cutMarkers = ['const ROUTES = {', 'window.addEventListener(\'hashchange\'', 'initOnce();'];
  for (const marker of cutMarkers) {
    const idx = script.indexOf(marker);
    if (idx >= 0) {
      script = script.slice(0, idx);
      break;
    }
  }

  const context = {
    console,
    localStorage: createLocalStorage(),
    document: {
      querySelectorAll() { return []; },
      getElementById() { return null; },
      querySelector() { return null; },
    },
    window: { addEventListener() {} },
    location: { hash: '' },
    setTimeout() {},
  };

  vm.createContext(context);
  return vm.runInContext(`${script}\n;JSON.parse(JSON.stringify(state))`, context, { timeout: 10000 });
}

mkdirSync(downloadsDir, { recursive: true });

const saved = loadSavedExport();
let payload;

if (saved.data) {
  payload = {
    exported: new Date().toISOString(),
    version: 'cli-from-existing-export',
    source: saved.source,
    ...saved.data,
  };
} else {
  const data = extractDefaultState();
  payload = {
    exported: new Date().toISOString(),
    version: 'cli-export',
    source: htmlFile,
    note: 'Kein Browser-Export gefunden. Bitte einmal in der App unter Daten → Export als JSON sichern.',
    ...data,
  };
}

writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`JSON-Export erstellt: ${outputFile}`);
