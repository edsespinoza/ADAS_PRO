// Catálogo server-side de conteúdo — fonte única de verdade.
//
// Histórico: este mapa estava duplicado em api-gateway/handler.ts e
// get-download-url/index.ts, e a cópia do gateway tinha apenas 13 dos 23
// itens — os 10 restantes respondiam "conteúdo não encontrado" mesmo com
// acesso válido. Pior: o gateway derivava o path como `${cat}/${id}.pdf`,
// produzindo `honda/honda-lkas.pdf` para o arquivo real
// `honda/honda-lkas-calibration.pdf` (404 em todo download da API).
//
// As duas Edge Functions importam daqui. Para adicionar um PDF:
//   1. editar este arquivo
//   2. atualizar DEFAULT_CONTENT em js/auth.js (metadados do cliente)
//   3. fazer deploy de api-gateway E get-download-url
//   4. validar o path com: ls assets/downloads/<pasta>/<arquivo>

export interface ContentEntry {
  /** Categoria de permissão (bate com public.users.permissions). */
  cat: string;
  /** Caminho real no bucket `materiais`. null = ainda não enviado. */
  filePath: string | null;
  /** Nível mínimo de plano para ver o item. */
  accessLevel: number;
  /** Nível mínimo de plano para baixar o arquivo. */
  downloadLevel: number;
  title?: string;
  pages?: number;
}

export const CONTENT_MAP: Record<string, ContentEntry> = {
  // ── Nível 2 (Pro) ──
  'honda-lkas':      { cat:'honda',      filePath:'honda/honda-lkas-calibration.pdf',       accessLevel:2, downloadLevel:3 },
  'honda-avm':       { cat:'honda',      filePath:'honda/honda-avm-360.pdf',                accessLevel:2, downloadLevel:3 },
  'honda-acc':       { cat:'honda',      filePath:null,                                   accessLevel:2, downloadLevel:3 },
  'toyota-ldw':      { cat:'toyota',     filePath:'toyota/toyota-ldw-120.pdf',              accessLevel:2, downloadLevel:3 },
  'toyota-180':      { cat:'toyota',     filePath:'toyota/toyota-lda-180.pdf',              accessLevel:2, downloadLevel:3 },
  'toyota-avm':      { cat:'toyota',     filePath:'toyota/toyota-avm.pdf',                  accessLevel:2, downloadLevel:3 },
  'nissan-lka':      { cat:'nissan',     filePath:'nissan/nissan-lka-tipo1.pdf',            accessLevel:2, downloadLevel:3 },
  'nissan-propilot': { cat:'nissan',     filePath:'nissan/nissan-propilot.pdf',             accessLevel:2, downloadLevel:3 },
  'nissan-radar':    { cat:'nissan',     filePath:null,                                   accessLevel:2, downloadLevel:3 },

  // ── Nível 3 (Premium) ──
  'subaru-type1':    { cat:'subaru',     filePath:'subaru/subaru-eyesight-tipo1.pdf',       accessLevel:3, downloadLevel:3 },
  'subaru-type2':    { cat:'subaru',     filePath:'subaru/subaru-eyesight-tipo2.pdf',       accessLevel:3, downloadLevel:3 },
  'hyundai-avm':     { cat:'hyundai',    filePath:'hyundai/hyundai-avm.pdf',                accessLevel:3, downloadLevel:3 },
  'hyundai-radar':   { cat:'hyundai',    filePath:'hyundai/hyundai-radar-acc.pdf',          accessLevel:3, downloadLevel:3 },
  'audi-lidar':      { cat:'vag',        filePath:'vag/audi-lidar-vas6430.pdf',             accessLevel:3, downloadLevel:4 },
  'vag-avm':         { cat:'vag',        filePath:'vag/vag-avm.pdf',                        accessLevel:3, downloadLevel:4 },
  'mercedes-night':  { cat:'mercedes',   filePath:'mercedes/mercedes-night-vision.pdf',     accessLevel:3, downloadLevel:4 },
  'mercedes-rcw':    { cat:'mercedes',   filePath:'mercedes/mercedes-rcw.pdf',              accessLevel:3, downloadLevel:4 },
  'ford-avm':        { cat:'ford',       filePath:'ford/ford-avm-360.pdf',                  accessLevel:3, downloadLevel:4 },
  'radar-univ':      { cat:'radar',      filePath:'radar/universal-radar-plate.pdf',        accessLevel:3, downloadLevel:4 },
  'mazda-avm':       { cat:'mazda',      filePath:'mazda/mazda-avm-fsc.pdf',                accessLevel:3, downloadLevel:4 },
  'mitsubishi-lka':  { cat:'mitsubishi', filePath:'mitsubishi/mitsubishi-lka-avm.pdf',        accessLevel:3, downloadLevel:4 },
  'byd-avm':         { cat:'chineses',   filePath:'chineses/byd-avm-pattern.pdf',           accessLevel:3, downloadLevel:4 },
  'mg-chery':        { cat:'chineses',   filePath:'chineses/mg-chery-avm.pdf',              accessLevel:3, downloadLevel:4 },
};
