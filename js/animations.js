/* ================================================
   ADAS PRO — Animações da Landing Page
   ================================================ */

/* ─── Typing Effect ─── */
function typeWriter(elementId, texts, speed = 60, pause = 2000) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let textIdx = 0, charIdx = 0, deleting = false;

  function type() {
    const current = texts[textIdx];
    if (!deleting) {
      el.textContent = current.slice(0, ++charIdx);
      if (charIdx === current.length) {
        deleting = true;
        setTimeout(type, pause);
        return;
      }
    } else {
      el.textContent = current.slice(0, --charIdx);
      if (charIdx === 0) {
        deleting = false;
        textIdx = (textIdx + 1) % texts.length;
      }
    }
    setTimeout(type, deleting ? speed / 2 : speed);
  }
  type();
}

/* ─── Progress Bar Animada ─── */
function animateProgressBars() {
  const bars = document.querySelectorAll('.prog-bar-fill');
  const obs  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => { e.target.style.width = (e.target.dataset.width || '0') + '%'; }, 100);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(b => obs.observe(b));
}

/* ─── Contador Dramático ─── */
function dramaticCounter(el, target, suffix = '', duration = 2000) {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  animateProgressBars();

  typeWriter('heroTyping', [
    'Calibração de câmeras LKAS',
    'Sistemas AVM 360°',
    'Radares ACC & AEB',
    'EyeSight & ProPilot',
    'LIDAR Audi VAS6430-12',
    'Night Vision Infrared',
  ]);

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('[data-dramatic]').forEach(el => {
          dramaticCounter(el, parseInt(el.dataset.target), el.dataset.suffix || '');
        });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.dramatic-section').forEach(s => obs.observe(s));
});
