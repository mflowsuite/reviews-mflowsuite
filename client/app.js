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
