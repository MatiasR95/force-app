# FORCE · Mi Rutina — Estado de cuota en la app

Plan de la primera versión de pagos. **Solo lectura**: la app lee `Pagos FORCE 2026`
y le muestra a cada socio si está al día. No escribe una sola celda en esa planilla,
no cobra, no integra Mercado Pago, no marca pagos automáticamente.

Decidido el 14/09/2026. Pendiente de aprobación antes de tocar código.

---

## 1. Qué ve el socio

La cuota no tiene una tarjeta fija en Inicio: ocupa lugar solo cuando hay algo que
hacer. En septiembre los 95 pagos entraron entre el 31/8 y el 9/9, o sea que tres
semanas de cada cuatro casi todos están al día, y una tarjeta que diga "todo bien"
es un bloque menos para lo que importa.

| Estado | Cuándo | Dónde aparece |
| --- | --- | --- |
| **Al día** | hay pago cargado del mes | **Solo en Perfil**, campo `Mi cuota`. Nada en Inicio |
| **Por vencer, 1 a 4** | principio de mes | **En ningún lado.** Avisarle el día 2 a quien siempre paga el 3 es hincharlo |
| **Por vencer, 5 a 9** | sin pago | Línea fina abajo, al peso del recordatorio de peso corporal |
| **Último día (10)** | sin pago | Tarjeta entera arriba, si gana el slot de atención |
| **Vencida (11+)** | sin pago | Tarjeta entera con los días de atraso |

Textos: *Tenés hasta el 10 para abonar la cuota de septiembre* · *Hoy es el último día
para abonar la cuota sin recargo* · *La cuota de septiembre está pendiente*, siempre
con **Ya la pagué → avisanos**.

Reglas que no se negocian:

- **Nunca se bloquea Entrenar.** El socio entrena aunque deba tres meses. La tarjeta
  avisa. Cobrar se arregla hablando, no con una pantalla.
- **Nunca acusa.** La planilla la cargás a mano, así que alguien que transfirió ayer
  puede leer "pendiente". Todos los estados sin pago llevan el botón
  **Ya la pagué → avisanos** (WhatsApp) y el pie **Actualizado al <fecha>**.
  Sin esa línea, el socio que ya pagó no tiene forma de saber si la planilla
  todavía no lo registró.
- **Nadie ve la cuota de otro.** El estado de pago no entra en ningún tablero
  compartido (récords, rachas, cumples). Solo el propio socio ve lo suyo.
- **A quien le pagan la cuota no se le reclama nunca.** Ver §3.

## 2. Un solo slot de atención en Inicio

Inicio venía acumulando bloques dorados que piden lo mismo. El 1 de octubre, un socio
que debe la cuota podía abrir la app y encontrar recap del mes, cuota vencida, "te
pasaron un récord" y su cumpleaños, los cuatro con borde dorado compitiendo. Cuando
gritan todos, no se lee ninguno.

Ahora se pinta **uno**, por prioridad:

1. **Tu cumpleaños.** Va primero a propósito: cobrarle a alguien el día que cumple
   años es exactamente lo que FORCE no hace.
2. **Cuota** (día 10 o vencida).
3. **Te pasaron un récord.**
4. **Recap del mes.**

Ninguno se pierde. El recap sigue ofrecido hasta que lo descarta, el récord robado queda
pendiente hasta que lo ve y la cuota no se paga sola: el que pierde sale al día siguiente.

Los avisos del gym (`NewsBanner`, cierres y horarios) quedan afuera del slot: que el
martes está cerrado no es una alerta personal que pueda esperar. El banner de evento
(patrias, Navidad) también, porque es el saludo del día, no algo para resolver.

Vive en `src/lib/homeAlerts.ts`. Cualquier bloque dorado nuevo en Inicio entra en esa
lista o no entra.

## 3. Grupos familiares

Hay socios que pagan la cuota de otros: una madre que paga la de sus dos hijas,
una pareja donde paga uno solo, un padre que cubre a tres de la familia. Hoy son
**5 grupos, 5 pagadores y 10 dependientes**.

Sin esto el app se equivoca hoy mismo: en septiembre una socia pagó dos cuotas en UNA
sola fila y **la otra persona del grupo no tiene fila propia**. El 11 abriría la app y
leería que debe una cuota que ya le pagaron.

### La notación: una columna

En `Clients`, **`PagaPor`** = el `ClientID` de quien paga. Vacío = paga lo suyo. El grupo
se deduce solo: pagador = cualquiera cuyo ClientID aparece en el `PagaPor` de otro.

> **Los nombres y ClientIDs de los grupos NO están en este repo.** Están en
> `grupos-familiares.csv`, que se le pasa a Matías aparte. Son datos personales de
> socios (quién le paga la cuota a quién) y un repo de código no es lugar para eso.

**`Promo Familiar` no sirve para esto.** Es un descuento, no un vínculo: el grupo de
cuatro figura siempre en `No`, y otro estuvo en `Si` de marzo a julio y pasó a `No` en
agosto. Deducir grupos de ahí se equivocaría con todos.

### La regla

**El socio está al día si tiene fila propia del mes, o si la tiene cualquiera de su
grupo.** No alcanza con mirar al pagador: en uno de los grupos la fila de septiembre
está cargada a nombre de una hija y quien paga es la madre. Con esta regla las dos
formas de cargar que usás hoy funcionan sin que cambies nada:

- una fila por persona (un grupo lo hace siempre; otro lo hizo de marzo a julio);
- una fila sola con el total de dos o tres cuotas (agosto y septiembre).

### Qué ve cada uno

**El pagador** ve una tarjeta que habla del grupo: *Las 3 cuotas de septiembre están
pendientes*, el total, y los nombres del grupo. El aviso del 10 le llega a él, una vez
por grupo, porque es el único que puede resolverlo.

**El dependiente no ve nunca una tarjeta de deuda.** Ni tarjeta, ni línea, ni aviso del
10. En Perfil, en tono neutro: *Tu cuota de septiembre la paga <quien sea>. Al día* o
*Todavía no figura registrada*. Sin monto, sin botón de pago y sin días de atraso: la
plata no pasa por sus manos y cargarle el reclamo es pasarle un problema ajeno.

### Dos cosas que esto destapó

**`DaysPerWeek = 0` no significa baja: significa que nadie actualizó la columna.**
Había socios en 0 que pagan todos los meses. La regla que teníamos (0 = no ve la
tarjeta) les hubiera escondido la cuota a socios activos, así que se cae. Con `DaysPerWeek = 0` no se puede calcular el monto
esperado: la tarjeta muestra el estado sin monto hasta que el dato esté cargado.

**Las familias no pagan el precio de `Pricing`.** En septiembre, los cuatro de un mismo
grupo pagaron entre `$500` y `$2.500` por debajo de la lista, cada uno distinto. El
monto de la tarjeta les va a quedar mal. Solución:
una columna **`MontoPactado`** en `Clients` que pise a `Pricing` cuando está cargada.
Sirve para cualquier arreglo especial, no solo familias.

### Cerrado el 16/09

Los 5 grupos están confirmados uno por uno con Matías, junto con los apellidos repetidos
que NO son grupo (hermanos que pagan cada uno lo suyo). También salió un `$940.000` en
julio que era un cero de más: iban `$94.000`.

## 4. Aviso del 10

**Ahora:** la tarjeta escala sola. El día 10 es lo más fuerte de Inicio y además se
abre una hoja una sola vez, descartable. Llega a quien abre la app ese día. Cuesta cero.

**Después, si hace falta:** notificación push real (llega con la app cerrada). Necesita
Web Push: claves VAPID, guardar la suscripción de cada socio y una tarea programada que
dispare el día 10. En iPhone solo funciona con la app instalada y con permiso aceptado.
Un día de trabajo. Se evalúa recién cuando sepamos si el aviso del 10 se pierde.

## 5. Datos para transferir

**Sí, hay que crear el tab.** Va en el **FORCE App — Config** (el mismo archivo que tiene
`clientes`), no en la planilla de pagos: ese archivo ya se abre en cada llamada del
backend y no hay que darle permiso a nada nuevo.

El tab se llama `pagos_config` y es **clave / valor**, una fila por dato, no encabezados
en la primera fila. Así agregar un dato mañana no toca ni una línea de código y no se
rompe si movés una fila de lugar:

| A (clave) | B (valor) |
| --- | --- |
| `alias` | … |
| `cvu` | … |
| `titular` | `Matias Rossi` |
| `whatsapp` | `54 9 221` + el número, todo junto y sin signos |
| `recargo_semanal` | `5000` |

**Los valores reales no están en este repo ni van a estar.** `MatiasR95/force-app` es
público: un CVU y un teléfono pegados acá quedan indexados y se raspan solos. En el
código hay datos de ejemplo; los de verdad los cargás una vez en esa pestaña. Matías
los pasó el 15/09 y están listos para pegar.

Texto de la tarjeta, efectivo primero:

> **Si podés, preferimos efectivo en el local. Nos da una mano enorme.**
> Si te queda más cómodo transferir: alias `…` · CVU `…` · Titular `…` · [Copiar]

### Recargo

`$5.000 por cada semana de atraso pasado el 10`. La primera semana corre del 11 al 17,
la segunda del 18 al 24. La tarjeta lo dice como dato, no como reto:

> Se suma $5.000 por cada semana de atraso pasado el 10: van 2 semanas ($10.000).

Solo aparece cuando la cuota ya está vencida.

## 6. Cómo se calcula el estado

Todo lectura, sin escritura:

1. `Clients` por `token` → `DaysPerWeek`.
2. `Pricing` del mes en curso + ese `DaysPerWeek` → **monto esperado**.
3. Pestaña del mes en curso → ¿hay fila de ese socio, **o de alguien de su grupo**,
   con `Mes de Pago` del mes? → **pagado** (ver §3).

Detalles de implementación:

- Se lee **por nombre de columna, nunca por posición**: Febrero no tiene columna `Medio`.
  El formato cambia entre meses y va a volver a cambiar.
- La pestaña del mes se busca por su nombre y se valida contra la columna `Mes de Pago`.
- Caché de 10 minutos por socio. El estado cambia un par de veces por día, no por minuto.
- Si algo falla (planilla movida, mes sin pestaña, socio sin mapear), la tarjeta
  **no aparece**. Nunca se muestra "vencido" por un error de lectura.

### Endpoint nuevo

```
GET  ?action=getPago&token=...
  → { periodo, estado, monto, actualizadoAl, grupo, config, pagadoEl?, medio? }
  → { sinDatos: true }   cuando el socio no tiene `clientid` o no está en `Clients`
```

Único agregado al backend. **No hay `POST` de pagos**, ni lo va a haber en esta versión.

Detalles que valen:

- **Sin `clientid`, no se muestra nada.** Antes que arriesgar un cruce por nombre y
  decirle a alguien que está al día que debe plata, la tarjeta no aparece.
- **Dos cachés**: el padrón + los pagos del mes en una sola clave compartida (10 min),
  y la respuesta por socio (10 min). Sin la primera, cada teléfono releería las tres
  pestañas enteras y a la hora pico se satura la cuota de ejecuciones simultáneas.
- **El front recalcula el estado** con la fecha del teléfono. La respuesta está cacheada
  10 minutos y el aviso del día 10 no puede llegar tarde por eso.
- **La pestaña del mes no se busca por nombre exacto.** Alcanza con que alguien la
  renombre a "Septiembre 2026" para que `getSheetByName` devuelva null y nadie vea su
  cuota; se busca por nombre que contenga el mes y, si falla, revisando la columna
  `Mes de Pago` de cada pestaña.
- `config` (alias, CVU, titular, WhatsApp, recargo) viaja en la misma respuesta, así no
  hay una segunda llamada.

### Qué pasa si la planilla no se puede leer

Si `Pagos FORCE 2026` no está compartida con la cuenta del gym, la movieron o la
renombraron, `getPago` devuelve `sinDatos` y el error queda en el log del servidor.
La app no muestra tarjeta y nada más se rompe. **Ninguna falla de lectura puede
terminar en una deuda inventada**: ese es el único error que esta función no puede
cometer.

### Probado contra los datos reales

Se simuló `getPago_()` con las dos planillas de verdad, sin tocar Google. El caso que
motivó todo esto pasa: **el dependiente que no tiene fila propia da `al_dia`**, y el
grupo cuya fila está cargada a nombre de una hija también. Un `clientid` que no existe
en `Clients` devuelve `sinDatos` en vez de inventar un estado.

## 7. Requisitos antes de codear

1. ~~Compartir `Pagos FORCE 2026` con `forcebyaurus@gmail.com`~~ **hecho el 15/09.**
2. **Columna `clientId` en el tab `clientes` del Config** (ver §8). No al revés.
3. **Columna `PagaPor` en `Clients`** con los 5 grupos de §3.
4. **Columna `MontoPactado`** para quienes no pagan el precio de `Pricing`.
5. ~~Poner los `DaysPerWeek` que faltaban~~ **hecho el 16/09.**
6. **Pegar el `Tokens.gs` nuevo** junto con el `Code.gs`, o `rebuildClientConfig()`
   borra la columna `clientId` la primera vez que agregues un socio.

## 8. El mapeo socio ↔ cuenta de la app

Los nombres no coinciden entre planillas. La app toma el nombre de la **carpeta de
Drive**, que son apodos y diminutivos, y la planilla de pagos usa el **nombre completo**,
con erratas en los apellidos de los dos lados. De 95 socios que pagaron en septiembre,
34 no cruzaban ni por nombre de pila. Cruzar por nombre en vivo no sirve: un match
equivocado le dice a alguien que está al día que debe plata.

Se resuelve una vez, a mano. Después el cruce es por identidad, exacto, para siempre.

### El token no se mueve: se mueve el ClientID

La tentación es poner una columna `token` en `Clients`. **No.** Los tokens son la llave
de acceso de cada socio y viven en un solo lugar, el Config sheet. Copiarlos a la
planilla de pagos los duplica, obliga a un `IMPORTRANGE` entre archivos y deja la llave
en dos lados.

Va al revés: **`clientId` como séptima columna del tab `clientes` del Config**, al lado
de `genero`. Ese archivo ya se abre en cada llamada del backend, así que no cuesta nada.

> **Ojo con `rebuildClientConfig()`**: reescribe el tab entero cada vez que agregás un
> socio. Ya preservaba `token` y `genero`; ahora también preserva `clientId`
> (`apps-script/Tokens.gs`). Si pegás el `Code.gs` nuevo, pegá también el `Tokens.gs`
> nuevo, o la primera corrida te borra el mapeo completo.

### Dónde va cada columna

| Archivo | Tab | Columna nueva | Qué va |
| --- | --- | --- | --- |
| FORCE App — Config | `clientes` | **G · `clientId`** | el `ClientID` del socio en la planilla de pagos |
| Pagos FORCE 2026 | `Clients` | **F · `PagaPor`** | `ClientID` de quien le paga (vacío = paga lo suyo) |
| Pagos FORCE 2026 | `Clients` | **G · `MontoPactado`** | monto fijo que pisa a `Pricing` (vacío = precio de lista) |
| FORCE App — Config | `pagos_config` | tab nuevo | ver §5 |

Las columnas se agregan **a la derecha de lo que ya hay**, sin mover nada. `Clients`
hoy termina en `E · FamilyDiscount`, así que `PagaPor` es F y `MontoPactado` es G. El
backend lee **por nombre de encabezado**, así que el orden no le importa; se agregan al
final para no romper fórmulas ni el modelo de Power BI.

### Cómo se carga

Dos caminos, y dan lo mismo:

- **`backfillClientIds()`** en el editor de Apps Script (está en `Tokens.gs`). Lee los
  dos tabs, cruza, y escribe **solo lo que está fuera de duda**. Lo ambiguo lo deja en
  blanco y lo lista en el log. Es idempotente y nunca pisa una celda ya cargada.
- **Pegar la columna** del CSV que se le pasa a Matías aparte, en `G2`.

Las dos formas se verificaron contra el mismo mapeo revisado a mano: **142 asignaciones,
cero contradicciones**.

Cómo decide la función, y por qué así:

- **Asigna de mayor a menor puntaje, no por orden de fila.** Asignando por filas, un
  match flojo que aparecía antes le robaba el `ClientID` al dueño real y el socio exacto
  quedaba sin asignar.
- **El apellido tiene piso propio** (`0.86` para alta), separado del nombre de pila. Un
  promedio ponderado llegó a proponer dos apellidos que no se parecen en nada, solo
  porque no había ningún competidor cerca.
- **Un prefijo alcanza para el nombre de pila**: `Ro`/`Rosario`, `Cande`/`Candela`,
  `Vicky`/`Victoria`. Más una tabla chica de apodos que no comparten prefijo
  (`Nacho`/`Ignacio`, `Lucho`/`Luis`).
- **Ante la duda, no escribe.** Un `ClientID` equivocado le muestra a un socio la cuota
  de otro: es el único error que esta función no puede cometer.

Quedan ~17 cuentas sin `clientId`, y está bien: son carpetas de Drive viejas, nombres de
pila sueltos (`Belu`, `Juli`, `Nico`) o socios que no están en `Clients`. Sin `clientId`
la tarjeta no aparece, que es exactamente lo que queremos.

### Hallazgos del padrón (revisalos aunque no hagamos pagos)

Los nombres van en un CSV aparte, fuera del repo. En resumen:

- **Una socia está dos veces en `Clients`** con dos `ClientID` distintos, y otra aparece
  dos veces con el nombre escrito distinto.
- **Dos socios tienen la carpeta de Drive duplicada**, o sea dos tokens de acceso para
  la misma persona.
- `Pricing` no tiene fila de 5× ni 6× para **Mayo**.

## 9. Qué NO hace esta versión

No cobra, no escribe en `Pagos FORCE 2026`, no manda recordatorios automáticos por
WhatsApp, no deja que el socio declare un pago y no integra Mercado Pago. Nada cambia
de estado sin que vos o Fer carguen la fila a mano, como hoy.

## 10. Archivos

| Archivo | Qué pasa |
| --- | --- |
| `apps-script/Code.gs` | `getPago_()` + ruta `getPago` + `PAGOS_SHEET_ID` |
| `apps-script/Tokens.gs` | preserva `clientId` al reconstruir el tab `clientes` |
| `src/lib/pagos.ts` | tipos, estados, grupos, `visibilidadEnInicio`, datos de muestra |
| `src/lib/homeAlerts.ts` | el slot único de atención |
| `src/components/PagoCard.tsx` | tarjeta, línea fina y la fila de Perfil |
| `src/components/Profile.tsx` | el campo `Mi cuota` |
| `src/lib/api.ts` | `fetchPago()` |
| `src/screens/Home.tsx` | montar la tarjeta |
| `test/pagos.test.ts` | estados, visibilidad, grupos y recargo |
| `test/home-alerts.test.ts` | la prioridad del slot |

## 11. Puesta en marcha

- [x] Compartir `Pagos FORCE 2026` con la cuenta del gym como **Lector**. (15/09)
- [ ] Revisar las 8 filas `revisar` de socios activos en `mapeo-socios.csv`.
- [ ] Pegar la columna `clientId` en el tab `clientes` del Config.
- [ ] Cargar `PagaPor` con los 10 dependientes de `grupos-familiares.csv`.
- [ ] Cargar `MontoPactado` para los que no pagan precio de lista.
- [x] Poner los `DaysPerWeek` que faltaban. (16/09)
- [x] Corregir el `$940.000` de julio: iban `$94.000`. (16/09)
- [ ] Unificar los duplicados del padrón (ver `hallazgos-padron.csv`).
- [ ] Crear el tab `pagos_config` (clave/valor) en el Config con los 5 datos de §5.
- [ ] Agregar `PagaPor` y `MontoPactado` a la derecha de `Clients` (F y G).
- [ ] Pegar el `Code.gs` **y el `Tokens.gs`** nuevos, y **editar** el deployment
      existente (mantiene el mismo `/exec`).
- [ ] Probar con tu propio token antes de que lo vea nadie.

## 12. Más adelante (nada de esto está aprobado)

Vista `Cobranzas` con quién debe y recordatorio por WhatsApp de un toque. Resumen diario
por mail. Modo `Cobrar` para vos y Fer, que escribe la fila en el momento y llena `Retiro`.
Notificación push del día 10.
