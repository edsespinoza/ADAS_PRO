/* reset-password.html — page controller */

function setState(id) {
  ['stateLoading','stateInvalid','stateForm','stateSuccess'].forEach(s => {
    document.getElementById(s).style.display = s === id ? 'block' : 'none';
  });
}

function showAlert(type, msg) {
  document.getElementById('alertError').classList.remove('show');
  document.getElementById('alertSuccess').classList.remove('show');
  const el = document.getElementById(type === 'error' ? 'alertError' : 'alertSuccess');
  el.textContent = msg; el.classList.add('show');
}

function toggleEye(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  const show  = input.type === 'password';
  input.type  = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

const STRENGTH_LABELS = ['Muito fraca','Fraca','Razoável','Boa','Forte','Excelente'];
const STRENGTH_COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#10b981'];

function checkStrength(val) {
  let score = 0;
  if (val.length >= 8)              score++;
  if (val.length >= 12)             score++;
  if (/[A-Z]/.test(val))            score++;
  if (/[0-9]/.test(val))            score++;
  if (/[^A-Za-z0-9]/.test(val))     score++;
  const pct   = Math.round((score / 5) * 100);
  const color = STRENGTH_COLORS[score] || STRENGTH_COLORS[0];
  document.getElementById('strengthFill').style.width      = pct + '%';
  document.getElementById('strengthFill').style.background = color;
  document.getElementById('strengthLabel').textContent     = val ? STRENGTH_LABELS[score] || 'Excelente' : 'Digite a nova senha';
  document.getElementById('strengthLabel').style.color     = val ? color : 'rgba(255,255,255,.3)';
}

async function doUpdatePassword(e) {
  e.preventDefault();
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  if (newPass !== confirm) { showAlert('error', 'As senhas não coincidem.'); return; }
  if (newPass.length < 8)  { showAlert('error', 'A senha deve ter no mínimo 8 caracteres.'); return; }

  const btn = document.getElementById('btnUpdate');
  btn.textContent = 'Salvando...'; btn.disabled = true;

  try {
    const result = await AUTH.updatePassword(newPass);
    if (!result.ok) { showAlert('error', result.msg); return; }
    setState('stateSuccess');
  } catch(err) {
    showAlert('error', 'Erro inesperado. Tente novamente.');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar nova senha →';
  }
}

// ── Event listeners ──────────────────────────────────────────────────
document.getElementById('formResetPassword').addEventListener('submit', doUpdatePassword);
document.getElementById('eye1').addEventListener('click', () => toggleEye('newPassword', 'eye1'));
document.getElementById('eye2').addEventListener('click', () => toggleEye('confirmPassword', 'eye2'));
document.getElementById('newPassword').addEventListener('input', function() { checkStrength(this.value); });

// ── Recovery token detection ──────────────────────────────────────────
let _recoveryDetected = false;

AUTH.init().then(() => {
  AUTH.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' && !_recoveryDetected) {
      _recoveryDetected = true;
      history.replaceState({}, document.title, '/reset-password');
      setState('stateForm');
      setTimeout(() => document.getElementById('newPassword').focus(), 100);
    }
  });

  const hash   = window.location.hash;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const type   = params.get('type');
  const token  = params.get('access_token');
  if (type === 'recovery' && token && !_recoveryDetected) {
    _recoveryDetected = true;
    history.replaceState({}, document.title, '/reset-password');
    setState('stateForm');
    setTimeout(() => document.getElementById('newPassword').focus(), 100);
    return;
  }

  setTimeout(() => {
    if (!_recoveryDetected) setState('stateInvalid');
  }, 3000);

}).catch(() => setState('stateInvalid'));
