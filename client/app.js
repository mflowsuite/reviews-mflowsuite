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

/* ── Utilities ─────────────────────────────────────── */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? '' : 'none';
}

function setLoadingBtn(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = '…';
  } else {
    btn.textContent = btn.dataset.origText || originalText || btn.textContent;
  }
}

function reviewUrl(clientId) {
  return CLIENT_CONFIG.reviewsBase + '?clientId=' + encodeURIComponent(clientId);
}

function qrUrl(url) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
}

/* ── Init ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-login if credentials in sessionStorage
  if (state.email && state.password) {
    autoLogin();
  }

  // Register form submit
  document.getElementById('register-form').addEventListener('submit', e => {
    e.preventDefault();
    doRegister();
  });

  // Login form submit
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin();
  });
});

async function autoLogin() {
  showScreen('screen-register-loading');
  document.querySelector('#screen-register-loading .loading-text').textContent = 'Cargando tu panel…';
  try {
    const data = await callDashboard({ action: 'get' });
    state.client = data.client;
    populateDashboard(data.client);
    showScreen('screen-dashboard');
  } catch (err) {
    // Credentials invalid or expired — clear and show welcome
    sessionStorage.removeItem('client_email');
    sessionStorage.removeItem('client_pwd');
    state.email = '';
    state.password = '';
    showScreen('screen-welcome');
  }
}

/* ── Register ───────────────────────────────────────── */

async function doRegister() {
  setError('register-error', '');
  const businessName = document.getElementById('reg-business-name').value.trim();
  const industry     = document.getElementById('reg-industry').value.trim();
  const language     = document.getElementById('reg-language').value;
  const googleUrl    = document.getElementById('reg-google-url').value.trim();
  const email        = document.getElementById('reg-email').value.trim().toLowerCase();
  const password     = document.getElementById('reg-password').value;
  const aiHint       = document.getElementById('reg-ai-hint').value.trim();

  if (!businessName) return setError('register-error', 'Ingresá el nombre del negocio.');
  if (!industry)     return setError('register-error', 'Ingresá el rubro del negocio.');
  if (!email || !email.includes('@')) return setError('register-error', 'Ingresá un email válido.');
  if (password.length < 6) return setError('register-error', 'La contraseña debe tener al menos 6 caracteres.');

  setLoadingBtn('register-btn', true);
  showScreen('screen-register-loading');

  try {
    const res = await fetch(CLIENT_CONFIG.registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, industry, language, googleReviewUrl: googleUrl, email, password, aiHint }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoadingBtn('register-btn', false, 'Crear mi página →');
      showScreen('screen-register');
      if (data.error === 'email_exists') {
        setError('register-error', 'Ya existe una cuenta con ese email. Iniciá sesión.');
      } else {
        setError('register-error', 'Error al crear la página. Intentá de nuevo.');
      }
      return;
    }

    // Success — save credentials and show setup-done
    state.email    = email;
    state.password = password;
    sessionStorage.setItem('client_email', email);
    sessionStorage.setItem('client_pwd', password);

    const url = reviewUrl(data.clientId);
    document.getElementById('setup-url').textContent = url;
    document.getElementById('setup-qr').src = qrUrl(url);
    document.getElementById('setup-preview-text').textContent = data.suggestedReviewText || '—';

    // Store clientId for goToDashboard
    state._newClientId = data.clientId;

    setLoadingBtn('register-btn', false, 'Crear mi página →');
    showScreen('screen-setup-done');

  } catch (err) {
    setLoadingBtn('register-btn', false, 'Crear mi página →');
    showScreen('screen-register');
    setError('register-error', 'Error de conexión. Revisá tu internet e intentá de nuevo.');
  }
}

function copySetupUrl() {
  const url = document.getElementById('setup-url').textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  document.getElementById('setup-url').textContent = '¡Copiado!';
  setTimeout(() => { document.getElementById('setup-url').textContent = url; }, 1500);
}

async function goToDashboard() {
  showScreen('screen-register-loading');
  document.querySelector('#screen-register-loading .loading-text').textContent = 'Cargando tu panel…';
  try {
    const data = await callDashboard({ action: 'get' });
    state.client = data.client;
    populateDashboard(data.client);
    showScreen('screen-dashboard');
  } catch (err) {
    showScreen('screen-login');
  }
}

/* ── Login ──────────────────────────────────────────── */

async function doLogin() {
  setError('login-error', '');
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (!email || !email.includes('@')) return setError('login-error', 'Ingresá un email válido.');
  if (!password) return setError('login-error', 'Ingresá tu contraseña.');

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
    showScreen('screen-dashboard');
  } catch (err) {
    setLoadingBtn('login-btn', false, 'Entrar →');
    const msg = err.status === 401
      ? 'Email o contraseña incorrectos.'
      : 'Error de conexión. Intentá de nuevo.';
    setError('login-error', msg);
    state.email    = '';
    state.password = '';
  }
}

function doLogout() {
  sessionStorage.removeItem('client_email');
  sessionStorage.removeItem('client_pwd');
  state.email    = '';
  state.password = '';
  state.client   = null;
  showScreen('screen-welcome');
}

/* ── Dashboard ──────────────────────────────────────── */

function populateDashboard(client) {
  if (!client) return;

  const clientId = client.clientId || '';
  const url = reviewUrl(clientId);

  // Nav
  document.getElementById('dash-business-name').textContent = client.businessName || '—';

  // URL + QR
  document.getElementById('dash-url').textContent = url;
  document.getElementById('dash-url-link').href = url;
  document.getElementById('dash-qr').src = qrUrl(url);

  // Mi negocio
  setField('d-business-name',  client.businessName   || '');
  setField('d-industry',       client.industry        || '');
  setSelect('d-language',      client.language        || 'es-AR');
  document.getElementById('d-accent-color').value = client.accentColor || '#6C63FF';

  if (client.logoUrl) {
    const img = document.getElementById('logo-preview');
    img.src = client.logoUrl;
    img.style.display = '';
  }

  // Links
  setField('d-google-url',         client.googleReviewUrl   || '');
  setField('d-notification-email', client.notificationEmail || '');

  // Texto
  setField('d-suggested-review', client.suggestedReviewText || '');

  // IA
  setField('d-ai-topics',       client.aiTopics            || '');
  setField('d-ai-tones',        client.aiTones             || '');
  setField('d-ai-styles',       client.aiStyles            || '');
  setField('d-ai-max-sentences', client.aiMaxSentences != null ? String(client.aiMaxSentences) : '2');
  setField('d-ai-extra',        client.aiExtraInstructions || '');

  // Incentivo
  document.getElementById('d-incentive-enabled').checked = !!client.incentiveEnabled;
  setField('d-incentive-text',   client.incentiveText       || '');
  setField('d-incentive-button', client.incentiveButtonText || '');

  // Foto
  document.getElementById('d-photo-enabled').checked = !!client.photoUploadEnabled;
  setField('d-photo-prompt', client.photoPromptText || '');

  // Apply accent color
  if (client.accentColor) {
    document.documentElement.style.setProperty('--accent', client.accentColor);
  }
}

function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setSelect(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  for (const opt of el.options) {
    if (opt.value === val) { opt.selected = true; break; }
  }
}

async function saveDashboard() {
  const btn = document.getElementById('dash-save-btn');
  const status = document.getElementById('dash-save-status');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  status.textContent = '';

  const optionalText = k => {
    const v = (document.getElementById(k)?.value || '').trim();
    return v === '' ? null : v;
  };

  const fields = {
    businessName:        (document.getElementById('d-business-name')?.value || '').trim() || null,
    industry:            optionalText('d-industry'),
    language:            document.getElementById('d-language')?.value || null,
    accentColor:         optionalText('d-accent-color'),
    googleReviewUrl:     optionalText('d-google-url'),
    notificationEmail:   optionalText('d-notification-email'),
    suggestedReviewText: optionalText('d-suggested-review'),
    aiTopics:            optionalText('d-ai-topics'),
    aiTones:             optionalText('d-ai-tones'),
    aiStyles:            optionalText('d-ai-styles'),
    aiExtraInstructions: optionalText('d-ai-extra'),
    incentiveEnabled:    document.getElementById('d-incentive-enabled')?.checked || false,
    incentiveText:       optionalText('d-incentive-text'),
    incentiveButtonText: optionalText('d-incentive-button'),
    photoUploadEnabled:  document.getElementById('d-photo-enabled')?.checked || false,
    photoPromptText:     optionalText('d-photo-prompt'),
  };

  // aiMaxSentences
  const maxS = parseInt(document.getElementById('d-ai-max-sentences')?.value || '', 10);
  fields.aiMaxSentences = (maxS >= 1) ? maxS : null;

  // logoUrl from current preview if changed
  const logoPreview = document.getElementById('logo-preview');
  if (logoPreview && logoPreview.dataset.newUrl) {
    fields.logoUrl = logoPreview.dataset.newUrl;
  }

  try {
    await callDashboard({ action: 'save', fields });
    // Update local accent color
    if (fields.accentColor) {
      document.documentElement.style.setProperty('--accent', fields.accentColor);
    }
    document.getElementById('dash-business-name').textContent = fields.businessName || '—';
    status.textContent = '✓ Cambios guardados';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) {
    status.style.color = '#e53935';
    status.textContent = '✗ Error al guardar. Intentá de nuevo.';
    setTimeout(() => { status.style.color = '#4CAF50'; status.textContent = ''; }, 4000);
  }

  btn.disabled = false;
  btn.textContent = 'Guardar cambios';
}

/* ── Logo upload ────────────────────────────────────── */

async function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;

  const label = document.getElementById('logo-upload-text');
  label.textContent = 'Subiendo…';

  try {
    // Resize with canvas (max 800px)
    const MAX_PX = 800;
    const bitmap = await createImageBitmap(file);
    let { width: w, height: h } = bitmap;
    if (w > MAX_PX || h > MAX_PX) {
      const ratio = Math.min(MAX_PX / w, MAX_PX / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const base64 = canvas.toDataURL('image/png').split(',')[1];

    const res = await fetch(CLIENT_CONFIG.uploadWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'Mflow@dmin25',
        filename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
        data: base64,
      }),
    });

    if (!res.ok) throw new Error('Upload failed');
    const result = await res.json();
    const logoUrl = result.url || result.logoUrl || '';

    if (logoUrl) {
      const img = document.getElementById('logo-preview');
      img.src = logoUrl;
      img.style.display = '';
      img.dataset.newUrl = logoUrl;
      label.textContent = '✓ Logo subido';
    } else {
      label.textContent = '📷 Subir logo';
    }
  } catch (err) {
    label.textContent = '✗ Error al subir';
    setTimeout(() => { label.textContent = '📷 Subir logo'; }, 3000);
  }
}

/* ── QR Download ────────────────────────────────────── */

function downloadQR() {
  const url = document.getElementById('dash-url').textContent;
  const qr  = qrUrl(url);
  const a   = document.createElement('a');
  a.href     = qr;
  a.download = 'qr-reviews.png';
  a.target   = '_blank';
  a.click();
}

function copyDashUrl() {
  const url = document.getElementById('dash-url').textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  const el = document.getElementById('dash-url');
  const orig = el.textContent;
  el.textContent = '¡Copiado!';
  setTimeout(() => { el.textContent = orig; }, 1500);
}

/* ── n8n API call ───────────────────────────────────── */

async function callDashboard(payload) {
  const body = { email: state.email, password: state.password, ...payload };
  const res = await fetch(CLIENT_CONFIG.dashboardUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
