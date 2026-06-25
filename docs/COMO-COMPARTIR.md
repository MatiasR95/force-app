# Cómo compartir la app con un cliente (guía para el coach)

Onboardear a un miembro lleva **2 minutos**. Una vez que el backend está publicado
(ver `docs/GO-LIVE.md`), repetí esto por cada cliente.

## Pasos

1. **Asegurate de que el cliente tenga su carpeta** en `Clientes/<Nombre>/` con su **planilla de
   rutina** adentro (la hoja suelta más reciente, no dentro de `Historial/`).
2. En el proyecto **Apps Script** corré, en este orden:
   - **`rebuildClientConfig`** → registra al cliente y le crea su token (los existentes no se tocan).
   - **`listMagicLinks`** → *View → Logs*: copiá el **link** y la **URL del QR** de ese cliente.
3. **Mandale dos cosas** por WhatsApp:
   - su **link** (o el **QR** para que escanee), y
   - el **PDF** `docs/FORCE-Guia-Cliente.pdf` (la guía linda para el cliente).
4. El cliente toca el link → se abre con su nombre → lo instala como app. **Listo.**

> El link es **personal**: cada uno ve solo su rutina. No hace falta usuario ni contraseña.
> No necesitás volver a publicar la app ni el backend para sumar gente: solo los 2 pasos de arriba.

## Mensaje listo para pegar (WhatsApp)

> ¡Bienvenido/a a **FORCE**! 💪 Tu rutina ahora la tenés en el celular.
>
> 1) Tocá tu link: **<PEGÁ EL LINK ACÁ>**
> 2) Se abre con tu nombre. Instalala como app para tenerla a mano:
>    • Android (Chrome): menú ⋮ → *Agregar a pantalla de inicio*
>    • iPhone (Safari): *Compartir* → *Agregar a inicio*
> 3) Cada día te muestra **qué te toca** y te lleva **serie por serie**. Marcás lo que hacés y
>    se guardan tu progreso y tus récords.
>
> Te dejo una **guía rápida** acá 👇 (el PDF)
> Cualquier duda, escribime. ¡Nos vemos en la sala! 🔱

## Si sumás varios clientes de una
Creá todas las carpetas + planillas primero, corré **`rebuildClientConfig`** una sola vez, después
**`listMagicLinks`** te lista a todos con su link/QR. Repartís y listo.
