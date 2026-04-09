/* ============================================================
   CONFIGURACIÓN — edita estas URLs cuando tengas n8n listo
   ============================================================ */
const CONFIG = {
  N8N_CONFIG_URL:   'https://fluky-n8n.lembgk.easypanel.host/webhook/get-client-config',
  N8N_GENERATE_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/generate-review-text',
  N8N_FEEDBACK_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/save-feedback',
  POSITIVE_MIN:     4,   // 4+ estrellas = flujo positivo
  PHOTO_MAX_PX:     1200, // máximo px para comprimir imagen
  PHOTO_QUALITY:    0.75, // calidad JPEG (0-1)
};

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const state = {
  clientId:        null,
  client:          null,
  selectedRating:  0,
  hoveredRating:   0,
  photoDataPos:    null, // base64 foto flujo positivo
  photoDataNeg:    null, // base64 foto flujo negativo
};

/* ============================================================
   TRADUCCIONES i18n
   ============================================================ */
const T = {
  'es-ES': {
    ratingQuestion:   '¿Cómo ha sido tu visita a {{businessName}}?',
    ratingLabels:     ['', 'Muy mala experiencia', 'Mala experiencia', 'Regular', 'Buena experiencia', '¡Excelente!'],
    pwHeadline:       '¡Qué alegría saberlo!',
    pwSubtitle:       '¿Nos regalas un minuto en Google? Tu opinión ayuda a muchas personas.',
    pwLabel:          'Aquí tienes un texto para tu reseña — puedes editarlo:',
    copyOpenBtn:      '📋 Copiar y abrir Google',
    skipLink:         'Prefiero no hacerlo ahora',
    tyPosHeadline:    '¡Muchas gracias!',
    tyPosBody:        'Tu reseña hace una gran diferencia para nosotros.',
    negHeadline:      'Lamentamos que no haya sido lo esperado',
    negSubtitle:      'Tu experiencia nos importa. Cuéntanos qué pasó y haremos todo lo posible por mejorar.',
    labelName:        'Tu nombre',
    labelContact:     'WhatsApp o email',
    labelComment:     '¿Qué podríamos mejorar?',
    phName:           '¿Cómo te llamas?',
    phContact:        'Para que podamos contactarte',
    phComment:        'Cuéntanos tu experiencia con confianza, leemos todo...',
    submitBtn:        'Enviar comentario',
    submitting:       'Enviando...',
    tyNegHeadline:    '¡Gracias por avisarnos!',
    tyNegBody:        'Recibimos tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo a la brevedad.',
    tyNegClosing:     'Gracias por darnos la oportunidad de mejorar 🙌',
    incentiveHeadline:'¡Un regalo para ti!',
    photoText:        '📷 Añadir foto (opcional)',
    errorRequired:    'Por favor completa todos los campos obligatorios.',
    errorSend:        'Hubo un problema al enviar. Por favor inténtalo de nuevo.',
  },
  'es-AR': {
    ratingQuestion:   '¿Cómo fue tu visita a {{businessName}}?',
    ratingLabels:     ['', 'Muy mala experiencia', 'Mala experiencia', 'Regular', 'Buena experiencia', '¡Excelente!'],
    pwHeadline:       '¡Qué alegría saberlo!',
    pwSubtitle:       '¿Nos regalás un minuto en Google? Tu opinión ayuda a que más personas nos encuentren.',
    pwLabel:          'Acá tenés un texto para tu reseña — podés editarlo:',
    copyOpenBtn:      '📋 Copiar y abrir Google',
    skipLink:         'Prefiero no hacerlo ahora',
    tyPosHeadline:    '¡Gracias de corazón!',
    tyPosBody:        'Tu reseña hace una gran diferencia para nosotros.',
    negHeadline:      'Lamentamos que no haya sido lo esperado',
    negSubtitle:      'Tu experiencia nos importa. Contanos qué pasó y haremos todo lo posible para mejorar.',
    labelName:        'Tu nombre',
    labelContact:     'WhatsApp o email',
    labelComment:     '¿Qué podríamos mejorar?',
    phName:           '¿Cómo te llamás?',
    phContact:        'Para que podamos contactarte',
    phComment:        'Contanos tu experiencia con confianza, leemos todo...',
    submitBtn:        'Enviar comentario',
    submitting:       'Enviando...',
    tyNegHeadline:    '¡Gracias por avisarnos!',
    tyNegBody:        'Recibimos tu mensaje. Un integrante de nuestro equipo se va a comunicar con vos a la brevedad.',
    tyNegClosing:     'Gracias por darnos la oportunidad de mejorar 🙌',
    incentiveHeadline:'¡Un regalo para vos!',
    photoText:        '📷 Agregar foto (opcional)',
    errorRequired:    'Por favor completá todos los campos obligatorios.',
    errorSend:        'Hubo un problema al enviar. Por favor intentá de nuevo.',
  },
  'en-US': {
    ratingQuestion:   'How was your visit to {{businessName}}?',
    ratingLabels:     ['', 'Very bad experience', 'Bad experience', 'OK', 'Good experience', 'Excellent!'],
    pwHeadline:       'So glad to hear it!',
    pwSubtitle:       'Would you take a minute to share your experience on Google? It helps others find us.',
    pwLabel:          'Here\'s a suggested review text — feel free to edit it:',
    copyOpenBtn:      '📋 Copy & Open Google',
    skipLink:         'Maybe later',
    tyPosHeadline:    'Thank you so much!',
    tyPosBody:        'Your review makes a huge difference for us.',
    negHeadline:      'We\'re sorry to hear that',
    negSubtitle:      'Your experience matters to us. Tell us what happened and we\'ll do our best to improve.',
    labelName:        'Your name',
    labelContact:     'WhatsApp or email',
    labelComment:     'What could we improve?',
    phName:           'What\'s your name?',
    phContact:        'So we can reach out to you',
    phComment:        'Tell us about your experience, we read everything...',
    submitBtn:        'Send feedback',
    submitting:       'Sending...',
    tyNegHeadline:    'Thanks for letting us know!',
    tyNegBody:        'We received your message. A member of our team will be in touch shortly.',
    tyNegClosing:     'Thank you for giving us the chance to improve 🙌',
    incentiveHeadline:'A gift for you!',
    photoText:        '📷 Add a photo (optional)',
    errorRequired:    'Please fill in all required fields.',
    errorSend:        'Something went wrong. Please try again.',
  },
};

const EMOJI_MAP   = { 0:'😐', 1:'😢', 2:'😞', 3:'😕', 4:'😊', 5:'🤩' };

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
async function init() {
  const params   = new URLSearchParams(window.location.search);
  state.clientId = params.get('clientId') || params.get('c') || params.get('client');
  state.testMode = params.get('test') === 'true';

  if (!state.clientId) {
    showScreen('error');
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s max

    const res = await fetch(
      `${CONFIG.N8N_CONFIG_URL}?clientId=${encodeURIComponent(state.clientId)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.client = data;
    applyBranding(data);
    buildStars();
    applyTranslations(data.language || 'es-ES');
    showScreen('rating');
    requestAnimationFrame(() => selectRating(5)); // precargar después de que la pantalla sea visible
  } catch (err) {
    console.warn('Config fetch failed:', err);
    // Si es timeout, mostrar igual con datos mínimos para no perder al cliente
    if (err.name === 'AbortError') {
      state.client = { clientId: state.clientId, language: 'es-ES' };
      buildStars();
      applyTranslations('es-ES');
      showScreen('rating');
      requestAnimationFrame(() => selectRating(5));
    } else {
      showScreen('error');
    }
  }
}

/* ============================================================
   BRANDING POR CLIENTE
   ============================================================ */
function applyBranding(client) {
  // Color de marca
  if (client.accentColor) {
    const r = document.documentElement;
    r.style.setProperty('--accent',      client.accentColor);
    r.style.setProperty('--accent-dark', darkenHex(client.accentColor, 25));
    r.style.setProperty('--accent-light', hexToRgba(client.accentColor, 0.1));
  }

  // Logo y nombre
  const logo = document.getElementById('client-logo');
  const name = document.getElementById('client-name');
  if (client.logoUrl) {
    logo.onerror = () => { logo.style.display = 'none'; }; // asignar ANTES de src
    logo.src   = client.logoUrl;
    logo.alt   = client.businessName || '';
    logo.style.display = 'block';
  } else {
    logo.style.display = 'none';
  }
  name.textContent = client.businessName || '';

  // Logo en pantalla incentivo
  const incentiveLogo = document.getElementById('incentive-logo');
  if (client.logoUrl) {
    incentiveLogo.src   = client.logoUrl;
    incentiveLogo.alt   = client.businessName || '';
    incentiveLogo.style.display = 'block';
    incentiveLogo.onerror = () => { incentiveLogo.style.display = 'none'; };
  } else {
    incentiveLogo.style.display = 'none';
  }

  // Incentivo
  if (client.incentiveEnabled === true || client.incentiveEnabled === 'TRUE') {
    document.getElementById('incentive-text').textContent = client.incentiveText || '';
  }
}

function applyTranslations(lang) {
  const t = T[lang] || T['es-ES'];
  const biz = (state.client && state.client.businessName) || '';

  // Pantalla rating
  document.getElementById('rating-question').textContent =
    t.ratingQuestion.replace('{{businessName}}', biz);

  // Helper: set text/placeholder solo si el elemento existe
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML  = val; };
  const setPh   = (id, val) => { const el = document.getElementById(id); if (el) el.placeholder = val; };
  const setCss  = (id, prop, val) => { const el = document.getElementById(id); if (el) el.style[prop] = val; };
  const setVal  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  // Pantalla positive-write
  setText('pw-headline', t.pwHeadline);
  setText('pw-subtitle', t.pwSubtitle);
  setText('pw-label',    t.pwLabel);
  setHtml('copy-open-btn', t.copyOpenBtn);

  // Pantalla negative
  setText('neg-headline',   t.negHeadline);
  setText('neg-subtitle',   t.negSubtitle);
  setText('label-name',     t.labelName);
  setText('label-contact',  t.labelContact);
  setText('label-comment',  t.labelComment);
  setPh('field-name',       t.phName);
  setPh('field-contact',    t.phContact);
  setPh('field-comment',    t.phComment);
  setText('submit-btn',     t.submitBtn);

  // Thank you positivo
  setText('ty-pos-headline', t.tyPosHeadline);
  setText('ty-pos-body',     t.tyPosBody);

  // Thank you negativo
  setText('ty-neg-headline', t.tyNegHeadline);
  setText('ty-neg-body',     t.tyNegBody);
  setText('ty-neg-closing',  t.tyNegClosing);

  // Incentivo
  setText('incentive-headline', t.incentiveHeadline);

  // Foto prompts
  const photoText = (state.client && state.client.photoPromptText) || t.photoText;
  setText('pw-photo-text',  photoText);
  setText('neg-photo-text', photoText);

  // Foto solo en flujo negativo
  const photoEnabled = state.client &&
    (state.client.photoUploadEnabled === true || state.client.photoUploadEnabled === 'TRUE');
  setCss('photo-upload-wrap-pos', 'display', 'none');
  setCss('photo-upload-wrap-neg', 'display', photoEnabled ? 'block' : 'none');

  // Guardar texto IA en state (se usa cuando el cliente hace click en "Ayudame con el texto")
  if (state.client) {
    state.client.suggestedReviewAI = state.client.suggestedReviewAI || null;
  }
}

/* ============================================================
   ESTRELLAS
   ============================================================ */
function buildStars() {
  const container = document.getElementById('stars-container');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className  = 'star-btn';
    btn.innerHTML  = '★';
    btn.setAttribute('data-value', i);
    btn.setAttribute('aria-label', `${i} estrellas`);
    btn.setAttribute('type', 'button');

    // Desktop: hover + click
    btn.addEventListener('mouseenter', () => updateHover(i));
    btn.addEventListener('mouseleave', () => resetHover());
    btn.addEventListener('click',      () => selectRating(i));

    // Mobile: cada botón conoce su propio valor — sin getBoundingClientRect
    btn.addEventListener('touchstart', () => updateHover(i), { passive: true });
    btn.addEventListener('touchend',   () => selectRating(i), { passive: true });

    container.appendChild(btn);
  }
}

function updateHover(val) {
  state.hoveredRating = val;
  renderStars(val);
  const emoji = document.getElementById('emoji-display');
  emoji.textContent = EMOJI_MAP[val];
  emoji.classList.add('pop');
  setTimeout(() => emoji.classList.remove('pop'), 250);

  const lang = (state.client && state.client.language) || 'es-ES';
  const t    = T[lang] || T['es-ES'];
  document.getElementById('rating-label').textContent = t.ratingLabels[val] || '';
}

function resetHover() {
  state.hoveredRating = 0;
  renderStars(state.selectedRating);
  document.getElementById('emoji-display').textContent =
    state.selectedRating ? EMOJI_MAP[state.selectedRating] : EMOJI_MAP[0];
  if (!state.selectedRating) {
    document.getElementById('rating-label').textContent = '\u00A0';
  }
}

function renderStars(filled) {
  document.querySelectorAll('.star-btn').forEach((btn, idx) => {
    const val = idx + 1;
    btn.classList.toggle('lit',     val <= filled && filled !== state.hoveredRating);
    btn.classList.toggle('hovered', val <= filled && filled === state.hoveredRating);
  });
}

function selectRating(val) {
  state.selectedRating = val;
  renderStars(val);
  // Actualizar emoji y etiqueta
  const emojiEl = document.getElementById('emoji-display');
  if (emojiEl) {
    emojiEl.textContent = EMOJI_MAP[val];
    emojiEl.classList.add('pop');
    setTimeout(() => emojiEl.classList.remove('pop'), 250);
  }
  const lang = (state.client && state.client.language) || 'es-ES';
  const labelEl = document.getElementById('rating-label');
  if (labelEl) labelEl.textContent = (T[lang] || T['es-ES']).ratingLabels[val] || '';
  // Mostrar botón confirmar (se re-anima en cada cambio de estrella)
  const btn = document.getElementById('confirm-rating-btn');
  if (btn) {
    btn.style.display = 'block';
    // Re-trigger animation al cambiar estrella
    btn.style.animation = 'none';
    btn.offsetWidth; // reflow
    btn.style.animation = '';
  }
}

function confirmRating() {
  const val = state.selectedRating;
  if (!val) return;
  if (val >= CONFIG.POSITIVE_MIN) {
    showScreen('positive-write');
  } else {
    showScreen('negative');
    document.getElementById('neg-emoji').textContent = EMOJI_MAP[val];
  }
  // Ocultar el botón para la próxima vez que se vuelva a la pantalla
  const btn = document.getElementById('confirm-rating-btn');
  if (btn) btn.style.display = 'none';
}

/* ============================================================
   GESTIÓN DE PANTALLAS
   ============================================================ */
function showScreen(id) {
  const all = document.querySelectorAll('.screen');
  all.forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const next = document.getElementById('screen-' + id);
  if (!next) return;
  next.style.display = 'flex';
  // Doble rAF para disparar la transición CSS desde display:none
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add('active');
    });
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   FLUJO POSITIVO
   ============================================================ */

// Ir a Google directo sin texto
function openGoogleDirect() {
  const url = state.client && state.client.googleReviewUrl;
  if (url) window.open(url, '_blank');
  showThankyouPositive();
}

// Botón "Ayudame con el texto" — llama a n8n en ese momento
async function generateAIText() {
  const btn = document.getElementById('ai-generate-btn');
  document.getElementById('pw-no-text').style.display    = 'none';
  document.getElementById('pw-loading-ai').style.display = 'flex';

  try {
    // Reutiliza el config ya cargado o pide uno fresco
    let reviewText = state.client && state.client.suggestedReviewAI;

    if (!reviewText) {
      // Pide texto generado por IA al endpoint dedicado
      const res = await fetch(
        `${CONFIG.N8N_GENERATE_URL}?clientId=${encodeURIComponent(state.clientId)}`
      );
      const data = await res.json();
      reviewText = data.reviewText || data.suggestedReviewAI || data.suggestedReviewText || '';
    }

    // Último fallback: texto estático guardado en state al cargar la config
    if (!reviewText) {
      reviewText = (state.client && state.client.suggestedReviewText) || '';
    }

    document.getElementById('review-text').value = reviewText;
    document.getElementById('ai-badge').style.display = reviewText ? 'flex' : 'none';
  } catch (err) {
    console.warn('generateAIText error:', err);
    // Si falla la red, usar el texto de fallback de Airtable
    const fallback = (state.client && state.client.suggestedReviewText) || '';
    document.getElementById('review-text').value = fallback;
    document.getElementById('ai-badge').style.display = 'none';
  }

  document.getElementById('pw-loading-ai').style.display = 'none';
  document.getElementById('pw-with-text').style.display  = 'flex';
}

async function handleCopyAndOpen() {
  const text = document.getElementById('review-text').value.trim() ||
               (state.client && state.client.suggestedReviewText) ||
               'Muy buena experiencia, lo recomiendo !!';

  // Abrir Google PRIMERO (antes de cualquier await — móvil Safari bloquea popups post-await)
  const url = state.client && state.client.googleReviewUrl;
  if (url) window.open(url, '_blank');

  // Copiar al portapapeles
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  }

  // Feedback visual en el botón, luego directo a gracias + incentivo
  const btn = document.getElementById('copy-open-btn');
  if (btn) { btn.textContent = '✓ Texto copiado!'; btn.disabled = true; }
  setTimeout(() => showThankyouPositive(), 1500);
}

function showThankyouPositive() {
  showScreen('thankyou-positive');
  // Mostrar incentivo después si está habilitado (acepta boolean true o string 'true'/'TRUE')
  const inc = state.client && state.client.incentiveEnabled;
  if (inc === true || (typeof inc === 'string' && inc.toLowerCase() === 'true')) {
    setTimeout(() => showScreen('incentive'), 2800);
  }
}

/* ============================================================
   FLUJO NEGATIVO — ENVÍO DEL FORMULARIO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitFeedback();
  });

  // Listeners de foto (solo si existen en el DOM)
  const photoPosInput = document.getElementById('photo-input-pos');
  if (photoPosInput) photoPosInput.addEventListener('change', (e) => handlePhotoSelect(e, 'pos'));

  const photoNegInput = document.getElementById('photo-input-neg');
  if (photoNegInput) photoNegInput.addEventListener('change', (e) => handlePhotoSelect(e, 'neg'));

  init();
});

async function submitFeedback() {
  const lang = (state.client && state.client.language) || 'es-ES';
  const t    = T[lang] || T['es-ES'];

  const name    = document.getElementById('field-name').value.trim();
  const contact = document.getElementById('field-contact').value.trim();
  const comment = document.getElementById('field-comment').value.trim();
  const errEl   = document.getElementById('form-error');

  // Limpiar errores
  errEl.style.display = 'none';
  ['field-name','field-contact','field-comment'].forEach(id => {
    document.getElementById(id).classList.remove('invalid');
  });

  // Validación — solo comentario es obligatorio, nombre y contacto opcionales
  let hasError = false;
  if (!comment) { document.getElementById('field-comment').classList.add('invalid'); hasError = true; }

  if (hasError) {
    errEl.textContent    = t.errorRequired;
    errEl.style.display  = 'block';
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = t.submitting;

  const payload = {
    clientId:   state.clientId,
    clientName: (state.client && state.client.businessName) || '',
    rating:     state.selectedRating,
    name,
    contact,
    comment,
    photoBase64: state.photoDataNeg || undefined,
    timestamp:  new Date().toISOString(),
    userAgent:  navigator.userAgent,
  };

  // Modo test: simula el envío sin guardar nada
  if (state.testMode) {
    console.log('[TEST MODE] Payload que se enviaría:', payload);
    btn.disabled    = false;
    btn.textContent = t.submitBtn;
    showScreen('thankyou-negative');
    // Sin incentivo en flujo negativo
    return;
  }

  try {
    const res = await fetch(CONFIG.N8N_FEEDBACK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('server error');
    showScreen('thankyou-negative');
    // Sin incentivo en flujo negativo — el regalo es solo para quienes dejan reseña positiva en Google
  } catch {
    btn.disabled    = false;
    btn.textContent = t.submitBtn;
    errEl.textContent   = t.errorSend;
    errEl.style.display = 'block';
  }
}

/* ============================================================
   FOTO — SELECCIÓN, COMPRESIÓN, PREVIEW
   ============================================================ */
function handlePhotoSelect(event, slot) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const compressed = compressImage(img, CONFIG.PHOTO_MAX_PX, CONFIG.PHOTO_QUALITY);
      if (slot === 'pos') {
        state.photoDataPos = compressed;
        showPhotoPreview('pos', compressed);
      } else {
        state.photoDataNeg = compressed;
        showPhotoPreview('neg', compressed);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function compressImage(imgEl, maxPx, quality) {
  let { width, height } = imgEl;
  if (width > maxPx || height > maxPx) {
    if (width > height) { height = Math.round(height * maxPx / width);  width  = maxPx; }
    else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
  }
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(imgEl, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function showPhotoPreview(slot, dataUrl) {
  const previewWrap = document.getElementById(`photo-preview-${slot}`);
  const previewImg  = document.getElementById(`photo-img-${slot}`);
  previewImg.src           = dataUrl;
  previewWrap.style.display = 'block';
}

function removePhoto(slot) {
  if (slot === 'pos') {
    state.photoDataPos = null;
    const inp = document.getElementById('photo-input-pos');
    if (inp) inp.value = '';
  } else {
    state.photoDataNeg = null;
    const inp = document.getElementById('photo-input-neg');
    if (inp) inp.value = '';
  }
  const preview = document.getElementById(`photo-preview-${slot}`);
  const img     = document.getElementById(`photo-img-${slot}`);
  if (preview) preview.style.display = 'none';
  if (img)     img.src = '';
}

/* ============================================================
   CERRAR PÁGINA (incentivo)
   ============================================================ */
function closePage() {
  // Intenta cerrar si fue abierta como popup, si no muestra mensaje de cierre
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Limpiar la pantalla con un mensaje de despedida
    document.getElementById('incentive-headline').textContent = '¡Hasta pronto! 👋';
    document.getElementById('incentive-text').textContent = '';
    document.getElementById('coupon-box').style.display = 'none';
    document.querySelector('.incentive-hint').style.display = 'none';
    document.querySelector('#screen-incentive .btn-outline').style.display = 'none';
  }
}

/* ============================================================
   UTILIDADES DE COLOR
   ============================================================ */
function darkenHex(hex, amount) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x+x).join('');
  let [r,g,b] = [0,2,4].map(i => parseInt(c.slice(i, i+2), 16));
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
}

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x+x).join('');
  const [r,g,b] = [0,2,4].map(i => parseInt(c.slice(i, i+2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
