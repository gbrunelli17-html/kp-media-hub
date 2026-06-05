/* ============================================================
   INIT.JS — app bootstrap
   Runs last, after all modules are loaded.
   Decides whether to show onboarding or go straight to app.
   ============================================================ */

(function () {

  // Copy KP logo from uploads into assets folder path reference
  // (The logo img tag uses assets/kp-logo.png — place your logo there)

  if (STORAGE.isOnboarded() && STORAGE.hasKeys()) {
    // Keys exist — go straight to app
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Set user initials in sidebar
    const name = STORAGE.getUserName();
    const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sb-initials').textContent = initials;

    APP.init();
  } else {
    // Show onboarding
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');

    // Auto-focus first key input
    setTimeout(() => document.getElementById('ob-claude-key')?.focus(), 100);
  }

})();
