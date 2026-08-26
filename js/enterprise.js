/* ================================================
   ADAS PRO — Enterprise Multi-User System
   ================================================
   Versão:   1.0.0  build 20260825
   Modos:    Supabase + localStorage (offline)
   Copyright: © 2024-2026 AutoTech Service
   ================================================ */

const ENTERPRISE = (function () {

  const STORE_KEY = 'adaspro_enterprise';
  const INVITE_KEY = 'adaspro_enterprise_invites';
  const ACTIVITY_KEY = 'adaspro_enterprise_activity';

  const ENTERPRISE_ROLES = { owner: 4, admin: 3, member: 1 };
  const VALID_INDUSTRY = ['oficina', 'concessionaria', 'independente', 'treinamento', 'outro'];

  /* ════════════════════════════════════════════
     ESTADO INTERNO
  ════════════════════════════════════════════ */
  let _account = null;
  let _members = [];
  let _invites = [];
  let _activity = [];
  let _ready = false;

  /* ════════════════════════════════════════════
     SUPABASE OPERATIONS
  ════════════════════════════════════════════ */
  function _sb() {
    return (typeof AUTH !== 'undefined' && AUTH.isOfflineMode && !AUTH.isOfflineMode())
      ? (typeof supabase !== 'undefined' ? supabase : null) : null;
  }

  async function _sbLoadAccount(ownerId) {
    const client = _sb();
    if (!client) return null;
    try {
      const { data, error } = await client.from('enterprise_accounts').select('*').eq('owner_id', ownerId).single();
      if (!error && data) return data;
    } catch (e) { console.warn('[ENTERPRISE] _sbLoadAccount:', e.message); }
    return null;
  }

  async function _sbLoadMembers(accountId) {
    const client = _sb();
    if (!client) return [];
    try {
      const { data, error } = await client.from('enterprise_members').select('*').eq('account_id', accountId);
      if (!error && data) return data;
    } catch (e) { console.warn('[ENTERPRISE] _sbLoadMembers:', e.message); }
    return [];
  }

  async function _sbUpsertAccount(account) {
    const client = _sb();
    if (!client) { _saveLocal(); return; }
    try {
      await client.from('enterprise_accounts').upsert(account);
    } catch (e) { console.error('[ENTERPRISE] _sbUpsertAccount:', e.message); }
  }

  async function _sbUpsertMember(member) {
    const client = _sb();
    if (!client) { _saveLocal(); return; }
    try {
      await client.from('enterprise_members').upsert(member);
    } catch (e) { console.error('[ENTERPRISE] _sbUpsertMember:', e.message); }
  }

  async function _sbDeleteMember(memberId) {
    const client = _sb();
    if (!client) { _saveLocal(); return; }
    try {
      await client.from('enterprise_members').delete().eq('id', memberId);
    } catch (e) { console.error('[ENTERPRISE] _sbDeleteMember:', e.message); }
  }

  async function _sbLogActivity(entry) {
    const client = _sb();
    if (!client) { _activity.push(entry); _saveLocal(); return; }
    try {
      await client.from('enterprise_activity').insert(entry);
    } catch (e) { console.error('[ENTERPRISE] _sbLogActivity:', e.message); }
  }

  /* ════════════════════════════════════════════
     LOCAL STORAGE
  ════════════════════════════════════════════ */
  function _saveLocal() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ account: _account, members: _members, activity: _activity }));
      localStorage.setItem(INVITE_KEY, JSON.stringify(_invites));
    } catch (e) { console.warn('[ENTERPRISE] _saveLocal:', e.message); }
  }

  function _loadLocal() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        _account = d.account || null;
        _members = d.members || [];
        _activity = d.activity || [];
      }
    } catch (e) { _account = null; _members = []; _activity = []; }
    try {
      const raw = localStorage.getItem(INVITE_KEY);
      if (raw) _invites = JSON.parse(raw);
    } catch (e) { _invites = []; }
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  async function init() {
    if (_ready) return;
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session) return;

    const client = _sb();
    if (client) {
      const remote = await _sbLoadAccount(session.userId);
      if (remote) {
        _account = remote;
        _members = await _sbLoadMembers(remote.id);
        _ready = true;
        return;
      }
    }

    _loadLocal();
    if (_account && _account.owner_id === session.userId) { _ready = true; }
    else { _account = null; _members = []; _ready = true; }
  }

  /* ════════════════════════════════════════════
     AUTHORIZATION HELPERS
  ════════════════════════════════════════════ */
  function _getMemberRole(userId) {
    if (!_account) return null;
    if (_account.owner_id === userId) return 'owner';
    const m = _members.find(x => x.user_id === userId);
    return m ? m.role : null;
  }

  function _isAtLeast(userId, minRole) {
    const r = _getMemberRole(userId);
    if (!r) return false;
    return (ENTERPRISE_ROLES[r] || 0) >= (ENTERPRISE_ROLES[minRole] || 0);
  }

  function _logActivity(action, userId, details) {
    const entry = {
      id: 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      account_id: _account ? _account.id : null,
      action,
      user_id: userId,
      details: details || {},
      created_at: new Date().toISOString(),
    };
    _activity.unshift(entry);
    if (_activity.length > 500) _activity = _activity.slice(0, 500);
    _sbLogActivity(entry);
  }

  /* ════════════════════════════════════════════
     PUBLIC API — ACCOUNT
  ════════════════════════════════════════════ */
  function createEnterpriseAccount(data) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session) return { ok: false, msg: 'Sessão inválida.' };
    if (_account) return { ok: false, msg: 'Conta enterprise já existe.' };

    const { name, cnpj, industry, size, plan, billingEmail } = data || {};
    if (!name || !name.trim()) return { ok: false, msg: 'Nome da empresa é obrigatório.' };
    if (industry && !VALID_INDUSTRY.includes(industry)) return { ok: false, msg: 'Indústria inválida.' };

    const validSizes = ['micro', 'pequena', 'media', 'grande'];
    const safeSize = validSizes.includes(size) ? size : 'pequena';

    const seatLimits = { micro: 5, pequena: 15, media: 50, grande: 200 };

    _account = {
      id: 'ent_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      owner_id: session.userId,
      name: name.trim(),
      cnpj: cnpj || null,
      industry: industry || 'outro',
      size: safeSize,
      plan: plan || 'pro',
      max_seats: seatLimits[safeSize] || 15,
      used_seats: 1,
      billing_email: billingEmail || session.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ownerMember = {
      id: 'mem_' + Date.now().toString(36) + '_owner',
      account_id: _account.id,
      user_id: session.userId,
      email: session.email,
      name: session.name || '',
      role: 'owner',
      invited_by: null,
      joined_at: new Date().toISOString(),
      downloads: 0,
      last_active: new Date().toISOString(),
    };

    _members = [ownerMember];
    _logActivity('account_created', session.userId, { name: _account.name });

    _sbUpsertAccount(_account);
    _sbUpsertMember(ownerMember);
    _saveLocal();

    return { ok: true, account: _account };
  }

  function getAccount() {
    return _account ? { ..._account } : null;
  }

  function updateAccount(data) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'owner')) return { ok: false, msg: 'Apenas o proprietário pode alterar dados da empresa.' };

    const allowed = ['name', 'cnpj', 'industry', 'size', 'plan', 'billing_email'];
    for (const key of allowed) {
      if (data[key] !== undefined) _account[key] = data[key];
    }
    _account.updated_at = new Date().toISOString();

    _logActivity('account_updated', session.userId, { changes: Object.keys(data) });
    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true, account: _account };
  }

  /* ════════════════════════════════════════════
     PUBLIC API — MEMBERS
  ════════════════════════════════════════════ */
  function inviteMember(email, role) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'admin')) return { ok: false, msg: 'Sem permissão para convidar membros.' };

    if (!email || !email.trim()) return { ok: false, msg: 'E-mail obrigatório.' };
    const cleanEmail = email.trim().toLowerCase();

    const validInviteRoles = ['admin', 'member'];
    const safeRole = validInviteRoles.includes(role) ? role : 'member';

    if (_members.length >= _account.max_seats) return { ok: false, msg: 'Limite de seats atingido. Atualize o plano.' };

    const existing = _members.find(m => m.email === cleanEmail);
    if (existing) return { ok: false, msg: 'E-mail já é membro da equipe.' };

    const pendingInvite = _invites.find(i => i.email === cleanEmail && !i.accepted);
    if (pendingInvite) return { ok: false, msg: 'Convite pendente para este e-mail.' };

    const invite = {
      id: 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      account_id: _account.id,
      email: cleanEmail,
      role: safeRole,
      invited_by: session.userId,
      invited_by_name: session.name || session.email,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted: false,
    };

    _invites.push(invite);
    _logActivity('member_invited', session.userId, { email: cleanEmail, role: safeRole });

    _saveLocal();
    return { ok: true, invite };
  }

  function acceptInvite(inviteId, userId) {
    const invite = _invites.find(i => i.id === inviteId);
    if (!invite) return { ok: false, msg: 'Convite não encontrado.' };
    if (invite.accepted) return { ok: false, msg: 'Convite já utilizado.' };
    if (new Date(invite.expires_at) < new Date()) return { ok: false, msg: 'Convite expirado.' };

    if (!_account || _account.id !== invite.account_id) return { ok: false, msg: 'Conta enterprise incompatível.' };
    if (_members.length >= _account.max_seats) return { ok: false, msg: 'Limite de seats atingido.' };

    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    const userEmail = (session && session.userId === userId) ? session.email : invite.email;

    const member = {
      id: 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      account_id: _account.id,
      user_id: userId,
      email: userEmail,
      name: '',
      role: invite.role,
      invited_by: invite.invited_by,
      joined_at: new Date().toISOString(),
      downloads: 0,
      last_active: new Date().toISOString(),
    };

    _members.push(member);
    invite.accepted = true;
    _account.used_seats = _members.length;
    _account.updated_at = new Date().toISOString();

    _logActivity('member_joined', userId, { email: userEmail, role: invite.role });

    _sbUpsertMember(member);
    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true, member };
  }

  function removeMember(userId) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'admin')) return { ok: false, msg: 'Sem permissão.' };

    const targetMember = _members.find(m => m.user_id === userId);
    if (!targetMember) return { ok: false, msg: 'Membro não encontrado.' };
    if (targetMember.role === 'owner') return { ok: false, msg: 'Não é possível remover o proprietário.' };

    if (_getMemberRole(session.userId) === 'admin' && targetMember.role === 'admin') {
      return { ok: false, msg: 'Admins não podem remover outros admins.' };
    }

    _members = _members.filter(m => m.user_id !== userId);
    _account.used_seats = _members.length;
    _account.updated_at = new Date().toISOString();

    _logActivity('member_removed', session.userId, { removed_user: userId });

    _sbDeleteMember(targetMember.id);
    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true };
  }

  function getTeamMembers() {
    return _members.map(m => ({ ...m }));
  }

  function updateMemberRole(userId, newRole) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'owner')) return { ok: false, msg: 'Apenas o proprietário pode alterar roles.' };

    const target = _members.find(m => m.user_id === userId);
    if (!target) return { ok: false, msg: 'Membro não encontrado.' };
    if (target.role === 'owner') return { ok: false, msg: 'Role do proprietário não pode ser alterada.' };

    const validRoles = ['admin', 'member'];
    const safeRole = validRoles.includes(newRole) ? newRole : 'member';

    target.role = safeRole;
    _account.updated_at = new Date().toISOString();

    _logActivity('member_role_changed', session.userId, { target_user: userId, new_role: safeRole });

    _sbUpsertMember(target);
    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true };
  }

  function getPendingInvites() {
    return _invites.filter(i => !i.accepted && new Date(i.expires_at) > new Date());
  }

  function cancelInvite(inviteId) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'admin')) return { ok: false, msg: 'Sem permissão.' };

    const idx = _invites.findIndex(i => i.id === inviteId && !i.accepted);
    if (idx < 0) return { ok: false, msg: 'Convite não encontrado.' };

    _invites.splice(idx, 1);
    _logActivity('invite_cancelled', session.userId, { invite_id: inviteId });
    _saveLocal();
    return { ok: true };
  }

  /* ════════════════════════════════════════════
     PUBLIC API — SEATS & BILLING
  ════════════════════════════════════════════ */
  function updateSeatCount(maxSeats) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (!_isAtLeast(session.userId, 'owner')) return { ok: false, msg: 'Apenas o proprietário pode alterar seats.' };

    const n = parseInt(maxSeats, 10);
    if (isNaN(n) || n < 1) return { ok: false, msg: 'Número inválido.' };

    _account.max_seats = n;
    _account.updated_at = new Date().toISOString();

    _logActivity('seats_updated', session.userId, { max_seats: n });

    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true, max_seats: n };
  }

  function getCompanyBilling() {
    if (!_account) return null;
    return {
      account_id: _account.id,
      company_name: _account.name,
      cnpj: _account.cnpj,
      plan: _account.plan,
      billing_email: _account.billing_email,
      max_seats: _account.max_seats,
      used_seats: _account.used_seats,
      industry: _account.industry,
      size: _account.size,
    };
  }

  /* ════════════════════════════════════════════
     PUBLIC API — OWNERSHIP TRANSFER
  ════════════════════════════════════════════ */
  function transferOwnership(newOwnerId) {
    const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
    if (!session || !_account) return { ok: false, msg: 'Sem conta enterprise.' };
    if (session.userId !== _account.owner_id) return { ok: false, msg: 'Apenas o proprietário pode transferir a propriedade.' };
    if (session.userId === newOwnerId) return { ok: false, msg: 'O novo proprietário deve ser outro membro.' };

    const newOwner = _members.find(m => m.user_id === newOwnerId);
    if (!newOwner) return { ok: false, msg: 'Novo proprietário deve ser membro da equipe.' };

    const oldOwnerId = _account.owner_id;

    _members = _members.map(m => {
      if (m.user_id === oldOwnerId) return { ...m, role: 'admin' };
      if (m.user_id === newOwnerId) return { ...m, role: 'owner' };
      return m;
    });

    _account.owner_id = newOwnerId;
    _account.updated_at = new Date().toISOString();

    _logActivity('ownership_transferred', session.userId, { from: oldOwnerId, to: newOwnerId });

    _members.forEach(m => _sbUpsertMember(m));
    _sbUpsertAccount(_account);
    _saveLocal();
    return { ok: true };
  }

  /* ════════════════════════════════════════════
     PUBLIC API — ANALYTICS
  ════════════════════════════════════════════ */
  function getTeamStats() {
    if (!_account) return null;

    const totalDownloads = _members.reduce((sum, m) => sum + (m.downloads || 0), 0);
    const activeMembers = _members.filter(m => {
      if (!m.last_active) return false;
      return (Date.now() - new Date(m.last_active).getTime()) < 30 * 24 * 60 * 60 * 1000;
    }).length;

    const roleBreakdown = { owner: 0, admin: 0, member: 0 };
    _members.forEach(m => { if (roleBreakdown[m.role] !== undefined) roleBreakdown[m.role]++; });

    return {
      total_members: _members.length,
      max_seats: _account.max_seats,
      seats_available: _account.max_seats - _members.length,
      active_last_30d: activeMembers,
      total_downloads: totalDownloads,
      role_breakdown: roleBreakdown,
      avg_downloads_per_member: _members.length ? (totalDownloads / _members.length).toFixed(1) : '0',
      activity_count: _activity.length,
    };
  }

  function getActivityLog(limit) {
    const n = parseInt(limit, 10) || 50;
    return _activity.slice(0, n);
  }

  function trackMemberDownload(userId) {
    const member = _members.find(m => m.user_id === userId);
    if (!member) return;
    member.downloads = (member.downloads || 0) + 1;
    member.last_active = new Date().toISOString();
    _sbUpsertMember(member);
    _saveLocal();
  }

  /* ════════════════════════════════════════════
     EXPORT
  ════════════════════════════════════════════ */
  return {
    init,
    ENTERPRISE_ROLES,
    VALID_INDUSTRY,

    createEnterpriseAccount,
    getAccount,
    updateAccount,

    inviteMember,
    acceptInvite,
    cancelInvite,
    removeMember,
    getTeamMembers,
    updateMemberRole,
    getPendingInvites,

    updateSeatCount,
    getCompanyBilling,

    transferOwnership,

    getTeamStats,
    getActivityLog,
    trackMemberDownload,

    _isAtLeast,
    _getMemberRole,
  };
})();
