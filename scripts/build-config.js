#!/usr/bin/env node
/**
 * ADAS PRO — Build: gera js/supabase-config.js a partir de variáveis de ambiente.
 * Produção: variáveis definidas no painel do Vercel.
 * Local:    variáveis definidas em .env.local (nunca commitado).
 */

const fs   = require('fs');
const path = require('path');
const isDev = process.argv.includes('--dev');

// Carrega .env.local em desenvolvimento
if (isDev || process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('[build-config] Carregando .env.local');
  }
}

const url         = process.env.SUPABASE_URL      || '';
const anonKey     = process.env.SUPABASE_ANON_KEY  || '';
const demoEnabled = (process.env.DEMO_ENABLED || '').toLowerCase() !== 'false'; // padrão: true; desativa com DEMO_ENABLED=false
const siteUrl     = process.env.SITE_URL           || 'https://adaspro.com.br';

if (!url || !anonKey) {
  console.warn('[build-config] AVISO: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos.');
  console.warn('[build-config] Mantendo js/supabase-config.js existente (se houver).');
  process.exit(0);
}

const content = `/* ================================================
   ADAS PRO — Configuração Supabase (gerado pelo build)
   NÃO EDITE MANUALMENTE — edite via variáveis de ambiente
   ================================================ */

const SUPABASE_CONFIG = {
  url:         ${JSON.stringify(url)},
  anonKey:     ${JSON.stringify(anonKey)},
  demoEnabled: ${demoEnabled},
  siteUrl:     ${JSON.stringify(siteUrl)},
};
`;

const outPath = path.join(__dirname, '..', 'js', 'supabase-config.js');
fs.writeFileSync(outPath, content, 'utf8');
console.log('[build-config] js/supabase-config.js gerado com sucesso.');
