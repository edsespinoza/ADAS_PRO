/* ================================================
   ADAS PRO — Sistema de Gamificação
   ================================================
   Empresa:     AutoTech Service
   Produto:     ADAS PRO Platform
   Versão:      1.0.0  build 20260825
   Modos:       1) Supabase (tabela user_gamification)
                2) localStorage (fallback)
   Copyright:   © 2024-2026 AutoTech Service
   ================================================ */

const GAMIFICATION = (function () {

  const VERSION = '1.0.0';

  /* ─── Chaves localStorage ─── */
  const BADGES_KEY     = 'adaspro_badges';
  const PROGRESS_KEY   = 'adaspro_reading_progress';
  const STREAKS_KEY    = 'adaspro_streaks';
  const LEADERBOARD_KEY = 'adaspro_leaderboard';

  /* ─── Referência ao Supabase client (quando disponível) ─── */
  let _sb = null;
  let _mode = 'local';

  /* ─── Categorias e conteúdo (copiado de AUTH — fonte única: auth.js) ─── */
  function _getCategories() {
    return (typeof AUTH !== 'undefined' && AUTH.CATEGORIES) ? AUTH.CATEGORIES : [
      { id:'honda', label:'Honda & Acura', icon:'🔵' },
      { id:'toyota', label:'Toyota & Lexus', icon:'🔴' },
      { id:'nissan', label:'Nissan & Infiniti', icon:'🟡' },
      { id:'subaru', label:'Subaru EyeSight', icon:'🟢' },
      { id:'hyundai', label:'Hyundai & Kia', icon:'🔷' },
      { id:'vag', label:'VAG (Audi/VW/Seat)', icon:'🟣' },
      { id:'mercedes', label:'Mercedes-Benz', icon:'⭕' },
      { id:'ford', label:'Ford & Lincoln', icon:'🔸' },
      { id:'radar', label:'Radar Universal', icon:'📡' },
      { id:'mazda', label:'Mazda AVM 360°', icon:'🔶' },
      { id:'mitsubishi', label:'Mitsubishi', icon:'🔹' },
      { id:'chineses', label:'BYD / Chery / MG', icon:'🇨🇳' },
    ];
  }

  function _getContent() {
    if (typeof AUTH !== 'undefined' && typeof AUTH.getContent === 'function') {
      const result = AUTH.getContent();
      return Array.isArray(result) ? result : [];
    }
    try {
      return JSON.parse(localStorage.getItem('adaspro_content') || '[]');
    } catch { return []; }
  }

  function _getContentForUser(user) {
    if (typeof AUTH !== 'undefined' && typeof AUTH.getContentForUser === 'function') {
      return AUTH.getContentForUser() || [];
    }
    return _getContent();
  }

  /* ════════════════════════════════════════════
     PERSISTÊNCIA — localStorage + Supabase
  ════════════════════════════════════════════ */

  function _readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }

  function _writeLocal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch(e) { console.warn('[GAMIFICATION] localStorage write failed:', e.message); }
  }

  async function _sbUpsert(data) {
    if (_mode !== 'supabase' || !_sb) return;
    try {
      const { error } = await _sb.from('user_gamification').upsert(data, { onConflict: 'user_id' });
      if (error) console.warn('[GAMIFICATION] Supabase upsert:', error.message);
    } catch(e) { console.warn('[GAMIFICATION] Supabase upsert:', e.message); }
  }

  async function _sbLoad(userId) {
    if (_mode !== 'supabase' || !_sb) return null;
    try {
      const { data, error } = await _sb.from('user_gamification')
        .select('*').eq('user_id', userId).single();
      if (error || !data) return null;
      return data;
    } catch { return null; }
  }

  /* ════════════════════════════════════════════
     INICIALIZAÇÃO
  ════════════════════════════════════════════ */

  function init() {
    if (typeof AUTH !== 'undefined' && typeof AUTH.isOfflineMode === 'function') {
      _mode = AUTH.isOfflineMode() ? 'local' : 'supabase';
    }
    if (_mode === 'supabase' && typeof AUTH !== 'undefined') {
      try {
        _sb = AUTH._sb || null;
      } catch { _sb = null; }
    }
    if (!_sb && typeof window !== 'undefined' && window.supabase) {
      try {
        const cfg = window.SUPABASE_CONFIG;
        if (cfg && cfg.url && cfg.anonKey && !cfg.url.includes('SEU-PROJETO')) {
          _sb = window.supabase.createClient(cfg.url, cfg.anonKey);
          _mode = 'supabase';
        }
      } catch { /* fallback local */ }
    }
  }

  /* ════════════════════════════════════════════
     1. SISTEMA DE BADGES
  ════════════════════════════════════════════ */

  const BADGE_DEFS = [
    { id:'especialista_honda',     cat:'honda',     label:'Especialista Honda',      icon:'🔵', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'mestre_toyota',          cat:'toyota',    label:'Mestre Toyota',           icon:'🔴', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'expert_nissan',          cat:'nissan',    label:'Expert Nissan',           icon:'🟡', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'specialista_subaru',     cat:'subaru',    label:'Especialista Subaru',     icon:'🟢', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'mestre_hyundai',         cat:'hyundai',   label:'Mestre Hyundai',          icon:'🔷', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'expert_vag',             cat:'vag',       label:'Expert VAG',              icon:'🟣', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'especialista_mercedes',  cat:'mercedes',  label:'Especialista Mercedes',   icon:'⭕', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'mestre_ford',            cat:'ford',      label:'Mestre Ford',             icon:'🔸', tiers:{ bronze:1, prata:3, ouro:-1, diamante:-1 } },
    { id:'expert_radar',           cat:'radar',     label:'Expert Radar',            icon:'📡', tiers:{ bronze:1, prata:2, ouro:-1, diamante:-1 } },
    { id:'especialista_mazda',     cat:'mazda',     label:'Especialista Mazda',      icon:'🔶', tiers:{ bronze:1, prata:2, ouro:-1, diamante:-1 } },
    { id:'mestre_mitsubishi',      cat:'mitsubishi',label:'Mestre Mitsubishi',       icon:'🔹', tiers:{ bronze:1, prata:2, ouro:-1, diamante:-1 } },
    { id:'expert_chineses',        cat:'chineses',  label:'Expert Chineses',         icon:'🇨🇳', tiers:{ bronze:1, prata:2, ouro:-1, diamante:-1 } },
  ];

  const TIER_ORDER = ['bronze','prata','ouro','diamante'];
  const TIER_META = {
    bronze:   { label:'Bronze',   color:'#CD7F32', glow:'rgba(205,127,50,.4)' },
    prata:    { label:'Prata',    color:'#C0C0C0', glow:'rgba(192,192,192,.4)' },
    ouro:     { label:'Ouro',     color:'#FFD700', glow:'rgba(255,215,0,.4)' },
    diamante: { label:'Diamante', color:'#B9F2FF', glow:'rgba(185,242,255,.5)' },
  };

  function _countContentInCategory(catId) {
    return _getContentForUser().filter(c => c.cat === catId).length;
  }

  function _getBadgeProgressForUser(userId, catId) {
    const content = _getContentForUser().filter(c => c.cat === catId);
    const total = content.length;
    if (total === 0) return { total:0, read:0, pct:0, tier:'none' };

    const readingData = _readLocal(PROGRESS_KEY);
    const userProgress = readingData[userId] || {};
    let read = 0;
    content.forEach(c => {
      const p = userProgress[c.id];
      if (p && p.progress >= 100) read++;
    });

    const pct = Math.round((read / total) * 100);
    let tier = 'none';
    const def = BADGE_DEFS.find(b => b.cat === catId);
    if (def) {
      if (read >= total) tier = 'ouro';
      else if (read >= def.tiers.prata) tier = 'prata';
      else if (read >= def.tiers.bronze) tier = 'bronze';
    }
    return { total, read, pct, tier };
  }

  function _determineTier(readCount, total, hasQuiz) {
    if (hasQuiz && readCount >= total) return 'diamante';
    if (readCount >= total) return 'ouro';
    if (readCount >= 3) return 'prata';
    if (readCount >= 1) return 'bronze';
    return 'none';
  }

  function checkBadges(userId) {
    if (!userId) return [];
    const badgesData = _readLocal(BADGES_KEY);
    const userBadges = badgesData[userId] || {};
    const newBadges = [];
    const categories = _getCategories();

    categories.forEach(cat => {
      const progress = _getBadgeProgressForUser(userId, cat.id);
      const def = BADGE_DEFS.find(b => b.cat === cat.id);
      if (!def || progress.total === 0) return;

      const tier = _determineTier(progress.read, progress.total, false);
      if (tier === 'none') return;

      const currentTier = userBadges[def.id]?.tier || 'none';
      const tierIdx = TIER_ORDER.indexOf(tier);
      const currentIdx = TIER_ORDER.indexOf(currentTier);

      if (tierIdx > currentIdx) {
        userBadges[def.id] = {
          badgeId: def.id,
          tier,
          cat: cat.id,
          earnedAt: Date.now(),
          progress: progress.read,
          total: progress.total,
        };
        newBadges.push({ ...def, tier, progress });
      }
    });

    if (newBadges.length > 0) {
      badgesData[userId] = userBadges;
      _writeLocal(BADGES_KEY, badgesData);
      _syncToServer(userId, { badges: userBadges });
      _addPoints(userId, newBadges.length * 100);
    }

    return newBadges;
  }

  function getBadges(userId) {
    if (!userId) return [];
    const badgesData = _readLocal(BADGES_KEY);
    const userBadges = badgesData[userId] || {};
    const result = [];
    BADGE_DEFS.forEach(def => {
      const entry = userBadges[def.id];
      if (entry) {
        const tierMeta = TIER_META[entry.tier] || TIER_META.bronze;
        result.push({ ...def, ...entry, tierMeta });
      }
    });
    return result;
  }

  function getBadgeProgress(userId, catId) {
    if (!userId || !catId) return { total:0, read:0, pct:0, tier:'none', badges:[] };
    const progress = _getBadgeProgressForUser(userId, catId);
    const def = BADGE_DEFS.find(b => b.cat === catId);
    const badgesData = _readLocal(BADGES_KEY);
    const userBadges = badgesData[userId] || {};
    const earned = userBadges[def?.id] || null;
    return { ...progress, earned, def };
  }

  /* ════════════════════════════════════════════
     2. BARRAS DE PROGRESSO
  ════════════════════════════════════════════ */

  function updateReadingProgress(userId, contentId, progress) {
    if (!userId || !contentId) return;
    const pct = Math.max(0, Math.min(100, Math.round(progress)));
    const allData = _readLocal(PROGRESS_KEY);
    if (!allData[userId]) allData[userId] = {};
    const prev = allData[userId][contentId]?.progress || 0;
    allData[userId][contentId] = {
      progress: pct,
      updatedAt: Date.now(),
    };
    _writeLocal(PROGRESS_KEY, allData);

    if (pct >= 100 && prev < 100) {
      _addPoints(userId, 25);
      checkBadges(userId);
    }

    _syncToServer(userId, { reading_progress: allData[userId] });
  }

  function getReadingProgress(userId, contentId) {
    if (!userId || !contentId) return 0;
    const allData = _readLocal(PROGRESS_KEY);
    return allData[userId]?.[contentId]?.progress || 0;
  }

  function getOverallProgress(userId) {
    if (!userId) return 0;
    const content = _getContentForUser();
    if (content.length === 0) return 0;
    const allData = _readLocal(PROGRESS_KEY);
    const userProgress = allData[userId] || {};
    let total = 0;
    content.forEach(c => {
      total += (userProgress[c.id]?.progress || 0);
    });
    return Math.round(total / content.length);
  }

  function renderProgressBar(containerId, progress, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
      height = 8,
      showLabel = true,
      animated = true,
      gradient = 'linear-gradient(90deg, var(--accent), var(--tech))',
      label = null,
    } = options;

    const pct = Math.max(0, Math.min(100, Math.round(progress)));

    container.innerHTML = `
      <div class="gam-progress" style="height:${height}px">
        <div class="gam-progress__track${animated ? ' gam-progress__track--animated' : ''}"
             style="background:${gradient}; width:${pct}%">
        </div>
      </div>
      ${showLabel ? `<div class="gam-progress__label">${label ? label + ': ' : ''}${pct}%</div>` : ''}
    `;
  }

  /* ════════════════════════════════════════════
     3. STREAKS
  ════════════════════════════════════════════ */

  function _today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function _yesterday() {
    const d = new Date(Date.now() - 86400000);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function recordActivity(userId) {
    if (!userId) return;
    const streaks = _readLocal(STREAKS_KEY);
    if (!streaks[userId]) {
      streaks[userId] = { current: 1, longest: 1, lastDay: _today(), days: [_today()] };
    } else {
      const s = streaks[userId];
      const today = _today();
      if (s.lastDay === today) return; // already recorded today
      if (s.lastDay === _yesterday()) {
        s.current += 1;
      } else {
        s.current = 1;
      }
      s.lastDay = today;
      s.days.push(today);
      if (s.days.length > 365) s.days = s.days.slice(-365);
      if (s.current > s.longest) s.longest = s.current;
    }
    _writeLocal(STREAKS_KEY, streaks);
    _addPoints(userId, 10);
    _syncToServer(userId, { streak: streaks[userId] });
  }

  function getStreak(userId) {
    if (!userId) return 0;
    const streaks = _readLocal(STREAKS_KEY);
    const s = streaks[userId];
    if (!s) return 0;
    if (s.lastDay === _today() || s.lastDay === _yesterday()) return s.current;
    return 0; // streak broken
  }

  function getLongestStreak(userId) {
    if (!userId) return 0;
    const streaks = _readLocal(STREAKS_KEY);
    return streaks[userId]?.longest || 0;
  }

  /* ════════════════════════════════════════════
     4. LEADERBOARD
  ════════════════════════════════════════════ */

  function _addPoints(userId, points) {
    const lb = _readLocal(LEADERBOARD_KEY);
    if (!lb[userId]) lb[userId] = { points: 0, name: '' };
    lb[userId].points += points;
    // tenta pegar o nome do usuário
    if (!lb[userId].name && typeof AUTH !== 'undefined') {
      try {
        const u = typeof AUTH.getUserById === 'function' ? AUTH.getUserById(userId) : null;
        if (u) lb[userId].name = u.name || u.email;
      } catch {}
    }
    _writeLocal(LEADERBOARD_KEY, lb);
    _syncToServer(userId, { points: lb[userId].points });
  }

  function getLeaderboard() {
    const lb = _readLocal(LEADERBOARD_KEY);
    const entries = Object.entries(lb)
      .map(([id, v]) => ({ userId: id, name: v.name || 'Usuário', points: v.points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 50);
    return entries;
  }

  function getUserRank(userId) {
    if (!userId) return null;
    const lb = getLeaderboard();
    const idx = lb.findIndex(e => e.userId === userId);
    return idx >= 0 ? { rank: idx + 1, ...lb[idx] } : null;
  }

  /* ════════════════════════════════════════════
     SINCRONIZAÇÃO SUPABASE
  ════════════════════════════════════════════ */

  function _syncToServer(userId, data) {
    if (_mode !== 'supabase' || !_sb) return;
    const record = { user_id: userId, ...data, updated_at: new Date().toISOString() };
    _sbUpsert(record);
  }

  async function _loadFromServer(userId) {
    if (_mode !== 'supabase' || !_sb) return null;
    return _sbLoad(userId);
  }

  /* ════════════════════════════════════════════
     5. DASHBOARD WIDGET
  ════════════════════════════════════════════ */

  function renderDashboard(containerId, userId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const streak = getStreak(userId);
    const badges = getBadges(userId);
    const overallPct = getOverallProgress(userId);
    const rank = getUserRank(userId);

    // Progress ring SVG params
    const r = 54, stroke = 8, circumference = 2 * Math.PI * r;
    const offset = circumference - (overallPct / 100) * circumference;

    const recentBadges = badges.slice(-5).reverse();

    container.innerHTML = `
      <div class="gam-dashboard">
        <!-- Streak -->
        <div class="gam-dash-card gam-dash-streak">
          <div class="gam-streak-flame${streak > 0 ? ' gam-streak-flame--active' : ''}">🔥</div>
          <div class="gam-streak-count">${streak}</div>
          <div class="gam-streak-label">dia${streak !== 1 ? 's' : ''} seguidos</div>
        </div>

        <!-- Badges Count -->
        <div class="gam-dash-card gam-dash-badges">
          <div class="gam-dash-badges__count">${badges.length}</div>
          <div class="gam-dash-badges__label">badges obtidos</div>
        </div>

        <!-- Progress Ring -->
        <div class="gam-dash-card gam-dash-progress">
          <svg class="gam-ring" width="130" height="130" viewBox="0 0 130 130">
            <circle class="gam-ring__bg" cx="65" cy="65" r="${r}"
                    fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/>
            <circle class="gam-ring__fill" cx="65" cy="65" r="${r}"
                    fill="none" stroke="url(#gamRingGrad)" stroke-width="${stroke}"
                    stroke-linecap="round"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    transform="rotate(-90 65 65)"/>
            <defs>
              <linearGradient id="gamRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--accent)"/>
                <stop offset="100%" stop-color="var(--tech)"/>
              </linearGradient>
            </defs>
            <text x="65" y="60" text-anchor="middle" class="gam-ring__pct">${overallPct}%</text>
            <text x="65" y="78" text-anchor="middle" class="gam-ring__sub">completo</text>
          </svg>
        </div>

        <!-- Rank -->
        <div class="gam-dash-card gam-dash-rank">
          <div class="gam-dash-rank__icon">🏆</div>
          <div class="gam-dash-rank__info">
            <span class="gam-dash-rank__label">Ranking</span>
            <span class="gam-dash-rank__value">#${rank ? rank.rank : '—'}</span>
            ${rank ? `<span class="gam-dash-rank__pts">${rank.points} pts</span>` : ''}
          </div>
        </div>

        <!-- Recent Badges -->
        <div class="gam-dash-card gam-dash-recent">
          <div class="gam-dash-recent__title">Badges Recentes</div>
          <div class="gam-dash-recent__list">
            ${recentBadges.length === 0 ? '<span class="gam-dash-recent__empty">Nenhum badge ainda</span>' :
              recentBadges.map(b => `
                <div class="gam-dash-badge-chip" style="--badge-color:${(TIER_META[b.tier]||TIER_META.bronze).color}">
                  <span class="gam-dash-badge-chip__icon">${b.icon}</span>
                  <span class="gam-dash-badge-chip__name">${b.label}</span>
                  <span class="gam-dash-badge-chip__tier">${(TIER_META[b.tier]||TIER_META.bronze).label}</span>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    `;

    // Animate ring fill
    requestAnimationFrame(() => {
      const fill = container.querySelector('.gam-ring__fill');
      if (fill) {
        fill.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)';
        fill.style.strokeDashoffset = offset;
      }
    });
  }

  /* ════════════════════════════════════════════
     UTILITÁRIOS PÚBLICOS
  ════════════════════════════════════════════ */

  function getStats(userId) {
    const badges = getBadges(userId);
    const streak = getStreak(userId);
    const longest = getLongestStreak(userId);
    const overall = getOverallProgress(userId);
    const rank = getUserRank(userId);
    const points = rank?.points || 0;
    return { badges: badges.length, streak, longestStreak: longest, overall, points, rank: rank?.rank };
  }

  function resetUserData(userId) {
    if (!userId) return;
    [BADGES_KEY, PROGRESS_KEY, STREAKS_KEY, LEADERBOARD_KEY].forEach(key => {
      const data = _readLocal(key);
      delete data[userId];
      _writeLocal(key, data);
    });
  }

  /* ─── Export público ─── */
  return {
    init, VERSION,
    BADGE_DEFS, TIER_ORDER, TIER_META,
    checkBadges, getBadges, getBadgeProgress,
    updateReadingProgress, getReadingProgress, getOverallProgress, renderProgressBar,
    recordActivity, getStreak, getLongestStreak,
    getLeaderboard, getUserRank,
    renderDashboard,
    getStats, resetUserData,
  };

})();
