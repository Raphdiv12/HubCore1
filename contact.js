/* ============================================================
   HUBCORE — Contact Page Controller (contact.js)
   Self-contained script for /contact/.
   Handles navigation, accessible validation, and delivery.
   ============================================================ */

document.documentElement.classList.add('js');

function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

onReady(() => {
  requestAnimationFrame(() => document.documentElement.classList.add('is-loaded'));
  initNav();
  initContactForm();
});

/* ─── NAVIGATION (Consistent with Atelier & Works) ───────── */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  if (!nav) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    if (y > 100) {
      if (y > lastY && y - lastY > 6) nav.classList.add('is-hidden-up');
      else if (y < lastY && lastY - y > 6) nav.classList.remove('is-hidden-up');
    } else {
      nav.classList.remove('is-hidden-up');
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Accessible keyboard focus: bring nav into view if focused
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden-up'));

  if (!hamburger || !overlay) return;

  let isOpen = false;
  const toggle = () => {
    isOpen = !isOpen;
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    overlay.classList.toggle('is-open', isOpen);
    nav.classList.toggle('menu-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (!isOpen) hamburger.focus();
  };

  hamburger.addEventListener('click', toggle);
  overlay.querySelectorAll('.overlay-link').forEach((link) => {
    link.addEventListener('click', () => { if (isOpen) toggle(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggle();
  });
}

/* ─── FORM VALIDATION & DISPATCH ─────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const nameInput = document.getElementById('field-name');
  const emailInput = document.getElementById('field-email');
  const messageInput = document.getElementById('field-message');
  const submitBtn = document.getElementById('contact-submit');
  const statusEl = document.getElementById('form-status');

  const errorName = document.getElementById('error-name');
  const errorEmail = document.getElementById('error-email');
  const errorMessage = document.getElementById('error-message');

  const clearErrors = () => {
    [nameInput, emailInput, messageInput].forEach((input) => {
      if (input) {
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
      }
    });
    if (errorName) errorName.textContent = '';
    if (errorEmail) errorEmail.textContent = '';
    if (errorMessage) errorMessage.textContent = '';
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }
  };

  // Real-time error clearance on input
  nameInput?.addEventListener('input', () => {
    nameInput.classList.remove('is-invalid');
    nameInput.removeAttribute('aria-invalid');
    if (errorName) errorName.textContent = '';
  });

  emailInput?.addEventListener('input', () => {
    emailInput.classList.remove('is-invalid');
    emailInput.removeAttribute('aria-invalid');
    if (errorEmail) errorEmail.textContent = '';
  });

  messageInput?.addEventListener('input', () => {
    messageInput.classList.remove('is-invalid');
    messageInput.removeAttribute('aria-invalid');
    if (errorMessage) errorMessage.textContent = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const message = messageInput?.value.trim() || '';

    let hasError = false;

    if (!name || name.length < 2) {
      nameInput?.classList.add('is-invalid');
      nameInput?.setAttribute('aria-invalid', 'true');
      if (errorName) errorName.textContent = 'Please enter your name.';
      hasError = true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      emailInput?.classList.add('is-invalid');
      emailInput?.setAttribute('aria-invalid', 'true');
      if (errorEmail) errorEmail.textContent = 'Please enter a valid email address.';
      hasError = true;
    }

    if (!message || message.length < 5) {
      messageInput?.classList.add('is-invalid');
      messageInput?.setAttribute('aria-invalid', 'true');
      if (errorMessage) errorMessage.textContent = 'Please share a few lines about what you are making.';
      hasError = true;
    }

    if (hasError) {
      const firstInvalid = form.querySelector('.is-invalid');
      firstInvalid?.focus();
      return;
    }

    const endpoint = form.dataset.endpoint?.trim() || '';

    // 1. Configured endpoint path (e.g. Formspree or custom service)
    if (endpoint) {
      if (submitBtn) {
        submitBtn.disabled = true;
        const label = submitBtn.querySelector('.submit-label');
        if (label) label.textContent = 'Sending...';
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ name, email, message })
        });

        if (!response.ok) throw new Error('Dispatch failed');

        if (statusEl) {
          statusEl.textContent = 'Message sent. We\'ll reply within two business days.';
          statusEl.className = 'form-status is-success';
        }
        form.reset();
      } catch {
        if (statusEl) {
          statusEl.innerHTML = 'Unable to send. Please write directly to <a href="mailto:hello@hubcore.design" style="text-decoration: underline;">hello@hubcore.design</a>.';
          statusEl.className = 'form-status is-error';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          const label = submitBtn.querySelector('.submit-label');
          if (label) label.textContent = 'Send message';
        }
      }
      return;
    }

    // 2. Direct Mailto Delivery (Static site default)
    const subject = encodeURIComponent(`Inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    const mailtoUrl = `mailto:hello@hubcore.design?subject=${subject}&body=${body}`;

    if (statusEl) {
      statusEl.textContent = 'Opening your email client to send...';
      statusEl.className = 'form-status is-success';
    }

    // Launch mail client with prefilled details
    window.location.href = mailtoUrl;
  });
}
