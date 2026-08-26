/* ================================================
   ADAS PRO — WhatsApp Business Integration
   ================================================
   Empresa:     AutoTech Service
   Produto:     ADAS PRO Platform
   Versão:      1.0.0  build 20260825
   Copyright:   © 2024-2026 AutoTech Service
   ================================================ */

const WHATSAPP = (function () {

  /* ─── Defaults ─── */
  const DEFAULT_PHONE = '5511947591115';
  const BUSINESS_HOURS = { start: 9, end: 18 }; /* 09:00–18:00 BRT */
  const STORE_KEY = 'adaspro_whatsapp_config';

  /* ─── Config ─── */
  let _config = {
    enabled: true,
    phone: DEFAULT_PHONE,
    businessHoursEnabled: true,
    afterHoursMessage: 'Olá! Nosso horário de atendimento é de segunda a sexta, das 09h às 18h. Retornaremos assim que possível.',
    notifyOnNewTicket: true,
    notifyOnTicketReply: true,
    notifyOnCertification: true,
  };

  /* ─── Load persisted config ─── */
  function _loadConfig() {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) _config = { ..._config, ...JSON.parse(saved) };
    } catch { /* use defaults */ }
  }
  function _saveConfig() { localStorage.setItem(STORE_KEY, JSON.stringify(_config)); }

  /* ════════════════════════════════════════════
     LINK GENERATOR
  ════════════════════════════════════════════ */

  function _getPhone() {
    /* Prefer settings from AUTH, fallback to config, fallback to default */
    try {
      if (typeof AUTH !== 'undefined') {
        const s = AUTH.getSettings();
        if (s && s.general && s.general.whatsapp) return s.general.whatsapp.replace(/\D/g, '');
      }
    } catch { /* fallback */ }
    return _config.phone.replace(/\D/g, '');
  }

  function generateLink(phone, message) {
    const p = (phone || _getPhone()).replace(/\D/g, '');
    const base = `https://wa.me/${p}`;
    if (message) return `${base}?text=${encodeURIComponent(message)}`;
    return base;
  }

  function generateSupportLink(issue) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    const userName = session ? session.name : 'Usuário';
    const defaultMsg = `Olá! Preciso de suporte técnico.\n\n${issue ? 'Assunto: ' + issue + '\n\n' : ''}Usuário: ${userName}\nPlataforma: ADAS PRO`;
    return generateLink(null, defaultMsg);
  }

  function generateShareLink(content) {
    if (!content) return generateLink();
    const text = `Confira no ADAS PRO: ${content.title}\n\n${content.description || ''}`;
    return generateLink(null, text);
  }

  /* ════════════════════════════════════════════
     BUSINESS HOURS
  ════════════════════════════════════════════ */

  function _isBusinessHours() {
    if (!_config.businessHoursEnabled) return true;
    const now = new Date();
    /* Convert to BRT (UTC-3) */
    const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = brt.getHours();
    const day = brt.getDay();
    /* Monday–Friday, 09:00–18:00 */
    return day >= 1 && day <= 5 && hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end;
  }

  function getBusinessStatus() {
    const open = _isBusinessHours();
    return {
      isOpen: open,
      hours: `${BUSINESS_HOURS.start}:00–${BUSINESS_HOURS.end}:00`,
      message: open
        ? 'Estamos online! Fale conosco pelo WhatsApp.'
        : _config.afterHoursMessage,
    };
  }

  /* ════════════════════════════════════════════
     NOTIFICATIONS
  ════════════════════════════════════════════ */

  function _shouldNotify(type) {
    if (!_config.enabled) return false;
    if (type === 'new_ticket')     return _config.notifyOnNewTicket;
    if (type === 'ticket_reply')   return _config.notifyOnTicketReply;
    if (type === 'certification')  return _config.notifyOnCertification;
    return false;
  }

  function sendNotification(type, data) {
    if (!_shouldNotify(type)) return { ok: false, skipped: true, reason: 'disabled' };

    const phone = _getPhone();
    let message = '';

    switch (type) {
      case 'new_ticket':
        message = `🎟️ *Novo ticket aberto*\n\n*Título:* ${data.title || 'Sem título'}\n*Usuário:* ${data.userName || 'N/A'}\n*Prioridade:* ${data.priority || 'medium'}\n*Categoria:* ${data.category || 'N/A'}\n\nAcesse o painel para responder.`;
        break;
      case 'ticket_reply':
        message = `💬 *Nova resposta no ticket*\n\n*Ticket:* ${data.ticketId || 'N/A'}\n*Título:* ${data.title || ''}\n*De:* ${data.authorName || 'N/A'}\n\n*Acesse o painel para ver a resposta.*`;
        break;
      case 'certification':
        message = `🏆 *Parabéns!*\n\nVocê earned o badge: *${data.badge || 'Certificação'}*\n\nContinue assim! Acesse sua área de membros para ver seusachievements.`;
        break;
      default:
        message = data.message || `Notificação ADAS PRO: ${type}`;
    }

    /* Store notification for toast display */
    _showToast(message, type);

    /* Open WhatsApp link for admin notification */
    const link = generateLink(phone, message);
    return { ok: true, link, message };
  }

  function openWhatsAppNotification(type, data) {
    if (!_shouldNotify(type)) return;
    const result = sendNotification(type, data);
    if (result.ok && result.link) {
      window.open(result.link, '_blank');
    }
    return result;
  }

  /* ════════════════════════════════════════════
     TOAST NOTIFICATIONS
  ════════════════════════════════════════════ */

  function _showToast(message, type) {
    const container = _getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'wa-toast';
    toast.setAttribute('data-type', type || 'info');

    const icon = _getToastIcon(type);
    const shortMsg = message.split('\n')[0].replace(/[*_]/g, '');

    toast.innerHTML = `
      <div class="wa-toast-icon">${icon}</div>
      <div class="wa-toast-body">
        <div class="wa-toast-title">${_getToastTitle(type)}</div>
        <div class="wa-toast-msg">${shortMsg}</div>
      </div>
      <button class="wa-toast-close" aria-label="Fechar">&times;</button>
    `;

    toast.querySelector('.wa-toast-close').addEventListener('click', () => {
      toast.classList.add('wa-toast-out');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('wa-toast-in');
    }, 10);

    /* Auto-remove after 6s */
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('wa-toast-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 6000);
  }

  function _getToastContainer() {
    let c = document.getElementById('wa-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'wa-toast-container';
      c.className = 'wa-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function _getToastIcon(type) {
    switch (type) {
      case 'new_ticket':     return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>';
      case 'ticket_reply':   return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
      case 'certification':  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
      default:               return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }
  }

  function _getToastTitle(type) {
    switch (type) {
      case 'new_ticket':     return 'Novo Ticket';
      case 'ticket_reply':   return 'Resposta no Ticket';
      case 'certification':  return 'Certificação';
      default:               return 'Notificação';
    }
  }

  /* ════════════════════════════════════════════
     FLOATING BUTTON
  ════════════════════════════════════════════ */

  let _floatBtn = null;

  function initFloatingButton() {
    if (_floatBtn || !_config.enabled) return;

    const btn = document.createElement('a');
    btn.id = 'wa-float-btn';
    btn.className = 'wa-float-btn';
    btn.href = generateSupportLink();
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Fale conosco pelo WhatsApp');
    btn.title = 'Fale conosco pelo WhatsApp';

    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    `;

    /* Status indicator */
    const status = document.createElement('div');
    status.className = 'wa-float-status';
    const busStatus = getBusinessStatus();
    status.innerHTML = busStatus.isOpen
      ? '<span class="wa-status-dot online"></span> Online'
      : '<span class="wa-status-dot offline"></span> Offline';
    btn.appendChild(status);

    document.body.appendChild(btn);
    _floatBtn = btn;

    /* Click handler — update link dynamically */
    btn.addEventListener('click', function (e) {
      const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
      const userName = session ? session.name : 'Usuário';
      const msg = busStatus.isOpen
        ? `Olá! Preciso de suporte técnico.\n\nUsuário: ${userName}\nPlataforma: ADAS PRO`
        : _config.afterHoursMessage + `\n\nUsuário: ${userName}`;
      btn.href = generateLink(null, msg);
    });
  }

  function removeFloatingButton() {
    if (_floatBtn) { _floatBtn.remove(); _floatBtn = null; }
  }

  /* ════════════════════════════════════════════
     QUICK ACTIONS PANEL
  ════════════════════════════════════════════ */

  let _quickPanel = null;

  function initQuickActions() {
    if (_quickPanel || !_config.enabled) return;

    const panel = document.createElement('div');
    panel.id = 'wa-quick-panel';
    panel.className = 'wa-quick-panel';
    panel.innerHTML = `
      <div class="wa-quick-header">
        <span class="wa-quick-title">WhatsApp Rápido</span>
        <button class="wa-quick-close" aria-label="Fechar">&times;</button>
      </div>
      <div class="wa-quick-actions">
        <a class="wa-quick-action" href="${generateSupportLink('Dúvida técnica')}" target="_blank" rel="noopener">
          <div class="wa-quick-action-icon tech">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div class="wa-quick-action-info">
            <span class="wa-quick-action-label">Suporte Técnico</span>
            <span class="wa-quick-action-desc">Dúvidas sobre calibração ADAS</span>
          </div>
        </a>
        <a class="wa-quick-action" href="${generateSupportLink('Solicitação de plano')}" target="_blank" rel="noopener">
          <div class="wa-quick-action-icon accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
          </div>
          <div class="wa-quick-action-info">
            <span class="wa-quick-action-label">Planos & Assinatura</span>
            <span class="wa-quick-action-desc">Upgrade, pagamento, boleto</span>
          </div>
        </a>
        <a class="wa-quick-action" href="${generateSupportLink('Bug ou problema')}" target="_blank" rel="noopener">
          <div class="wa-quick-action-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div class="wa-quick-action-info">
            <span class="wa-quick-action-label">Reportar Problema</span>
            <span class="wa-quick-action-desc">Bug, erro, conteúdo indisponível</span>
          </div>
        </a>
        <a class="wa-quick-action" href="${generateSupportLink('Sugestão de conteúdo')}" target="_blank" rel="noopener">
          <div class="wa-quick-action-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div class="wa-quick-action-info">
            <span class="wa-quick-action-label">Sugestão</span>
            <span class="wa-quick-action-desc">Novo conteúdo, melhoria, ideia</span>
          </div>
        </a>
      </div>
    `;

    panel.querySelector('.wa-quick-close').addEventListener('click', () => {
      panel.classList.remove('wa-quick-open');
    });

    document.body.appendChild(panel);
    _quickPanel = panel;
  }

  function toggleQuickActions() {
    if (!_quickPanel) initQuickActions();
    if (_quickPanel) _quickPanel.classList.toggle('wa-quick-open');
  }

  /* ════════════════════════════════════════════
     TICKET SYSTEM INTEGRATION
  ════════════════════════════════════════════ */

  function onTicketCreated(ticketData) {
    if (!_config.enabled || !_config.notifyOnNewTicket) return;
    sendNotification('new_ticket', ticketData);
  }

  function onTicketReply(ticketData) {
    if (!_config.enabled || !_config.notifyOnTicketReply) return;
    sendNotification('ticket_reply', ticketData);
  }

  function onCertificationEarned(data) {
    if (!_config.enabled || !_config.notifyOnCertification) return;
    sendNotification('certification', data);
  }

  /* ════════════════════════════════════════════
     CONFIG
  ════════════════════════════════════════════ */

  function getConfig() { return { ..._config }; }

  function updateConfig(updates) {
    _config = { ..._config, ...updates };
    _saveConfig();
    return { ok: true };
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */

  function init() {
    _loadConfig();
    initFloatingButton();
    initQuickActions();
  }

  /* Auto-init on DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─── Public API ─── */
  return {
    init, generateLink, generateSupportLink, generateShareLink,
    sendNotification, openWhatsAppNotification,
    getBusinessStatus, initFloatingButton, removeFloatingButton,
    initQuickActions, toggleQuickActions,
    onTicketCreated, onTicketReply, onCertificationEarned,
    getConfig, updateConfig,
  };
})();
