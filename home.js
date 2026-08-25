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
  const input = document.getElementById(id);
  const icon = btn.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
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
async function doHomeLogin() {

  let ok = true;

  ok = validateField('hl-email','hl-email-err',
      v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) && ok;

  ok = validateField('hl-pw','hl-pw-err',
      v => v.length >= 6) && ok;

  if(!ok) return;

  try{

      const response = await fetch('http://localhost:3000/api/login',{

          method:'POST',

          headers:{
              'Content-Type':'application/json'
          },

          body:JSON.stringify({

              email:document.getElementById('hl-email').value.trim(),
              password:document.getElementById('hl-pw').value,
              role:homeLoginType

          })

      });

      const data = await response.json();

      if(!response.ok){
          alert(data.error);
          return;
      }

      localStorage.setItem("mb_token",data.token);
      localStorage.setItem("mb_fname",data.user.fname);
      localStorage.setItem("mb_lname",data.user.lname);
      localStorage.setItem("mb_fullname",data.user.fullname);
      localStorage.setItem("mb_email",data.user.email);
      localStorage.setItem("mb_phone",data.user.phone);
      localStorage.setItem("mb_role",data.user.role);
      localStorage.setItem("mb_wsname",data.user.wsname || "");

      closePanelOverlay('loginOverlay');

      showHomeSuccess(
          data.user.role === "mechanic" ? "🔧" : "🚗",
          "Welcome Back!",
          `Welcome back, ${data.user.fullname}! Redirecting to your dashboard...`
      );

      setTimeout(()=>{
          window.location.href="dashboard.html";
      },1500);

  }
  catch(err){
      alert("Cannot connect to the server.");
      console.error(err);
  }

}

/* ── DO HOME REGISTER ── */
async function doHomeRegister() {

  let ok = true;

  ok = validateField('hr-fname','hr-fname-err', v => v.trim().length > 1) && ok;
  ok = validateField('hr-lname','hr-lname-err', v => v.trim().length > 1) && ok;
  ok = validateField('hr-email','hr-email-err', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) && ok;
  ok = validateField('hr-phone','hr-phone-err', v => /^(\+27|0)[6-8][0-9]{8}$/.test(v.replace(/\s/g,''))) && ok;
  ok = validateField('hr-pw','hr-pw-err', v => v.length >= 8) && ok;
  ok = validateField('hr-pw2','hr-pw2-err', v => v === document.getElementById('hr-pw').value) && ok;

  if(homeRegType === 'mechanic'){
      ok = validateField('hr-wsname','hr-wsname-err', v => v.trim().length > 1) && ok;
  }

  if(!ok) return;

  try{

      const response = await fetch('http://localhost:3000/api/register',{

          method:'POST',

          headers:{
              'Content-Type':'application/json'
          },

          body:JSON.stringify({

              fname:document.getElementById('hr-fname').value.trim(),
              lname:document.getElementById('hr-lname').value.trim(),
              email:document.getElementById('hr-email').value.trim(),
              phone:document.getElementById('hr-phone').value.trim(),
              password:document.getElementById('hr-pw').value,
              role:homeRegType,
              wsname:homeRegType==='mechanic'
                     ? document.getElementById('hr-wsname').value.trim()
                     : null

          })

      });

      const data = await response.json();

      if(!response.ok){
          alert(data.error);
          return;
      }

      localStorage.setItem("mb_token",data.token);
      localStorage.setItem("mb_fname",data.user.fname);
      localStorage.setItem("mb_lname",data.user.lname);
      localStorage.setItem("mb_fullname",data.user.fullname);
      localStorage.setItem("mb_email",data.user.email);
      localStorage.setItem("mb_phone",data.user.phone);
      localStorage.setItem("mb_role",data.user.role);
      localStorage.setItem("mb_wsname",data.user.wsname || "");

      showHomeSuccess(
          "🎉",
          "Account Created!",
          "Registration successful."
      );

      setTimeout(()=>{
          window.location.href="dashboard.html";
      },1500);

  }
  catch(err){
      alert("Cannot connect to the server.");
      console.error(err);
  }

}
/* ── OPEN REGISTER PANEL WHEN RETURNING FROM PRIVACY PAGE ── */
window.addEventListener("load", () => {
    if (window.location.hash === "#register") {
        showRegisterPanel();
    }
});
function showForgot()  { document.getElementById('forgotOverlay').classList.add('show'); }
function closeForgot() { document.getElementById('forgotOverlay').classList.remove('show'); }
async function sendReset() {
  const emailInput = document.getElementById('forgot-email');
  const email = emailInput.value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Unable to send verification code.');
      return;
    }

    alert('A verification code has been sent to your email.');

    // For now, close the first popup.
    closeForgot();

    // We'll replace this with the OTP screen in the next step.
    showSuccess(
      '📧',
      'Check Your Email',
      'A 6-digit verification code has been sent to your email.'
    );

  } catch (error) {
    console.error(error);
    alert('Cannot reach the server. Make sure node server.js is running.');
  }
}
window.addEventListener("load", () => {
    if (window.location.hash === "#register") {
        showPanel("panel-register");
    }
});

