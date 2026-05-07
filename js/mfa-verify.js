/* mfa-verify.html — page controller */

const inputs = Array.from({length:6}, (_,i) => document.getElementById('d'+i));

inputs.forEach((inp, i) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g,'').slice(-1);
    inp.classList.toggle('filled', inp.value !== '');
    inp.classList.remove('error');
    if (inp.value && i < 5) inputs[i+1].focus();
    if (getCode().length === 6) verifyMFA();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !inp.value && i > 0) { inputs[i-1].focus(); inputs[i-1].value=''; inputs[i-1].classList.remove('filled'); }
    if (e.key === 'ArrowLeft'  && i > 0) inputs[i-1].focus();
    if (e.key === 'ArrowRight' && i < 5) inputs[i+1].focus();
  });
  inp.addEventListener('paste', e => {
    e.preventDefault();
    const paste = (e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);
    paste.split('').forEach((c,j) => {
      if (inputs[j]) { inputs[j].value=c; inputs[j].classList.add('filled'); }
    });
    if (paste.length === 6) setTimeout(verifyMFA, 80);
  });
});

function getCode() { return inputs.map(i => i.value).join(''); }

function showAlert(type, msg) {
  ['alertError','alertSuccess'].forEach(id => document.getElementById(id).classList.remove('show'));
  const el = document.getElementById(type === 'error' ? 'alertError' : 'alertSuccess');
  el.textContent = msg; el.classList.add('show');
}

function setError(msg) {
  showAlert('error', msg);
  inputs.forEach(i => i.classList.add('error'));
  setTimeout(() => inputs.forEach(i => i.classList.remove('error')), 600);
  inputs[0].focus(); inputs.forEach(i => { i.value=''; i.classList.remove('filled'); });
}

function startTimer() {
  const timerEl  = document.getElementById('otpTimer');
  const timerVal = document.getElementById('timerVal');
  function tick() {
    const s = 30 - (Math.floor(Date.now() / 1000) % 30);
    timerVal.textContent = s + 's';
    timerEl.className = 'otp-timer' + (s <= 5 ? ' warn' : '');
  }
  tick();
  setInterval(tick, 1000);
}

async function verifyMFA() {
  const code = getCode();
  if (code.length < 6) { showAlert('error','Digite os 6 dígitos.'); return; }

  const btn = document.getElementById('btnVerify');
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Verificando...';
  btn.disabled = true;

  try {
    await AUTH.init();
    const result = await AUTH.verifyMFA(code);
    if (!result.ok) { setError(result.msg); return; }

    try { sessionStorage.removeItem('adaspro_mfa_uid'); } catch(_) {}
    showAlert('success', 'Identidade verificada. Redirecionando...');
    const role = result.session?.role || result.user?.role;
    setTimeout(() => {
      window.location.href = role === 'superadmin' ? 'superadmin.html'
        : (role === 'admin' || role === 'gestor') ? 'admin.html'
        : 'membros.html';
    }, 700);
  } catch(e) {
    setError('Erro ao verificar. Tente novamente.');
  } finally {
    if (document.getElementById('btnVerify').disabled) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verificar e entrar';
    }
  }
}

function requestHelp(e) {
  e.preventDefault();
  showAlert('error','Para recuperar o acesso ao autenticador, entre em contato pelo WhatsApp ou envie um e-mail para o administrador.');
}

// ── Event listeners ──────────────────────────────────────────────────
document.getElementById('btnVerify').addEventListener('click', verifyMFA);
document.getElementById('linkMfaHelp').addEventListener('click', requestHelp);

// ── Initialization ──────────────────────────────────────────────────
AUTH.init().then(async () => {
  const hasPendingUid = !!(function(){ try { return sessionStorage.getItem('adaspro_mfa_uid'); } catch(_){ return null; } })();
  if (!hasPendingUid) { window.location.href = 'login.html'; return; }

  const aal = await AUTH.getMfaLevel();
  if (aal) {
    if (aal.currentLevel === 'aal2') {
      const s = AUTH.getSession();
      const r = s?.role || 'membro';
      window.location.href = r === 'superadmin' ? 'superadmin.html' : r === 'admin' ? 'admin.html' : 'membros.html';
      return;
    }
    if (aal.currentLevel !== 'aal1') {
      window.location.href = 'login.html'; return;
    }
  }

  inputs[0].focus();
  startTimer();
}).catch(() => { window.location.href = 'login.html'; });
