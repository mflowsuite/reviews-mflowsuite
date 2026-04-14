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
  const inner = document.getElementById('qr-modal-inner');
  document.getElementById('qr-modal').style.display = 'flex';
  inner.style.background = '#fff';
  inner.style.color      = '';
  inner.querySelectorAll('.btn-outline').forEach(btn => {
    btn.style.color = ''; btn.style.borderColor = '';
  });
  document.getElementById('qr-title').textContent    = name;
  document.getElementById('qr-img').src              = qrBuildUrl(slug, false);
  document.getElementById('qr-mode-btn').textContent = '🌙 Modo noche';
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
  inner.querySelectorAll('.btn-outline').forEach(btn => {
    btn.style.color       = qr.dark ? '#fff' : '';
    btn.style.borderColor = qr.dark ? 'rgba(255,255,255,0.35)' : '';
  });
  document.getElementById('qr-img').src              = qrBuildUrl(qr.slug, qr.dark);
  document.getElementById('qr-mode-btn').textContent = qr.dark ? '☀️ Modo día' : '🌙 Modo noche';
}

async function downloadQR() {
  const btn = document.getElementById('qr-download-btn');
  btn.textContent = 'Descargando…';
  btn.disabled    = true;
  try {
    // Usa la URL exacta del img mostrado — evita mismatch dark/light
    const imgSrc  = document.getElementById('qr-img').src;
    const isDark  = imgSrc.includes('bgcolor=');
    const res     = await fetch(imgSrc);
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = blobUrl;
    a.download    = `qr-${qr.slug}${isDark ? '-dark' : ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revocar después de que la descarga inicie (no inmediatamente)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch {
    // Fallback: abrir en nueva pestaña para descarga manual
    window.open(document.getElementById('qr-img').src, '_blank');
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const res = await fetch(ADMIN_CONFIG.n8nWebhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: state.password, ...payload }),
      signal:  controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tiempo de espera agotado. Verificá tu conexión.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ══════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════
async function doLogin() {
  const pwd     = document.getElementById('inp-password').value.trim();
  const alertEl = document.getElementById('login-alert');
  const btn     = document.getElementById('login-btn');
  alertEl.style.display = 'none';

  if (!pwd) {
    showLoginError('Ingresá la clave de acceso.');
    return;
  }

  // Estado de carga
  btn.disabled    = true;
  btn.textContent = 'Conectando…';

  state.password = pwd;
  try {
    const data = await callN8n({ action: 'list' });
    if (data.error === 'Unauthorized') throw new Error('unauthorized');
    sessionStorage.setItem('admin_pwd', pwd);
    state.clients = (data.records || []);
    renderList();
    showScreen('list');
  } catch (e) {
    state.password = '';
    if (e.message === 'unauthorized') {
      showLoginError('Clave incorrecta.');
    } else {
      showLoginError(`Error: ${e.message}`);
      console.error(e);
    }
    btn.disabled    = false;
    btn.textContent = 'Entrar →';
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

  const clientIdEl = document.getElementById('f-clientId');

  if (recordId) {
    const rec = state.clients.find(r => r.id === recordId);
    if (!rec) return;
    populateForm(rec.fields);
    document.getElementById('form-title').textContent = rec.fields.businessName || 'Editar cliente';
    // Bloquear clientId: es inmutable una vez creado
    clientIdEl.readOnly = true;
    clientIdEl.style.background = '#f3f4f6';
    clientIdEl.style.cursor     = 'not-allowed';
    clientIdEl.title = 'El Client ID no se puede cambiar — está en uso por URLs y QR codes';
  } else {
    clearForm();
    document.getElementById('form-title').textContent = 'Nuevo cliente';
    // Habilitar clientId para nuevos clientes
    clientIdEl.readOnly = false;
    clientIdEl.style.background = '';
    clientIdEl.style.cursor     = '';
    clientIdEl.title = '';
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
    notificationEmail:  '',
    photoUploadEnabled: false,
    photoPromptText:    '',
    incentiveEnabled:      false,
    incentiveText:         '',
    incentiveButtonText:   '',
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
  set('f-language',           f.language           || 'Español España');
  updateAIPlaceholders(f.language || 'Español España');
  set('f-logoUrl',            f.logoUrl            || '');
  updateLogoPreview(f.logoUrl || '');
  set('f-googleReviewUrl',    f.googleReviewUrl    || '');
  set('f-notificationEmail',  f.notificationEmail  || '');
  set('f-photoPromptText',    f.photoPromptText    || '');
  set('f-incentiveText',         f.incentiveText         || '');
  set('f-incentiveButtonText',   f.incentiveButtonText   || '');
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

// ── Placeholders IA según idioma ────────────────────────
const AI_PLACEHOLDERS = {
  'Inglés': {
    suggestedReviewText: 'E.g.: Amazing ice cream and very friendly service. Totally recommended!',
    aiTopics:            'E.g.:\nflavor variety\nfriendly service\ncozy atmosphere\nvalue for money',
    aiTones:             'E.g.:\nenthusiastic\ncasual and friendly\nbrief and direct',
    aiStyles:            'E.g.:\nStart with the standout thing\nStart with how you felt\nStart with a recommendation',
    aiExtraInstructions: 'E.g.: Mention the business name naturally.',
  },
  default: {
    suggestedReviewText: 'Ej: Los helados están buenísimos y la atención es muy amable. ¡Lo recomiendo!',
    aiTopics:            'Ej:\nvariedad de sabores\natención amable\nambiente agradable\nrelación precio-calidad',
    aiTones:             'Ej:\nentusiasta\ncasual y amigable\nbreve y directo',
    aiStyles:            'Ej:\nEmpezar por lo que más destacó\nEmpezar con cómo te sentiste\nEmpezar con una recomendación',
    aiExtraInstructions: 'Ej: Mencionar el nombre del negocio de forma natural.',
  },
};

function updateAIPlaceholders(lang) {
  const ph = AI_PLACEHOLDERS[lang] || AI_PLACEHOLDERS['default'];
  const fields = ['suggestedReviewText', 'aiTopics', 'aiTones', 'aiStyles', 'aiExtraInstructions'];
  fields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.placeholder = ph[f];
  });
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
    notificationEmail:   document.getElementById('f-notificationEmail').value.trim(),
    photoUploadEnabled:  document.getElementById('f-photoEnabled').checked,
    photoPromptText:     document.getElementById('f-photoPromptText').value.trim(),
    incentiveEnabled:      document.getElementById('f-incentiveEnabled').checked,
    incentiveText:         document.getElementById('f-incentiveText').value.trim(),
    incentiveButtonText:   document.getElementById('f-incentiveButtonText').value.trim(),
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

  // ── Campos vacíos → null para que Airtable los borre (no omitir del PATCH) ──
  ['logoUrl','googleReviewUrl','notificationEmail','photoPromptText','incentiveText','incentiveButtonText',
   'suggestedReviewText','aiTopics','aiTones','aiStyles','aiExtraInstructions',
   'industry'].forEach(k => {
    if (fields[k] === '') fields[k] = null;
  });
  if (!fields.aiMaxSentences || fields.aiMaxSentences < 1) fields.aiMaxSentences = null;

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

/* ── Powered-by animation (login screen) ─────────────── */
let pbAnimStarted = false;

// ══════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════════════
(function init() {
  // Enter en login hace submit
  document.getElementById('inp-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Actualizar placeholders de IA cuando cambia el idioma
  const langSelect = document.getElementById('f-language');
  if (langSelect) {
    langSelect.addEventListener('change', () => updateAIPlaceholders(langSelect.value));
  }

  // Placeholders iniciales (español por defecto)
  updateAIPlaceholders('Español España');

  showScreen('login');

  // Mostrar pb-bar y arrancar animación
  const pbBar = document.getElementById('pb-bar');
  if (pbBar) { pbBar.classList.add('pb-visible'); startPbAnimation(); }
})();

function startPbAnimation() {
  if (pbAnimStarted) return;
  const logoEl = document.getElementById('pb-logo');
  if (!logoEl) return;
  if (!logoEl.complete || logoEl.naturalWidth === 0) {
    logoEl.onload = () => { pbAnimStarted = false; startPbAnimation(); };
    return;
  }
  pbAnimStarted = true;
  _runPbAnim();
}
function _runPbAnim() {
  const BRAND='MFlowSuite', SZ=20, HOP=200, FINAL=520, SQ=380, LOSQ=400, INTRO=500;
  const sceneEl=document.getElementById('pb-scene'), rowEl=document.getElementById('pb-row');
  const charsEl=document.getElementById('pb-chars'), slotEl=document.getElementById('pb-slot');
  const logoEl=document.getElementById('pb-logo');
  if (!sceneEl||!logoEl) return;
  charsEl.innerHTML='';
  const spans=[];
  for (const ch of BRAND){const s=document.createElement('span');s.className='pb-ch';s.textContent=ch;charsEl.appendChild(s);spans.push(s);}
  const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), arc=(t,h)=>4*h*t*(1-t);
  function spring(t){if(t<.15){const r=t/.15;return[lerp(1,1.35,r),lerp(1,.55,r)];}if(t<.40){const r=(t-.15)/.25;return[lerp(1.35,.88,r),lerp(.55,1.22,r)];}if(t<.70){const r=(t-.40)/.30;return[lerp(.88,1.04,r),lerp(1.22,.96,r)];}const r=(t-.70)/.30;return[lerp(1.04,1,r),lerp(.96,1,r)];}
  function airShape(t){if(t<.45)return[lerp(1,.84,t/.45),lerp(1,1.2,t/.45)];if(t<.82)return[.84,1.2];const r=(t-.82)/.18;return[lerp(.84,1.28,r),lerp(1.2,.68,r)];}
  function center(el){const er=el.getBoundingClientRect(),sr=sceneEl.getBoundingClientRect();return{x:er.left-sr.left+er.width/2,y:er.top-sr.top+er.height/2};}
  function moveLogo(cx,cy,sx,sy,rot,alpha){logoEl.style.transform=`translate(${cx-SZ/2}px,${cy-SZ/2}px) rotate(${rot}rad) scale(${sx},${sy})`;logoEl.style.opacity=alpha;}
  let phase='intro',t0=null,hopIdx=0,hop=null;
  const lsq=spans.map(()=>({at:-1}));let lsqAt=-1,lsX=1,lsY=1;
  function triggerLogoSq(now){lsqAt=now;lsX=1.3;lsY=0.62;}
  function startHop(from,to,h,dur,now){hop={from:{...from},to:{...to},h,dur,t0:now};}
  rowEl.style.opacity='0'; moveLogo(-300,0,1,1,0,0);
  function frame(now){
    if(!t0)t0=now; const el=now-t0;
    for(let i=0;i<spans.length;i++){if(lsq[i].at<0)continue;const t=clamp((now-lsq[i].at)/SQ,0,1);const[sx,sy]=spring(t);spans[i].style.transform=`scaleX(${sx}) scaleY(${sy})`;spans[i].style.color=t<.28?'rgba(110,168,255,.9)':'rgba(255,255,255,.38)';if(t>=1){lsq[i].at=-1;spans[i].style.transform='';spans[i].style.color='';}}
    if(lsqAt>=0){const t=clamp((now-lsqAt)/LOSQ,0,1);const[sx,sy]=spring(t);lsX=sx;lsY=sy;if(t>=1){lsqAt=-1;lsX=lsY=1;}}
    if(phase==='intro'){const t=clamp(el/INTRO,0,1);rowEl.style.opacity=t;moveLogo(-300,0,1,1,0,0);if(t>=1){const lpos=spans.map(center),spos=center(slotEl);const last=spans.length-1;phase='hopping';hopIdx=last;t0=now;startHop({x:lpos[last].x+60,y:spos.y},{x:lpos[last].x,y:spos.y},38,HOP,now);frame._lpos=lpos;frame._spos=spos;}}
    else if(phase==='hopping'){const lpos=frame._lpos,spos=frame._spos;if(hop){const ht=clamp((now-hop.t0)/hop.dur,0,1);const lx=lerp(hop.from.x,hop.to.x,ht),ly=lerp(hop.from.y,hop.to.y,ht)-arc(ht,hop.h);const rot=(ht<.5?1:-1)*Math.sin(Math.PI*ht)*.22;const[sx,sy]=lsqAt>=0?[lsX,lsY]:airShape(ht);moveLogo(lx,ly,sx,sy,rot,1);if(ht>=1){lsq[hopIdx].at=now;triggerLogoSq(now);const fx=hop.to.x,fy=hop.to.y;hopIdx--;if(hopIdx>=0){startHop({x:fx,y:fy},{x:lpos[hopIdx].x,y:spos.y},38,HOP,now);}else{phase='final';t0=now;startHop({x:fx,y:fy},{x:spos.x,y:spos.y},70,FINAL,now);}}}}
    else if(phase==='final'){const spos=frame._spos;if(hop){const ht=clamp((now-hop.t0)/hop.dur,0,1);const lx=lerp(hop.from.x,hop.to.x,ht),ly=lerp(hop.from.y,hop.to.y,ht)-arc(ht,hop.h);const rot=(ht<.5?1:-1)*Math.sin(Math.PI*ht)*.18;const[sx,sy]=lsqAt>=0?[lsX,lsY]:airShape(ht);moveLogo(lx,ly,sx,sy,rot,1);if(ht>=1){phase='settled';t0=now;triggerLogoSq(now);moveLogo(spos.x,spos.y,lsX,lsY,0,1);logoEl.classList.add('pb-glowing');}}}
    else if(phase==='settled'){const spos=frame._spos;moveLogo(spos.x,spos.y,lsX,lsY,0,1);return;}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
