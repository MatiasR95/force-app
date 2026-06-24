# FORCE · Mi Rutina — Checklist para salir en vivo

Pasos para pasar de demo a **clientes reales**. Hacelos en orden. Detalle largo en
`apps-script/SETUP.md`.

## 0. Pre-requisitos (una sola vez, si nunca lo hiciste)
- [ ] Tener el **config sheet** (tab `clientes`) y el **ID de la carpeta `Clientes/`**.
- [ ] Tener el proyecto Apps Script con `Code.gs` + `Tokens.gs` y `CONFIG_SHEET_ID` /
      `CLIENTES_FOLDER_ID` seteados. (SETUP.md §1–§3.)

## 1. Actualizar el backend con el código nuevo
Esta versión agrega endpoints (`updateCells`) y la columna `wc` en récords.
- [ ] En el proyecto Apps Script, pegá el **`Code.gs` actualizado** de este repo (reemplazá el viejo).
- [ ] **Deploy → Manage deployments → editar (✏️) el Web App existente → Version: *New version* → Deploy.**
      Editar el deployment existente **mantiene el mismo `/exec`**, así no tocás el secret.
- [ ] (Si es la primera vez) Deploy → *New deployment* → Web app · *Execute as: Me* · *Who has access:
      Anyone* → copiá el `/exec`.

## 2. Clientes y links
- [ ] Corré **`rebuildClientConfig`** (llena `clientes` con token+carpeta de cada miembro).
- [ ] Corré **`listMagicLinks`** → View → Logs → copiá el **link/QR de cada cliente**.
- [ ] Repartí el QR (imprimir en la sala / mandar por WhatsApp).

## 3. Publicar la app
- [ ] Confirmá el secret **`VITE_FORCE_API`** en GitHub (Settings → Secrets → Actions) = el `/exec`.
- [ ] **Push a `main`** → GitHub Actions corre tests+build y publica a GitHub Pages.
      *(Esta versión está commiteada pero NO pusheada todavía.)*
- [ ] Esperá que termine la Action (pestaña *Actions* en verde).

## 4. Prueba de humo (con un cliente real)
- [ ] Abrí un **magic link** real en el celu → carga la rutina del cliente (no el demo).
- [ ] Entrená un día: marcá series, **ajustá un peso** → confirmá que el número
      **aparece en la planilla** del cliente y la fila anterior queda registrada en `Seguimiento`.
- [ ] Hacé una marca grande → confirmá que entra a **Récords** con su **categoría**.
- [ ] Revisá **Inicio**: clima, feriado, tip, racha; y el **Perfil** (peso/cumple).

## Notas
- **Sexo / peso / cumpleaños:** hoy cada cliente los carga en **Perfil**. Para automatizarlo a
  futuro, traer el sexo de la planilla de Pagos vía el tab `clientes` (ver HANDOFF §5).
- **Feriados:** la lista (`src/lib/feriados.ts`) cubre 2026–2027; actualizá cuando salga el decreto.
- **Iconos:** animados y on-brand; si alguno se lee raro, pediselo al agente `sc-coach`.
