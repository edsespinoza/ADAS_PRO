#!/usr/bin/env node
/* Injeção de SRI (Subresource Integrity) nos assets locais referenciados
   pelas páginas HTML.

   Roda DURANTE o build (depois de build-config.js), para que o hash do
   `js/supabase-config.js` (regenerado a cada build) sempre corresponda ao
   conteúdo que será servido. Assets externos (CDN, /_vercel/) são ignorados.

   Idempotente: re-executar substitui o integrity existente, sem gerar diff. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

const HTML_FILES = [
  'index.html', 'login.html', 'reset-password.html', 'mfa-verify.html',
  'admin.html', 'membros.html', 'superadmin.html', 'email-config.html',
];

const sha384b64 = (buf) => crypto.createHash('sha384').update(buf).digest('base64');

function isLocal(url) {
  if (/^(?:https?:)?\/\//i.test(url)) return false;
  if (/^data:/i.test(url)) return false;
  if (/^\/_vercel\//.test(url)) return false;
  return true;
}

function injectFile(file) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) { console.warn(`[sri] Aviso: ${file} não encontrado.`); return 0; }
  let html = fs.readFileSync(fp, 'utf8');
  let changed = 0;

  html = html.replace(/<(script|link)\b([^>]*?)>/gi, (whole, tag, attrs) => {
    const m = attrs.match(/(?:src|href)\s*=\s*["']([^"']+?)["']/i);
    if (!m) return whole;
    const url = m[1];
    if (!isLocal(url)) return whole;
    const clean = url.replace(/\?.*$/, '');
    const assetPath = path.join(ROOT, clean);
    if (!fs.existsSync(assetPath)) { console.warn(`[sri] Aviso: asset não encontrado: ${clean}`); return whole; }
    const hash = sha384b64(fs.readFileSync(assetPath));

    let next = whole;
    if (/\bintegrity\s*=/.test(attrs)) {
      next = next.replace(/(\bintegrity\s*=\s*["'])[^"']*?(["'])/i, (_, a, q) => a + 'sha384-' + hash + q);
    } else {
      const isSelf = /\/\s*$/.test(attrs);
      const trimmedAttrs = attrs.replace(/\s*\/\s*$/, '');
      next = `<${tag}${trimmedAttrs} integrity="sha384-${hash}"${isSelf ? ' /' : ''}>`;
    }
    if (next !== whole) changed++;
    return next;
  });

  if (changed) fs.writeFileSync(fp, html, 'utf8');
  console.log(`[sri] ${file}: ${changed} tag(s) com integrity`);
  return changed;
}

let total = 0;
for (const f of HTML_FILES) total += injectFile(f);
console.log(`[sri] Total: ${total} assets com SRI sha384.`);
