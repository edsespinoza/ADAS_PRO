/* ================================================
   ADAS PRO — Programa de Certificação SENAI/CNA
   ================================================
   Versão:    1.0.0
   Chave LS:  adaspro_cert_progress, adaspro_cert_badges
   Requer:    js/auth.js
   ================================================ */

const CERT_PROGRAM = (function () {

  const STORAGE_KEY_PROG = 'adaspro_cert_progress';
  const STORAGE_KEY_BADGES = 'adaspro_cert_badges';
  const STORAGE_KEY_VERIFY = 'adaspro_certs';

  /* ─── Definição do Programa ─── */
  const LEVELS = {
    'fundamentos': {
      id: 'fundamentos',
      level: 1,
      label: 'Nível 1 — Fundamentos ADAS',
      description: 'Conhecimentos essenciais sobre sistemas de assistência à direção, componentes, diagnóstico e procedimentos de calibração.',
      hours: 40,
      minScore: 70,
      modules: [
        { id: 'mod-1.1', title: 'Introdução aos Sistemas ADAS', hours: 6, content: 'theory', questions: 15 },
        { id: 'mod-1.2', title: 'Componentes e Sensores', hours: 8, content: 'theory', questions: 20 },
        { id: 'mod-1.3', title: 'Protocolos de Comunicação', hours: 6, content: 'theory', questions: 15 },
        { id: 'mod-1.4', title: 'Ferramentas de Diagnóstico', hours: 6, content: 'practical', questions: 10 },
        { id: 'mod-1.5', title: 'Procedimentos de Calibração Básica', hours: 8, content: 'practical', questions: 15 },
        { id: 'mod-1.6', title: 'Quiz Final — Fundamentos', hours: 6, content: 'quiz', questions: 30 }
      ],
      badge: { id: 'badge-fundamentos', label: 'Especialista Fundamentos ADAS', icon: '🔧' }
    },
    'calibracao': {
      id: 'calibracao',
      level: 2,
      label: 'Nível 2 — Especialista em Calibração',
      description: 'Técnicas avançadas de calibração de câmeras, radar e LiDAR para todos os fabricantes.',
      hours: 60,
      minScore: 75,
      prerequisite: 'fundamentos',
      modules: [
        { id: 'mod-2.1', title: 'Calibração de Câmeras Frontais', hours: 10, content: 'practical', questions: 20 },
        { id: 'mod-2.2', title: 'Calibração de Radar Dianteiro', hours: 8, content: 'practical', questions: 15 },
        { id: 'mod-2.3', title: 'Calibração de Radar Traseiro e Lateral', hours: 8, content: 'practical', questions: 15 },
        { id: 'mod-2.4', title: 'Calibração de LiDAR', hours: 6, content: 'practical', questions: 10 },
        { id: 'mod-2.5', title: 'Ferramentas e Equipamentos Especializados', hours: 6, content: 'theory', questions: 15 },
        { id: 'mod-2.6', title: 'Procedimento Completo por Fabricante', hours: 12, content: 'practical', questions: 20 },
        { id: 'mod-2.7', title: 'Quiz Final — Calibração', hours: 10, content: 'quiz', questions: 40 }
      ],
      badge: { id: 'badge-calibracao', label: 'Especialista em Calibração ADAS', icon: '🎯' }
    },
    'diagnostico': {
      id: 'diagnostico',
      level: 3,
      label: 'Nível 3 — Diagnóstico Avançado',
      description: 'Diagnóstico profundo de falhas, interpretação de códigos, análise de dados e solução de problemas complexos.',
      hours: 80,
      minScore: 80,
      prerequisite: 'calibracao',
      modules: [
        { id: 'mod-3.1', title: 'Análise de Códigos de Falha (DTC)', hours: 10, content: 'theory', questions: 20 },
        { id: 'mod-3.2', title: 'Interpretação de Dados de Sensores', hours: 10, content: 'practical', questions: 20 },
        { id: 'mod-3.3', title: 'Diagnóstico de Falhas Intermitentes', hours: 10, content: 'practical', questions: 15 },
        { id: 'mod-3.4', title: 'Análise de Redes CAN/LIN/FlexRay', hours: 12, content: 'practical', questions: 20 },
        { id: 'mod-3.5', title: 'Cenários Complexos por Fabricante', hours: 12, content: 'practical', questions: 20 },
        { id: 'mod-3.6', title: 'Documentação e Relatório Técnico', hours: 6, content: 'theory', questions: 10 },
        { id: 'mod-3.7', title: 'Quiz Final — Diagnóstico Avançado', hours: 10, content: 'quiz', questions: 50 }
      ],
      badge: { id: 'badge-diagnostico', label: 'Especialista em Diagnóstico ADAS', icon: '🔍' }
    }
  };

  /* ─── Estado do Progresso ─── */
  let _progress = {};
  let _badges = [];

  /* ─── Persistência ─── */
  function _saveProgress() {
    try { localStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(_progress)); } catch {}
  }
  function _saveBadges() {
    try { localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(_badges)); } catch {}
  }
  function _loadProgress() {
    try {
      const d = localStorage.getItem(STORAGE_KEY_PROG);
      if (d) _progress = JSON.parse(d);
    } catch { _progress = {}; }
  }
  function _loadBadges() {
    try {
      const d = localStorage.getItem(STORAGE_KEY_BADGES);
      if (d) _badges = JSON.parse(d);
    } catch { _badges = []; }
  }

  /* ─── Init ─── */
  function init() {
    _loadProgress();
    _loadBadges();
  }

  /* ─── Acesso ao Programa ─── */
  function getLevels() { return Object.values(LEVELS); }
  function getLevel(id) { return LEVELS[id] || null; }
  function getModules(levelId) { return LEVELS[levelId]?.modules || []; }
  function getModule(levelId, moduleId) {
    const lv = LEVELS[levelId];
    if (!lv) return null;
    return lv.modules.find(m => m.id === moduleId) || null;
  }

  /* ─── Progresso ─── */
  function getModuleProgress(levelId, moduleId) {
    const key = `${levelId}:${moduleId}`;
    return _progress[key] || { started: null, completed: null, score: 0, attempts: 0, answers: [] };
  }

  function _setModuleProgress(levelId, moduleId, data) {
    const key = `${levelId}:${moduleId}`;
    _progress[key] = { ...getModuleProgress(levelId, moduleId), ...data };
    _saveProgress();
  }

  function completeModule(levelId, moduleId, score) {
    const existing = getModuleProgress(levelId, moduleId);
    _setModuleProgress(levelId, moduleId, {
      started: existing.started || new Date().toISOString(),
      completed: new Date().toISOString(),
      score: Math.max(existing.score, score),
      attempts: existing.attempts + 1,
    });
  }

  function startModule(levelId, moduleId) {
    const existing = getModuleProgress(levelId, moduleId);
    if (!existing.started) {
      _setModuleProgress(levelId, moduleId, { started: new Date().toISOString() });
    }
  }

  function getLevelProgress(levelId) {
    const lv = LEVELS[levelId];
    if (!lv) return null;
    const total = lv.modules.length;
    let completed = 0;
    let totalScore = 0;
    let scoredCount = 0;
    const modules = lv.modules.map(m => {
      const p = getModuleProgress(levelId, m.id);
      const isComplete = !!p.completed;
      if (isComplete) {
        completed++;
        totalScore += p.score;
        scoredCount++;
      }
      return { ...m, progress: p, isComplete };
    });
    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    const isLevelComplete = completed === total;
    return { levelId, total, completed, avgScore, isLevelComplete, modules };
  }

  function getAllProgress() {
    return Object.keys(LEVELS).map(id => getLevelProgress(id));
  }

  /* ─── Certificação ─── */
  function canEarnCertificate(levelId) {
    const lv = LEVELS[levelId];
    if (!lv) return false;

    if (lv.prerequisite) {
      const prereq = LEVELS[lv.prerequisite];
      if (!prereq) return false;
      const prereqProgress = getLevelProgress(lv.prerequisite);
      if (!prereqProgress || !prereqProgress.isLevelComplete) return false;
      const quizPrereq = prereq.modules.find(m => m.content === 'quiz');
      if (quizPrereq) {
        const p = getModuleProgress(lv.prerequisite, quizPrereq.id);
        if (p.score < lv.minScore) return false;
      }
    }

    const lp = getLevelProgress(levelId);
    if (!lp || !lp.isLevelComplete) return false;

    const quizModule = lv.modules.find(m => m.content === 'quiz');
    if (quizModule) {
      const qp = getModuleProgress(levelId, quizModule.id);
      return qp.score >= lv.minScore;
    }
    return false;
  }

  function earnCertificate(levelId) {
    if (!canEarnCertificate(levelId)) return null;

    const lv = LEVELS[levelId];
    const certId = `ADAS-${lv.level}-${Date.now().toString(36).toUpperCase()}`;
    const issued = new Date().toISOString();
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const cert = {
      id: certId,
      levelId,
      level: lv.level,
      levelLabel: lv.label,
      badge: lv.badge,
      issuedOn: issued,
      expiresAt: expires,
      holderName: AUTH.getSession()?.name || 'Profissional ADAS',
    };

    const existing = _getStoredCerts();
    existing.push(cert);
    try { localStorage.setItem(STORAGE_KEY_VERIFY, JSON.stringify(existing)); } catch {}

    if (!_badges.includes(lv.badge.id)) {
      _badges.push(lv.badge.id);
      _saveBadges();
    }

    return cert;
  }

  function getCertificates() {
    return _getStoredCerts();
  }

  function getCertificateById(certId) {
    return _getStoredCerts().find(c => c.id === certId) || null;
  }

  function _getStoredCerts() {
    try {
      const d = localStorage.getItem(STORAGE_KEY_VERIFY);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  }

  /* ─── Badges ─── */
  function getEarnedBadges() { return [..._badges]; }
  function hasBadge(id) { return _badges.includes(id); }

  /* ─── Geração de Certificado SVG ─── */
  function generateCertificateSVG(cert) {
    if (!cert) return '';

    const now = new Date(cert.issuedOn);
    const exp = new Date(cert.expiresAt);
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const expStr = exp.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="636" viewBox="0 0 900 636">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f1923"/>
      <stop offset="100%" style="stop-color:#1B2B4D"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="50%" style="stop-color:#FFC107"/>
      <stop offset="100%" style="stop-color:#FFD700"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="900" height="636" rx="16" fill="url(#bgGrad)"/>

  <rect x="16" y="16" width="868" height="604" rx="12" fill="none" stroke="url(#goldGrad)" stroke-width="3" filter="url(#glow)"/>
  <rect x="28" y="28" width="844" height="580" rx="8" fill="none" stroke="url(#goldGrad)" stroke-width="1" opacity="0.5"/>

  <g filter="url(#glow)">
    <circle cx="450" cy="100" r="40" fill="none" stroke="url(#goldGrad)" stroke-width="2"/>
    <text x="450" y="110" text-anchor="middle" font-size="40">${cert.badge?.icon || '🏆'}</text>
  </g>

  <text x="450" y="56" text-anchor="middle" fill="url(#goldGrad)" font-family="Poppins,sans-serif" font-size="14" letter-spacing="4" font-weight="600">PROGRAMA DE CERTIFICAÇÃO</text>

  <text x="450" y="175" text-anchor="middle" fill="url(#goldGrad)" font-family="Poppins,sans-serif" font-size="22" font-weight="700">ADAS PRO — SENAI/CNA</text>

  <line x1="300" y1="195" x2="600" y2="195" stroke="url(#goldGrad)" stroke-width="1" opacity="0.6"/>

  <text x="450" y="235" text-anchor="middle" fill="#E8E8E8" font-family="Inter,sans-serif" font-size="13">Conferido a</text>
  <text x="450" y="270" text-anchor="middle" fill="#FFFFFF" font-family="Poppins,sans-serif" font-size="26" font-weight="700">${cert.holderName}</text>

  <text x="450" y="310" text-anchor="middle" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="13">completou o programa</text>
  <text x="450" y="345" text-anchor="middle" fill="url(#goldGrad)" font-family="Poppins,sans-serif" font-size="18" font-weight="600">${cert.levelLabel}</text>

  <line x1="250" y1="370" x2="650" y2="370" stroke="url(#goldGrad)" stroke-width="0.5" opacity="0.4"/>

  <text x="280" y="405" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="11">Data de conclusão</text>
  <text x="280" y="422" fill="#FFFFFF" font-family="Inter,sans-serif" font-size="13">${dateStr}</text>

  <text x="450" y="405" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="11" text-anchor="middle">Validade</text>
  <text x="450" y="422" fill="#FFFFFF" font-family="Inter,sans-serif" font-size="13" text-anchor="middle">${expStr}</text>

  <text x="620" y="405" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="11" text-anchor="end">ID do certificado</text>
  <text x="620" y="422" fill="#FFFFFF" font-family="Inter,sans-serif" font-size="13" text-anchor="end" font-weight="600">${cert.id}</text>

  <line x1="250" y1="450" x2="650" y2="450" stroke="url(#goldGrad)" stroke-width="0.5" opacity="0.4"/>

  <text x="450" y="490" text-anchor="middle" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="10">Verifique em: adaspro.com.br/verificar</text>

  <rect x="350" y="500" width="100" height="100" rx="4" fill="#FFFFFF" id="qr-placeholder"/>
  <text x="400" y="555" text-anchor="middle" fill="#1B2B4D" font-family="Inter,sans-serif" font-size="8" font-weight="700">QR VERIFICAÇÃO</text>

  <text x="450" y="600" text-anchor="middle" fill="#AAB8C2" font-family="Inter,sans-serif" font-size="10">ADAS PRO — AutoTech Service · plataformadaspro.com.br</text>
</svg>`;
  }

  /* ─── Verificação pública ─── */
  function verifyCertificate(certId) {
    const cert = getCertificateById(certId);
    if (!cert) return { valid: false, error: 'Certificate not found' };
    if (new Date(cert.expiresAt) < new Date()) {
      return { valid: false, error: 'Certificate expired', cert };
    }
    return { valid: true, cert };
  }

  /* ─── Expor API ─── */
  return {
    init,
    getLevels,
    getLevel,
    getModules,
    getModule,
    getModuleProgress,
    getLevelProgress,
    getAllProgress,
    startModule,
    completeModule,
    canEarnCertificate,
    earnCertificate,
    getCertificates,
    getCertificateById,
    getEarnedBadges,
    hasBadge,
    generateCertificateSVG,
    verifyCertificate,
    LEVELS,
    VERSION: '1.0.0',
  };

})();

if (typeof window !== 'undefined') window.CERT_PROGRAM = CERT_PROGRAM;
