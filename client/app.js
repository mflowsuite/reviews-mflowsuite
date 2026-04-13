/* =====================================================
   Reseñas Positivas — Client Portal
   /client/app.js
   ===================================================== */

const CLIENT_CONFIG = {
  registerUrl:   'https://fluky-n8n.lembgk.easypanel.host/webhook/register-client',
  dashboardUrl:  'https://fluky-n8n.lembgk.easypanel.host/webhook/client-dashboard',
  uploadWebhook: 'https://fluky-n8n.lembgk.easypanel.host/webhook/upload-logo',
  reviewsBase:   'https://reviews.mflowsuite.com/',
};

const state = {
  email:    sessionStorage.getItem('client_email') || '',
  password: sessionStorage.getItem('client_pwd')   || '',
  client:   null,
};

/* ── Utilidades ─────────────────────────────────── */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  // Powered-by bar: show on auth screens, hide on dashboard/loading
  const authScreens = ['welcome', 'login', 'register', 'forgot'];
  const pbBar = document.getElementById('pb-bar');
  if (pbBar) {
    if (authScreens.includes(id)) {
      pbBar.classList.add('pb-visible');
      if (typeof startPbAnimation === 'function') startPbAnimation();
    } else {
      pbBar.classList.remove('pb-visible');
    }
  }
}

// Para las pantallas de auth (welcome/login/register/forgot) que usan IDs distintos
function showAuthScreen(name) {
  showScreen(name === 'welcome' ? 'welcome'
           : name === 'login'   ? 'login'
           : name === 'forgot'  ? 'forgot'
           : 'register');
}

function setAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent    = msg;
  el.className      = 'alert alert-' + (type || 'error');
  el.style.display  = msg ? '' : 'none';
}

function setLoadingBtn(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) { btn.dataset.orig = btn.textContent; btn.textContent = '…'; }
  else          { btn.textContent = label || btn.dataset.orig || btn.textContent; }
}

function reviewUrl(clientId) {
  return CLIENT_CONFIG.reviewsBase + '?clientId=' + encodeURIComponent(clientId);
}

function qrUrl(url, size) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || '200x200') + '&data=' + encodeURIComponent(url);
}

/* ── QR Modal ───────────────────────────────── */
const cqr = { url: '', name: '', dark: false };

function cqrBuildUrl(url, dark) {
  const colors = dark ? '&color=ffffff&bgcolor=1a1a2e' : '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600${colors}&data=${encodeURIComponent(url)}`;
}

function openQR() {
  cqr.url  = document.getElementById('dash-url').textContent.trim();
  cqr.name = document.getElementById('topbar-biz-name').textContent.trim() || 'Mi página';
  cqr.dark = false;
  const inner = document.getElementById('cqr-modal-inner');
  document.getElementById('cqr-modal').style.display = 'flex';
  inner.style.background = '#fff';
  inner.style.color      = '';
  inner.querySelectorAll('.btn-outline').forEach(b => { b.style.color = ''; b.style.borderColor = ''; });
  document.getElementById('cqr-title').textContent    = cqr.name;
  document.getElementById('cqr-img').src              = cqrBuildUrl(cqr.url, false);
  document.getElementById('cqr-mode-btn').textContent = '🌙 Modo noche';
}

function closeQR(e) {
  if (!e || e.target === document.getElementById('cqr-modal')) {
    document.getElementById('cqr-modal').style.display = 'none';
  }
}

function toggleQRMode() {
  cqr.dark = !cqr.dark;
  const inner = document.getElementById('cqr-modal-inner');
  inner.style.background = cqr.dark ? '#1a1a2e' : '#fff';
  inner.style.color      = cqr.dark ? '#fff'    : '';
  inner.querySelectorAll('.btn-outline').forEach(b => {
    b.style.color       = cqr.dark ? '#fff' : '';
    b.style.borderColor = cqr.dark ? 'rgba(255,255,255,0.35)' : '';
  });
  document.getElementById('cqr-img').src              = cqrBuildUrl(cqr.url, cqr.dark);
  document.getElementById('cqr-mode-btn').textContent = cqr.dark ? '☀️ Modo día' : '🌙 Modo noche';
}

async function downloadQR() {
  const btn = document.getElementById('cqr-download-btn');
  btn.textContent = 'Descargando…';
  btn.disabled = true;
  try {
    const imgSrc = document.getElementById('cqr-img').src;
    const isDark = imgSrc.includes('bgcolor=');
    const res     = await fetch(imgSrc);
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = blobUrl;
    a.download    = `qr-mipagina${isDark ? '-dark' : ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revocar después de que la descarga inicie (no inmediatamente)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch {
    // Fallback: abrir en nueva pestaña para descarga manual
    window.open(document.getElementById('cqr-img').src, '_blank');
  } finally {
    btn.textContent = '⬇️ Descargar';
    btn.disabled    = false;
  }
}

function printQR() {
  const bg  = cqr.dark ? '#1a1a2e' : '#ffffff';
  const fg  = cqr.dark ? '#ffffff' : '#000000';
  const url = cqrBuildUrl(cqr.url, cqr.dark);
  const win = window.open('', '_blank', 'width=520,height=600');
  win.document.write(`<!DOCTYPE html><html><head><title>QR · ${cqr.name}</title>
  <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:${bg};color:${fg};font-family:sans-serif}img{width:380px;height:380px;display:block}p{margin-top:1rem;font-size:1.1rem;font-weight:700;text-align:center}small{font-size:.75rem;opacity:.6;margin-top:.3rem}@media print{body{min-height:unset}}</style></head><body>
  <img src="${url}" /><p>${cqr.name}</p><small>${cqr.url}</small>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}<\/script>
  </body></html>`);
  win.document.close();
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = String(val ?? '');
}

function toggleSection(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}

/* ── Init ───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Listener de idioma para actualizar placeholders IA
  const langSelect = document.getElementById('f-language');
  if (langSelect) langSelect.addEventListener('change', () => updateAIPlaceholders(langSelect.value));

  // Auto-login si hay credenciales guardadas
  if (state.email && state.password) {
    autoLogin();
  } else {
    showScreen('welcome');
  }
});

async function autoLogin() {
  showLoadingScreen('Cargando tu panel…');
  try {
    const data = await callDashboard({ action: 'get' });
    state.client = data.client;
    populateDashboard(data.client);
    showScreen('dashboard');
  } catch {
    clearSession();
    showScreen('welcome');
  }
}

function showLoadingScreen(msg) {
  document.getElementById('loading-msg').textContent = msg || 'Cargando…';
  showScreen('loading');
}

/* ── Placeholders IA según idioma ─────────────── */

const AI_PLACEHOLDERS = {
  'Inglés': {
    suggestedReviewText: 'E.g.: Amazing service and great quality. Totally recommended!',
    aiTopics:            'E.g.:\nflavor variety\nfriendly service\ncozy atmosphere\nvalue for money',
    aiTones:             'E.g.:\nenthusiastic\ncasual and friendly\nbrief and direct',
    aiStyles:            'E.g.:\nStart with the standout thing\nStart with how you felt\nStart with a recommendation',
    aiExtraInstructions: 'E.g.: Mention the business name naturally.',
  },
  default: {
    suggestedReviewText: 'Ej: El servicio fue excelente y los productos increíbles. ¡Lo recomiendo!',
    aiTopics:            'Ej:\nvariedad de sabores\natención amable\nambiente agradable\nrelación precio-calidad',
    aiTones:             'Ej:\nentusiasta\ncasual y amigable\nbreve y directo',
    aiStyles:            'Ej:\nEmpezar por lo que más destacó\nEmpezar con cómo te sentiste\nEmpezar con una recomendación',
    aiExtraInstructions: 'Ej: Mencionar el nombre del negocio de forma natural.',
  },
};

function updateAIPlaceholders(lang) {
  const ph = AI_PLACEHOLDERS[lang] || AI_PLACEHOLDERS['default'];
  ['suggestedReviewText', 'aiTopics', 'aiTones', 'aiStyles', 'aiExtraInstructions'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.placeholder = ph[f];
  });
}

/* ── Color picker ────────────────────────────── */

function onPickerChange() {
  const val = document.getElementById('f-color-picker').value;
  document.getElementById('f-accentColor').value = val;
}

function onHexChange() {
  const val = document.getElementById('f-accentColor').value;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    document.getElementById('f-color-picker').value = val;
  }
}

/* ── Logo ────────────────────────────────────── */

function updateLogoPreview(url) {
  const preview = document.getElementById('logo-preview');
  if (!preview) return;
  if (url && url.startsWith('http')) {
    preview.src = url;
    preview.style.display = 'block';
    preview.onerror = () => { preview.style.display = 'none'; };
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
}

async function uploadLogo(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const statusEl = document.getElementById('logo-upload-status');
  statusEl.textContent = '⏳ Subiendo…';
  statusEl.style.color = 'var(--muted)';

  let base64;
  try {
    base64 = await resizeAndEncode(file, 800);
  } catch {
    base64 = await fileToBase64(file);
  }

  try {
    const res  = await fetch(CLIENT_CONFIG.uploadWebhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: 'Mflow@dmin25', fileData: base64, filename: file.name }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('f-logoUrl').value = data.url;
    statusEl.textContent = '✅ Logo subido';
    statusEl.style.color = 'var(--success)';
    updateLogoPreview(data.url);
  } catch (e) {
    statusEl.textContent = '❌ Error al subir';
    statusEl.style.color = 'var(--danger)';
  }

  inputEl.value = '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeAndEncode(file, maxPx) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else       { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(file.type || 'image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ── Register ───────────────────────────────── */

function resetRegisterForm() {
  document.getElementById('register-form')?.reset();
  setAlert('register-alert', '');
}

async function doRegister(event) {
  if (event) event.preventDefault();
  setAlert('register-alert', '');

  const businessName = document.getElementById('reg-businessName').value.trim();
  const industry     = document.getElementById('reg-industry').value.trim();
  const language     = document.getElementById('reg-language').value;
  const googleUrl    = document.getElementById('reg-googleUrl').value.trim();
  const email        = document.getElementById('reg-email').value.trim().toLowerCase();
  const password     = document.getElementById('reg-password').value;
  const aiHint       = document.getElementById('reg-aiHint').value.trim();

  if (!businessName)              return setAlert('register-alert', 'Ingresá el nombre del negocio.');
  if (!industry)                  return setAlert('register-alert', 'Ingresá el rubro del negocio.');
  if (!email || !email.includes('@')) return setAlert('register-alert', 'Ingresá un email válido.');
  if (password.length < 6)        return setAlert('register-alert', 'La contraseña debe tener al menos 6 caracteres.');

  setLoadingBtn('register-btn', true);
  showLoadingScreen('Configurando tu página con IA… puede tardar unos segundos');

  try {
    const res = await fetch(CLIENT_CONFIG.registerUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ businessName, industry, language, googleReviewUrl: googleUrl, email, password, aiHint }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoadingBtn('register-btn', false, 'Crear mi página →');
      showScreen('register');
      if (data.error === 'email_exists') {
        setAlert('register-alert', 'Ya existe una cuenta con ese email. Iniciá sesión.');
      } else {
        setAlert('register-alert', 'Error al crear la página. Intentá de nuevo.');
      }
      return;
    }

    // Guardar sesión
    state.email    = email;
    state.password = password;
    sessionStorage.setItem('client_email', email);
    sessionStorage.setItem('client_pwd', password);

    // Mostrar setup-done
    const url = reviewUrl(data.clientId);
    document.getElementById('setup-url').textContent = url;
    document.getElementById('setup-qr').src = qrUrl(url, '300x300');

    if (data.suggestedReviewText) {
      document.getElementById('setup-preview-text').textContent = data.suggestedReviewText;
      document.getElementById('setup-preview-wrap').style.display = '';
    } else {
      document.getElementById('setup-preview-wrap').style.display = 'none';
    }

    setLoadingBtn('register-btn', false, 'Crear mi página →');
    showScreen('setup-done');

  } catch {
    setLoadingBtn('register-btn', false, 'Crear mi página →');
    showScreen('register');
    setAlert('register-alert', 'Error de conexión. Revisá tu internet e intentá de nuevo.');
  }
}

function copySetupUrl() {
  const url  = document.getElementById('setup-url').textContent;
  const el   = document.getElementById('setup-url');
  const orig = el.textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  el.textContent = '¡Copiado!';
  setTimeout(() => { el.textContent = orig; }, 1500);
}

async function goToDashboard() {
  showLoadingScreen('Cargando tu panel…');
  try {
    const data = await callDashboard({ action: 'get' });
    state.client = data.client;
    populateDashboard(data.client);
    showScreen('dashboard');
  } catch {
    showScreen('login');
  }
}

/* ── Login ──────────────────────────────────── */

async function doLogin(event) {
  if (event) event.preventDefault();
  setAlert('login-alert', '');

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (!email || !email.includes('@')) return setAlert('login-alert', 'Ingresá un email válido.');
  if (!password)                       return setAlert('login-alert', 'Ingresá tu contraseña.');

  setLoadingBtn('login-btn', true);
  state.email    = email;
  state.password = password;

  try {
    const data = await callDashboard({ action: 'get' });
    sessionStorage.setItem('client_email', email);
    sessionStorage.setItem('client_pwd', password);
    state.client = data.client;
    populateDashboard(data.client);
    setLoadingBtn('login-btn', false, 'Entrar →');
    showScreen('dashboard');
  } catch (err) {
    setLoadingBtn('login-btn', false, 'Entrar →');
    setAlert('login-alert', err.status === 401 ? 'Email o contraseña incorrectos.' : 'Error de conexión. Intentá de nuevo.');
    state.email    = '';
    state.password = '';
  }
}

/* ── Forgot password ────────────────────────── */

async function doForgotPassword(event) {
  if (event) event.preventDefault();
  setAlert('forgot-alert', '');

  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  if (!email || !email.includes('@')) return setAlert('forgot-alert', 'Ingresá un email válido.');

  setLoadingBtn('forgot-btn', true);

  try {
    await fetch(CLIENT_CONFIG.dashboardUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password: '', action: 'forgot-password' }),
    });
    // Siempre mostrar el mismo mensaje (no revelar si el email existe)
    setAlert('forgot-alert', 'Si el email está registrado, recibirás un mensaje con tu contraseña.', 'success');
  } catch {
    setAlert('forgot-alert', 'Error de conexión. Intentá de nuevo.');
  }

  setLoadingBtn('forgot-btn', false, 'Enviar contraseña →');
}

/* ── Logout ─────────────────────────────────── */

function clearSession() {
  sessionStorage.removeItem('client_email');
  sessionStorage.removeItem('client_pwd');
  state.email    = '';
  state.password = '';
  state.client   = null;
}

function doLogout() {
  clearSession();
  // Limpiar formulario del dashboard
  clearDashboardForm();
  showScreen('welcome');
}

function clearDashboardForm() {
  const ids = ['f-businessName','f-industry','f-accentColor','f-logoUrl','f-googleReviewUrl',
               'f-notificationEmail','f-photoPromptText','f-incentiveText','f-incentiveButtonText',
               'f-suggestedReviewText','f-aiTopics','f-aiTones','f-aiStyles','f-aiExtraInstructions'];
  ids.forEach(id => set(id, ''));
  set('f-language', 'Español Argentina');
  set('f-accentColor', '#6C63FF');
  set('f-aiMaxSentences', '2');
  document.getElementById('f-color-picker').value  = '#6C63FF';
  document.getElementById('f-photoEnabled').checked    = false;
  document.getElementById('f-incentiveEnabled').checked = false;
  toggleSection('photo-fields',     false);
  toggleSection('incentive-fields', false);
  // Limpiar logo preview
  const logoPreview = document.getElementById('logo-preview');
  logoPreview.src          = '';
  logoPreview.style.display = 'none';
  const logoStatus = document.getElementById('logo-upload-status');
  if (logoStatus) logoStatus.textContent = '';
}

/* ── Dashboard ──────────────────────────────── */

function populateDashboard(client) {
  if (!client) return;

  const clientId = client.clientId || '';
  const url      = reviewUrl(clientId);

  // Topbar
  document.getElementById('topbar-biz-name').textContent = client.businessName || '';

  // QR / URL
  document.getElementById('dash-url').textContent  = url;
  document.getElementById('dash-url-link').href    = url;
  document.getElementById('dash-qr').src           = qrUrl(url, '200x200');

  // Formulario — mismos IDs f-* que el admin
  set('f-businessName',       client.businessName       || '');
  set('f-industry',           client.industry           || '');
  set('f-language',           client.language           || 'Español Argentina');
  updateAIPlaceholders(client.language || 'Español Argentina');

  // Logo
  set('f-logoUrl', client.logoUrl || '');
  updateLogoPreview(client.logoUrl || '');

  // Links
  set('f-googleReviewUrl',   client.googleReviewUrl   || '');
  set('f-notificationEmail', client.notificationEmail || '');

  // Foto
  document.getElementById('f-photoEnabled').checked = !!client.photoUploadEnabled;
  set('f-photoPromptText', client.photoPromptText || '');
  toggleSection('photo-fields', !!client.photoUploadEnabled);

  // Incentivo
  document.getElementById('f-incentiveEnabled').checked = !!client.incentiveEnabled;
  set('f-incentiveText',       client.incentiveText       || '');
  set('f-incentiveButtonText', client.incentiveButtonText || '');
  toggleSection('incentive-fields', !!client.incentiveEnabled);

  // Texto fallback
  set('f-suggestedReviewText', client.suggestedReviewText || '');

  // IA
  set('f-aiTopics',           client.aiTopics           || '');
  set('f-aiTones',            client.aiTones            || '');
  set('f-aiStyles',           client.aiStyles           || '');
  set('f-aiMaxSentences',     client.aiMaxSentences != null ? String(client.aiMaxSentences) : '2');
  set('f-aiExtraInstructions',client.aiExtraInstructions || '');

  // Color
  const color = /^#[0-9a-fA-F]{6}$/.test(client.accentColor) ? client.accentColor : '#6C63FF';
  document.getElementById('f-accentColor').value  = color;
  document.getElementById('f-color-picker').value = color;
}

async function saveDashboard() {
  const btn      = document.getElementById('save-btn');
  const statusEl = document.getElementById('save-status');

  btn.disabled          = true;
  btn.textContent       = 'Guardando…';
  statusEl.textContent  = '';
  document.getElementById('dash-alert').style.display = 'none';

  const opt = id => { const v = (document.getElementById(id)?.value || '').trim(); return v === '' ? null : v; };

  const fields = {
    businessName:        opt('f-businessName'),
    industry:            opt('f-industry'),
    language:            document.getElementById('f-language')?.value || null,
    accentColor:         opt('f-accentColor'),
    logoUrl:             opt('f-logoUrl'),
    googleReviewUrl:     opt('f-googleReviewUrl'),
    notificationEmail:   opt('f-notificationEmail'),
    photoUploadEnabled:  document.getElementById('f-photoEnabled')?.checked || false,
    photoPromptText:     opt('f-photoPromptText'),
    incentiveEnabled:    document.getElementById('f-incentiveEnabled')?.checked || false,
    incentiveText:       opt('f-incentiveText'),
    incentiveButtonText: opt('f-incentiveButtonText'),
    suggestedReviewText: opt('f-suggestedReviewText'),
    aiTopics:            opt('f-aiTopics'),
    aiTones:             opt('f-aiTones'),
    aiStyles:            opt('f-aiStyles'),
    aiExtraInstructions: opt('f-aiExtraInstructions'),
  };

  const maxS = parseInt(document.getElementById('f-aiMaxSentences')?.value || '', 10);
  fields.aiMaxSentences = (maxS >= 1) ? maxS : null;

  try {
    await callDashboard({ action: 'save', fields });

    // Actualizar topbar y color de acento
    if (fields.businessName) document.getElementById('topbar-biz-name').textContent = fields.businessName;
    if (fields.accentColor)  document.documentElement.style.setProperty('--primary', fields.accentColor);

    statusEl.textContent = '✅ Guardado correctamente';
    statusEl.style.color = 'var(--success)';
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  } catch (err) {
    statusEl.textContent = '❌ Error al guardar. Intentá de nuevo.';
    statusEl.style.color = 'var(--danger)';
    setTimeout(() => { statusEl.style.color = 'var(--success)'; statusEl.textContent = ''; }, 4000);
  }

  btn.disabled    = false;
  btn.textContent = 'Guardar cambios';
}

/* ── QR ─────────────────────────────────────── */

function copyDashUrl() {
  const url  = document.getElementById('dash-url').textContent;
  const el   = document.getElementById('dash-url');
  const orig = el.textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  el.textContent = '¡Copiado!';
  setTimeout(() => { el.textContent = orig; }, 1500);
}

function downloadQR() {
  const clientId = state.client?.clientId || '';
  const url = qrUrl(reviewUrl(clientId), '600x600');
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'qr-reviews.png';
  a.target   = '_blank';
  a.click();
}

/* ── Powered-by animation ───────────────────── */
let pbAnimStarted = false;
function startPbAnimation() {
  if (pbAnimStarted) return;
  const logoEl = document.getElementById('pb-logo');
  if (!logoEl || !logoEl.complete || logoEl.naturalWidth === 0) {
    if (!logoEl) return;
    logoEl.onload = () => { pbAnimStarted = false; startPbAnimation(); };
    return;
  }
  pbAnimStarted = true;
  _runPbAnim();
}

function _runPbAnim() {
  const BRAND = 'MFlowSuite';
  const SZ    = 20;
  const HOP   = 200, FINAL = 520, SQ = 380, LOSQ = 400, INTRO = 500;

  const sceneEl  = document.getElementById('pb-scene');
  const rowEl    = document.getElementById('pb-row');
  const charsEl  = document.getElementById('pb-chars');
  const slotEl   = document.getElementById('pb-slot');
  const logoEl   = document.getElementById('pb-logo');
  if (!sceneEl || !logoEl) return;

  // Build letter spans
  charsEl.innerHTML = '';
  const spans = [];
  for (const ch of BRAND) {
    const s = document.createElement('span');
    s.className = 'pb-ch';
    s.textContent = ch;
    charsEl.appendChild(s);
    spans.push(s);
  }

  const lerp  = (a,b,t) => a+(b-a)*t;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const arc   = (t,h)   => 4*h*t*(1-t);

  function spring(t) {
    if (t<.15){const r=t/.15;      return [lerp(1,1.35,r),  lerp(1,.55,r)];}
    if (t<.40){const r=(t-.15)/.25;return [lerp(1.35,.88,r),lerp(.55,1.22,r)];}
    if (t<.70){const r=(t-.40)/.30;return [lerp(.88,1.04,r),lerp(1.22,.96,r)];}
    const r=(t-.70)/.30;           return [lerp(1.04,1,r),  lerp(.96,1,r)];
  }
  function airShape(t) {
    if (t<.45) return [lerp(1,.84,t/.45),   lerp(1,1.2,t/.45)];
    if (t<.82) return [.84,1.2];
    const r=(t-.82)/.18;
    return [lerp(.84,1.28,r),lerp(1.2,.68,r)];
  }
  function center(el) {
    const er=el.getBoundingClientRect(), sr=sceneEl.getBoundingClientRect();
    return { x:er.left-sr.left+er.width/2, y:er.top-sr.top+er.height/2 };
  }
  function moveLogo(cx,cy,sx,sy,rot,alpha) {
    const tx=cx-SZ/2, ty=cy-SZ/2;
    logoEl.style.transform=`translate(${tx}px,${ty}px) rotate(${rot}rad) scale(${sx},${sy})`;
    logoEl.style.opacity=alpha;
  }

  let phase='intro', t0=null, hopIdx=0, hop=null;
  const lsq   = spans.map(()=>({at:-1}));
  let lsqAt=-1, lsX=1, lsY=1;

  function triggerLogoSq(now){lsqAt=now;lsX=1.3;lsY=0.62;}
  function startHop(from,to,h,dur,now){hop={from:{...from},to:{...to},h,dur,t0:now};}

  rowEl.style.opacity='0';
  moveLogo(-300,0,1,1,0,0);

  function frame(now) {
    if (!t0) t0=now;
    const el=now-t0;

    // Letter squishes
    for (let i=0;i<spans.length;i++) {
      if (lsq[i].at<0) continue;
      const t=clamp((now-lsq[i].at)/SQ,0,1);
      const [sx,sy]=spring(t);
      spans[i].style.transform=`scaleX(${sx}) scaleY(${sy})`;
      spans[i].style.color=t<.28?'rgba(110,168,255,.9)':'rgba(255,255,255,.38)';
      if (t>=1){lsq[i].at=-1;spans[i].style.transform='';spans[i].style.color='';}
    }
    // Logo squish
    if (lsqAt>=0) {
      const t=clamp((now-lsqAt)/LOSQ,0,1);
      const [sx,sy]=spring(t);
      lsX=sx;lsY=sy;
      if (t>=1){lsqAt=-1;lsX=lsY=1;}
    }

    if (phase==='intro') {
      const t=clamp(el/INTRO,0,1);
      rowEl.style.opacity=t;
      moveLogo(-300,0,1,1,0,0);
      if (t>=1) {
        const lpos=spans.map(center), spos=center(slotEl);
        const last=spans.length-1;
        phase='hopping'; hopIdx=last; t0=now;
        startHop({x:lpos[last].x+60,y:spos.y},{x:lpos[last].x,y:spos.y},38,HOP,now);
        // store positions for later use
        frame._lpos=lpos; frame._spos=spos;
      }
    } else if (phase==='hopping') {
      const lpos=frame._lpos, spos=frame._spos;
      if (hop) {
        const ht=clamp((now-hop.t0)/hop.dur,0,1);
        const lx=lerp(hop.from.x,hop.to.x,ht);
        const ly=lerp(hop.from.y,hop.to.y,ht)-arc(ht,hop.h);
        const rot=(ht<.5?1:-1)*Math.sin(Math.PI*ht)*.22;
        const [sx,sy]=lsqAt>=0?[lsX,lsY]:airShape(ht);
        moveLogo(lx,ly,sx,sy,rot,1);
        if (ht>=1) {
          lsq[hopIdx].at=now; triggerLogoSq(now);
          const fx=hop.to.x, fy=hop.to.y;
          hopIdx--;
          if (hopIdx>=0) {
            startHop({x:fx,y:fy},{x:lpos[hopIdx].x,y:spos.y},38,HOP,now);
          } else {
            phase='final'; t0=now;
            startHop({x:fx,y:fy},{x:spos.x,y:spos.y},70,FINAL,now);
          }
        }
      }
    } else if (phase==='final') {
      const spos=frame._spos;
      if (hop) {
        const ht=clamp((now-hop.t0)/hop.dur,0,1);
        const lx=lerp(hop.from.x,hop.to.x,ht);
        const ly=lerp(hop.from.y,hop.to.y,ht)-arc(ht,hop.h);
        const rot=(ht<.5?1:-1)*Math.sin(Math.PI*ht)*.18;
        const [sx,sy]=lsqAt>=0?[lsX,lsY]:airShape(ht);
        moveLogo(lx,ly,sx,sy,rot,1);
        if (ht>=1) {
          phase='settled'; t0=now; triggerLogoSq(now);
          moveLogo(spos.x,spos.y,lsX,lsY,0,1);
          logoEl.classList.add('pb-glowing');
        }
      }
    } else if (phase==='settled') {
      const spos=frame._spos;
      moveLogo(spos.x,spos.y,lsX,lsY,0,1);
      return; // stop rAF
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ── n8n call ───────────────────────────────── */

async function callDashboard(payload) {
  const body = { email: state.email, password: state.password, ...payload };
  const res  = await fetch(CLIENT_CONFIG.dashboardUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err   = new Error('HTTP ' + res.status);
    err.status  = res.status;
    throw err;
  }
  return res.json();
}
