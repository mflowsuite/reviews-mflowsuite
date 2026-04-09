// ══════════════════════════════════════════════════════════
//  ⚙️  CONFIGURACIÓN — cambiá solo este bloque
// ══════════════════════════════════════════════════════════
const ADMIN_CONFIG = {
  n8nWebhook:    'https://fluky-n8n.lembgk.easypanel.host/webhook/admin-clients',
  uploadWebhook: 'https://fluky-n8n.lembgk.easypanel.host/webhook/upload-logo',
};
// ══════════════════════════════════════════════════════════

// ── Estado global ──────────────────────────────────────────
const state = {
  password:        sessionStorage.getItem('admin_pwd') || '',
  clients:         [],
  editingRecordId: null,   // null = nuevo, string = editar
};

// ── Estado QR ──────────────────────────────────────────────
const qr = { slug: '', name: '', dark: false };

function qrBuildUrl(slug, dark) {
  const data   = encodeURIComponent('https://reviews.mflowsuite.com/?clientId=' + slug);
  const colors = dark ? '&color=ffffff&bgcolor=1a1a2e' : '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600${colors}&data=${data}`;
}

function openQR(slug, name) {
  qr.slug = slug; qr.name = name; qr.dark = false;
  document.getElementById('qr-modal').style.display     = 'flex';
  document.getElementById('qr-modal-inner').style.background = '#fff';
  document.getElementById('qr-title').textContent       = name;
  document.getElementById('qr-img').src                 = qrBuildUrl(slug, false);
  document.getElementById('qr-mode-btn').textContent    = '🌙 Modo noche';
}

function closeQR(e) {
  if (!e || e.target === document.getElementById('qr-modal')) {
    document.getElementById('qr-modal').style.display = 'none';
  }
}

function toggleQRMode() {
  qr.dark = !qr.dark;
  const inner = document.getElementById('qr-modal-inner');
  inner.style.background = qr.dark ? '#1a1a2e' : '#fff';
  inner.style.color      = qr.dark ? '#fff' : 'var(--text)';
  document.getElementById('qr-img').src              = qrBuildUrl(qr.slug, qr.dark);
  document.getElementById('qr-mode-btn').textContent = qr.dark ? '☀️ Modo día' : '🌙 Modo noche';
}

async function downloadQR() {
  const btn = document.getElementById('qr-download-btn');
  btn.textContent = 'Descargando…';
  btn.disabled    = true;
  try {
    const res  = await fetch(qrBuildUrl(qr.slug, qr.dark));
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `qr-${qr.slug}${qr.dark ? '-dark' : ''}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally {
    btn.textContent = '⬇️ Descargar';
    btn.disabled    = false;
  }
}

function printQR() {
  const bg  = qr.dark ? '#1a1a2e' : '#ffffff';
  const fg  = qr.dark ? '#ffffff' : '#000000';
  const url = qrBuildUrl(qr.slug, qr.dark);
  const win = window.open('', '_blank', 'width=520,height=600');
  win.document.write(`<!DOCTYPE html><html><head><title>QR · ${qr.name}</title>
  <style>
    body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;background:${bg};color:${fg};font-family:sans-serif}
    img{width:380px;height:380px;display:block}
    p{margin-top:1rem;font-size:1.1rem;font-weight:700;text-align:center}
    small{font-size:.75rem;opacity:.6;margin-top:.3rem}
    @media print{body{min-height:unset}}
  </style></head><body>
  <img src="${url}" />
  <p>${qr.name}</p>
  <small>reviews.mflowsuite.com/?clientId=${qr.slug}</small>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}<\/script>
  </body></html>`);
  win.document.close();
}

// ══════════════════════════════════════════════════════════
//  PANTALLAS
// ══════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

// ══════════════════════════════════════════════════════════
//  UPLOAD LOGO
// ══════════════════════════════════════════════════════════
async function uploadLogo(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const statusEl = document.getElementById('logo-upload-status');
  statusEl.textContent = '⏳ Subiendo…';
  statusEl.style.color = 'var(--muted)';

  // Redimensionar si es muy grande (max 800px)
  let base64;
  try {
    base64 = await resizeAndEncode(file, 800);
  } catch {
    base64 = await fileToBase64(file);
  }

  try {
    const res  = await fetch(ADMIN_CONFIG.uploadWebhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: state.password, fileData: base64, filename: file.name }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Auto-rellenar el campo URL
    document.getElementById('f-logoUrl').value = data.url;
    statusEl.textContent = '✅ Logo subido';
    statusEl.style.color = 'var(--success)';
    // Preview
    const preview = document.getElementById('logo-preview');
    if (preview) { preview.src = data.url; preview.style.display = 'block'; }
  } catch (e) {
    statusEl.textContent = `❌ Error: ${e.message}`;
    statusEl.style.color = 'var(--danger)';
  }

  inputEl.value = ''; // reset input
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateLogoPreview(url) {
  const preview = document.getElementById('logo-preview');
  if (!preview) return;
  if (url && url.startsWith('http')) {
    preview.src = url;
    preview.style.display = 'block';
    preview.onerror = () => { preview.style.display = 'none'; };
  } else {
    preview.style.display = 'none';
  }
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

// ══════════════════════════════════════════════════════════
//  CALL n8n helper
// ══════════════════════════════════════════════════════════
async function callN8n(payload) {
  const res = await fetch(ADMIN_CONFIG.n8nWebhook, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ key: state.password, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ══════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════
async function doLogin() {
  const pwd     = document.getElementById('inp-password').value.trim();
  const alertEl = document.getElementById('login-alert');
  alertEl.style.display = 'none';

  if (!pwd) {
    showLoginError('Ingresá la clave de acceso.');
    return;
  }

  // Validar clave contra n8n (que a su vez llama a Airtable)
  state.password = pwd;
  try {
    const data = await callN8n({ action: 'list' });
    if (data.error === 'Unauthorized') throw new Error('unauthorized');
    // Login OK
    sessionStorage.setItem('admin_pwd', pwd);
    state.clients = (data.records || []);
    renderList();
    showScreen('list');
  } catch (e) {
    state.password = '';
    if (e.message === 'unauthorized') {
      showLoginError('Clave incorrecta.');
    } else {
      showLoginError('No se pudo conectar al servidor. Intentá de nuevo.');
      console.error(e);
    }
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-alert');
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogout() {
  sessionStorage.removeItem('admin_pwd');
  state.password = '';
  state.clients  = [];
  showScreen('login');
}

// ══════════════════════════════════════════════════════════
//  LISTA DE CLIENTES
// ══════════════════════════════════════════════════════════
async function loadClients() {
  showScreen('list');
  document.getElementById('list-loading').style.display = 'block';
  document.getElementById('clients-grid').style.display = 'none';

  try {
    const data = await callN8n({ action: 'list' });
    state.clients = data.records || [];
    renderList();
  } catch (e) {
    document.getElementById('list-loading').innerHTML =
      `<p style="color:var(--danger)">Error al cargar clientes: ${e.message}</p>`;
  }
}

function renderList() {
  document.getElementById('list-loading').style.display = 'none';
  const grid = document.getElementById('clients-grid');
  grid.style.display = 'grid';

  if (!state.clients.length) {
    grid.innerHTML = '<div class="empty-state">No hay clientes todavía.<br>¡Creá el primero! 🚀</div>';
    return;
  }

  grid.innerHTML = state.clients.map(rec => {
    const f       = rec.fields;
    const name    = f.businessName || '—';
    const initial = name.charAt(0).toUpperCase();
    const slug    = f.clientId || '';
    const webUrl  = `https://reviews.mflowsuite.com/?clientId=${slug}`;

    const logo = f.logoUrl
      ? `<img class="cc-logo" src="${f.logoUrl}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="cc-logo-placeholder" style="display:none">${initial}</div>`
      : `<div class="cc-logo-placeholder">${initial}</div>`;

    return `
      <div class="client-card">
        <div class="cc-header">
          ${logo}
          <div style="flex:1;min-width:0">
            <div class="cc-name">${name}</div>
            <div class="cc-industry">${f.industry || ''}</div>
          </div>
          <span class="badge ${f.active ? 'badge-on' : 'badge-off'}">${f.active ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div class="cc-slug">${slug}</div>
        <div class="cc-actions">
          <button class="btn btn-outline btn-sm" onclick="openForm('${rec.id}')">✏️ Editar</button>
          <button class="btn btn-outline btn-sm" onclick="openQR('${slug}','${name.replace(/'/g,"\\'")}')" >📱 QR</button>
          <a class="btn btn-outline btn-sm" href="${webUrl}" target="_blank">👁️ Ver</a>
        </div>
      </div>`;
  }).join('');
}

function goBackToList() {
  loadClients();
}

// ══════════════════════════════════════════════════════════
//  FORMULARIO
// ══════════════════════════════════════════════════════════
function openForm(recordId) {
  state.editingRecordId = recordId;
  document.getElementById('form-alert').style.display = 'none';
  document.getElementById('save-status').textContent  = '';

  if (recordId) {
    const rec = state.clients.find(r => r.id === recordId);
    if (!rec) return;
    populateForm(rec.fields);
    document.getElementById('form-title').textContent = rec.fields.businessName || 'Editar cliente';
  } else {
    clearForm();
    document.getElementById('form-title').textContent = 'Nuevo cliente';
  }

  showScreen('form');
  window.scrollTo(0, 0);
}

function clearForm() {
  populateForm({
    businessName:       '',
    clientId:           '',
    industry:           '',
    language:           'es-ES',
    accentColor:        '#6C63FF',
    active:             true,
    logoUrl:            '',
    googleReviewUrl:    '',
    photoUploadEnabled: false,
    photoPromptText:    '',
    incentiveEnabled:   false,
    incentiveText:      '',
    suggestedReviewText:'',
    aiTopics:           '',
    aiTones:            '',
    aiStyles:           '',
    aiMaxSentences:     2,
    aiExtraInstructions:'',
  });
}

function populateForm(f) {
  set('f-businessName',       f.businessName       || '');
  set('f-clientId',           f.clientId           || '');
  set('f-industry',           f.industry           || '');
  set('f-language',           f.language           || 'es-ES');
  set('f-logoUrl',            f.logoUrl            || '');
  updateLogoPreview(f.logoUrl || '');
  set('f-googleReviewUrl',    f.googleReviewUrl    || '');
  set('f-photoPromptText',    f.photoPromptText    || '');
  set('f-incentiveText',      f.incentiveText      || '');
  set('f-suggestedReviewText',f.suggestedReviewText|| '');
  set('f-aiTopics',           f.aiTopics           || '');
  set('f-aiTones',            f.aiTones            || '');
  set('f-aiStyles',           f.aiStyles           || '');
  set('f-aiMaxSentences',     f.aiMaxSentences     || 2);
  set('f-aiExtraInstructions',f.aiExtraInstructions|| '');

  // Color
  const color = /^#[0-9a-fA-F]{6}$/.test(f.accentColor) ? f.accentColor : '#6C63FF';
  document.getElementById('f-accentColor').value   = color;
  document.getElementById('f-color-picker').value  = color;

  // Checkboxes
  document.getElementById('f-active').checked          = f.active !== false;
  document.getElementById('f-photoEnabled').checked    = !!f.photoUploadEnabled;
  document.getElementById('f-incentiveEnabled').checked= !!f.incentiveEnabled;

  // Secciones condicionales
  toggleSection('photo-fields',     !!f.photoUploadEnabled);
  toggleSection('incentive-fields', !!f.incentiveEnabled);

  // Slug preview
  document.getElementById('slug-preview').textContent = f.clientId || '…';
}

// Helper: set value en cualquier input/select/textarea
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── Auto-slug ───────────────────────────────────────────
function autoSlug() {
  if (state.editingRecordId) return; // No cambiar slug al editar
  const name = document.getElementById('f-businessName').value;
  const slug = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  document.getElementById('f-clientId').value  = slug;
  document.getElementById('slug-preview').textContent = slug || '…';
}

// ── Sincronización color picker ↔ hex ───────────────────
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

// ── Secciones condicionales ──────────────────────────────
function toggleSection(id, show) {
  document.getElementById(id).style.display = show ? 'block' : 'none';
}

// ══════════════════════════════════════════════════════════
//  GUARDAR CLIENTE
// ══════════════════════════════════════════════════════════
async function saveClient() {
  const btn      = document.getElementById('save-btn');
  const statusEl = document.getElementById('save-status');
  const alertEl  = document.getElementById('form-alert');

  alertEl.style.display  = 'none';
  statusEl.textContent   = '';
  btn.disabled           = true;
  btn.textContent        = 'Guardando…';

  // ── Leer todos los campos del form ──
  const fields = {
    clientId:            document.getElementById('f-clientId').value.trim(),
    businessName:        document.getElementById('f-businessName').value.trim(),
    industry:            document.getElementById('f-industry').value.trim(),
    language:            document.getElementById('f-language').value,
    accentColor:         document.getElementById('f-accentColor').value.trim(),
    active:              document.getElementById('f-active').checked,
    logoUrl:             document.getElementById('f-logoUrl').value.trim(),
    googleReviewUrl:     document.getElementById('f-googleReviewUrl').value.trim(),
    photoUploadEnabled:  document.getElementById('f-photoEnabled').checked,
    photoPromptText:     document.getElementById('f-photoPromptText').value.trim(),
    incentiveEnabled:    document.getElementById('f-incentiveEnabled').checked,
    incentiveText:       document.getElementById('f-incentiveText').value.trim(),
    suggestedReviewText: document.getElementById('f-suggestedReviewText').value.trim(),
    aiTopics:            document.getElementById('f-aiTopics').value.trim(),
    aiTones:             document.getElementById('f-aiTones').value.trim(),
    aiStyles:            document.getElementById('f-aiStyles').value.trim(),
    aiMaxSentences:      parseInt(document.getElementById('f-aiMaxSentences').value) || 2,
    aiExtraInstructions: document.getElementById('f-aiExtraInstructions').value.trim(),
  };

  // ── Validación básica ──
  if (!fields.clientId || !fields.businessName) {
    showFormAlert('El nombre del negocio y el Client ID son obligatorios.');
    btn.disabled = false;
    btn.textContent = 'Guardar cliente';
    return;
  }

  // ── Fecha de creación (solo al crear) ──
  if (!state.editingRecordId) {
    fields.createdAt = new Date().toISOString().split('T')[0];
  }

  // ── Limpiar campos vacíos opcionales ──
  ['logoUrl','googleReviewUrl','photoPromptText','incentiveText',
   'suggestedReviewText','aiTopics','aiTones','aiStyles','aiExtraInstructions',
   'industry'].forEach(k => {
    if (fields[k] === '') delete fields[k];
  });

  try {
    const data = await callN8n({
      action:   'save',
      recordId: state.editingRecordId || null,
      fields,
    });

    // ── Actualizar estado local ──
    if (state.editingRecordId) {
      const idx = state.clients.findIndex(r => r.id === state.editingRecordId);
      if (idx >= 0) state.clients[idx] = data;
    } else {
      state.editingRecordId = data.id;
      state.clients.push(data);
      document.getElementById('form-title').textContent = fields.businessName;
    }

    statusEl.textContent = '✅ Guardado correctamente';
    statusEl.style.color = 'var(--success)';
    setTimeout(() => goBackToList(), 1400);

  } catch (e) {
    showFormAlert(`Error al guardar: ${e.message}`);
    console.error(e);
  }

  btn.disabled    = false;
  btn.textContent = 'Guardar cliente';
}

function showFormAlert(msg) {
  const el = document.getElementById('form-alert');
  el.textContent = msg;
  el.className   = 'alert alert-error';
  el.style.display = 'block';
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════════════
(function init() {
  // Enter en login hace submit
  document.getElementById('inp-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  showScreen('login');
})();
