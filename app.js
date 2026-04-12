/* ============================================================
   CONFIGURACIÓN — edita estas URLs cuando tengas n8n listo
   ============================================================ */
const CONFIG = {
  N8N_CONFIG_URL:   'https://fluky-n8n.lembgk.easypanel.host/webhook/get-client-config',
  N8N_GENERATE_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/generate-review-text',
  N8N_FEEDBACK_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/save-feedback',
  N8N_CLAIM_URL:    'https://fluky-n8n.lembgk.easypanel.host/webhook/claim-incentive',
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
    loadingText:           'Cargando...',
    ratingQuestion:        '¿Cómo ha sido tu visita a {{businessName}}?',
    ratingLabels:          ['', 'Muy mala experiencia', 'Mala experiencia', 'Regular', 'Buena experiencia', '¡Excelente!'],
    confirmBtn:            'Confirmar →',
    pwHeadline:            '¡Qué alegría saberlo!',
    pwSubtitle:            '¿Nos regalas un minuto en Google? Tu opinión ayuda a muchas personas.',
    pwLabel:               'Aquí tienes un texto para tu reseña — puedes editarlo:',
    aiGenerateBtn:         '✨ Ayudame con el texto',
    directGoogleBtn:       'Ir a Google Reviews →',
    copyBtn:               '📋 Copiar texto',
    skipWithoutText:       'Ir sin texto',
    poHeadline:            '¡Texto copiado!',
    poInstruction:         '📌 Pegá el texto en Google',
    poHintMobile:          '📱 Mantén pulsado → Pegar',
    poHintPc:              '🖥️ Ctrl+V en PC · Cmd+V en Mac',
    poOpenGoogleBtn:       '🔗 Abrir Google Reviews',
    poConfirmBtn:          '✅ ¡Listo, ya lo dejé!',
    tyPosHeadline:         '¡Muchas gracias!',
    tyPosBody:             'Tu reseña hace una gran diferencia para nosotros.',
    tyPosClosing:          '¡Hasta la próxima! 👋',
    negHeadline:           'Lamentamos que no haya sido lo esperado',
    negSubtitle:           'Tu experiencia nos importa. Cuéntanos qué pasó y haremos todo lo posible por mejorar.',
    labelName:             'Tu nombre',
    labelContact:          'WhatsApp o email',
    labelComment:          '¿Qué podríamos mejorar?',
    phName:                '¿Cómo te llamas?',
    phContact:             'Para que podamos contactarte',
    phComment:             'Cuéntanos tu experiencia con confianza, leemos todo...',
    submitBtn:             'Enviar comentario',
    submitting:            'Enviando...',
    tyNegHeadline:         '¡Gracias por avisarnos!',
    tyNegBody:             'Recibimos tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo a la brevedad.',
    tyNegClosing:          'Gracias por darnos la oportunidad de mejorar 🙌',
    incentiveHeadline:     '¡Un regalo para ti!',
    incentiveGateHeadline: '¡Hay un regalo para ti!',
    incentiveGateSubtitle: 'Ingresa tu email para recibirlo',
    claimBtnDefault:       'Reclamar regalo 🎁',
    skipIncentiveLink:     'Prefiero no recibirlo',
    incentiveUsedHeadline: 'Ya recibiste este regalo',
    incentiveUsedBody:     'Anteriormente reclamaste un cupón para este lugar. ¡Gracias por volver!',
    incentiveUsedClosing:  '¡Hasta la próxima! 👋',
    incentiveHint:         'Mostrá esta pantalla (o el email) en el local para canjearlo 🏪',
    incentiveCloseBtn:     '¡Entendido, gracias! 🙏',
    photoText:             '📷 Añadir foto (opcional)',
    errorRequired:         'Por favor completa todos los campos obligatorios.',
    errorSend:             'Hubo un problema al enviar. Por favor inténtalo de nuevo.',
  },
  'es-AR': {
    loadingText:           'Cargando...',
    ratingQuestion:        '¿Cómo fue tu visita a {{businessName}}?',
    ratingLabels:          ['', 'Muy mala experiencia', 'Mala experiencia', 'Regular', 'Buena experiencia', '¡Excelente!'],
    confirmBtn:            'Confirmar →',
    pwHeadline:            '¡Qué alegría saberlo!',
    pwSubtitle:            '¿Nos regalás un minuto en Google? Tu opinión ayuda a que más personas nos encuentren.',
    pwLabel:               'Acá tenés un texto para tu reseña — podés editarlo:',
    aiGenerateBtn:         '✨ Ayudame con el texto',
    directGoogleBtn:       'Ir a Google Reviews →',
    copyBtn:               '📋 Copiar texto',
    skipWithoutText:       'Ir sin texto',
    poHeadline:            '¡Texto copiado!',
    poInstruction:         '📌 Pegá el texto en Google',
    poHintMobile:          '📱 Mantén pulsado → Pegar',
    poHintPc:              '🖥️ Ctrl+V en PC · Cmd+V en Mac',
    poOpenGoogleBtn:       '🔗 Abrir Google Reviews',
    poConfirmBtn:          '✅ ¡Listo, ya lo dejé!',
    tyPosHeadline:         '¡Gracias de corazón!',
    tyPosBody:             'Tu reseña hace una gran diferencia para nosotros.',
    tyPosClosing:          '¡Hasta la próxima! 👋',
    negHeadline:           'Lamentamos que no haya sido lo esperado',
    negSubtitle:           'Tu experiencia nos importa. Contanos qué pasó y haremos todo lo posible para mejorar.',
    labelName:             'Tu nombre',
    labelContact:          'WhatsApp o email',
    labelComment:          '¿Qué podríamos mejorar?',
    phName:                '¿Cómo te llamás?',
    phContact:             'Para que podamos contactarte',
    phComment:             'Contanos tu experiencia con confianza, leemos todo...',
    submitBtn:             'Enviar comentario',
    submitting:            'Enviando...',
    tyNegHeadline:         '¡Gracias por avisarnos!',
    tyNegBody:             'Recibimos tu mensaje. Un integrante de nuestro equipo se va a comunicar con vos a la brevedad.',
    tyNegClosing:          'Gracias por darnos la oportunidad de mejorar 🙌',
    incentiveHeadline:     '¡Un regalo para vos!',
    incentiveGateHeadline: '¡Hay un regalo para vos!',
    incentiveGateSubtitle: 'Ingresá tu email para recibirlo',
    claimBtnDefault:       'Reclamar regalo 🎁',
    skipIncentiveLink:     'Prefiero no recibirlo',
    incentiveUsedHeadline: 'Ya recibiste este regalo',
    incentiveUsedBody:     'Anteriormente reclamaste un cupón para este lugar. ¡Gracias por volver!',
    incentiveUsedClosing:  '¡Hasta la próxima! 👋',
    incentiveHint:         'Mostrá esta pantalla (o el email) en el local para canjearlo 🏪',
    incentiveCloseBtn:     '¡Entendido, gracias! 🙏',
    photoText:             '📷 Agregar foto (opcional)',
    errorRequired:         'Por favor completá todos los campos obligatorios.',
    errorSend:             'Hubo un problema al enviar. Por favor intentá de nuevo.',
  },
  'en-US': {
    loadingText:           'Loading...',
    ratingQuestion:        'How was your visit to {{businessName}}?',
    ratingLabels:          ['', 'Very bad experience', 'Bad experience', 'OK', 'Good experience', 'Excellent!'],
    confirmBtn:            'Confirm →',
    pwHeadline:            'So glad to hear it!',
    pwSubtitle:            'Would you take a minute to share your experience on Google? It helps others find us.',
    pwLabel:               'Here\'s a suggested review text — feel free to edit it:',
    aiGenerateBtn:         '✨ Help me write',
    directGoogleBtn:       'Go to Google Reviews →',
    copyBtn:               '📋 Copy text',
    skipWithoutText:       'Skip, go without text',
    poHeadline:            'Text copied!',
    poInstruction:         '📌 Paste your text in Google',
    poHintMobile:          '📱 Long press → Paste',
    poHintPc:              '🖥️ Ctrl+V on PC · Cmd+V on Mac',
    poOpenGoogleBtn:       '🔗 Open Google Reviews',
    poConfirmBtn:          '✅ Done, I left my review!',
    tyPosHeadline:         'Thank you so much!',
    tyPosBody:             'Your review makes a huge difference for us.',
    tyPosClosing:          'See you next time! 👋',
    negHeadline:           'We\'re sorry to hear that',
    negSubtitle:           'Your experience matters to us. Tell us what happened and we\'ll do our best to improve.',
    labelName:             'Your name',
    labelContact:          'WhatsApp or email',
    labelComment:          'What could we improve?',
    phName:                'What\'s your name?',
    phContact:             'So we can reach out to you',
    phComment:             'Tell us about your experience, we read everything...',
    submitBtn:             'Send feedback',
    submitting:            'Sending...',
    tyNegHeadline:         'Thanks for letting us know!',
    tyNegBody:             'We received your message. A member of our team will be in touch shortly.',
    tyNegClosing:          'Thank you for giving us the chance to improve 🙌',
    incentiveHeadline:     'A gift for you!',
    incentiveGateHeadline: 'There\'s a gift for you!',
    incentiveGateSubtitle: 'Enter your email to receive it',
    claimBtnDefault:       'Claim your gift 🎁',
    skipIncentiveLink:     'I\'d rather not',
    incentiveUsedHeadline: 'You already claimed this gift',
    incentiveUsedBody:     'You previously claimed a reward here. Thanks for coming back!',
    incentiveUsedClosing:  'See you next time! 👋',
    incentiveHint:         'Show this screen (or the email) at the venue to redeem your reward 🏪',
    incentiveCloseBtn:     'Got it, thanks! 🙏',
    photoText:             '📷 Add a photo (optional)',
    errorRequired:         'Please fill in all required fields.',
    errorSend:             'Something went wrong. Please try again.',
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

    if (!res.ok) throw new Error('http_' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.client = data;
    applyBranding(data);
    buildStars();
    applyTranslations(data.language || 'es-ES');
    showScreen('rating');
    requestAnimationFrame(() => selectRating(5)); // precargar después de que la pantalla sea visible
  } catch (err) {
    console.warn('Config fetch failed:', err.name, err.message);
    // Mostrar pantalla genérica para cualquier error de red o timeout
    // Solo mostrar error "Enlace no válido" si el cliente no existe (404)
    if (err.message === 'http_404' || err.message === 'Client not found or inactive') {
      showScreen('error');
    } else {
      // Red lenta, servidor caído, timeout — mostrar igual sin branding
      state.client = { clientId: state.clientId, language: 'es-ES' };
      buildStars();
      applyTranslations('es-ES');
      showScreen('rating');
      const banner = document.getElementById('offline-banner');
      if (banner) banner.style.display = 'block';
      requestAnimationFrame(() => selectRating(5));
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
    // Texto personalizado del botón de reclamar
    const claimBtn = document.getElementById('claim-btn');
    if (claimBtn && client.incentiveButtonText) {
      claimBtn.textContent = client.incentiveButtonText;
    }
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

  // Pantalla rating
  setText('confirm-rating-btn', t.confirmBtn);

  // Pantalla positive-write
  setText('pw-headline',        t.pwHeadline);
  setText('pw-subtitle',        t.pwSubtitle);
  setText('pw-label',           t.pwLabel);
  setText('ai-generate-btn',    t.aiGenerateBtn);
  setText('go-google-direct-btn', t.directGoogleBtn);
  setHtml('copy-open-btn',      t.copyBtn);
  setText('skip-without-text',  t.skipWithoutText);

  // Pantalla positive-open
  setText('po-headline',         t.poHeadline);
  setText('po-instruction',      t.poInstruction);
  setText('po-hint-mobile',      t.poHintMobile);
  setText('po-hint-pc',          t.poHintPc);
  setText('po-open-google-btn',  t.poOpenGoogleBtn);
  setText('po-confirm-btn',      t.poConfirmBtn);

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
  setText('ty-pos-closing',  t.tyPosClosing);

  // Thank you negativo
  setText('ty-neg-headline', t.tyNegHeadline);
  setText('ty-neg-body',     t.tyNegBody);
  setText('ty-neg-closing',  t.tyNegClosing);

  // Incentivo (pantalla cupón)
  setText('incentive-headline', t.incentiveHeadline);
  setText('incentive-hint',      t.incentiveHint);
  setText('incentive-close-btn', t.incentiveCloseBtn);

  // Pantalla incentive-gate
  setText('incentive-gate-headline', t.incentiveGateHeadline);
  setText('incentive-gate-subtitle', t.incentiveGateSubtitle);
  setText('skip-incentive-link',     t.skipIncentiveLink);
  // claim-btn: usar default del idioma solo si el cliente no tiene texto personalizado
  if (!(state.client && state.client.incentiveButtonText)) {
    setText('claim-btn', t.claimBtnDefault);
  }

  // Pantalla incentive-used
  setText('incentive-used-headline', t.incentiveUsedHeadline);
  setText('incentive-used-body',     t.incentiveUsedBody);
  setText('incentive-used-closing',  t.incentiveUsedClosing);

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

function handleCopyAndOpen() {
  const text = document.getElementById('review-text').value.trim() ||
               (state.client && state.client.suggestedReviewText) ||
               'Muy buena experiencia, lo recomiendo !!';

  state.copiedReviewText = text;

  // 1. Copiar PRIMERO con execCommand (sync — funciona en iOS Safari con user gesture)
  //    iOS requiere: readonly, setSelectionRange, y restaurar scroll
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
  document.body.appendChild(ta);
  const yPos = window.pageYOffset || document.documentElement.scrollTop;
  ta.focus();
  ta.setSelectionRange(0, text.length);
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  window.scrollTo(0, yPos);

  // Intentar también Clipboard API en background (para navegadores sin execCommand)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // 2. Mostrar pantalla positive-open con preview del texto
  // Google se abre desde el botón "Abrir Google Reviews" en esa pantalla (user gesture directo)
  showScreen('positive-open');
  const preview = document.getElementById('po-review-preview');
  const box     = document.getElementById('po-copied-text');
  if (preview && text) {
    preview.textContent = text;
    box.style.display   = 'block';
  }
}

// Abre Google Reviews desde screen-positive-open — directo en click handler (iOS safe)
function openGoogleReviews() {
  const url = state.client && state.client.googleReviewUrl;
  if (url) window.open(url, '_blank');
}

function showThankyouPositive() {
  showScreen('thankyou-positive');
  // Mostrar incentive-gate (pide email) si el incentivo está habilitado
  const inc = state.client && state.client.incentiveEnabled;
  if (inc === true || (typeof inc === 'string' && inc.toLowerCase() === 'true')) {
    setTimeout(() => showScreen('incentive-gate'), 2800);
  }
}

function skipIncentive() {
  showScreen('thankyou-positive');
}

async function claimIncentive(email) {
  const res = await fetch(CONFIG.N8N_CLAIM_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId: state.clientId, email }),
  });
  if (!res.ok) throw new Error('server error');
  const data = await res.json();

  if (data.claimed) {
    showScreen('incentive-used');
  } else {
    // Mostrar código en pantalla incentive
    const codeEl = document.getElementById('coupon-code');
    if (codeEl && data.couponCode) {
      codeEl.textContent  = data.couponCode;
      codeEl.style.display = 'block';
    }
    showScreen('incentive');
  }
}

/* ============================================================
   FLUJO NEGATIVO — ENVÍO DEL FORMULARIO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Traducir pantalla de carga usando el idioma del browser (antes de saber el idioma del cliente)
  const browserLang = (navigator.language || 'es').toLowerCase();
  const initLang = browserLang.startsWith('en') ? 'en-US' : 'es-ES';
  const loadingEl = document.getElementById('loading-text');
  if (loadingEl) loadingEl.textContent = (T[initLang] || T['es-ES']).loadingText;

  document.getElementById('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitFeedback();
  });

  // Claim incentive form
  const claimForm = document.getElementById('claim-form');
  if (claimForm) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email  = document.getElementById('claim-email').value.trim();
      const errEl  = document.getElementById('claim-error');
      const btn    = document.getElementById('claim-btn');

      errEl.style.display = 'none';

      if (!email || !email.includes('@')) {
        errEl.textContent   = 'Por favor ingresá un email válido.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Enviando...';

      try {
        await claimIncentive(email);
      } catch {
        btn.disabled    = false;
        btn.textContent = 'Reclamar regalo 🎁';
        errEl.textContent   = 'Hubo un problema. Intentá de nuevo.';
        errEl.style.display = 'block';
      }
    });
  }

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
