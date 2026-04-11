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
- **Flujo**: Webhook → Airtable (buscar cliente) → IF activo → Set respuesta → Respond 200
- **IMPORTANTE**: OpenAI está DESCONECTADO del critical path (nodo huérfano).
  La respuesta tarda ~1.7s. Si se reconecta OpenAI, la respuesta sube a 5-6s
  y el celular deja de funcionar (timeout).
- **Responde**: JSON con todos los campos del cliente incluyendo `incentiveButtonText`

### Workflow B — Save Feedback (`2RI2HG6j4N2BaU20`)
- **Webhook**: `POST /webhook/save-feedback`
- **Flujo**: OPTIONS preflight → Validar → Foto (opcional, imgBB) → Airtable guardar
- Maneja CORS manualmente (nodo `IF - OPTIONS preflight`)

### Workflow C — Admin CRUD (`Daaqa7fMbmWBVDwC`)
- **Webhook**: `POST /webhook/admin-clients`
- **Auth**: clave hardcodeada en Code node (no en el repo)
- **Acciones**: `list`, `save` (create/update por recordId)
- **Credencial Airtable**: "Airtable Admin PAT" — PAT con permisos read+write

### Workflow D — Upload Logo (`GYf9xxqMFW7GxKu9`)
- **Webhook**: `POST /webhook/upload-logo`
- **Flujo**: Auth → base64 → GitHub PUT → devuelve URL pública
- **Credencial GitHub**: "GitHub Token"
- **Destino**: `reviews.mflowsuite.com/assets/logos/{timestamp}-{filename}.png`

### Workflow E — Generate AI Review Text (`4QwRCImkvX5VdmB0`)
- **Webhook**: `GET /webhook/generate-review-text?clientId=XXX`
- **Flujo**: Airtable → IF activo → OpenAI → Respond `{ reviewText: "..." }`
- Solo se llama cuando el usuario hace click en "Ayudame con el texto"
- Tarda 3-5s (tiene OpenAI) — está bien porque el usuario espera activamente

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
- **API key**: guardada directamente en los nodos HTTP de Workflow F (header `Authorization: Bearer re_...`)
- **Sender**: `"{businessName} <noreply@mflowsuite.com>"` — nombre dinámico por negocio
- **Emails que se envían**:
  - Al cliente: `🎁 Tu regalo de {businessName}` — con incentiveText + couponCode + instrucción de canje
  - Al negocio: `🎁 Nuevo cupón reclamado — {businessName}` — con email cliente + código + timestamp

---

## Campos Airtable — tabla `clients` (`tblxTlomzuupQcgyY`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `clientId` | text | Slug único (ej: `heladeria-tinos`) |
| `businessName` | text | Nombre del negocio |
| `industry` | text | Rubro (ej: `heladería`) |
| `language` | text | `es-ES`, `es-AR`, `en-US` |
| `logoUrl` | text | URL pública del logo |
| `googleReviewUrl` | text | Link directo a Google Reviews |
| `accentColor` | text | Hex color (ej: `#00B4D8`) |
| `suggestedReviewText` | text | Texto estático de fallback para reseña |
| `photoUploadEnabled` | boolean | Habilitar subida de foto |
| `photoPromptText` | text | Texto del prompt de foto |
| `incentiveEnabled` | boolean | Mostrar pantalla de incentivo |
| `incentiveText` | text | Texto del incentivo (ej: "15% off en tu próxima visita") |
| `incentiveButtonText` | text | Texto del botón de reclamo (ej: "Reclamar sorpresa 🎁") — si vacío usa default |
| `notificationEmail` | email | Email del dueño para recibir avisos de cupones reclamados |
| `active` | boolean | Cliente activo (IF lo verifica) |
| `aiTopics` | multilineText | Temas para prompt IA (uno por línea) |
| `aiTones` | multilineText | Tonos para prompt IA (uno por línea) |
| `aiStyles` | multilineText | Estructuras de apertura (uno por línea) |
| `aiMaxSentences` | number | Máx oraciones en texto IA |
| `aiExtraInstructions` | text | Instrucciones extra fijas para IA |

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
                                  ├─ (≥4★) → positive-write → [Copiar y abrir Google]
                                  │                              ↓ handleCopyAndOpen() (sync)
                                  │                           positive-open (muestra texto copiado)
                                  │                              ↓ "Ya lo pegué"
                                  │                           thankyou-positive
                                  │                              ↓ (si incentiveEnabled, 2.8s)
                                  │                           incentive-gate (pide email)
                                  │                              ↓ claimIncentive(email)
                                  │                           ├─ (claimed: true)  → incentive-used
                                  │                           └─ (claimed: false) → incentive (cupón + código)
                                  └─ (<4★) → negative → thankyou-negative
```

### Funciones clave

**`handleCopyAndOpen()`** — **SÍNCRONA** (no async):
- Copia el texto con `document.execCommand('copy')` + tricks iOS (textarea readonly, setSelectionRange, restaurar scroll)
- También intenta `navigator.clipboard.writeText` en background para browsers modernos
- Abre Google Reviews con `window.open(url, '_blank')` dentro del mismo user gesture
- Guarda texto en `state.copiedReviewText` y lo muestra en `#po-review-preview`
- Debe permanecer síncrona — si se convierte a async, iOS Safari bloquea el popup y el clipboard

**`showThankyouPositive()`**:
- Muestra `screen-thankyou-positive`
- Si `incentiveEnabled`, después de 2.8s va a `screen-incentive-gate`

**`claimIncentive(email)`** — async:
- POST a `N8N_CLAIM_URL` con `{ clientId, email }`
- Si `data.claimed === true` → `showScreen('incentive-used')`
- Si `data.claimed === false` → setea `#coupon-code` con `data.couponCode` y va a `screen-incentive`

**`skipIncentive()`**:
- Llamado desde el link "Prefiero no recibirlo" en `screen-incentive-gate`
- Vuelve a `screen-thankyou-positive`

**`applyBranding(client)`**:
- Setea `--accent`, logo, nombre del negocio
- Si `client.incentiveButtonText` existe, lo aplica al botón `#claim-btn`

### Comportamiento offline/error
- **AbortError (timeout 12s)** → fallback: pantalla rating sin branding + banner amarillo
- **Error de red / servidor** → igual que AbortError
- **404 (cliente no existe)** → pantalla "Enlace no válido"
- El banner `#offline-banner` se muestra cuando carga sin branding

### Texto IA (generateAIText)
- El botón "Ayudame con el texto" llama a `N8N_GENERATE_URL` (Workflow E)
- Si falla → usa `suggestedReviewText` de Airtable como fallback
- La respuesta de Workflow E tiene formato `{ reviewText: "..." }`

---

## Frontend — index.html (pantallas relevantes)

### `screen-incentive-gate`
- Muestra emoji 🎁, título, subtítulo
- Formulario `#claim-form` con input `#claim-email`
- Botón `#claim-btn` con texto configurable (default "Reclamar regalo 🎁")
- Div `#claim-error` para errores de validación
- Link "Prefiero no recibirlo" → llama `skipIncentive()`

### `screen-incentive-used`
- Muestra cuando el cliente ya reclamó antes (email duplicado)
- Emoji 💜, "Ya recibiste este regalo"

### `screen-incentive`
- Muestra el cupón con `client.incentiveText`
- Elemento `#coupon-code` (oculto por defecto) que se llena con el código generado
- Solo se navega a esta pantalla después de `claimIncentive()` exitoso

### `screen-positive-open`
- Instrucciones de pegado más grandes (`.paste-instruction`, `.paste-hint`, `.paste-hint-pc`)
- Div `#po-copied-text` con `#po-review-preview` — muestra el texto copiado para referencia
- Permite al usuario ver el texto mientras alterna con Google en otro tab

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
- La contraseña se verifica en el Code node de Workflow C

### QR Modal
- Modo día/noche, descargar PNG, imprimir
- URL codificada: `https://reviews.mflowsuite.com/?clientId={slug}`
- Generado con: `https://api.qrserver.com/v1/create-qr-code/`

### Logo upload
- Redimensiona a max 800px con canvas antes de enviar
- Envía base64 a Workflow D → GitHub PUT → devuelve URL
- URL formato: `https://reviews.mflowsuite.com/assets/logos/{timestamp}-{filename}.png`

### Campos del formulario
Incluye todos los campos de la tabla `clients`. Los relevantes al incentivo:
- `notificationEmail` — email del dueño del negocio (recibe aviso cuando alguien reclama)
- `incentiveButtonText` — texto personalizable del botón de reclamo (dentro de `#incentive-fields`)

---

## Seguridad
- **Tokens n8n**: en n8n native credentials (no en el repo)
  - "Airtable Admin PAT" — Airtable read+write
  - "GitHub Token" — push a repo
  - "OpenAi Guzel" — OpenAI API
- **Resend API key**: hardcodeada en nodos HTTP de Workflow F (header Authorization)
- **Credencial Airtable OAuth2** (Workflow A/E): "Clientes Tiendanube" (ID: `1H9wOKsGsvMbhda0`)
- **Clave admin**: hardcodeada en Workflow C Code node (no en GitHub)
- **Archivos gitignoreados**: `n8n-workflow-C-admin-crud.json`, `n8n-workflow-D-upload-logo.json`, `.claude/`

---

## Gotchas críticos

### Mobile / red
- **VPN en celular** bloquea `fluky-n8n.lembgk.easypanel.host` — desactivar VPN para que funcione
- Si en el futuro hay problemas de red → configurar dominio propio `n8n.mflowsuite.com`
  como CNAME hacia `fluky-n8n.lembgk.easypanel.host` + configurar en EasyPanel

### OpenAI en critical path
- **NUNCA reconectar OpenAI al critical path de Workflow A**
- Con OpenAI: respuesta 5-6s → timeout en mobile (AbortController 12s muy justo en redes lentas)
- Sin OpenAI: respuesta 1.7s → funciona en cualquier red
- El texto IA se genera lazy (Workflow E, solo cuando el usuario lo pide)

### iOS Safari — clipboard y popup
- `window.open()` y `execCommand('copy')` DEBEN llamarse dentro de un handler síncrono de user gesture
- Si `handleCopyAndOpen` se vuelve `async` (o usa `await` antes del open/copy), iOS Safari bloquea ambos
- Solución: usar `document.execCommand('copy')` con un `<textarea readonly>` + `setSelectionRange` + restaurar `scrollY`
- `navigator.clipboard.writeText` se puede intentar en background (`.catch(() => {})`) como fallback para otros browsers
- `touchend` listeners deben ser `{ passive: true }` — nunca `passive: false` + `preventDefault`
- Usar `min-height: 100dvh` en lugar de `100vh` para el viewport móvil

### n8n — referencias a nodos no adyacentes
- En un nodo cuyo input viene de otro nodo (no el anterior directo), `$json` tiene la respuesta del nodo inmediatamente anterior
- Para referenciar datos de un nodo anterior no adyacente: `$('NombreDelNodo').item.json.campo`
- Ejemplo en Workflow F: después de `HTTP - Create Coupon`, el `$json` es la respuesta de Airtable.
  Los datos del cliente están en `$('Code - Build Email').item.json.email` (y otros campos)

### n8n API
- `PUT /api/v1/workflows/{id}` requiere solo: `name`, `nodes`, `connections`, `settings`, `staticData`
- `settings` solo acepta: `executionOrder`, `timezone`, `callerPolicy`, `errorWorkflow`, `executionTimeout`, `saveManualExecutions`
- Propiedades extra → 400 Bad Request "must NOT have additional properties"

### CORS
- Todos los nodos "Respond to Webhook" necesitan `Access-Control-Allow-Origin: *`
- Workflow B y F manejan OPTIONS preflight manualmente (nodo IF + Respond 200)
- Workflow A/C/D/E: n8n maneja OPTIONS automáticamente

### Airtable
- La columna `active` puede llegar como `true` (boolean) o `'TRUE'` (string) — el IF node compara con boolean `true`, pero el Set node hace `|| null` como fallback
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
| clientId | Negocio | Estado |
|----------|---------|--------|
| `heladeria-tinos` | Heladería Tino's | Activo ✅ |

---

## Pendientes / Próximos pasos
- [ ] Panel admin: pantalla para dar de alta clientes sin tocar Airtable directamente
- [ ] QR por cliente: ya funciona en el modal del admin, falta imprimir físico para Tino's
- [ ] Workflow A: el nodo "OPEN API" está desconectado (huérfano) — se puede eliminar para limpiar
- [ ] Resend: si el volumen crece, evaluar upgrade (plan Starter: 50.000/mes por USD 20)

## Completado ✅
- [x] Prompt IA dinámico para Tino's: campos `aiTopics`, `aiTones`, `aiStyles`, `aiMaxSentences`, `aiExtraInstructions` cargados en Airtable. Workflow E los usa para generar texto variado.
- [x] Dominio n8n: `fluky-n8n.lembgk.easypanel.host` funciona bien. Solo falla si el usuario tiene una VPN activa en su dispositivo (solución: desactivar VPN). No requiere cambio.
- [x] Fix iOS/Safari: botón "Copiar y abrir Google" ahora usa `execCommand` síncrono — funciona en iPhone y Mac Safari.
- [x] Pantalla `positive-open` mejorada: muestra el texto copiado como referencia + instrucciones de pegado más grandes.
- [x] Sistema de incentivos con anti-duplicado: Workflow F, tabla `coupons`, pantallas `incentive-gate` e `incentive-used`, código de cupón único por reclamo.
- [x] Notificaciones por email: Resend configurado con dominio `mflowsuite.com`. Email al cliente con código + email al negocio si tiene `notificationEmail`. Remitente muestra el nombre del negocio.
- [x] `incentiveButtonText` configurable por negocio: campo en Airtable, Workflow A lo devuelve, frontend lo aplica, admin puede editarlo.
