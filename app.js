/* ============================================================
   CONFIGURACIÓN — edita estas URLs cuando tengas n8n listo
   ============================================================ */
const CONFIG = {
  N8N_CONFIG_URL:   'https://fluky-n8n.lembgk.easypanel.host/webhook/get-client-config',
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
  state.clientId = params.get('c') || params.get('client');

  if (!state.clientId) {
    showScreen('error');
    return;
  }

  try {
    const res = await fetch(
      `${CONFIG.N8N_CONFIG_URL}?clientId=${encodeURIComponent(state.clientId)}`
    );
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.client = data;
    applyBranding(data);
    buildStars();
    applyTranslations(data.language || 'es-ES');
    showScreen('rating');
  } catch (err) {
    console.warn('Config fetch failed:', err);
    showScreen('error');
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
    logo.src = client.logoUrl;
    logo.alt = client.businessName || '';
    logo.style.display = 'block';
  } else {
    logo.style.display = 'none';
  }
  name.textContent = client.businessName || '';

  // Logo en pantalla incentivo
  const incentiveLogo = document.getElementById('incentive-logo');
  if (client.logoUrl) {
    incentiveLogo.src  = client.logoUrl;
    incentiveLogo.alt  = client.businessName || '';
    incentiveLogo.style.display = 'block';
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

  // Pantalla positive-write
  document.getElementById('pw-headline').textContent  = t.pwHeadline;
  document.getElementById('pw-subtitle').textContent  = t.pwSubtitle;
  document.getElementById('pw-label').textContent     = t.pwLabel;
  document.getElementById('copy-open-btn').innerHTML  = t.copyOpenBtn;

  // Pantalla negative
  document.getElementById('neg-headline').textContent  = t.negHeadline;
  document.getElementById('neg-subtitle').textContent  = t.negSubtitle;
  document.getElementById('label-name').textContent    = t.labelName;
  document.getElementById('label-contact').textContent = t.labelContact;
  document.getElementById('label-comment').textContent = t.labelComment;
  document.getElementById('field-name').placeholder    = t.phName;
  document.getElementById('field-contact').placeholder = t.phContact;
  document.getElementById('field-comment').placeholder = t.phComment;
  document.getElementById('submit-btn').textContent    = t.submitBtn;

  // Thank you positivo
  document.getElementById('ty-pos-headline').textContent = t.tyPosHeadline;
  document.getElementById('ty-pos-body').textContent     = t.tyPosBody;

  // Thank you negativo
  document.getElementById('ty-neg-headline').textContent = t.tyNegHeadline;
  document.getElementById('ty-neg-body').textContent     = t.tyNegBody;
  document.getElementById('ty-neg-closing').textContent  = t.tyNegClosing;

  // Incentivo
  document.getElementById('incentive-headline').textContent = t.incentiveHeadline;

  // Foto prompts
  const photoText = (state.client && state.client.photoPromptText) || t.photoText;
  document.getElementById('pw-photo-text').textContent  = photoText;
  document.getElementById('neg-photo-text').textContent = photoText;

  // Foto upload visibilidad
  const photoEnabled = state.client &&
    (state.client.photoUploadEnabled === true || state.client.photoUploadEnabled === 'TRUE');
  document.getElementById('photo-upload-wrap-pos').style.display = photoEnabled ? 'block' : 'none';
  document.getElementById('photo-upload-wrap-neg').style.display = photoEnabled ? 'block' : 'none';

  // Texto sugerido con IA o fallback
  const reviewText = (state.client && (state.client.suggestedReviewAI || state.client.suggestedReviewText)) || '';
  document.getElementById('review-text').value = reviewText;
  if (!state.client?.suggestedReviewAI) {
    document.getElementById('ai-badge').style.display = 'none';
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

    btn.addEventListener('mouseenter', () => updateHover(i));
    btn.addEventListener('mouseleave', () => resetHover());
    btn.addEventListener('click',      () => selectRating(i));
    // Touch
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
  setTimeout(() => {
    if (val >= CONFIG.POSITIVE_MIN) {
      showScreen('positive-write');
    } else {
      showScreen('negative');
      const emojiNeg = document.getElementById('neg-emoji');
      emojiNeg.textContent = EMOJI_MAP[val];
    }
  }, 320);
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
async function handleCopyAndOpen() {
  const text = document.getElementById('review-text').value.trim() ||
               (state.client && state.client.suggestedReviewText) ||
               '¡Excelente experiencia, muy recomendable!';

  // Copiar al portapapeles
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback para navegadores sin clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // Abrir Google Reviews en nueva pestaña
  const url = state.client && state.client.googleReviewUrl;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  showScreen('positive-open');
}

function showThankyouPositive() {
  showScreen('thankyou-positive');
  // Mostrar incentivo después si está habilitado
  if (state.client && (state.client.incentiveEnabled === true || state.client.incentiveEnabled === 'TRUE')) {
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

  // Listeners de foto
  document.getElementById('photo-input-pos').addEventListener('change', (e) => {
    handlePhotoSelect(e, 'pos');
  });
  document.getElementById('photo-input-neg').addEventListener('change', (e) => {
    handlePhotoSelect(e, 'neg');
  });

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

  // Validación
  let hasError = false;
  if (!name)    { document.getElementById('field-name').classList.add('invalid');    hasError = true; }
  if (!contact) { document.getElementById('field-contact').classList.add('invalid'); hasError = true; }
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

  try {
    const res = await fetch(CONFIG.N8N_FEEDBACK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('server error');
    showScreen('thankyou-negative');
    // Mostrar incentivo si está habilitado
    if (state.client && (state.client.incentiveEnabled === true || state.client.incentiveEnabled === 'TRUE')) {
      setTimeout(() => showScreen('incentive'), 2800);
    }
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
    document.getElementById('photo-input-pos').value = '';
  } else {
    state.photoDataNeg = null;
    document.getElementById('photo-input-neg').value = '';
  }
  document.getElementById(`photo-preview-${slot}`).style.display = 'none';
  document.getElementById(`photo-img-${slot}`).src = '';
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
