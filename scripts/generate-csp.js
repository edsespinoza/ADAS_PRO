#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const HTML_FILES = [
  'index.html', 'login.html', 'reset-password.html', 'mfa-verify.html',
  'admin.html', 'membros.html', 'superadmin.html', 'email-config.html',
];

const EXCLUDED_CDN = [
  '_vercel/insights/script.js',
  '_vercel/speed-insights/script.js',
];

function extractInlineScripts(html) {
  const scripts = [];
  // Ignora blocks JSON-LD (type="application/ld+json") — não executam JS
  const inlineRegex = /<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']application\/ld\+json["'])([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = inlineRegex.exec(html)) !== null) {
    // IMPORTANTE: NÃO usar .trim() aqui. O browser hasheia o conteúdo EXATO
    // do elemento <script> (incluindo quebras de linha e espaços), não a
    // versão limpa. Hash de conteúdo trimado = CSP bloqueia o script em produção.
    const content = match[2];
    if (content.trim()) {
      scripts.push(content);
    }
  }
  return scripts;
}

function generate() {
  let total = 0;

  for (const file of HTML_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[generate-csp] Aviso: ${file} não encontrado, ignorando.`);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const scripts = extractInlineScripts(html);
    total += scripts.length;
    console.log(`[generate-csp] ${file}: ${scripts.length} inline scripts encontrados`);
  }

  console.log(`[generate-csp] Total de inline scripts: ${total}`);
}

const CSP = [
  `default-src 'self'`,
  // 'unsafe-inline' é OBRIGATÓRIO: o app usa centenas de event handlers inline
  // (onclick="..."), e hashes CSP não se aplicam a eles. Sem 'unsafe-inline',
  // TODOS os botões do site param de funcionar em produção.
  // IMPORTANTE: NÃO misturar com hashes — segundo o spec, se houver hash ou
  // nonce na source list o 'unsafe-inline' é IGNORADO e os handlers são
  // bloqueados de novo. A geração de hashes foi removida por isso.
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data:`,
  `connect-src 'self' https://zqydyyticvtmirjzskly.supabase.co wss://zqydyyticvtmirjzskly.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `worker-src 'none'`,
  `manifest-src 'self'`,
  `media-src 'self'`,
  `upgrade-insecure-requests`,
].join('; ');

const vercelPath = path.join(ROOT, 'vercel.json');
const vercelRaw = fs.readFileSync(vercelPath, 'utf8');
const vercel = JSON.parse(vercelRaw);

for (const headerSet of (vercel.headers || [])) {
  for (const h of (headerSet.headers || [])) {
    if (h.key === 'Content-Security-Policy') {
      h.value = CSP;
      console.log(`[generate-csp] CSP atualizado em vercel.json`);
    }
  }
}

fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
console.log('[generate-csp] vercel.json salvo.');
