/* login.html — page controller */

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('pendingCard').classList.remove('show');
  clearAlerts();
  if (tab === 'login') {
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('formLogin').classList.add('active');
  } else {
    document.getElementById('tabRegister').classList.add('active');
    document.getElementById('formRegister').classList.add('active');
  }
}

function showAlert(type, msg) {
  clearAlerts();
  const el = document.getElementById(type === 'error' ? 'alertError' : 'alertSuccess');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

function clearAlerts() {
  document.getElementById('alertError').classList.remove('show');
  document.getElementById('alertSuccess').classList.remove('show');
}

async function doLogin(e) {
  e.preventDefault();
  clearAlerts();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('btnLogin');

  btn.textContent = 'Verificando...';
  btn.disabled = true;

  try {
    const result = await AUTH.login(email, password);
    if (!result.ok) {
      if (result.msg === 'pending') {
        document.getElementById('formLogin').classList.remove('active');
        document.getElementById('pendingCard').classList.add('show');
      } else if (result.msg === 'mfa_required') {
        window.location.href = 'mfa-verify.html';
      } else {
        showAlert('error', result.msg);
      }
      return;
    }
    const role = result.session.role;
    if (role === 'superadmin') {
      window.location.href = 'superadmin.html';
    } else if (role === 'admin' || role === 'gestor') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'membros.html';
    }
  } catch(err) {
    showAlert('error', 'Erro inesperado. Tente novamente.');
    console.error('[login]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar na plataforma →';
  }
}

async function doResetPassword(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { showAlert('error', 'Digite seu e-mail no campo acima antes de solicitar a recuperação.'); return; }
  const btn = document.getElementById('btnLogin');
  const originalText = btn.textContent;
  btn.textContent = 'Enviando...'; btn.disabled = true;
  try {
    const result = await AUTH.resetPassword(email);
    if (result.ok) {
      showAlert('success', 'Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.');
    } else {
      showAlert('error', result.msg || 'Erro ao enviar email de recuperação.');
    }
  } catch(err) {
    showAlert('error', 'Erro inesperado. Tente novamente.');
  } finally {
    btn.disabled = false; btn.textContent = originalText;
  }
}

async function doRegister(e) {
  e.preventDefault();
  clearAlerts();
  const name      = document.getElementById('regName').value;
  const email     = document.getElementById('regEmail').value;
  const password  = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;
  const level     = document.getElementById('regLevel').value;
  const btn       = document.getElementById('btnRegister');

  if (password !== password2) { showAlert('error', 'As senhas não coincidem.'); return; }

  btn.textContent = 'Enviando...';
  btn.disabled = true;

  try {
    const result = await AUTH.register({ name, email, password, level });
    if (!result.ok) { showAlert('error', result.msg); return; }
    document.getElementById('formRegister').classList.remove('active');
    document.getElementById('tabRegister').classList.remove('active');
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('pendingCard').classList.add('show');
  } catch(err) {
    showAlert('error', 'Erro inesperado. Tente novamente.');
    console.error('[register]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Solicitar cadastro →';
  }
}

async function enterDemoMode(role) {
  const btn = document.querySelector(`[data-demo-role="${role}"]`);
  if (btn) { btn.textContent = 'Carregando demo...'; btn.disabled = true; }

  try {
    await AUTH.init();
    const result = await AUTH.enterDemoMode(role);
    if (result.ok) {
      const r = result.session.role;
      window.location.href = r === 'superadmin' ? 'superadmin.html'
        : (r === 'admin' || r === 'gestor') ? 'admin.html' : 'membros.html';
    } else {
      showAlert('error', 'Erro ao entrar no modo demo: ' + result.msg);
      if (btn) btn.disabled = false;
      if (btn) btn.textContent = role === 'admin' ? '🎯 Entrar como Admin — DEMO' : '👤 Entrar como Membro — DEMO';
    }
  } catch(err) {
    showAlert('error', 'Erro ao inicializar o sistema.');
    console.error('[demo]', err);
    if (btn) btn.disabled = false;
  }
}

// ── Initialization ──────────────────────────────────────────────────
try { history.replaceState({}, document.title, '/'); } catch(e) {}

AUTH.init().catch(err => console.warn('[ADAS PRO] init error:', err));

const _loginParams = new URLSearchParams(window.location.search);
if (_loginParams.get('tab') === 'register') switchTab('register');

if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.demoEnabled === true) {
  document.getElementById('demoSection').style.display = 'block';
}

// ── Event listeners ──────────────────────────────────────────────────
document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));
document.getElementById('formLogin').addEventListener('submit', doLogin);
document.getElementById('formRegister').addEventListener('submit', doRegister);
document.getElementById('linkForgotPassword').addEventListener('click', doResetPassword);
document.getElementById('linkSwitchToRegister').addEventListener('click', e => { e.preventDefault(); switchTab('register'); });
document.getElementById('linkSwitchToLogin').addEventListener('click', e => { e.preventDefault(); switchTab('login'); });

// Password toggle — delegated to handle all .toggle-password elements
document.addEventListener('click', e => {
  const toggle = e.target.closest('.toggle-password');
  if (!toggle) return;
  const input = toggle.closest('.input-wrap').querySelector('input');
  if (input.type === 'password') { input.type = 'text'; toggle.textContent = '🙈'; }
  else { input.type = 'password'; toggle.textContent = '👁'; }
});

// Demo buttons — delegated via data-demo-role attribute
document.addEventListener('click', e => {
  const demoBtn = e.target.closest('[data-demo-role]');
  if (demoBtn) enterDemoMode(demoBtn.dataset.demoRole);
});
