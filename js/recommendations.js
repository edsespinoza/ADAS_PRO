/* ================================================
   ADAS PRO — Motor de Recomendações
   ================================================
   Versão:      1.0.0  build 20260825
   Dependências: auth.js (AUTH IIFE)
   Modo:        localStorage (offline-first)
   ================================================ */

const RECOMMENDATIONS = (function () {

  const STORE_KEY = 'adaspro_recommendations';
  const COLLAB_KEY = 'adaspro_collab_data';
  const WEEKLY_KEY = 'adaspro_weekly_picks';
  const WEEKLY_TS_KEY = 'adaspro_weekly_ts';

  /* ─── Referências do AUTH ─── */
  function _getContent() {
    return (typeof AUTH !== 'undefined' && AUTH.getContent) ? AUTH.getContent() : [];
  }
  function _getUser(id) {
    return (typeof AUTH !== 'undefined' && AUTH.getUserById) ? AUTH.getUserById(id) : null;
  }
  function _getAccessLevel(userId) {
    return (typeof AUTH !== 'undefined' && AUTH.getUserAccessLevel) ? AUTH.getUserAccessLevel(userId) : 0;
  }
  function _canView(userId, contentId) {
    return (typeof AUTH !== 'undefined' && AUTH.canViewContent) ? AUTH.canViewContent(userId, contentId) : false;
  }
  function _canDownload(userId, contentId) {
    return (typeof AUTH !== 'undefined' && AUTH.canDownloadContent) ? AUTH.canDownloadContent(userId, contentId) : false;
  }

  /* ════════════════════════════════════════════
     1. REGRAS DE RECOMENDAÇÃO
  ════════════════════════════════════════════ */

  const RULES = {
    'honda-lkas':     { suggest: ['honda-avm', 'honda-acc'],                     reason: 'Quem calibra LKA Honda também trabalha com AVM e ACC' },
    'honda-avm':      { suggest: ['honda-lkas', 'honda-acc'],                    reason: 'AVM Honda complementa LKAS e ACC do mesmo fabricante' },
    'honda-acc':      { suggest: ['honda-lkas', 'honda-avm'],                    reason: 'ACC Honda usa radar frontal — relate com LKAS e AVM' },
    'toyota-ldw':     { suggest: ['toyota-180', 'toyota-avm'],                   reason: 'LDW 120° evolui para LDA 180° — complementar com AVM' },
    'toyota-180':     { suggest: ['toyota-ldw', 'toyota-avm'],                   reason: 'LDA 180° complementa LDW 120° e AVM Toyota' },
    'toyota-avm':     { suggest: ['toyota-ldw', 'toyota-180'],                   reason: 'AVM Toyota complementa os sistemas de faixa' },
    'nissan-lka':     { suggest: ['nissan-propilot', 'nissan-radar'],             reason: 'LKA Nissan evolui para ProPilot — radar complementar' },
    'nissan-propilot':{ suggest: ['nissan-lka', 'nissan-radar'],                  reason: 'ProPilot combina câmera + radar — estudar ambos' },
    'nissan-radar':   { suggest: ['nissan-lka', 'nissan-propilot'],               reason: 'Radar Hitachi complementa LKA e ProPilot Nissan' },
    'subaru-type1':   { suggest: ['subaru-type2'],                               reason: 'EyeSight geração 1 evolui para geração 2' },
    'subaru-type2':   { suggest: ['subaru-type1'],                               reason: 'Comparar com EyeSight geração anterior' },
    'hyundai-avm':    { suggest: ['hyundai-radar'],                              reason: 'AVM Hyundai complementa SCC/ACC radar' },
    'hyundai-radar':  { suggest: ['hyundai-avm'],                                reason: 'Radar SCC complementa AVM Hyundai/Kia' },
    'audi-lidar':     { suggest: ['vag-avm'],                                    reason: 'LIDAR Audi complementa AVM do grupo VAG' },
    'vag-avm':        { suggest: ['audi-lidar'],                                 reason: 'AVM VAG complementa LIDAR Audi' },
    'mercedes-night': { suggest: ['mercedes-rcw'],                               reason: 'Night Vision complementa radar traseiro Mercedes' },
    'mercedes-rcw':   { suggest: ['mercedes-night'],                             reason: 'RCW complementa Night Vision Mercedes' },
    'ford-avm':       { suggest: ['radar-univ'],                                 reason: 'AVM Ford complementa radar universal' },
    'radar-univ':     { suggest: ['ford-avm', 'hyundai-radar', 'nissan-radar'],  reason: 'Radar universal serve múltiplos fabricantes' },
    'mazda-avm':      { suggest: ['radar-univ'],                                 reason: 'AVM Mazda complementa radar universal' },
    'mitsubishi-lka': { suggest: ['radar-univ'],                                 reason: 'LKA Mitsubishi complementa radar universal' },
    'byd-avm':        { suggest: ['mg-chery'],                                   reason: 'AVM BYD complementa padrões chineses similares' },
    'mg-chery':       { suggest: ['byd-avm'],                                    reason: 'MG/Chery complementa BYD — mercado chinês' },
  };

  /* ─── Regras cross-category (transferência de calibração) ─── */
  const CROSS_RULES = {
    'honda-lkas':  ['toyota-ldw', 'nissan-lka', 'mitsubishi-lka'],
    'toyota-ldw':  ['honda-lkas', 'nissan-lka', 'mitsubishi-lka'],
    'nissan-lka':  ['honda-lkas', 'toyota-ldw', 'mitsubishi-lka'],
    'honda-avm':   ['toyota-avm', 'hyundai-avm', 'ford-avm', 'mazda-avm'],
    'toyota-avm':  ['honda-avm', 'hyundai-avm', 'ford-avm', 'mazda-avm'],
    'honda-acc':   ['nissan-radar', 'hyundai-radar', 'radar-univ'],
    'nissan-radar':['honda-acc', 'hyundai-radar', 'radar-univ'],
    'radar-univ':  ['honda-acc', 'nissan-radar', 'hyundai-radar'],
  };

  /* ════════════════════════════════════════════
     2. LEARNING PATHS
  ════════════════════════════════════════════ */

  const LEARNING_PATHS = {
    honda: {
      label: 'Honda & Acura',
      icon: '🔵',
      steps: [
        { contentId: 'honda-lkas', label: 'LKAS Calibration', desc: 'Calibração de faixa — target Tipo 1 e Tipo 2' },
        { contentId: 'honda-avm',  label: 'AVM 360°',         desc: 'Câmeras de visão panorâmica — 4 targets' },
        { contentId: 'honda-acc',  label: 'ACC Radar Frontal', desc: 'Radar ACC/CMBS — calibração dinâmica' },
      ],
    },
    toyota: {
      label: 'Toyota & Lexus',
      icon: '🔴',
      steps: [
        { contentId: 'toyota-ldw', label: 'LDW 120°',  desc: 'Lane Departure Warning — target 120°' },
        { contentId: 'toyota-180', label: 'LDA 180°',  desc: 'Lane Departure Alert — target 180°' },
        { contentId: 'toyota-avm', label: 'AVM 360°',  desc: 'Around View Monitor — 4 targets' },
      ],
    },
    nissan: {
      label: 'Nissan & Infiniti',
      icon: '🟡',
      steps: [
        { contentId: 'nissan-lka',      label: 'LKA Tipo 1',     desc: 'Lane Keep Assist — target único 348+ modelos' },
        { contentId: 'nissan-propilot',  label: 'ProPilot Assist', desc: 'Câmera + radar — mosaico A4 × 7' },
        { contentId: 'nissan-radar',     label: 'Radar Hitachi',   desc: 'ACC/AEB — radar 77 GHz' },
      ],
    },
    subaru: {
      label: 'Subaru EyeSight',
      icon: '🟢',
      steps: [
        { contentId: 'subaru-type1', label: 'EyeSight Tipo 1', desc: 'Geração 1 e 2 — calibração binocular' },
        { contentId: 'subaru-type2', label: 'EyeSight Tipo 2', desc: 'Nova geração 2020+ — HEV/EV' },
      ],
    },
    hyundai: {
      label: 'Hyundai & Kia',
      icon: '🔷',
      steps: [
        { contentId: 'hyundai-avm',   label: 'AVM 360°',    desc: '4 câmeras simultâneas — xadrez 550×400mm' },
        { contentId: 'hyundai-radar', label: 'SCC/ACC Radar', desc: 'Radar 77 GHz — target reflexivo' },
      ],
    },
    vag: {
      label: 'VAG (Audi/VW/Seat)',
      icon: '🟣',
      steps: [
        { contentId: 'vag-avm',    label: 'AVM VAG',          desc: 'Tipos 1 e 2 — ODIS S' },
        { contentId: 'audi-lidar', label: 'LIDAR ACC Audi',   desc: 'VAS6430-12 — ODIS Engineering' },
      ],
    },
    mercedes: {
      label: 'Mercedes-Benz',
      icon: '⭕',
      steps: [
        { contentId: 'mercedes-night', label: 'Night Vision',    desc: 'Câmera IR — target térmico' },
        { contentId: 'mercedes-rcw',   label: 'RCW Radar',      desc: 'Radar traseiro — 77 GHz' },
      ],
    },
    ford: {
      label: 'Ford & Lincoln',
      icon: '🔸',
      steps: [
        { contentId: 'ford-avm', label: 'AVM 360° LH/RH', desc: 'Targets laterais — arquivo .psb' },
      ],
    },
    mazda: {
      label: 'Mazda AVM 360°',
      icon: '🔶',
      steps: [
        { contentId: 'mazda-avm', label: 'AVM + FSC', desc: 'Front Side Camera — i-Activsense' },
      ],
    },
    mitsubishi: {
      label: 'Mitsubishi',
      icon: '🔹',
      steps: [
        { contentId: 'mitsubishi-lka', label: 'LKA + AVM', desc: 'Mi-Pilot — 2 tipos + LH/RH' },
      ],
    },
    chineses: {
      label: 'BYD / Chery / MG',
      icon: '🇨🇳',
      steps: [
        { contentId: 'byd-avm',  label: 'BYD AVM',     desc: '4 variantes Tipo A/B/C/D' },
        { contentId: 'mg-chery', label: 'MG & Chery',  desc: 'Padrão xadrez — CDAS' },
      ],
    },
    radar: {
      label: 'Radar Universal',
      icon: '📡',
      steps: [
        { contentId: 'radar-univ', label: 'Universal Radar Plate', desc: 'Placa reflexiva 300×300mm — multi-fabricante' },
      ],
    },
  };

  /* ════════════════════════════════════════════
     3. CONTEÚDO-BASED FILTERING
  ════════════════════════════════════════════ */

  function _getContentById(id) {
    return _getContent().find(c => c.id === id) || null;
  }

  function _getUserDownloads(userId) {
    const user = _getUser(userId);
    if (!user || !user.downloads || !Array.isArray(user.downloads)) return [];
    return user.downloads;
  }

  function _getDownloadedIds(userId) {
    return new Set(_getUserDownloads(userId).map(d => d.contentId));
  }

  function _contentBasedRecs(userId, contentId, limit) {
    const allContent = _getContent();
    const source = _getContentById(contentId);
    if (!source) return [];

    const downloaded = _getDownloadedIds(userId);
    const accessLevel = _getAccessLevel(userId);

    const scored = allContent
      .filter(c => c.id !== contentId && !downloaded.has(c.id) && _canView(userId, c.id))
      .map(c => {
        let score = 0;
        if (c.cat === source.cat) score += 40;
        if (CROSS_RULES[contentId] && CROSS_RULES[contentId].includes(c.id)) score += 30;
        if (RULES[contentId] && RULES[contentId].suggest.includes(c.id)) score += 25;
        if (c.accessLevel <= accessLevel) score += 10;
        if (c.models && source.models) {
          const overlap = c.models.filter(m => source.models.some(sm => sm.split(' ')[0] === m.split(' ')[0]));
          if (overlap.length > 0) score += 15;
        }
        if (c.downloadLevel <= accessLevel) score += 5;
        return { ...c, score, reason: _getReason(contentId, c.id) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || 6);

    return scored;
  }

  function _getReason(fromId, toId) {
    if (RULES[fromId] && RULES[fromId].suggest.includes(toId)) {
      return RULES[fromId].reason;
    }
    const from = _getContentById(fromId);
    const to = _getContentById(toId);
    if (from && to && from.cat === to.cat) {
      return `Mesmo fabricante: ${from.cat}`;
    }
    return ' Conteúdo complementar';
  }

  /* ════════════════════════════════════════════
     4. COLLABORATIVE FILTERING
  ════════════════════════════════════════════ */

  function _loadCollabData() {
    try {
      const raw = localStorage.getItem(COLLAB_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function _saveCollabData(data) {
    try { localStorage.setItem(COLLAB_KEY, JSON.stringify(data)); } catch {}
  }

  function _recordCoDownload(contentId1, contentId2) {
    if (contentId1 === contentId2) return;
    const data = _loadCollabData();
    const key = [contentId1, contentId2].sort().join('|||');
    if (!data[key]) data[key] = { count: 0, contentIds: [contentId1, contentId2].sort() };
    data[key].count++;
    _saveCollabData(data);
  }

  function trackDownloadPair(userId, contentId) {
    const downloads = _getUserDownloads(userId);
    const recent = downloads.slice(-10);
    recent.forEach(d => {
      if (d.contentId !== contentId) {
        _recordCoDownload(d.contentId, contentId);
      }
    });
  }

  function getCollaborativeRecs(contentId, limit) {
    const data = _loadCollabData();
    const allContent = _getContent();
    const scores = {};

    Object.values(data).forEach(entry => {
      if (entry.contentIds.includes(contentId)) {
        const otherId = entry.contentIds[0] === contentId ? entry.contentIds[1] : entry.contentIds[0];
        scores[otherId] = (scores[otherId] || 0) + entry.count;
      }
    });

    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit || 5)
      .map(([id, count]) => {
        const item = allContent.find(c => c.id === id);
        return item ? { ...item, collabScore: count, reason: `${count} usuário(s) também baixaram` } : null;
      })
      .filter(Boolean);
  }

  /* ════════════════════════════════════════════
     5. SMART RECOMMENDATIONS
  ════════════════════════════════════════════ */

  function getRecommendations(userId, limit) {
    const limitN = limit || 6;
    const downloads = _getUserDownloads(userId);
    const downloaded = _getDownloadedIds(userId);
    const accessLevel = _getAccessLevel(userId);
    const allContent = _getContent();

    if (downloads.length === 0) {
      return allContent
        .filter(c => _canView(userId, c.id))
        .sort((a, b) => (a.accessLevel || 1) - (b.accessLevel || 1))
        .slice(0, limitN)
        .map(c => ({ ...c, score: 10, reason: ' Comece por aqui' }));
    }

    const recentDownloads = downloads.slice(-5).map(d => d.contentId);
    const scored = allContent
      .filter(c => !downloaded.has(c.id) && _canView(userId, c.id))
      .map(c => {
        let score = 0;
        let reasons = [];

        recentDownloads.forEach(dlId => {
          if (RULES[dlId] && RULES[dlId].suggest.includes(c.id)) {
            score += 25;
            reasons.push(RULES[dlId].reason);
          }
          if (CROSS_RULES[dlId] && CROSS_RULES[dlId].includes(c.id)) {
            score += 20;
            reasons.push('Calibração transferível');
          }
          const dlItem = _getContentById(dlId);
          if (dlItem && dlItem.cat === c.cat) {
            score += 15;
            reasons.push(`Mesmo fabricante: ${c.cat}`);
          }
        });

        if (c.accessLevel <= accessLevel) score += 5;
        if (c.downloadLevel <= accessLevel) score += 3;

        if (score === 0) score = 2;

        return {
          ...c,
          score,
          reason: reasons.length > 0 ? reasons[0] : ' Conteúdo disponível',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limitN);

    return scored;
  }

  function getContentRecommendations(contentId, limit) {
    const contentBased = _contentBasedRecs(null, contentId, (limit || 6) + 4);
    const collabBased = getCollaborativeRecs(contentId, 4);

    const merged = new Map();
    contentBased.forEach(c => merged.set(c.id, c));
    collabBased.forEach(c => {
      if (!merged.has(c.id)) merged.set(c.id, c);
      else {
        const existing = merged.get(c.id);
        existing.score = (existing.score || 0) + (c.collabScore || 0) * 5;
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit || 6);
  }

  function getWeeklyPicks(userId) {
    const weeklyRaw = localStorage.getItem(WEEKLY_KEY);
    const weeklyTs = parseInt(localStorage.getItem(WEEKLY_TS_KEY) || '0', 10);
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    if (weeklyRaw && (now - weeklyTs) < WEEK) {
      try {
        const picks = JSON.parse(weeklyRaw);
        if (userId) {
          return picks.filter(c => _canView(userId, c.id));
        }
        return picks;
      } catch {}
    }

    const allContent = _getContent();
    const shuffled = [...allContent].sort(() => Math.random() - 0.5);

    const picks = shuffled.slice(0, 4).map(c => ({
      ...c,
      reason: ' Escolha da semana — destaque do catálogo',
      isWeeklyPick: true,
    }));

    try {
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(picks));
      localStorage.setItem(WEEKLY_TS_KEY, String(now));
    } catch {}

    return userId ? picks.filter(c => _canView(userId, c.id)) : picks;
  }

  function getTrendingContent() {
    const allDownloads = {};
    const users = _loadAllUsers();

    Object.values(users).forEach(user => {
      if (user.downloads && Array.isArray(user.downloads)) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        user.downloads.forEach(d => {
          if (d.at > weekAgo) {
            allDownloads[d.contentId] = (allDownloads[d.contentId] || 0) + 1;
          }
        });
      }
    });

    const allContent = _getContent();
    return Object.entries(allDownloads)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => {
        const item = allContent.find(c => c.id === id);
        return item ? { ...item, trendingCount: count, reason: `${count} download(s) esta semana` } : null;
      })
      .filter(Boolean);
  }

  function _loadAllUsers() {
    try {
      const raw = localStorage.getItem('adaspro_users');
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch { return {}; }
  }

  function getNextInPath(userId) {
    const downloads = _getDownloadedIds(userId);
    const accessLevel = _getAccessLevel(userId);

    for (const [catId, path] of Object.entries(LEARNING_PATHS)) {
      for (let i = 0; i < path.steps.length; i++) {
        const step = path.steps[i];
        if (!downloads.has(step.contentId)) {
          const item = _getContentById(step.contentId);
          if (item && _canView(userId, step.contentId)) {
            const completed = path.steps.slice(0, i).filter(s => downloads.has(s.contentId)).length;
            return {
              ...item,
              pathLabel: path.label,
              pathIcon: path.icon,
              stepIndex: i,
              totalSteps: path.steps.length,
              completedSteps: completed,
              reason: `Próximo passo em ${path.label}`,
              isNextInPath: true,
            };
          }
        }
      }
    }

    const catsWithContent = Object.entries(LEARNING_PATHS).filter(([, path]) =>
      path.steps.some(s => {
        const item = _getContentById(s.contentId);
        return item && _canView(userId, s.contentId) && !downloads.has(s.contentId);
      })
    );

    if (catsWithContent.length > 0) {
      const [catId, path] = catsWithContent[0];
      const firstStep = path.steps.find(s => {
        const item = _getContentById(s.contentId);
        return item && _canView(userId, s.contentId);
      });
      if (firstStep) {
        const item = _getContentById(firstStep.contentId);
        return {
          ...item,
          pathLabel: path.label,
          pathIcon: path.icon,
          stepIndex: 0,
          totalSteps: path.steps.length,
          completedSteps: 0,
          reason: `Comece ${path.label}`,
          isNextInPath: true,
        };
      }
    }

    return null;
  }

  /* ════════════════════════════════════════════
     6. LEARNING PATH ENGINE
  ════════════════════════════════════════════ */

  function getLearningPath(userId, category) {
    const path = LEARNING_PATHS[category];
    if (!path) return null;

    const downloaded = _getDownloadedIds(userId);

    const steps = path.steps.map((step, index) => {
      const item = _getContentById(step.contentId);
      const accessible = item ? _canView(userId, step.contentId) : false;
      const completed = downloaded.has(step.contentId);

      return {
        ...step,
        index,
        accessible,
        completed,
        item: item || null,
      };
    });

    const completedCount = steps.filter(s => s.completed).length;
    const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

    return {
      category,
      label: path.label,
      icon: path.icon,
      steps,
      completedCount,
      totalSteps: steps.length,
      progress,
    };
  }

  function getPathProgress(userId, category) {
    const path = getLearningPath(userId, category);
    if (!path) return null;

    return {
      category: path.category,
      label: path.label,
      progress: path.progress,
      completedCount: path.completedCount,
      totalSteps: path.totalSteps,
      nextStep: path.steps.find(s => !s.completed && s.accessible) || null,
    };
  }

  function getAllPathsProgress(userId) {
    const results = [];
    for (const catId of Object.keys(LEARNING_PATHS)) {
      const progress = getPathProgress(userId, catId);
      if (progress) results.push(progress);
    }
    return results.sort((a, b) => b.progress - a.progress);
  }

  /* ════════════════════════════════════════════
     7. UI COMPONENTS
  ════════════════════════════════════════════ */

  function renderRecommendations(containerId, userId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const recs = getRecommendations(userId, limit || 6);
    if (recs.length === 0) {
      container.innerHTML = '<div class="rec-empty"><span class="rec-empty-icon">📚</span><p class="rec-empty-text">Nenhuma recomendação disponível no momento.</p></div>';
      return;
    }

    container.innerHTML = recs.map(rec => `
      <div class="rec-card" data-content-id="${rec.id}">
        <div class="rec-card-header">
          <span class="rec-card-icon">${rec.icon || '📄'}</span>
          <span class="rec-card-badge">${rec.reason || 'Recomendado'}</span>
        </div>
        <div class="rec-card-body">
          <h4 class="rec-card-title">${rec.title || ''}</h4>
          <p class="rec-card-desc">${(rec.desc || '').substring(0, 100)}${(rec.desc || '').length > 100 ? '...' : ''}</p>
        </div>
        <div class="rec-card-footer">
          <span class="rec-card-meta">${rec.fileSize || ''} · ${rec.pages || 0} págs</span>
          <button class="rec-card-btn" onclick="RECOMMENDATIONS._onRecClick('${rec.id}')">Ver material</button>
        </div>
      </div>
    `).join('');
  }

  function renderLearningPath(containerId, userId, category) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const path = getLearningPath(userId, category);
    if (!path) {
      container.innerHTML = '<div class="rec-empty"><p class="rec-empty-text">Caminho de aprendizado não encontrado.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="lp-header">
        <span class="lp-icon">${path.icon}</span>
        <div class="lp-header-info">
          <h3 class="lp-title">${path.label}</h3>
          <p class="lp-subtitle">${path.completedCount} de ${path.totalSteps} concluído(s)</p>
        </div>
        <div class="lp-progress-ring" data-progress="${path.progress}">
          <svg viewBox="0 0 36 36">
            <path class="lp-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="3"/>
            <path class="lp-ring-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="${path.progress}, 100" stroke-linecap="round"/>
          </svg>
          <span class="lp-progress-pct">${path.progress}%</span>
        </div>
      </div>
      <div class="lp-steps">
        ${path.steps.map((step, i) => `
          <div class="lp-step ${step.completed ? 'lp-step-done' : ''} ${!step.accessible ? 'lp-step-locked' : ''}">
            <div class="lp-step-connector">
              <div class="lp-step-dot">${step.completed ? '✓' : (i + 1)}</div>
              ${i < path.steps.length - 1 ? '<div class="lp-step-line"></div>' : ''}
            </div>
            <div class="lp-step-content">
              <h4 class="lp-step-title">${step.label}</h4>
              <p class="lp-step-desc">${step.desc}</p>
              ${step.item ? `<span class="lp-step-meta">${step.item.fileSize || ''} · v${(step.item.version || '').replace('v', '')}</span>` : ''}
              ${step.completed ? '<span class="lp-step-badge lp-badge-done">Concluído</span>' : ''}
              ${!step.accessible ? '<span class="lp-step-badge lp-badge-locked">Bloqueado</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderWeeklyPicks(containerId, userId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const picks = getWeeklyPicks(userId);
    if (picks.length === 0) {
      container.innerHTML = '<div class="rec-empty"><p class="rec-empty-text">Nenhuma escolha da semana disponível.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="wp-header">
        <span class="wp-icon">⭐</span>
        <h3 class="wp-title">Escolhas da Semana</h3>
        <span class="wp-subtitle">Curadoria ADAS PRO</span>
      </div>
      <div class="wp-grid">
        ${picks.map(pick => `
          <div class="wp-card" data-content-id="${pick.id}">
            <div class="wp-card-badge">Destaque</div>
            <span class="wp-card-icon">${pick.icon || '📄'}</span>
            <h4 class="wp-card-title">${pick.title || ''}</h4>
            <p class="wp-card-desc">${(pick.desc || '').substring(0, 80)}...</p>
            <div class="wp-card-meta">
              <span>${pick.fileSize || ''}</span>
              <span>v${(pick.version || '').replace('v', '')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTrending(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const trending = getTrendingContent();

    if (trending.length === 0) {
      container.innerHTML = '<div class="rec-empty"><span class="rec-empty-icon">📊</span><p class="rec-empty-text">Ainda não há dados de tendências.</p><p class="rec-empty-sub">Os downloads da comunidade aparecerão aqui.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="tr-header">
        <span class="tr-icon">🔥</span>
        <h3 class="tr-title">Em Alta Esta Semana</h3>
      </div>
      <div class="tr-list">
        ${trending.map((item, i) => `
          <div class="tr-item" data-content-id="${item.id}">
            <span class="tr-rank">#${i + 1}</span>
            <div class="tr-item-body">
              <h4 class="tr-item-title">${item.title || ''}</h4>
              <p class="tr-item-reason">${item.reason || ''}</p>
            </div>
            <span class="tr-item-badge">${item.trendingCount || 0} ↓</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderNextStep(containerId, userId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const next = getNextInPath(userId);
    if (!next) {
      container.innerHTML = '<div class="rec-empty"><span class="rec-empty-icon">🎉</span><p class="rec-empty-text">Parabéns! Você concluiu todos os caminhos disponíveis.</p></div>';
      return;
    }

    const pct = next.totalSteps > 0 ? Math.round((next.completedSteps / next.totalSteps) * 100) : 0;

    container.innerHTML = `
      <div class="ns-card">
        <div class="ns-card-accent"></div>
        <div class="ns-card-body">
          <span class="ns-path-icon">${next.pathIcon || '📘'}</span>
          <span class="ns-path-label">${next.pathLabel || ''} — Passo ${next.stepIndex + 1}/${next.totalSteps}</span>
          <h3 class="ns-title">${next.title || ''}</h3>
          <p class="ns-desc">${(next.desc || '').substring(0, 120)}...</p>
          <div class="ns-progress-bar">
            <div class="ns-progress-fill" style="width:${pct}%"></div>
          </div>
          <p class="ns-progress-text">${pct}% concluído — ${next.reason || 'Próximo passo'}</p>
        </div>
        <div class="ns-card-action">
          <button class="ns-btn" onclick="RECOMMENDATIONS._onRecClick('${next.id}')">Continuar trilha →</button>
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     8. CALLBACKS / HANDLERS
  ════════════════════════════════════════════ */

  function _onRecClick(contentId) {
    if (typeof AUTH !== 'undefined' && AUTH.trackDownload) {
      const session = AUTH.getSession ? AUTH.getSession() : null;
      if (session && session.userId) {
        trackDownloadPair(session.userId, contentId);
      }
    }
    const item = _getContentById(contentId);
    if (item && item.filePath) {
      window.open('assets/downloads/' + item.filePath, '_blank');
    }
  }

  /* ════════════════════════════════════════════
     API PÚBLICA
  ════════════════════════════════════════════ */

  return {
    VERSION: '1.0.0',

    RULES,
    CROSS_RULES,
    LEARNING_PATHS,

    getRecommendations,
    getContentRecommendations,
    getCollaborativeRecs,
    getWeeklyPicks,
    getTrendingContent,
    getNextInPath,
    getLearningPath,
    getPathProgress,
    getAllPathsProgress,
    trackDownloadPair,

    renderRecommendations,
    renderLearningPath,
    renderWeeklyPicks,
    renderTrending,
    renderNextStep,

    _onRecClick,
    _getContentById,
    _getDownloadedIds,
    _loadCollabData,
  };

})();
