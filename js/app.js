/* ================================================
   ADAS PRO — Interações da Landing Page
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Navbar scroll ─── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 50);
  });

  /* ─── Menu mobile ─── */
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks?.classList.toggle('open');
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger?.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  /* ─── FAQ accordion ─── */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');
      // Fecha todos
      document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
      // Abre o atual se estava fechado
      if (!isOpen) item.classList.add('active');
    });
  });

  /* ─── Counter animation ─── */
  function animateCounter(el) {
    if (el.dataset.animated) return;
    el.dataset.animated = '1';
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;

    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.floor(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, step);
  }

  /* ─── Scroll reveal + counters ─── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Dispara contador se tiver data-target
          entry.target.querySelectorAll('[data-target]').forEach(animateCounter);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Counter isolado para stats do hero
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('[data-target]').forEach(animateCounter);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll('.hero-stats, .about-systems-count').forEach(el => counterObserver.observe(el));

  /* ─── Formulário de contato → WhatsApp ─── */
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.form-submit');
    btn.textContent = 'Abrindo WhatsApp...';
    btn.disabled = true;

    const name    = document.getElementById('cName')?.value.trim() || '';
    const phone   = document.getElementById('cPhone')?.value.trim() || '';
    const email   = document.getElementById('cEmail')?.value.trim() || '';
    const level   = document.getElementById('cLevel')?.value || '';
    const message = document.getElementById('cMessage')?.value.trim() || '';

    const levelMap = {
      tecnico: 'Técnico automotivo', oficina: 'Proprietário de oficina',
      autocenter: 'Auto center / Multimarcas', parabrisa: 'Loja de parabrisa',
      gestor: 'Gestor / Coordenador técnico', outro: 'Outro'
    };

    let text = `Olá! Vim pelo site *ADAS PRO* e quero saber mais sobre a mentoria.\n\n`;
    text += `*Nome:* ${name}\n`;
    text += `*WhatsApp:* ${phone}\n`;
    text += `*E-mail:* ${email}\n`;
    if (level) text += `*Perfil:* ${levelMap[level] || level}\n`;
    if (message) text += `*Necessidade:* ${message}\n`;

    const waUrl = `https://wa.me/5511947591115?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener');

    contactForm.reset();
    btn.textContent = '🎯 Solicitar avaliação gratuita';
    btn.disabled = false;
    showFormSuccess();
  });

  function showFormSuccess() {
    let msg = document.getElementById('formSuccess');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'formSuccess';
      msg.className = 'alert alert-success show';
      msg.style.cssText = 'margin-top:12px;display:flex';
      msg.innerHTML = '✅ WhatsApp aberto! Aguardamos sua mensagem.';
      contactForm.after(msg);
    }
    msg.style.display = 'flex';
    setTimeout(() => { msg.style.display = 'none'; }, 6000);
  }

  /* ─── Smooth scroll para âncoras ─── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─── Marquee brands: duplica itens para loop infinito ─── */
  const track = document.querySelector('.brands-track');
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  /* ─── Tooltip para sistema cards ─── */
  // (expansível futuramente)

  /* ─── Redirect para área de membros se já logado ─── */
  if (typeof AUTH !== 'undefined') {
    AUTH.init().then(() => {
      const session = AUTH.getSession();
      const memberBtn = document.querySelector('.btn-members');
      if (session && memberBtn) {
        memberBtn.textContent = 'Minha Área';
        memberBtn.href = session.role === 'admin' || session.role === 'gestor'
          ? 'admin.html'
          : 'membros.html';
      }
    });
  }
});
