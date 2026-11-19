/* ============================================================
   HUBCORE CMS — Confirmation Modal
   ============================================================ */

/**
 * Shows a confirmation modal and returns a promise that resolves
 * to true (confirmed) or false (cancelled).
 * @param {string} title
 * @param {string} message
 * @param {string} confirmLabel
 * @returns {Promise<boolean>}
 */
export function confirmModal(title, message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}">
        <h3 class="modal-title">${title}</h3>
        <p class="modal-message">${message}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" type="button">Cancel</button>
          <button class="modal-btn modal-btn-confirm" type="button">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));

    const close = (result) => {
      overlay.classList.remove('is-visible');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      setTimeout(() => overlay.remove(), 400);
      resolve(result);
    };

    overlay.querySelector('.modal-btn-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('.modal-btn-confirm').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handler);
        close(false);
      }
    });
  });
}
