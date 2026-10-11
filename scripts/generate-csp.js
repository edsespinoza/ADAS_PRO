#!/usr/bin/env node
/* Gera a Content-Security-Policy a partir dos arquivos HTML.

   Estratégia (sem 'unsafe-inline' e sem 'unsafe-hashes'):
   - Cada bloco <script> inline é hasheado (sha256 do conteúdo EXATO — sem trim,
     o browser hasheia os bytes do elemento).
   - NÃO há hashes de atributos de evento: todos os handlers inline foram
     migrados para data-act + window.__acts + delegacao document-level (#46).
   - A extração de handlers permanece como GUARDA: se qualquer on*="..." inline
     reaparecer no HTML, o build FALHA (exitCode 1) para impedir a regressão.

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
  'lgpd.html', 'certifications.html', 'api-docs.html', 'verificar.html',
];

/* Hosts externos permitidos em script-src (além de 'self' + hashes). */
const EXTRA_SCRIPT_SRC = ['https://www.googletagmanager.com'];

const BASE_DIRECTIVES = {
  'default-src': `'self'`,
  'style-src':   `'self' 'unsafe-inline' https://fonts.googleapis.com`,
  'font-src':    `'self' https://fonts.gstatic.com`,
  'img-src':     `'self' data: https://www.googletagmanager.com https://www.google-analytics.com`,
  'connect-src': `'self' https://zqydyyticvtmirjzskly.supabase.co wss://zqydyyticvtmirjzskly.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com https://api.pwnedpasswords.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com`,
  'object-src':  `'none'`,
  'base-uri':    `'self'`,
  'form-action': `'self'`,
  'frame-ancestors': `'none'`,
  'worker-src':  `'self'`,
  'manifest-src': `'self'`,
  'media-src':   `'self'`,
  'upgrade-insecure-requests': '',
};

const sha256 = (s) => 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64');

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

    // Guarda de regressão: nenhum handler inline é permitido (#46).
    // Handlers interpolados (${...}) ou estáticos devem virar data-act.
    if (handlers.length > 0) {
      const bad = handlers.filter(v => v.includes('${'));
      console.error(`[generate-csp] ERRO: ${file} contém ${handlers.length} handler(s) inline (${bad.length} interpolado(s)) — CSP não cobre. Converta para data-act.`);
      process.exitCode = 1;
    }
  }

  const uScripts = uniqueSorted(scriptHashes);

  const scriptSrc = [
    `'self'`,
    ...EXTRA_SCRIPT_SRC,
    ...uScripts.map(h => `'${h}'`),
  ].join(' ');

  const dirs = [];
  for (const [k, v] of Object.entries(BASE_DIRECTIVES)) {
    dirs.push(v ? `${k} ${v}` : k);
  }
  const csp = [dirs[0], `script-src ${scriptSrc}`, ...dirs.slice(1)].join('; ');

  console.log(`[generate-csp] Inline scripts: ${scriptCount} (${uScripts.length} hashes) | Handlers inline: ${handlerCount} (devem ser 0)`);
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
module.exports = { computeCsp, main };
