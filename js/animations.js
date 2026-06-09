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

/* ─── Progress Bar Animada (com stagger) ─── */
function animateProgressBars() {
  const container = document.querySelector('.market-section .container');
  if (!container) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const bars = container.querySelectorAll('.prog-bar-fill');
        bars.forEach((b, i) => {
          setTimeout(() => {
            b.style.width = (b.dataset.width || '0') + '%';
            b.addEventListener('transitionend', () => {
              b.classList.add('shimmer');
            }, { once: true });
          }, 200 + i * 150);
        });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  obs.observe(container);
}

/* ─── Anima números percentuais ao lado das barras ─── */
function animateProgressLabels() {
  const container = document.querySelector('.market-section .container');
  if (!container) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        container.querySelectorAll('.prog-label .text-accent').forEach((el, i) => {
          const pct = parseInt(el.textContent, 10);
          if (!pct) return;
          el.textContent = '0%';
          setTimeout(() => dramaticCounter(el, pct, '%', 1400), 200 + i * 150);
        });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  obs.observe(container);
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
  typeWriter('heroTyping', [
    'Calibração de câmeras LKAS',
    'Sistemas AVM 360°',
    'Radares ACC & AEB',
    'EyeSight & ProPilot',
    'LIDAR Audi VAS6430-12',
    'Night Vision Infrared',
  ]);
  animateProgressBars();
  animateProgressLabels();
});
