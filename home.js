/* ══════════════════════════════════════
   MechBook EL – home.js
   ══════════════════════════════════════ */

/* ── LIVE CLOCK ── */
function updateTime() {
  const now  = new Date();
  const opts = {
    weekday:'long', year:'numeric', month:'long',
    day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'
  };
  const el = document.getElementById('current-time');
  if (el) el.textContent = now.toLocaleString('en-GB', opts);
}
updateTime();
setInterval(updateTime, 1000);

/* ── AUTH POPUP (Find a Workshop) ── */
function showAuthPopup(event) {
  event.preventDefault();
  document.getElementById('authPopup').classList.add('active');
}
function closePopup() {
  document.getElementById('authPopup').classList.remove('active');
}
window.addEventListener('click', function (e) {
  const popup = document.getElementById('authPopup');
  if (e.target === popup) closePopup();
  const info = document.getElementById('infoOverlay');
  if (e.target === info) closeInfo();
});

/* ── PANEL OVERLAYS ── */
function showLoginPanel() {
  closePopup();
  closePanelOverlay('registerOverlay');
  document.getElementById('loginOverlay').classList.add('active');
}
function showRegisterPanel() {
  closePopup();
  closePanelOverlay('loginOverlay');
  document.getElementById('registerOverlay').classList.add('active');
}
function closePanelOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

/* ── MECHBOOK INFO OVERLAY ── */
function showInfo(event) {
  event.preventDefault();
  document.getElementById('infoOverlay').classList.add('active');
}
function closeInfo() {
  document.getElementById('infoOverlay').classList.remove('active');
}

/* ── USER TYPE SELECTORS ── */
let homeLoginType = 'owner';
let homeRegType   = 'owner';

function selLoginType(type, btn) {
  homeLoginType = type;
  btn.parentElement.querySelectorAll('.type-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}
function selRegType(type, btn) {
  homeRegType = type;
  btn.parentElement.querySelectorAll('.type-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById('hr-ws-group').style.display = type === 'mechanic' ? 'block' : 'none';
}

/* ── PASSWORD TOGGLE ── */
function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁️' : '🙈';
}

/* ── SUCCESS OVERLAY ── */
function showHomeSuccess(icon, title, msg) {
  document.getElementById('homeSuccessIcon').textContent  = icon;
  document.getElementById('homeSuccessTitle').textContent = title;
  document.getElementById('homeSuccessMsg').textContent   = msg;
  document.getElementById('homeSuccessOverlay').classList.add('show');
}

/* ── VALIDATE HELPER ── */
function validateField(id, errId, fn) {
  const el  = document.getElementById(id);
  const err = document.getElementById(errId);
  if (!el || !err) return true;
  if (fn(el.value)) {
    el.classList.remove('err');
    err.classList.remove('show');
    return true;
  } else {
    el.classList.add('err');
    err.classList.add('show');
    return false;
  }
}

/* ── DO HOME LOGIN ── */
function doHomeLogin() {
  let ok = true;
  ok = validateField('hl-email','hl-email-err', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) && ok;
  ok = validateField('hl-pw',   'hl-pw-err',    v => v.length >= 6)                          && ok;
  if (!ok) return;

  localStorage.setItem('mb_role', homeLoginType);
  const savedName = localStorage.getItem('mb_fullname') || '';
  const type      = homeLoginType === 'mechanic' ? 'Mechanic' : 'Car Owner';
  const greeting  = savedName ? `, ${savedName}` : '';
  const icon      = homeLoginType === 'mechanic' ? '🔧' : '🚗';

  closePanelOverlay('loginOverlay');
  showHomeSuccess(icon, 'Welcome Back!', `Welcome back${greeting}! You are logged in as a ${type}. Redirecting you to your dashboard...`);
}

/* ── DO HOME REGISTER ── */
function doHomeRegister() {
  let ok = true;
  ok = validateField('hr-fname','hr-fname-err', v => v.trim().length > 1)                             && ok;
  ok = validateField('hr-lname','hr-lname-err', v => v.trim().length > 1)                             && ok;
  ok = validateField('hr-email','hr-email-err', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))           && ok;
  ok = validateField('hr-phone','hr-phone-err', v => /^(\+27|0)[6-8][0-9]{8}$/.test(v.replace(/\s/g,''))) && ok;
  ok = validateField('hr-pw',   'hr-pw-err',    v => v.length >= 8)                                   && ok;
  ok = validateField('hr-pw2',  'hr-pw2-err',   v => v === document.getElementById('hr-pw').value && v.length > 0) && ok;

  if (homeRegType === 'mechanic') {
    ok = validateField('hr-wsname','hr-wsname-err', v => v.trim().length > 1) && ok;
  }

  const terms    = document.getElementById('hr-terms');
  const termsErr = document.getElementById('hr-terms-err');
  if (!terms.checked) { termsErr.classList.add('show'); ok = false; }
  else                { termsErr.classList.remove('show'); }

  if (!ok) return;

  const fn   = document.getElementById('hr-fname').value;
  const ln   = document.getElementById('hr-lname').value;
  const type = homeRegType === 'mechanic' ? 'Workshop Owner' : 'Car Owner';

  localStorage.setItem('mb_fname',    fn);
  localStorage.setItem('mb_lname',    ln);
  localStorage.setItem('mb_fullname', fn + ' ' + ln);
  localStorage.setItem('mb_role',     homeRegType);
  localStorage.setItem('mb_email',    document.getElementById('hr-email').value);
  localStorage.setItem('mb_phone',    document.getElementById('hr-phone').value);

  closePanelOverlay('registerOverlay');
  showHomeSuccess('🎉','Account Created!', `Welcome to MechBook EL, ${fn} ${ln}! Your ${type} account is ready. Let's get started!`);
}