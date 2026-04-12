# Reseñas Positivas — Documentación del Sistema

## Stack
| Capa | Tecnología | URL |
|------|-----------|-----|
| Frontend | HTML/CSS/JS vanilla | GitHub Pages → `reviews.mflowsuite.com` |
| Admin panel | HTML/CSS/JS vanilla | `reviews.mflowsuite.com/admin/` |
| Base de datos | Airtable | Base `appwlnvY7rceVb06Q`, tabla `tblxTlomzuupQcgyY` |
| Backend | n8n en EasyPanel | `fluky-n8n.lembgk.easypanel.host` |
| IA | OpenAI GPT-4.1-mini via n8n | credencial "OpenAi Guzel" |
| Email transaccional | Resend | `noreply@mflowsuite.com` |
| Logos | GitHub repo `/assets/` | `reviews.mflowsuite.com/assets/` |

---

## Workflows n8n

### Workflow A — Get Client Config (`fAmH0SbPDcyyvEV4`)
- **Webhook**: `GET /webhook/get-client-config?clientId=XXX`
- **Flujo**: Webhook → Airtable → IF activo → OPEN API (OpenAI) → Set respuesta → Respond 200
- **IMPORTANTE**: El nodo OpenAI (`OPEN API - Generar texto reseña`) está **CONECTADO** en el critical path.
  Genera el texto IA en el mismo request de carga. Esto hace la respuesta más lenta (~4-5s) pero
  precarga el texto para que el usuario no espere al hacer click en "Ayudame".
  - Si en el futuro la respuesta es demasiado lenta, desconectar el nodo OpenAI y dejarlo como huérfano.
  - El Set node mapea `suggestedReviewAI` desde `$json.choices?.[0]?.message?.content ?? null`
- **Prompt del nodo OpenAI (Workflow A)**:
  - System: instrucciones de estilo (max oraciones, sin signos invertidos, WhatsApp informal)
  - User: incluye `businessName`, `industry`, `aiTopics`/`aiTones`/`aiStyles` (con Math.random en n8n), `language`, `aiExtraInstructions`
  - El idioma se pasa como `$json.language` (texto plano, ej: `en-US`) y la IA lo interpreta directamente
- **Responde**: JSON con todos los campos del cliente incluyendo `suggestedReviewAI`, `incentiveButtonText`

### Workflow B — Save Feedback (`2RI2HG6j4N2BaU20`)
- **Webhook**: `POST /webhook/save-feedback`
- **Flujo**: OPTIONS preflight → Validar → Foto (opcional, imgBB) → Airtable guardar → [Respond 200 || Email negativo]
- Maneja CORS manualmente (nodo `IF - OPTIONS preflight`)
- **Email al negocio por reseña negativa** (rating ≤ 3):
  - Rama paralela después de guardar en Airtable
  - `IF - Rating negativo` → `HTTP - Get Client Config` (Airtable lookup por clientId) → `IF - Tiene notificationEmail` → `Resend - Email negativo al negocio`
  - Nodo Resend tiene `continueOnFail: true` para no romper el flujo si falla el email
  - API key Resend: `re_Bwy4FMNM_M5cUQzVjHwT9PhLpkRs5tRQf` (hardcodeada en el nodo)

### Workflow C — Admin CRUD (`Daaqa7fMbmWBVDwC`)
- **Webhook**: `POST /webhook/admin-clients`
- **Auth**: clave `Mflow@dmin25` hardcodeada en Code node (no en el repo)
- **Acciones**: `list`, `save` (create/update por recordId)
- **Credencial Airtable**: "Airtable Admin PAT" — PAT con permisos read+write
- **Update**: usa PATCH a Airtable con `{ fields, typecast: true }`
  - Campos vacíos se envían como `null` (no omitidos) para que Airtable los borre

### Workflow D — Upload Logo (`GYf9xxqMFW7GxKu9`)
- **Webhook**: `POST /webhook/upload-logo`
- **Flujo**: Auth → base64 → GitHub PUT → devuelve URL pública
- **Credencial GitHub**: "GitHub Token"
- **Destino**: `reviews.mflowsuite.com/assets/logos/{timestamp}-{filename}.png`

### Workflow E — Generate AI Review Text (`4QwRCImkvX5VdmB0`)
- **Webhook**: `GET /webhook/generate-review-text?clientId=XXX`
- **Flujo**: Airtable → IF activo → OpenAI → Respond `{ reviewText: "..." }`
- Solo se llama cuando el usuario hace click en "Ayudame con el texto" (si Workflow A no precargó el texto)
- Tarda 3-5s (tiene OpenAI) — está bien porque el usuario espera activamente
- **Prompt**: mismo estilo que Workflow A pero usando `String.fromCharCode(10)` para split de líneas
  y pasando la lista completa a GPT para que elija aleatoriamente (más robusto que Math.random en n8n)
- **Idioma**: controlado por ternario `language === 'en-US' ? 'You MUST write in English...' : 'Escribe en espanol...'`

### Workflow F — Claim Incentive (`1u5GwJP3JKKw9HzL`)
- **Webhook**: `POST /webhook/claim-incentive`
- **Body**: `{ clientId, email }`
- **Flujo completo**:
  1. OPTIONS preflight → Respond 200
  2. Code Normalize → valida `clientId` y `email`, construye URLs de búsqueda
  3. HTTP Search Coupons → Airtable busca en `coupons` donde `clientId=X AND email=Y`
  4. Code Check Claimed → si existe registro, marca `alreadyClaimed: true`; si no, genera `couponCode`
  5. **IF Already Claimed** → Respond `{ claimed: true, couponCode }`
  6. **Si NO reclamado**:
     - HTTP Get Client → busca config del cliente en tabla `clients`
     - Code Build Email → extrae `businessName`, `incentiveText`, `notificationEmail`
     - HTTP Create Coupon → inserta fila en tabla `coupons`
     - Resend Send to Client → email al cliente con código
     - IF Has Notification Email → si el negocio tiene `notificationEmail`:
       - Resend Send to Business → email al negocio con datos del reclamo
     - Respond `{ claimed: false, couponCode }`
- **Email provider**: Resend API (`https://api.resend.com/emails`)
  - `from`: `"{businessName} <noreply@mflowsuite.com>"` — el nombre del negocio aparece como remitente
  - `noreply@mflowsuite.com` verificado en Resend con DNS en Cloudflare
- **Credenciales**: "Airtable Admin PAT" (HTTP Header Auth en todos los HTTP nodes)
- **Anti-duplicado**: busca por `clientId + email` en tabla `coupons` antes de crear
- **Código generado**: `XXX-XXXXXX` (prefijo 3 letras del clientId + 6 chars random, ej: `TIN-A3F9K2`)
- **IMPORTANTE**: en nodos después de `HTTP - Create Coupon`, usar `$('Code - Build Email').item.json.fieldName`
  para referenciar datos anteriores — `$json` en ese punto es la respuesta de Airtable, no los datos del cliente
- Archivo en repo: `n8n-workflow-F-claim-incentive.json`

---

## Email — Resend

- **Servicio**: Resend (`resend.com`) — plan gratuito: 3.000 emails/mes, 100/día
- **Dominio verificado**: `mflowsuite.com` (DNS en Cloudflare)
  - SPF: registro TXT en `mflowsuite.com`
  - DKIM: registro TXT en `resend._domainkey.mflowsuite.com`
  - Registros añadidos via Cloudflare API en la sesión de setup
- **API keys**:
  - Workflow F: hardcodeada en nodos HTTP (header `Authorization: Bearer re_...`)
  - Workflow B (email negativo): clave hardcodeada en nodo Resend del workflow (NO guardar en repo)
- **Sender**: `"{businessName} <noreply@mflowsuite.com>"` — nombre dinámico por negocio
- **Emails que se envían**:
  - Al cliente (incentivo): `🎁 Tu regalo de {businessName}` — incentiveText + couponCode + instrucción de canje
  - Al negocio (incentivo): `🎁 Nuevo cupón reclamado — {businessName}` — email cliente + código + timestamp
  - Al negocio (reseña negativa): `⚠️ Nueva reseña negativa — {businessName}` — rating, comentario, nombre, contacto, fecha

---

## Campos Airtable — tabla `clients` (`tblxTlomzuupQcgyY`)
| Campo | Tipo | Field ID | Descripción |
|-------|------|----------|-------------|
| `clientId` | text | `fldAMNKfF4UEMdr0K` | Slug único (ej: `heladeria-tinos`) |
| `businessName` | text | `fldOy2BlpxEjnZAUt` | Nombre del negocio |
| `industry` | text | `fldMHVFgzyQ7oVNdf` | Rubro (ej: `heladería`) — usar en inglés para clientes en-US |
| `language` | singleSelect | `fldMPiZ04bgaiqZIN` | `es-ES`, `es-AR`, `en-US` |
| `logoUrl` | url | `flduhixQYvoKZaMWF` | URL pública del logo |
| `googleReviewUrl` | url | `fldAsNW6O750KoqCN` | Link directo a Google Reviews |
| `accentColor` | text | `fldNq89BSUdJb7t6I` | Hex color (ej: `#00B4D8`) |
| `suggestedReviewText` | multilineText | `fldO0mEei2S2uPDC0` | Texto estático de fallback para reseña |
| `photoUploadEnabled` | boolean | `fldddUlFf4ZzeFFuq` | Habilitar subida de foto |
| `photoPromptText` | text | `fldC7yjqg2T1RzWwd` | Texto del prompt de foto |
| `incentiveEnabled` | boolean | `fldT7o2B42camXH7Z` | Mostrar pantalla de incentivo |
| `incentiveText` | multilineText | `fldRD0Zw7Rui7BOD0` | Texto del incentivo (ej: "15% off en tu próxima visita") |
| `incentiveButtonText` | text | `fldd4XZkl0K4XggyM` | Texto del botón de reclamo — si vacío usa default del T object |
| `notificationEmail` | email | `fldC3A1LAhfHIhFMa` | Email del dueño para recibir avisos (cupones + reseñas negativas) |
| `active` | boolean | `fldJKaBd9JeAJb9um` | Cliente activo (IF lo verifica) |
| `aiTopics` | multilineText | `fldU5aOq973RhvgG9` | Temas para prompt IA (uno por línea) — en el idioma del cliente |
| `aiTones` | multilineText | `fldwF7YrlsCIz12xl` | Tonos para prompt IA (uno por línea) |
| `aiStyles` | multilineText | `fldHGda4p9XdE4kc5` | Estructuras de apertura (uno por línea) |
| `aiMaxSentences` | number | `fldf1kmxQVdnWiyPL` | Máx oraciones en texto IA (default 2) |
| `aiExtraInstructions` | text | `fldTEox1vjMYbqd9O` | Instrucciones extra fijas para IA |

## Campos Airtable — tabla `coupons` (`tbljuu3kuNFezEanG`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `couponCode` | text | Código único (ej: `TIN-A3F9K2`) — campo primario |
| `clientId` | text | ID del negocio |
| `email` | email | Email del cliente que reclamó |
| `claimedAt` | dateTime | Timestamp del reclamo |
| `businessName` | text | Nombre del negocio (desnormalizado) |

---

## Frontend — app.js

### CONFIG
```js
const CONFIG = {
  N8N_CONFIG_URL:   'https://fluky-n8n.lembgk.easypanel.host/webhook/get-client-config',
  N8N_GENERATE_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/generate-review-text',
  N8N_FEEDBACK_URL: 'https://fluky-n8n.lembgk.easypanel.host/webhook/save-feedback',
  N8N_CLAIM_URL:    'https://fluky-n8n.lembgk.easypanel.host/webhook/claim-incentive',
  POSITIVE_MIN:     4,
  PHOTO_MAX_PX:     1200,
  PHOTO_QUALITY:    0.75,
};
```

### Flujo de pantallas
```
loading → [fetch n8n] → rating → confirmRating()
                                  ├─ (≥4★) → positive-write
                                  │           ├─ "✨ Ayudame con el texto" → [IA genera texto] → textarea editable
                                  │           │    ↓ "📋 Copiar texto"  ← handleCopyAndOpen() (sync, solo copia)
                                  │           └─ "Ir a Google Reviews →" → Google directo sin texto
                                  │                           ↓
                                  │                      positive-open (instrucciones de pegado + texto copiado)
                                  │                           ↓ "🔗 Abrir Google Reviews" → window.open (iOS safe)
                                  │                           ↓ "✅ Ya lo pegué"
                                  │                      thankyou-positive
                                  │                           ↓ (si incentiveEnabled, 2.8s)
                                  │                      incentive-gate (pide email)
                                  │                           ↓ claimIncentive(email)
                                  │                      ├─ (claimed: true)  → incentive-used
                                  │                      └─ (claimed: false) → incentive (cupón + código)
                                  └─ (<4★) → negative → thankyou-negative
```

### i18n — objeto T
Contiene traducciones para `es-ES`, `es-AR`, `en-US`. Claves principales:
- `reviewFallback` — texto de reseña de fallback cuando no hay IA ni `suggestedReviewText`
- `confirmBtn`, `copyBtn`, `aiGenerateBtn`, `directGoogleBtn`, `skipWithoutText`
- `poHeadline`, `poInstruction`, `poHintMobile`, `poHintPc`, `poOpenGoogleBtn`, `poConfirmBtn`
- `tyPosHeadline`, `tyPosBody`, `tyPosClosing`
- `incentiveGateHeadline`, `incentiveGateSubtitle`, `claimBtnDefault`, `skipIncentiveLink`
- `incentiveUsedHeadline`, `incentiveUsedBody`, `incentiveUsedClosing`
- `incentiveHint`, `incentiveCloseBtn`

`applyTranslations(lang)` usa `setText()` / `setHtml()` para actualizar el DOM por ID.
Se llama al inicio en `init()` una vez que se conoce el idioma del cliente.

### Funciones clave

**`handleCopyAndOpen()`** — **SÍNCRONA** (no async):
- Detecta el idioma del cliente (`state.client.language`) y usa `t.reviewFallback` si no hay texto
- Copia con `document.execCommand('copy')` + tricks iOS (textarea readonly, setSelectionRange, restaurar scroll)
- También intenta `navigator.clipboard.writeText` en background para browsers modernos
- NO abre Google — solo copia el texto y muestra `screen-positive-open`
- Debe permanecer síncrona — si se convierte a async, iOS Safari bloquea el clipboard

**`openGoogleReviews()`** — en `screen-positive-open`, botón con animación pulse:
- Llama a `window.open(googleReviewUrl, '_blank')` directamente desde el click handler
- iOS-safe porque es un user gesture directo (no async)
- El botón `#po-open-google-btn` tiene animación CSS `btn-ping` (pulse continuo)

**`showThankyouPositive()`**:
- Muestra `screen-thankyou-positive`
- Si `incentiveEnabled`, después de 2.8s va a `screen-incentive-gate`

**`claimIncentive(email)`** — async:
- POST a `N8N_CLAIM_URL` con `{ clientId, email }`
- Si `data.claimed === true` → `showScreen('incentive-used')`
- Si `data.claimed === false` → setea `#coupon-code` con `data.couponCode` y va a `screen-incentive`

**`applyBranding(client)`**:
- Setea `--accent`, logo, nombre del negocio
- Si `client.incentiveButtonText` existe, lo aplica al botón `#claim-btn`

### Comportamiento offline/error
- **AbortError (timeout 12s)** → fallback: pantalla rating sin branding + banner amarillo
- **Error de red / servidor** → igual que AbortError
- **404 (cliente no existe)** → pantalla "Enlace no válido"
- El banner `#offline-banner` se muestra cuando carga sin branding

### Texto IA (generateAIText)
- El botón "Ayudame" llama a `N8N_GENERATE_URL` (Workflow E) si no hay `state.client.suggestedReviewAI` precargado
- Si falla → usa `suggestedReviewText` de Airtable como fallback
- La respuesta de Workflow E tiene formato `{ reviewText: "..." }`

---

## Frontend — index.html (pantallas relevantes)

### `screen-positive-write`
- Botón `#ai-generate-btn` → genera texto con IA
- Botón `#go-google-direct-btn` → va a Google sin texto (llama `openGoogleDirect()`)
- Textarea `#review-text` — editable, se llena con texto IA o manual
- Botón `#copy-open-btn` → copia texto y muestra `positive-open`

### `screen-positive-open`
- Instrucciones de pegado: `#po-instruction`, `#po-hint-mobile`, `#po-hint-pc`
- `#po-copied-text` con `#po-review-preview` — muestra el texto copiado para referencia
- `#po-open-google-btn` — abre Google Reviews (con animación pulse `btn-ping`)
- `#po-confirm-btn` → `showThankyouPositive()`

### `screen-incentive-gate`
- Formulario `#claim-form` con input `#claim-email`
- Botón `#claim-btn` con texto configurable (default del T object o `incentiveButtonText` de Airtable)
- Link `#skip-incentive-link` → llama `skipIncentive()`

### `screen-incentive-used`
- Muestra cuando el cliente ya reclamó antes (email duplicado)

### `screen-incentive`
- Muestra el cupón con `client.incentiveText`
- `#coupon-code` (oculto por defecto) se llena con el código generado

---

## Admin Panel — admin/app.js

### ADMIN_CONFIG
```js
const ADMIN_CONFIG = {
  n8nWebhook:    'https://fluky-n8n.lembgk.easypanel.host/webhook/admin-clients',
  uploadWebhook: 'https://fluky-n8n.lembgk.easypanel.host/webhook/upload-logo',
};
```

### Autenticación
- Contraseña guardada en `sessionStorage` (no localStorage — se borra al cerrar tab)
- La contraseña se verifica en el Code node de Workflow C (`Mflow@dmin25`)

### QR Modal
- Modo día/noche, descargar PNG, imprimir
- URL codificada: `https://reviews.mflowsuite.com/?clientId={slug}`
- Generado con: `https://api.qrserver.com/v1/create-qr-code/`

### Logo upload
- Redimensiona a max 800px con canvas antes de enviar
- Envía base64 a Workflow D → GitHub PUT → devuelve URL
- URL formato: `https://reviews.mflowsuite.com/assets/logos/{timestamp}-{filename}.png`

### Placeholders IA según idioma
- `updateAIPlaceholders(lang)` cambia los placeholders de `aiTopics`, `aiTones`, `aiStyles`,
  `suggestedReviewText`, `aiExtraInstructions` según el idioma seleccionado
- Se llama al cargar un cliente (`populateForm`) y al cambiar el select `#f-language`
- Idiomas soportados: `en-US` (ejemplos en inglés) y `default` (español)

### Guardar cliente — campos vacíos
- Campos opcionales vacíos se envían como `null` (no se omiten) → Airtable los borra
- `aiMaxSentences` vacío o 0 también se envía como `null`
- **IMPORTANTE**: Si se hace `delete fields[k]`, Airtable no borra el campo, lo ignora

---

## Seguridad
- **Tokens n8n**: en n8n native credentials (no en el repo)
  - "Airtable Admin PAT" — Airtable read+write
  - "GitHub Token" — push a repo
  - "OpenAi Guzel" — OpenAI API
- **Resend API keys**: hardcodeadas en nodos HTTP de Workflow F y B (header Authorization)
- **Credencial Airtable OAuth2** (Workflow A/E): "Clientes Tiendanube" (ID: `1H9wOKsGsvMbhda0`)
- **Clave admin**: `Mflow@dmin25` hardcodeada en Workflow C Code node (no en GitHub)
- **Archivos gitignoreados**: `n8n-workflow-C-admin-crud.json`, `n8n-workflow-D-upload-logo.json`, `.claude/`

---

## Gotchas críticos

### Mobile / red
- **VPN en celular** bloquea `fluky-n8n.lembgk.easypanel.host` — desactivar VPN para que funcione
- Si en el futuro hay problemas de red → configurar dominio propio `n8n.mflowsuite.com`
  como CNAME hacia `fluky-n8n.lembgk.easypanel.host` + configurar en EasyPanel

### OpenAI en Workflow A
- El nodo `OPEN API - Generar texto reseña` está **conectado** en el critical path de Workflow A
- Precarga el texto IA en la respuesta inicial → el usuario no espera al hacer click en "Ayudame"
- Si la respuesta se vuelve muy lenta (>5s en redes lentas), desconectar el nodo y dejarlo huérfano
- **NUNCA** reconectar si se observan timeouts en mobile

### iOS Safari — clipboard y popup
- `window.open()` y `execCommand('copy')` DEBEN llamarse dentro de un handler síncrono de user gesture
- `handleCopyAndOpen` es síncrona — NO agregar `await` antes del copy
- `openGoogleReviews()` está en un botón separado en `screen-positive-open` — iOS safe
- Solución clipboard: `<textarea readonly>` + `setSelectionRange` + restaurar `scrollY`
- `navigator.clipboard.writeText` en background como fallback para otros browsers
- Usar `min-height: 100dvh` en lugar de `100vh` para el viewport móvil

### n8n — prompt de IA multiline
- En el campo `jsonBody` de un nodo HTTP, los saltos de línea literales dentro de strings rompen el JSON
- Para hacer split por líneas en expresiones n8n: usar `String.fromCharCode(10)` en lugar de `'\n'`
- Alternativa más simple: pasar la lista completa a GPT con `.join(', ')` y pedirle que elija al azar

### n8n — referencias a nodos no adyacentes
- En un nodo cuyo input viene de otro nodo (no el anterior directo), `$json` tiene la respuesta del nodo inmediatamente anterior
- Para referenciar datos de un nodo anterior no adyacente: `$('NombreDelNodo').item.json.campo`

### n8n API
- `PUT /api/v1/workflows/{id}` requiere solo: `name`, `nodes`, `connections`, `settings`, `staticData`
- `settings` solo acepta: `executionOrder`, `timezone`, `callerPolicy`, `errorWorkflow`, `executionTimeout`, `saveManualExecutions`
- Propiedades extra → 400 Bad Request "must NOT have additional properties"

### CORS
- Todos los nodos "Respond to Webhook" necesitan `Access-Control-Allow-Origin: *`
- Workflow B y F manejan OPTIONS preflight manualmente (nodo IF + Respond 200)
- Workflow A/C/D/E: n8n maneja OPTIONS automáticamente

### Airtable — borrar campos via PATCH
- Para borrar un campo: enviar `null` explícitamente
- Si se omite el campo del payload (delete), Airtable lo deja intacto
- El admin panel envía `null` para campos vacíos opcionales desde `saveClient()`

### Airtable — otros
- La columna `active` puede llegar como `true` (boolean) o `'TRUE'` (string)
- OAuth2 token puede expirar — si Workflow A/E empieza a fallar, verificar credencial en n8n

### Resend
- Plan gratuito: 100 emails/día, 3.000/mes
- Si se supera el límite diario, los emails fallan silenciosamente (nodos con `continueOnFail: true`)
- La API key de tipo "Sending Access" NO permite verificar dominios — necesita "Full Access" para eso
- El campo `from` acepta formato `"Nombre <email@dominio.com>"` para mostrar nombre personalizado

### GitHub Pages
- Deploy tarda 1-5 minutos después de un push
- Probar en modo incógnito para evitar cache del navegador

---

## Clientes actuales
| clientId | Negocio | Idioma | Estado |
|----------|---------|--------|--------|
| `heladeria-tinos` | Heladería Tino's | `es-ES` | Activo ✅ |
| `distribuidora-cuarso` | Distribuidora Cuarso | `en-US` | Activo ✅ |
| `fluky-blanqueria-mayorista` | Fluky Blanquería Mayorista | `es-AR` | Activo ✅ |

---

## Pendientes / Próximos pasos
- [ ] QR por cliente: ya funciona en el modal del admin, falta imprimir físico para Tino's
- [ ] Resend: si el volumen crece, evaluar upgrade (plan Starter: 50.000/mes por USD 20)
- [ ] Workflow A: si la respuesta se vuelve lenta, desconectar nodo OpenAI y dejarlo huérfano

## Completado ✅
- [x] Prompt IA dinámico: campos `aiTopics`, `aiTones`, `aiStyles`, `aiMaxSentences`, `aiExtraInstructions` en Airtable. Workflows A y E los usan para generar texto variado.
- [x] i18n completo: objeto T con 3 idiomas (es-ES, es-AR, en-US), `applyTranslations()` cubre todas las pantallas. `reviewFallback` en el idioma correcto del cliente.
- [x] Dominio n8n: `fluky-n8n.lembgk.easypanel.host` funciona bien. Solo falla si el usuario tiene una VPN activa.
- [x] Fix iOS/Safari: clipboard y popup separados en dos botones distintos — funciona en iPhone y Mac Safari.
- [x] UX `screen-positive-open`: instrucciones primero, botón "Abrir Google Reviews" separado con animación pulse. Google se abre DESPUÉS de leer las instrucciones.
- [x] Pantalla de carga: solo spinner, sin texto (eliminado "Cargando..." para evitar problema de traducción).
- [x] Sistema de incentivos con anti-duplicado: Workflow F, tabla `coupons`, pantallas `incentive-gate` e `incentive-used`, código de cupón único por reclamo.
- [x] Notificaciones por email: Resend con dominio `mflowsuite.com`. Email al cliente (incentivo) + email al negocio (incentivo + reseña negativa). Remitente muestra el nombre del negocio.
- [x] `incentiveButtonText` configurable por negocio: campo en Airtable, Workflow A lo devuelve, frontend lo aplica, admin puede editarlo.
- [x] Admin panel — placeholders IA según idioma del cliente.
- [x] Admin panel — campos vacíos se borran correctamente en Airtable (envían `null`, no se omiten del PATCH).
- [x] IA en inglés para clientes en-US: prompt con ternario de idioma, `industry` en inglés en Airtable, `aiTopics`/`aiTones`/`aiStyles` en inglés para `distribuidora-cuarso`.
