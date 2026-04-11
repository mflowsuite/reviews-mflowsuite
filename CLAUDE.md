# Reseñas Positivas — Documentación del Sistema

## Stack
| Capa | Tecnología | URL |
|------|-----------|-----|
| Frontend | HTML/CSS/JS vanilla | GitHub Pages → `reviews.mflowsuite.com` |
| Admin panel | HTML/CSS/JS vanilla | `reviews.mflowsuite.com/admin/` |
| Base de datos | Airtable | Base `appwlnvY7rceVb06Q`, tabla `tblxTlomzuupQcgyY` |
| Backend | n8n en EasyPanel | `fluky-n8n.lembgk.easypanel.host` |
| IA | OpenAI GPT-4.1-mini via n8n | credencial "OpenAi Guzel" |
| Logos | GitHub repo `/assets/` | `reviews.mflowsuite.com/assets/` |

---

## Workflows n8n

### Workflow A — Get Client Config (`fAmH0SbPDcyyvEV4`)
- **Webhook**: `GET /webhook/get-client-config?clientId=XXX`
- **Flujo**: Webhook → Airtable (buscar cliente) → IF activo → Set respuesta → Respond 200
- **IMPORTANTE**: OpenAI está DESCONECTADO del critical path (nodo huérfano).
  La respuesta tarda ~1.7s. Si se reconecta OpenAI, la respuesta sube a 5-6s
  y el celular deja de funcionar (timeout).
- **Responde**: JSON con config del cliente (sin `suggestedReviewAI` — siempre vacío)

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
- **Flujo**: Normalizar → Buscar en tabla `coupons` → IF ya reclamado → Respond `{ claimed: true }`
  - Si NO reclamado → Get client config → Build email data → Guardar en `coupons` → Gmail cliente → IF notificationEmail → Gmail negocio → Respond `{ claimed: false, couponCode }`
- **Credenciales**: "Airtable Admin PAT" (HTTP Header) + "Gmail Fluky" (OAuth2)
- **Anti-duplicado**: busca por `clientId + email` en tabla `coupons` antes de crear
- **Código generado**: `XXX-XXXXXX` (prefijo 3 letras del clientId + 6 chars random)

---

## Campos Airtable — tabla `clients`
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
| `incentiveText` | text | Texto del incentivo |
| `notificationEmail` | email | Email del dueño para recibir avisos de cupones |
| `active` | boolean | Cliente activo (IF lo verifica) |
| `aiTopics` | multilineText | Temas para prompt IA (uno por línea) |
| `aiTones` | multilineText | Tonos para prompt IA (uno por línea) |
| `aiStyles` | multilineText | Estructuras de apertura (uno por línea) |
| `aiMaxSentences` | number | Máx oraciones en texto IA |
| `aiExtraInstructions` | text | Instrucciones extra fijas para IA |

## Campos Airtable — tabla `coupons` (`tbljuu3kuNFezEanG`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `couponCode` | text | Código único (ej: `HEL-A3F9K2`) — campo primario |
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
  POSITIVE_MIN:     4,
  PHOTO_MAX_PX:     1200,
  PHOTO_QUALITY:    0.75,
};
```

### Flujo de pantallas
```
loading → [fetch n8n] → rating → confirmRating()
                                  ├─ (≥4★) → positive-write → thankyou-positive → incentive
                                  └─ (<4★) → negative → thankyou-negative
```

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

---

## Seguridad
- **Tokens n8n**: en n8n native credentials (no en el repo)
  - "Airtable Admin PAT" — Airtable read+write
  - "GitHub Token" — push a repo
  - "OpenAi Guzel" — OpenAI API
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

### n8n API
- `PUT /api/v1/workflows/{id}` requiere solo: `name`, `nodes`, `connections`, `settings`, `staticData`
- `settings` solo acepta: `executionOrder`, `timezone`, `callerPolicy`, `errorWorkflow`, `executionTimeout`, `saveManualExecutions`
- Propiedades extra → 400 Bad Request "must NOT have additional properties"

### CORS
- Todos los nodos "Respond to Webhook" necesitan `Access-Control-Allow-Origin: *`
- Workflow B maneja OPTIONS preflight manualmente (nodo IF + Respond 204)
- Workflow A/C/D/E: n8n maneja OPTIONS automáticamente

### iOS Safari
- `window.open(url, '_blank')` debe llamarse DIRECTAMENTE en el click handler, no después de un `await`
- `touchend` listeners deben ser `{ passive: true }` — nunca `passive: false` + `preventDefault`
- Usar `min-height: 100dvh` en lugar de `100vh` para el viewport móvil

### Airtable
- La columna `active` puede llegar como `true` (boolean) o `'TRUE'` (string) — el IF node compara con boolean `true`, pero el Set node hace `|| null` como fallback
- OAuth2 token puede expirar — si Workflow A/E empieza a fallar, verificar credencial en n8n

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

## Completado ✅
- [x] Prompt IA dinámico para Tino's: campos `aiTopics`, `aiTones`, `aiStyles`, `aiMaxSentences`, `aiExtraInstructions` cargados en Airtable. Workflow E los usa para generar texto variado.
- [x] Dominio n8n: `fluky-n8n.lembgk.easypanel.host` funciona bien. Solo falla si el usuario tiene una VPN activa en su dispositivo (solución: desactivar VPN). No requiere cambio.
