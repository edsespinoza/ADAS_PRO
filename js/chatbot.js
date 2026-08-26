/* ================================================
   ADAS PRO — Chatbot Técnico (RAG Client-Side)
   ================================================
   Versão:  1.0.0  build 20260825
   Copyright: © 2024-2026 AutoTech Service
   ================================================ */

const CHATBOT = (function () {

  const STORE_KEY        = 'adaspro_chat_history';
  const INDEX_KEY        = 'adaspro_chatbot_index';
  const ANALYTICS_KEY    = 'adaspro_chatbot_analytics';
  const CUSTOM_RESP_KEY  = 'adaspro_chatbot_custom';
  const LEADERBOARD_KEY  = 'adaspro_chatbot_leaderboard';

  let _open = false;
  let _content = [];
  let _indexed = false;
  let _typingTimer = null;

  /* ─── Quick Questions ─── */
  const QUICK_QUESTIONS = [
    { label: 'Como calibrar Honda LKAS?',      query: 'Como calibrar Honda LKAS?' },
    { label: 'Target Toyota LDW 120°',          query: 'Qual o target Toyota LDW 120°?' },
    { label: 'Nissan ProPilot assistência',     query: 'Como funciona o Nissan ProPilot?' },
    { label: 'Audi LIDAR ACC calibration',      query: 'Audi LIDAR ACC como calibrar?' },
    { label: 'Subaru EyeSight tipo 1 vs 2',    query: 'Qual a diferença Subaru EyeSight tipo 1 e tipo 2?' },
    { label: 'BYD AVM padrões',                 query: 'Quais padrões de calibração BYD AVM?' },
  ];

  /* ─── Greetings & Fallback ─── */
  const GREETING_RESPONSE = 'Olá! 👋 Sou o assistente técnico **ADAS PRO**. Posso ajudar com:\n\n- 📋 Procedimentos de calibração\n- 🎯 Informações sobre targets\n- 🔧 Códigos de falha (DTC)\n- 📄 Conteúdo disponível na biblioteca\n\nComo posso ajudar?';

  const FALLBACK_RESPONSE = 'Não encontrei informação específica na base de conhecimento sobre isso. 😕\n\nPosso te direcionar para:\n- 🎫 **Suporte técnico** — abra um ticket com um especialista\n- 📚 **Biblioteca técnica** — explore os materiais disponíveis\n\nQuer que eu busque algo mais específico?';

  /* ─── Pre-defined Responses ─── */
  const PREDEFINED = [
    {
      patterns: [/^ol[áa]/i, /^oi$/i, /^hello$/i, /^bom dia$/i, /^boa tarde$/i, /^boa noite$/i, /^e a[ií]/i],
      response: GREETING_RESPONSE,
    },
    {
      patterns: [/calibr.*honda.*lkas/i, /honda.*lkas.*calibr/i],
      response: '## Honda LKAS — Calibração\n\nO guia completo está disponível na biblioteca: **Honda LKAS Calibration** (v3.1).\n\n**Resumo rápido:**\n- **Target Tipo 1:** impressão A4 × 4 folhas\n- **Target Tipo 2:** plotagem única 80×120cm\n- **Distância:** 3,0 m da câmera frontal\n- **Altura do centro ótico:** verificar por modelo\n- **Compatível:** 89 variantes regionais (Civic, CR-V, HR-V, Accord, Fit, Pilot, Acura RDX/MDX)\n\n**Modelos suportados (2016–2024):**\n`Civic · CR-V · HR-V · Accord · Fit · Pilot · Acura RDX · Acura MDX`\n\nDeseja detalhes sobre algum step específico?',
      contentId: 'honda-lkas',
    },
    {
      patterns: [/target.*toyota.*ldw/i, /toyota.*ldw.*target/i, /qual.*target.*toyota/i],
      response: '## Toyota LDW/LDA — Target 120°\n\nO PDF **Toyota LDW/LDA — Target 120°** (v4.2) cobre **142 modelos** Toyota/Lexus (2015–2024).\n\n**Especificações do Target:**\n- **Tipo:** 120° — impressão A4 × 3 folhas\n- **Altura centro câmera:** 1.200 mm do solo\n- **Distância:** 1,0 m da parte frontal do capô\n\n**Antes de calibrar:**\n1. Verificar código **C1A50** antes do procedimento\n2. Pneus calibrados e superfície nivelada\n\n**Modelos populares:**\n`Corolla · Camry · RAV4 · Hilux · Yaris · Lexus UX/NX/RX`\n\nPara Toyota com câmera estéreo (2019+), consulte também o **Target 180°**.',
      contentId: 'toyota-ldw',
    },
    {
      patterns: [/como.*funciona.*propilot/i, /propilot.*assist/i, /nissan.*propilot/i],
      response: '## Nissan ProPilot Assist\n\nO manual técnico cobre **ProPilot 1.0 e 2.0** (v3.0).\n\n**Procedimento:**\n1. Target **A4 × 7 folhas** (mosaico)\n2. Calibração **câmera + radar em sequência**\n3. Velocidade de verificação: **60–100 km/h**\n\n**Ferramentas:** Consult-III Plus obrigatório\n\n**Modelos suportados:**\n`Kicks 2021+ · Frontier 2022+ · Sentra 2021+ · Leaf 2020+ · Ariya`\n\nA cobertura inclui 348+ modelos — o **Nissan LKA Tipo 1** tem a lista completa.',
      contentId: 'nissan-propilot',
    },
    {
      patterns: [/audi.*lidar.*calibr/i, /lidar.*acc.*audi/i, /vas6430/i],
      response: '## Audi LIDAR ACC — VAS6430-12\n\nTarget proprietário **VAS6430-12** para calibração LIDAR do ACC Audi (v5.0).\n\n**Requisitos:**\n- Arquivo **Photoshop (.psb) incluso** — impressão em papel fotográfico fosco\n- **ODIS Engineering v12+** obrigatório\n- Calibração **estática + dinâmica**\n\n**Código de falha 00526** — procedimento de reset documentado no PDF.\n\n**Modelos suportados (2016+):**\n`A4 · A6 · A7 · A8 · Q5 · Q7 · Q8 · e-tron`\n\nArquivo de 38 páginas com medições exatas e tolerâncias.',
      contentId: 'audi-lidar',
    },
    {
      patterns: [/subaru.*eyesight.*tipo/i, /diferen[çc]a.*eyesight/i, /eyesight.*tipo.*1.*tipo.*2/i],
      response: '## Subaru EyeSight — Tipo 1 vs Tipo 2\n\n### Tipo 1 (2015–2019)\n- **Target único 180°** — plotagem obrigatória\n- Alinhamento X/Y com tolerância **±0,3°**\n- **Subaru Select Monitor** obrigatório\n- 350+ modelos e variantes\n\n### Tipo 2 (2020+)\n- **Target aumentado 210×180cm**\n- **HEV/PHEV:** desligar motor antes da calibração\n- **SSM IV versão 2023+** recomendada\n- Câmera wide-angle de nova geração\n\n**Ambos:** câmera estéreo — calibração binocular\n\nQual geração você está trabalhando?',
      contentId: 'subaru-type1',
    },
    {
      patterns: [/byd.*avm.*padr/i, /padr.*calibr.*byd/i, /byd.*avm/i],
      response: '## BYD AVM — 4 Variantes\n\nO padrão de calibração BYD (v1.8) cobre **4 variantes (A/B/C/D)**.\n\n**Especificações:**\n- **Formato:** Arquivos PNG 300dpi + PDF guiado\n- **Posição:** 1,0m de cada câmera\n- **Ferramenta:** DiagZone ou BYD Workshop obrigatório\n\n**Modelos suportados:**\n`Dolphin · Seal · Atto 3 · Han · Tang · Song Plus`\n\nCada variante é específica por modelo — verifique qual padrão corresponde ao seu veículo antes de imprimir.',
      contentId: 'byd-avm',
    },
    {
      patterns: [/c[óo]digo.*falha.*c1a50/i, /dtc.*c1a50/i, /c1a50/i],
      response: '## DTC C1A50 — Diagnóstico\n\nO código **C1A50** é comumente encontrado em veículos **Toyota/Lexus** e está relacionado ao sistema **Lane Departure Warning (LDW/LDA)**.\n\n**Causa mais comum:**\n- Câmera frontal descalibrada ou desalinhada\n- Ocorre após substituição de para-choque, pára-brisa ou reparos na área frontal\n\n**Procedimento:**\n1. Verificar integração física da câmera\n2. Executar calibração com target correto (120° ou 180° conforme modelo)\n3. Limpar DTC e testar em via\n\n📄 **PDF recomendado:** Toyota LDW/LDA — Target 120°',
      contentId: 'toyota-ldw',
    },
    {
      patterns: [/download.*pdf/i, /baixar.*pdf/i, /como.*baixar/i, /acessar.*material/i],
      response: '## Como acessar materiais\n\n1. Navegue até a **Biblioteca Técnica** no menu lateral\n2. Use os filtros de **categoria** para encontrar o material\n3. Clique no botão **"Baixar PDF"**\n\n⚠️ Materiais com cadeado 🔒 requerem plano **Módulo** ou superior.\n\nSeu plano atual dá acesso a materiais com nível até **{level}**. Para desbloquear mais conteúdo, acesse **Suporte → Upgrade de plano**.',
    },
    {
      patterns: [/radar.*universal/i, /placa.*reflexiv/i, /universal.*radar.*acc/i],
      response: '## Universal Radar Plate — ACC\n\nA **Universal Radar Plate** (v2.1) é uma solução compatível com múltiplos fabricantes.\n\n**Especificações:**\n- **Dimensões:** Placa reflexiva 300×300mm em alumínio escovado\n- **Distância:** 2,5–3,5m conforme fabricante\n- **Frequência radar:** Verificar se é 77 GHz\n- **Altura:** Centro do radar ±5mm\n\n**Compatível com:**\n`Genesis · Hyundai · Kia · Nissan · Toyota · Mazda`\n\nPDF de 12 páginas com diagramas de posicionamento.',
      contentId: 'radar-univ',
    },
    {
      patterns: [/obrigad[oa]/i, /valeu/i, /thanks/i],
      response: 'De nada! 😊 Se precisar de mais ajuda técnica, é só perguntar.\n\nBoa calibração! 🔧',
    },
  ];

  /* ════════════════════════════════════════════
     KNOWLEDGE BASE — INDEXING
  ════════════════════════════════════════════ */

  function indexContent() {
    _content = typeof AUTH !== 'undefined' ? AUTH.getContent() : [];
    const index = _content.map(item => ({
      id: item.id,
      cat: item.cat,
      title: item.title,
      desc: item.desc,
      models: item.models || [],
      highlights: item.highlights || [],
      tokens: _tokenize(item.title + ' ' + item.desc + ' ' + (item.models || []).join(' ') + ' ' + (item.highlights || []).join(' ')),
    }));
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(index)); } catch(_) {}
    _indexed = true;
    return index.length;
  }

  function _tokenize(text) {
    return (text || '').toLowerCase()
      .replace(/[^\w\sàáâãéèêíïóôõúüç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  function _loadIndex() {
    if (_indexed) return;
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (raw) { _content = typeof AUTH !== 'undefined' ? AUTH.getContent() : []; _indexed = true; return; }
    } catch(_) {}
    indexContent();
  }

  /* ════════════════════════════════════════════
     RAG — SEARCH ENGINE
  ════════════════════════════════════════════ */

  function searchKnowledge(query) {
    _loadIndex();
    const qTokens = _tokenize(query);
    if (!qTokens.length) return [];

    const index = (() => { try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; } })();
    const scored = index.map(item => {
      let score = 0;
      qTokens.forEach(qt => {
        if (item.tokens.some(t => t === qt)) score += 3;
        else if (item.tokens.some(t => t.includes(qt) || qt.includes(t))) score += 1.5;
      });
      const qLower = query.toLowerCase();
      if (item.title.toLowerCase().includes(qLower)) score += 5;
      if (item.desc.toLowerCase().includes(qLower)) score += 2;
      item.models.forEach(m => {
        if (qLower.includes(m.toLowerCase())) score += 4;
      });
      item.highlights.forEach(h => {
        if (qLower.includes(h.toLowerCase().substring(0, 10))) score += 2;
      });
      return { ...item, score };
    });

    return scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  }

  function searchSimilar(query, limit) {
    return searchKnowledge(query).slice(0, limit || 3);
  }

  function getContext(contentId) {
    const item = _content.find(c => c.id === contentId);
    if (!item) return null;
    return {
      title: item.title,
      description: item.desc,
      models: item.models,
      highlights: item.highlights,
      version: item.version,
      pages: item.pages,
      fileSize: item.fileSize,
    };
  }

  /* ════════════════════════════════════════════
     RAG — RESPONSE GENERATION
  ════════════════════════════════════════════ */

  function sendMessage(message) {
    _logAnalytics(message);

    const customResp = _getCustomResponse(message);
    if (customResp) return customResp;

    for (const pre of PREDEFINED) {
      if (pre.patterns.some(p => p.test(message))) {
        return pre.response.replace('{level}', _getUserLevelLabel());
      }
    }

    const results = searchKnowledge(message);
    if (results.length === 0) return FALLBACK_RESPONSE;

    const top = results[0];
    const fullItem = _content.find(c => c.id === top.id);

    let response = `Encontrei **${results.length} resultado(s)** relacionado(s):\n\n`;

    results.forEach((r, i) => {
      const item = _content.find(c => c.id === r.id);
      if (!item) return;
      const models = (item.models || []).slice(0, 4).join(', ');
      response += `### ${i + 1}. ${item.title}\n`;
      response += `📄 ${item.desc.substring(0, 160)}${item.desc.length > 160 ? '...' : ''}\n\n`;
      if (models) response += `**Modelos:** ${models}${(item.models || []).length > 4 ? ` +${item.models.length - 4} mais` : ''}\n\n`;
    });

    if (fullItem && fullItem.highlights && fullItem.highlights.length) {
      response += '**Destaques:**\n';
      fullItem.highlights.slice(0, 3).forEach(h => { response += `- ${h}\n`; });
      response += '\n';
    }

    response += `📄 Acesse o material completo na **Biblioteca Técnica** para mais detalhes.`;
    return response;
  }

  /* ════════════════════════════════════════════
     CUSTOM RESPONSES
  ════════════════════════════════════════════ */

  function _getCustomResponse(query) {
    try {
      const customs = JSON.parse(localStorage.getItem(CUSTOM_RESP_KEY) || '[]');
      const qLower = query.toLowerCase();
      for (const c of customs) {
        try {
          if (new RegExp(c.pattern, 'i').test(query)) return c.response;
        } catch(_) {
          if (qLower.includes(c.pattern.toLowerCase())) return c.response;
        }
      }
    } catch(_) {}
    return null;
  }

  function addCustomResponse(pattern, response) {
    try {
      const customs = JSON.parse(localStorage.getItem(CUSTOM_RESP_KEY) || '[]');
      customs.push({ pattern, response, createdAt: Date.now() });
      localStorage.setItem(CUSTOM_RESP_KEY, JSON.stringify(customs));
      return true;
    } catch(_) { return false; }
  }

  /* ════════════════════════════════════════════
     ANALYTICS
  ════════════════════════════════════════════ */

  function _logAnalytics(query) {
    try {
      const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{"queries":[]}');
      analytics.queries.push({ query, timestamp: Date.now() });
      if (analytics.queries.length > 500) analytics.queries = analytics.queries.slice(-500);
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
    } catch(_) {}
  }

  function getChatAnalytics() {
    try {
      const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{"queries":[]}');
      const freq = {};
      analytics.queries.forEach(q => {
        const key = q.query.toLowerCase().substring(0, 50);
        freq[key] = (freq[key] || 0) + 1;
      });
      const popular = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([query, count]) => ({ query, count }));
      return {
        totalQueries: analytics.queries.length,
        popular,
        last24h: analytics.queries.filter(q => Date.now() - q.timestamp < 86400000).length,
        last7d: analytics.queries.filter(q => Date.now() - q.timestamp < 604800000).length,
      };
    } catch(_) { return { totalQueries: 0, popular: [], last24h: 0, last7d: 0 }; }
  }

  function updateKnowledgeBase() {
    return indexContent();
  }

  /* ════════════════════════════════════════════
     CHAT HISTORY
  ════════════════════════════════════════════ */

  function _saveHistory(messages) {
    try {
      const hist = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      const entry = { id: 'ch_' + Date.now(), messages, timestamp: Date.now() };
      hist.push(entry);
      if (hist.length > 50) hist.splice(0, hist.length - 50);
      localStorage.setItem(STORE_KEY, JSON.stringify(hist));
    } catch(_) {}
  }

  function _loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
  }

  /* ════════════════════════════════════════════
     MARKDOWN & CODE HIGHLIGHTING (lightweight)
  ════════════════════════════════════════════ */

  function _renderMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="chat-code-block"><code class="chat-lang">${lang || ''}</code>${code.trim()}</pre>`)
      .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
      .replace(/^### (.+)$/gm, '<h4 class="chat-h3">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="chat-h2">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="chat-h1">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="chat-li">$1</li>')
      .replace(/(<li class="chat-li">.*<\/li>\n?)+/g, m => `<ul class="chat-ul">${m}</ul>`)
      .replace(/^(\d+)\. (.+)$/gm, '<li class="chat-oli"><span class="chat-oli-num">$1.</span> $2</li>')
      .replace(/📄|📋|🔧|🎯|⚠️|😊|👋|🔗|📎/g, m => `<span class="chat-emoji">${m}</span>`)
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
    return html;
  }

  /* ════════════════════════════════════════════
     USER LEVEL HELPER
  ════════════════════════════════════════════ */

  function _getUserLevelLabel() {
    if (typeof AUTH === 'undefined') return 'atual';
    const session = AUTH.getSession();
    if (!session) return 'atual';
    const plan = AUTH.getUserPlan(session.userId);
    return (plan && plan.badge) || 'atual';
  }

  /* ════════════════════════════════════════════
     UI — WIDGET RENDERING
  ════════════════════════════════════════════ */

  function _createWidget() {
    if (document.getElementById('chatbotWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'chatbotWidget';
    widget.innerHTML = `
      <div class="chatbot-fab" id="chatFab" onclick="CHATBOT.toggle()">
        <svg class="chatbot-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="chatbot-fab-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span class="chatbot-fab-badge" id="chatFabBadge" style="display:none">1</span>
      </div>
      <div class="chatbot-window" id="chatWindow">
        <div class="chatbot-header">
          <div class="chatbot-header-left">
            <div class="chatbot-header-avatar">AP</div>
            <div>
              <div class="chatbot-header-title">Assistente ADAS PRO</div>
              <div class="chatbot-header-status"><span class="chatbot-status-dot"></span>Online</div>
            </div>
          </div>
          <button class="chatbot-header-close" onclick="CHATBOT.toggle()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="chatbot-messages" id="chatMessages"></div>
        <div class="chatbot-quick" id="chatQuick"></div>
        <div class="chatbot-input-area">
          <input class="chatbot-input" id="chatInput" type="text" placeholder="Pergunte sobre calibração, DTCs, targets..." maxlength="500" autocomplete="off"/>
          <button class="chatbot-send" id="chatSend" onclick="CHATBOT._onSend()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); CHATBOT._onSend(); }
    });

    _renderQuickQuestions();
    _addAssistantMessage(GREETING_RESPONSE, false);
  }

  function _renderQuickQuestions() {
    const container = document.getElementById('chatQuick');
    if (!container) return;
    container.innerHTML = QUICK_QUESTIONS.map(q =>
      `<button class="chatbot-quick-btn" onclick="CHATBOT.askQuick('${q.query.replace(/'/g, "\\'")}')">${q.label}</button>`
    ).join('');
  }

  function _addMessage(text, role, animate) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `chatbot-msg chatbot-msg-${role}`;
    div.innerHTML = `
      <div class="chatbot-msg-avatar">${role === 'user' ? 'Você' : 'AP'}</div>
      <div class="chatbot-msg-content">${role === 'assistant' ? _renderMarkdown(text) : _escapeHtml(text)}</div>
    `;
    container.appendChild(div);
    if (animate) div.classList.add('chatbot-msg-enter');
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function _addAssistantMessage(text, animate) {
    const msg = _addMessage(text, 'assistant', animate !== false);
    _showKnowledgeCards(text, msg);
    return msg;
  }

  function _showKnowledgeCards(text, container) {
    if (!container) return;
    const idMatch = text.match(/\*\*(.+?)\*\*/g);
    const cards = document.getElementById('chatMessages');

    const contentIds = ['honda-lkas', 'toyota-ldw', 'nissan-propilot', 'audi-lidar', 'subaru-type1', 'byd-avm', 'radar-univ'];
    contentIds.forEach(cid => {
      const item = (typeof AUTH !== 'undefined' ? AUTH.getContent() : []).find(c => c.id === cid);
      if (!item) return;
      if (text.includes(item.title)) {
        const card = document.createElement('div');
        card.className = 'chatbot-knowledge-card';
        card.innerHTML = `
          <div class="chatbot-kc-header">
            <span class="chatbot-kc-icon">${item.icon || '📄'}</span>
            <div>
              <div class="chatbot-kc-title">${item.title}</div>
              <div class="chatbot-kc-meta">${item.pages}p · ${item.fileSize} · ${item.version}</div>
            </div>
          </div>
          <div class="chatbot-kc-models">${(item.models || []).slice(0, 3).join(' · ')}${(item.models || []).length > 3 ? ' ...' : ''}</div>
        `;
        container.appendChild(card);
      }
    });
  }

  function _showTyping() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.id = 'chatTyping';
    div.className = 'chatbot-msg chatbot-msg-assistant';
    div.innerHTML = `
      <div class="chatbot-msg-avatar">AP</div>
      <div class="chatbot-msg-content">
        <div class="chatbot-typing">
          <span class="chatbot-typing-dot"></span>
          <span class="chatbot-typing-dot"></span>
          <span class="chatbot-typing-dot"></span>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function _hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  function _escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ════════════════════════════════════════════
     UI — EVENT HANDLERS
  ════════════════════════════════════════════ */

  function toggle() {
    _open = !_open;
    const window_ = document.getElementById('chatWindow');
    const fabIcon = document.querySelector('.chatbot-fab-icon');
    const fabClose = document.querySelector('.chatbot-fab-close');
    if (!window_) return;

    if (_open) {
      window_.classList.add('chatbot-window-open');
      if (fabIcon) fabIcon.style.display = 'none';
      if (fabClose) fabClose.style.display = 'block';
      const badge = document.getElementById('chatFabBadge');
      if (badge) badge.style.display = 'none';
      setTimeout(() => {
        const input = document.getElementById('chatInput');
        if (input) input.focus();
      }, 300);
    } else {
      window_.classList.remove('chatbot-window-open');
      if (fabIcon) fabIcon.style.display = 'block';
      if (fabClose) fabClose.style.display = 'none';
    }
  }

  function _onSend() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    _addMessage(msg, 'user', true);
    _hideQuickQuestions();

    _showTyping();
    _typingTimer = setTimeout(() => {
      _hideTyping();
      const response = sendMessage(msg);
      _addAssistantMessage(response, true);
    }, 600 + Math.random() * 800);
  }

  function askQuick(query) {
    const input = document.getElementById('chatInput');
    if (input) input.value = query;
    _onSend();
  }

  function _hideQuickQuestions() {
    const q = document.getElementById('chatQuick');
    if (q) q.style.display = 'none';
  }

  function _showQuickQuestions() {
    const q = document.getElementById('chatQuick');
    if (q) q.style.display = 'flex';
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */

  function init() {
    _createWidget();
    indexContent();
    console.info('[CHATBOT] v1.0 initialized ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init, toggle, askQuick,
    sendMessage, searchKnowledge, searchSimilar, getContext,
    indexContent, updateKnowledgeBase,
    addCustomResponse, getChatAnalytics,
    _onSend,
  };

})();
