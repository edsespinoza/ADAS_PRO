#!/usr/bin/env node
/* Gera a Content-Security-Policy a partir dos arquivos HTML.

   Estratégia (sem 'unsafe-inline'):
   - Cada bloco <script> inline é hasheado (sha256 do conteúdo EXATO — sem trim,
     o browser hasheia os bytes do elemento).
   - Cada event handler inline (onclick="...", onchange="...", etc.) é hasheado
     pelo VALOR do atributo conforme o DOM o enxerga: após decode de entidades,
     trim de ponta, e normalização de quebras de linha → espaço.
   - 'unsafe-hashes' habilita o match dos hashes de atributos de evento.
   - Handlers com interpolação dinâmica (${...}) não são hasháveis — DEVEM ser
     convertidos para data-act + addEventListener (ver __acts nos painéis).

   IMPORTANTE: rodar sempre que qualquer HTML mudar. Executado pelo build
   (scripts/build-config.js → require('./generate-csp.js')). */
'use strict';
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

const HTML_FILES = [
  'index.html', 'login.html', 'reset-password.html', 'mfa-verify.html',
  'admin.html', 'membros.html', 'superadmin.html', 'email-config.html',
];

const BASE_DIRECTIVES = {
  'default-src': `'self'`,
  'style-src':   `'self' 'unsafe-inline' https://fonts.googleapis.com`,
  'font-src':    `'self' https://fonts.gstatic.com`,
  'img-src':     `'self' data:`,
  'connect-src': `'self' https://zqydyyticvtmirjzskly.supabase.co wss://zqydyyticvtmirjzskly.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com https://api.pwnedpasswords.com`,
  'object-src':  `'none'`,
  'base-uri':    `'self'`,
  'form-action': `'self'`,
  'frame-ancestors': `'none'`,
  'worker-src':  `'none'`,
  'manifest-src': `'self'`,
  'media-src':   `'self'`,
  'upgrade-insecure-requests': '',
};

const sha256 = (s) => 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64');

function decodeEntities(s) {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", '#x27': "'" };
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, name) => {
    const k = name.toLowerCase();
    if (k === '#x27' || k === '#39') return "'";
    if (map[k]) return map[k];
    if (k[0] === '#') { const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return m;
  });
}

/* Normaliza o valor de um atributo de evento para o que o DOM produz:
   decode de entidades, trim de ponta e quebras de linha → espaço. */
function normalizeHandlerValue(raw) {
  return decodeEntities(raw)
    .replace(/[\t\n\r]+/g, ' ')
    .trim();
}

/* Extrai blocos <script> inline (sem src, sem JSON-LD) com conteúdo bruto. */
function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']application\/ld\+json["'])([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[2].trim()) scripts.push(m[2]);
  }
  return scripts;
}

/* Extrai todos os valores de atributos de evento (onclick/onchange/...).
   Retorna valores BRUTOS (pré-normalização). */
const HANDLER_RE = /(?:^|\s)on[a-z]+\s*=\s*(['"])([\s\S]*?)\1/gi;

function extractHandlers(html) {
  const values = [];
  let m;
  while ((m = HANDLER_RE.exec(html)) !== null) {
    if (m[2].trim()) values.push(m[2]);
  }
  return values;
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort();
}

/* Computa a política completa a partir dos HTMLs (exportado p/ audit). */
function computeCsp() {
  const scriptHashes = [];
  const handlerHashes = [];
  let scriptCount = 0;
  let handlerCount = 0;

  for (const file of HTML_FILES) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) { console.warn(`[generate-csp] Aviso: ${file} não encontrado.`); continue; }
    const html = fs.readFileSync(fp, 'utf8');

    const blocks = extractInlineScripts(html);
    scriptCount += blocks.length;
    blocks.forEach(b => scriptHashes.push(sha256(b)));

    const handlers = extractHandlers(html);
    handlerCount += handlers.length;
    handlers.forEach(v => handlerHashes.push(sha256(normalizeHandlerValue(v))));

    // Prevenção: handler interpolado não hasheável quebraria em produção.
    if (handlers.some(v => v.includes('${'))) {
      console.error(`[generate-csp] ERRO: ${file} contém handler inline com interpolação \${...} — CSP não cobre. Converta para data-act.`);
      process.exitCode = 1;
    }
  }

  const uScripts = uniqueSorted(scriptHashes);
  const uHandlers = uniqueSorted(handlerHashes);

  const scriptSrc = [
    `'self'`,
    ...uScripts.map(h => `'${h}'`),
    `'unsafe-hashes'`,
    ...uHandlers.map(h => `'${h}'`),
  ].join(' ');

  const dirs = [];
  for (const [k, v] of Object.entries(BASE_DIRECTIVES)) {
    dirs.push(v ? `${k} ${v}` : k);
  }
  const csp = [dirs[0], `script-src ${scriptSrc}`, ...dirs.slice(1)].join('; ');

  console.log(`[generate-csp] Inline scripts: ${scriptCount} (${uScripts.length} hashes) | Handlers: ${handlerCount} (${uHandlers.length} hashes)`);
  return csp;
}

function main() {
  const csp = computeCsp();
  const vercelPath = path.join(ROOT, 'vercel.json');
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  let touched = 0;
  for (const headerSet of (vercel.headers || [])) {
    for (const h of (headerSet.headers || [])) {
      if (h.key === 'Content-Security-Policy') { h.value = csp; touched++; }
    }
  }
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
  console.log(`[generate-csp] CSP atualizada em vercel.json (${csp.length} chars, ${touched} bloco(s))`);
}

if (require.main === module) main();
module.exports = { computeCsp, normalizeHandlerValue, decodeEntities, main };
