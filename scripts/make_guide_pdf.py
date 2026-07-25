# Generates the FORCE client guide PDF — a premium, human-first brochure.
# Brand: gold on black, Montserrat (Black/Bold/Med/Reg/Light), winged emblem, the Spine.
# Static font weights live in scripts/_fonts/ (run scripts/_mk_fonts.py once).
# Run: py scripts/make_guide_pdf.py  ->  docs/FORCE-Guia-Cliente.pdf
import os, math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image
from reportlab.lib.utils import ImageReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FDIR = os.path.join(ROOT, "scripts/_fonts")
EMBLEM = os.path.join(ROOT, "src/assets/logo/emblem_gold_t.png")
OUT = os.path.join(ROOT, "docs/FORCE-Guia-Cliente.pdf")

# ---- Brand palette (from src/styles/brand-tokens.css) ----
INK = (0x0E/255, 0x0E/255, 0x0F/255)
BLACK = (0, 0, 0)
GOLD = (0xC6/255, 0xAE/255, 0x78/255)
GOLD_PALE = (0xEA/255, 0xDE/255, 0xB4/255)
GOLD_DEEP = (0x8A/255, 0x6A/255, 0x38/255)
WHITE = (1, 1, 1)
SOFT = (0.80, 0.79, 0.76)
LEAD = (0.52, 0.51, 0.48)
MUTE = (0.34, 0.33, 0.31)
CELESTE = (0x74/255, 0xAC/255, 0xDF/255)
BRONZE = (0xC7/255, 0x7B/255, 0x3E/255)
SILVER = (0xC9/255, 0xCC/255, 0xD2/255)
PLATINO = (0xBC/255, 0xD2/255, 0xDE/255)

# ---- Fonts ----
for nm, fn in [("MLight", "Montserrat-Light.ttf"), ("MReg", "Montserrat-Reg.ttf"),
               ("MMed", "Montserrat-Med.ttf"), ("MBold", "Montserrat-Bold.ttf"),
               ("MBlack", "Montserrat-Black.ttf")]:
    pdfmetrics.registerFont(TTFont(nm, os.path.join(FDIR, fn)))

W, H = A4
M = 48
TOTAL = 9
c = canvas.Canvas(OUT, pagesize=A4)

_EM = Image.open(EMBLEM)
EM_AR = _EM.height / _EM.width  # ~0.4386

# Pre-faded emblem used as a low-alpha watermark to anchor page whitespace
# (built in memory — no file written).
_g = Image.open(EMBLEM).convert("RGBA")
_r, _gg, _b, _a = _g.split()
_a = _a.point(lambda v: int(v*0.07))
GHOST = ImageReader(Image.merge("RGBA", (_r, _gg, _b, _a)))


# ---------- primitives ----------
def sw(s, size, font="MReg", tr=0):
    return pdfmetrics.stringWidth(s, font, size) + tr*max(0, len(s)-1)


def text(x, y, s, size, color=WHITE, font="MReg", tr=0, a=1.0):
    c.setFillColorRGB(*color); c.setFillAlpha(a)
    to = c.beginText(); to.setFont(font, size); to.setCharSpace(tr)
    to.setTextOrigin(x, y); to.textLine(s); c.drawText(to)
    c.setFillAlpha(1)


def ctext(cx, y, s, size, color=WHITE, font="MReg", tr=0, a=1.0):
    text(cx - sw(s, size, font, tr)/2, y, s, size, color, font, tr, a)


def wrap(s, size, maxw, font="MReg", tr=0):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur+" "+w).strip()
        if sw(t, size, font, tr) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def para(x, y, s, size, color=SOFT, maxw=None, lh=1.34, font="MReg", tr=0, a=1.0):
    maxw = maxw or (W-2*M)
    for ln in wrap(s, size, maxw, font, tr):
        text(x, y, ln, size, color, font, tr, a); y -= size*lh
    return y


def wrap2(s, size, first_w, rest_w, font="MReg"):
    """Wrap where the first line has a different max width (for run-in labels)."""
    words, lines, cur, mw = s.split(), [], "", first_w
    for w in words:
        t = (cur+" "+w).strip()
        if sw(t, size, font) <= mw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w; mw = rest_w
    if cur: lines.append(cur)
    return lines


def _dot(y, size, x=None):
    """A gold bullet optically centered on the first text line at baseline y."""
    c.setFillColorRGB(*GOLD); c.setFillAlpha(1)
    c.circle((M+4) if x is None else x, y + size*0.30, 2.2, fill=1, stroke=0)


def bpara(y, s, size=9.6, color=SOFT, lh=1.34, gap=9, indent=18, font="MReg"):
    """Bulleted paragraph; dot aligned to the first line. Returns the next y."""
    _dot(y, size)
    return para(M+indent, y, s, size, color, maxw=W-2*M-indent, lh=lh, font=font) - gap


def brich(y, label, body, size=9.6, lcolor=WHITE, bcolor=SOFT, lh=1.34, gap=9,
          indent=18, lfont="MBold"):
    """Bulleted run-in item: bold label then body; continuation lines align to
    the text indent (no ragged gap under the label). Returns the next y."""
    _dot(y, size)
    tx = M+indent
    text(tx, y, label, size, lcolor, lfont)
    lw = sw(label+" ", size, lfont)
    lines = wrap2(body, size, (W-M)-(tx+lw), (W-M)-tx)
    yy = y
    for i, ln in enumerate(lines):
        text(tx+lw if i == 0 else tx, yy, ln, size, bcolor)
        yy -= size*lh
    return yy - gap


def vgrad(x, y, w, h, c0, c1, steps=48):
    """Vertical gradient rect: c0 at top, c1 at bottom."""
    sh = h/steps
    for i in range(steps):
        t = i/(steps-1)
        col = tuple(c0[k]+(c1[k]-c0[k])*t for k in range(3))
        c.setFillColorRGB(*col)
        c.rect(x, y+h-(i+1)*sh, w, sh+0.6, fill=1, stroke=0)


def spine():
    """The signature vertical gold rule down the left edge (deep->gold->deep)."""
    n = 60; sh = H/n
    for i in range(n):
        t = i/(n-1)
        # deep at both ends, bright in the middle
        m = 1-abs(t-0.5)*2
        col = tuple(GOLD_DEEP[k]+(GOLD[k]-GOLD_DEEP[k])*m for k in range(3))
        c.setFillColorRGB(*col); c.setFillAlpha(0.92)
        c.rect(0, i*sh, 3, sh+0.6, fill=1, stroke=0)
    c.setFillAlpha(1)


def gline(y, x0, x1, thick=1.5, a=1.0):
    """Shimmering gold hairline: deep -> pale -> deep across the width."""
    n = 90; sw_ = (x1-x0)/n
    for i in range(n):
        t = i/(n-1); m = 1-abs(t-0.5)*2
        col = tuple(GOLD_DEEP[k]+(GOLD_PALE[k]-GOLD_DEEP[k])*m for k in range(3))
        c.setFillColorRGB(*col); c.setFillAlpha(a)
        c.rect(x0+i*sw_, y, sw_+0.5, thick, fill=1, stroke=0)
    c.setFillAlpha(1)


def glow(cx, cy, rings=None):
    rings = rings or [(320, 0.05), (230, 0.055), (150, 0.06), (85, 0.07)]
    for r, al in rings:
        c.setFillColorRGB(*GOLD); c.setFillAlpha(al)
        c.ellipse(cx-r, cy-r*0.62, cx+r, cy+r*0.62, fill=1, stroke=0)
    c.setFillAlpha(1)


def bg(cover=False):
    c.setFillColorRGB(*(BLACK if cover else INK)); c.rect(0, 0, W, H, fill=1, stroke=0)
    if cover:
        glow(W/2, H*0.66, [(360, 0.06), (255, 0.06), (165, 0.07), (95, 0.08)])
        vgrad(0, 0, W, 150, INK, BLACK, 40)  # gentle floor
    else:
        glow(W*0.74, H*0.94, [(300, 0.045), (200, 0.05), (120, 0.055)])
    spine()


def emblem(x, y, w, path=EMBLEM):
    h = w*EM_AR
    c.drawImage(path, x, y, width=w, height=h, mask='auto', preserveAspectRatio=True)
    return h


def kicker(x, y, s, color=GOLD, size=8.2, tr=2.6, font="MMed"):
    text(x, y, s, size, color, font, tr=tr)


def hero(x, y, s, size, color=GOLD, tr=1.5, shadow=True):
    """Heavy uppercase display with a subtle deep-gold emboss for depth."""
    if shadow:
        text(x+1.1, y-1.3, s, size, GOLD_DEEP, "MBlack", tr=tr, a=0.55)
    text(x, y, s, size, color, "MBlack", tr=tr)


def medal(cx, cy, r, ring):
    c.setFillColorRGB(*ring); c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColorRGB(0.07, 0.07, 0.08); c.circle(cx, cy, r*0.68, fill=1, stroke=0)
    # dumbbell glyph — a handle with a plate on each end
    c.setFillColorRGB(*ring)
    hw, hh = r*0.42, r*0.11
    c.roundRect(cx-hw/2, cy-hh/2, hw, hh, hh/2, fill=1, stroke=0)
    pw, ph = r*0.15, r*0.42
    c.roundRect(cx-hw/2-pw, cy-ph/2, pw, ph, pw*0.45, fill=1, stroke=0)
    c.roundRect(cx+hw/2, cy-ph/2, pw, ph, pw*0.45, fill=1, stroke=0)


def flag(x, y, w):
    h = w*0.66; band = h/3
    c.saveState()
    c.setFillColorRGB(1, 1, 1); c.roundRect(x, y, w, h, 2, fill=1, stroke=0)
    c.setFillColorRGB(*CELESTE)
    c.rect(x, y+2*band, w, band, fill=1, stroke=0); c.rect(x, y, w, band, fill=1, stroke=0)
    cx, cy = x+w/2, y+h/2
    c.setStrokeColorRGB(*GOLD_DEEP)
    for i in range(16):
        a = i*math.pi/8
        c.setLineWidth(0.9 if i % 2 == 0 else 0.5)
        c.line(cx+w*0.07*math.cos(a), cy+w*0.07*math.sin(a), cx+w*0.12*math.cos(a), cy+w*0.12*math.sin(a))
    c.setFillColorRGB(*GOLD_DEEP); c.circle(cx, cy, w*0.055, fill=1, stroke=0)
    c.restoreState()


def card(x, y, w, h, r=12, fa=0.045, sa=0.28):
    c.setFillColorRGB(1, 1, 1); c.setFillAlpha(fa)
    c.roundRect(x, y, w, h, r, fill=1, stroke=0)
    c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(sa); c.setLineWidth(1)
    c.roundRect(x, y, w, h, r, fill=0, stroke=1)
    c.setFillAlpha(1); c.setStrokeAlpha(1)


def ghost():
    """Faint emblem watermark low on the page to anchor whitespace."""
    gw = W*0.60
    emblem(W/2-gw/2, H*0.135, gw, path=GHOST)


def header(kick):
    """Standard content-page header: emblem + kicker + gold hairline."""
    eh = emblem(M, H-M-24, 30)
    kicker(M+40, H-M-14, kick, GOLD, 8, 2.4)
    text(W-M-sw("#TrustTheProcess", 7.5, "MMed", 1), H-M-14, "#TrustTheProcess", 7.5, GOLD_DEEP, "MMed", tr=1)
    gline(H-M-34, M, W-M, 1.4, 0.9)
    return H-M-60


def sectitle(y, kick, title, size=17):
    kicker(M, y, kick, GOLD, 8, 2.6)
    text(M, y-19, title, size, WHITE, "MBold")
    return y-19-size-6


def footer(pg):
    text(M, 34, "FORCE · La Plata", 7.5, LEAD, "MMed", tr=1)
    s = "%02d / %02d" % (pg, TOTAL)
    text(W-M-sw(s, 7.5, "MMed", 1), 34, s, 7.5, LEAD, "MMed", tr=1)


# =====================================================================
# PAGE 1 — COVER / THE REVEAL
# =====================================================================
bg(cover=True)
ew = 168; emblem(W/2-ew/2, H*0.635, ew)
# eyebrow
ky = H*0.635 - 26
ctext(W/2, ky, "F O R C E   ·   L A   P L A T A", 9, GOLD, "MMed", tr=3.5)
# product wordmark (the hero) — single clean draw with a soft deep-gold emboss
hy = ky - 74
_hs = sw("MI RUTINA", 62, "MBlack", 2)
hx = W/2 - _hs/2
text(hx+1.4, hy-1.6, "MI RUTINA", 62, GOLD_DEEP, "MBlack", tr=2, a=0.6)
text(hx, hy, "MI RUTINA", 62, GOLD, "MBlack", tr=2)
# rule + tagline
gline(hy-24, W/2-120, W/2+120, 1.6, 1.0)
ctext(W/2, hy-52, "La app de entrenamiento de FORCE.", 12.5, WHITE, "MReg")
ctext(W/2, hy-72, "Hecha a mano, para vos.", 12.5, GOLD_PALE, "MMed")
# bottom band
ctext(W/2, 92, "G U Í A   D E L   C L I E N T E", 8.5, LEAD, "MMed", tr=3)
gline(74, W/2-40, W/2+40, 1.2, 0.7)
ctext(W/2, 56, "#TrustTheProcess", 9, GOLD_DEEP, "MMed", tr=1)
c.showPage()

# =====================================================================
# PAGE 2 — THE HUMAN MANIFESTO (human first)
# =====================================================================
bg()
emblem(M, H-M-24, 30)
kicker(M+40, H-M-14, "DE PARTE DEL EQUIPO FORCE", GOLD, 8, 2.4)
gline(H-M-34, M, W-M, 1.4, 0.9)

# oversized opening quote mark
text(M-6, H-190, "“", 150, GOLD, "MBlack", a=0.16)

y = H-235
y = para(M, y, "Antes que una app,", 30, GOLD_PALE, maxw=W-2*M, lh=1.12, font="MLight")
y = para(M, y-2, "sos vos.", 30, GOLD, maxw=W-2*M, lh=1.12, font="MBlack") - 22

y = para(M, y, "En FORCE no tenemos clientes. Tenemos una familia que formamos entre todos, "
         "y a la que queremos darle siempre el mejor servicio que podamos dar.",
         12.5, SOFT, maxw=W-2*M, lh=1.62, font="MLight") - 12

y = para(M, y, "Esta app nació de ahí: de muchas charlas, pruebas y horas pensando en una sola "
         "cosa — cómo hacer que entrenar en FORCE sea cada vez mejor. La hicimos para que "
         "entiendas tu entrenamiento, sigas tus progresos y disfrutes todavía más de venir. "
         "La vamos a seguir mejorando, con tu ayuda.", 12.5, SOFT, maxw=W-2*M, lh=1.62, font="MLight") - 16

gline(y, M, M+70, 1.4, 1.0); y -= 26
y = para(M, y, "Porque vos, la familia FORCE, siempre merecés algo mejor.", 15, GOLD, maxw=W-2*M, lh=1.4, font="MMed") - 20
text(M, y, "—  El equipo FORCE", 11, WHITE, "MBold", tr=0.5)
footer(2)
c.showPage()

# =====================================================================
# PAGE 3 — TODO LO QUE HACE POR VOS (value props)
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "POR QUÉ ES DISTINTA", "Todo lo que hace por vos")
y -= 6

props = [
    ("Sabés qué te toca hoy", "Abrís la app y la sesión del día ya está lista. Sin pensar, sin buscar."),
    ("Te lleva serie por serie", "Un ejercicio a la vez, con su animación, sus kilos y sus repeticiones."),
    ("Te calcula los discos", "Te muestra qué poner en la barra. Vos no calculás nada."),
    ("Guarda tus récords solos", "Cada marca grande entra sola a tu Salón de la Fama de FORCE."),
    ("Premia tu constancia", "Ganás medallas por entrenar seguido y por tu fuerza, a tu medida."),
    ("Funciona sin señal", "Entrenás igual y todo se sincroniza cuando vuelve internet."),
]
rowh = (y - 96) / len(props)
for i, (h_, b_) in enumerate(props):
    ry = y - i*rowh
    text(M, ry-24, "%02d" % (i+1), 30, GOLD, "MBlack", tr=0)
    text(M+2, ry-24, "%02d" % (i+1), 30, GOLD_DEEP, "MBlack", a=0.0)  # (kept solid above)
    text(M+62, ry-8, h_, 13, WHITE, "MBold")
    para(M+62, ry-24, b_, 9.6, SOFT, maxw=W-M-(M+62), lh=1.3)
    if i < len(props)-1:
        gline(ry-rowh+16, M+62, W-M, 0.8, 0.32)
footer(3)
c.showPage()

# =====================================================================
# PAGE 4 — ACTIVÁ TU ACCESO (setup, once)
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "UNA SOLA VEZ", "Activá tu acceso")
y -= 4

steps4 = [
    ("Escaneá tu QR o tocá tu link", "Se abre tu rutina con tu nombre, sin usuario ni contraseña. El link es tuyo: no lo compartas."),
    ("Instalala como app", "iPhone (Safari): Compartir → Agregar a inicio, desde la misma pantalla donde abriste tu link. Android (Chrome): menú (tres puntitos) → Agregar a pantalla de inicio."),
    ("Elegí tu día y tu semana", "La primera vez te preguntamos con qué día arrancás y en qué semana estás — clave si entrás al ciclo a mitad de camino. De ahí en más, avanza sola."),
    ("Cargá tu perfil", "En Perfil (el engranaje, arriba a la derecha en Inicio): nombre, sexo, cumpleaños y peso. El peso define tu categoría en récords y medallas."),
    ("Permití las notificaciones", "Las usamos para avisarte cuando termina tu descanso y cuando alguien te pasa un récord de tu categoría."),
]
railx = M+11
prev_cy = None
for i, (h_, b_) in enumerate(steps4, 1):
    hy_ = y
    cy = hy_-2
    if prev_cy is not None:
        c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(0.35); c.setLineWidth(1.4)
        c.line(railx, prev_cy-12, railx, cy+12); c.setStrokeAlpha(1)
    # badge
    c.setFillColorRGB(*GOLD); c.circle(railx, cy-3, 11, fill=1, stroke=0)
    text(railx-sw(str(i), 11, "MBold")/2, cy-6.5, str(i), 11, INK, "MBold")
    text(M+34, hy_, h_, 11.5, WHITE, "MBold")
    yy = para(M+34, hy_-14, b_, 9.6, SOFT, maxw=W-M-(M+34), lh=1.34)
    prev_cy = cy
    y = yy - 16

# note box
by = y-6; bh = 40
card(M, by-bh, W-2*M, bh, r=11, fa=0.05, sa=0.32)
text(M+16, by-17, "SI SE CIERRA Y TE PIDE ACTIVAR DE NUEVO", 8, GOLD, "MBold", tr=1.6)
para(M+16, by-29, "Pegá tu link personal en esa misma pantalla y listo. Queda guardado para siempre en ese teléfono.",
     9, SOFT, maxw=W-2*M-28)
footer(4)
c.showPage()

# =====================================================================
# PAGE 5 — TU DÍA, PASO A PASO
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "PASO A PASO", "Tu día de entrenamiento")
y -= 4

steps5 = [
    ("Abrí y tocá “Hoy te toca · Día X”", "Caés en Inicio. El botón te lleva directo a lo de hoy y arranca por la entrada en calor."),
    ("Entrená serie por serie", "En pantalla completa ves un ejercicio a la vez. Al terminar cada serie tocá el botón dorado “Marcar serie hecha” y la app avanza sola."),
    ("Mirá lo que viene", "Con el ícono de lista ves toda la sesión y preparás el equipo. Podés saltar a cualquier paso sin perder tu progreso."),
    ("“La vez pasada”", "Debajo de cada ejercicio te recordamos cuánto hiciste la última vez, para saber qué igualar o superar."),
    ("Ajustá lo que hiciste de verdad", "Corregí kg / reps / series: actualiza tu récord y tu progreso, y queda anotado en tu planilla para tu coach. Si dice “x lado”, la app te muestra qué discos poner."),
    ("Usá el descanso", "El cronómetro sigue corriendo aunque cambies de pantalla o minimices, y te avisa con sonido, vibración y notificación cuando termina."),
    ("Terminá", "Al completar el último ejercicio te preguntamos cómo te fue (RPE) y podés dejar una nota. Tu asistencia se registra sola."),
]
railx = M+11
prev_cy = None
for i, (h_, b_) in enumerate(steps5, 1):
    hy_ = y; cy = hy_-2
    if prev_cy is not None:
        c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(0.35); c.setLineWidth(1.4)
        c.line(railx, prev_cy-12, railx, cy+12); c.setStrokeAlpha(1)
    c.setFillColorRGB(*GOLD); c.circle(railx, cy-3, 11, fill=1, stroke=0)
    text(railx-sw(str(i), 11, "MBold")/2, cy-6.5, str(i), 11, INK, "MBold")
    text(M+34, hy_, h_, 11, WHITE, "MBold")
    yy = para(M+34, hy_-13, b_, 9.3, SOFT, maxw=W-M-(M+34), lh=1.3)
    prev_cy = cy
    y = yy - 12

# two note strips
sy = y-4; sh = 46; gap = 12; cw = (W-2*M-gap)/2
card(M, sy-sh, cw, sh, r=10, fa=0.05, sa=0.3)
text(M+14, sy-17, "RÉCORDS AUTOMÁTICOS", 7.5, GOLD, "MBold", tr=1.4)
para(M+14, sy-29, "Una marca en los grandes entra sola a tu Salón de la Fama, por sexo y categoría.",
     8, SOFT, maxw=cw-28, lh=1.26)
x2 = M+cw+gap
card(x2, sy-sh, cw, sh, r=10, fa=0.05, sa=0.3)
text(x2+14, sy-17, "COMPARTÍ TU ENTRENO", 7.5, GOLD, "MBold", tr=1.4)
para(x2+14, sy-29, "Al terminar armás una placa para tu historia con tus kilos. Etiquetá a @force.ok.",
     8, SOFT, maxw=cw-28, lh=1.26)
footer(5)
c.showPage()

# =====================================================================
# PAGE 6 — ADENTRO DE LA APP (5 pestañas + día/semana)
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "LA APP", "Las 5 pestañas, de abajo")
y -= 4

tabs = [
    ("INICIO", "Tu tablero del día: pronóstico de La Plata, próximo feriado, el tip del coach y tus rachas. En fechas patrias, la app se viste para la ocasión."),
    ("HOY", "El detalle de la sesión de hoy y el botón grande para entrenar. Acá cambiás de día o de semana."),
    ("PLAN", "Toda tu rutina del ciclo, día por día, con cargas y técnicas. Tocá un ejercicio para ver su ficha, la animación y el cálculo de discos."),
    ("RÉCORDS", "El Salón de la Fama de FORCE: ranking por ejercicio, sexo y categoría de peso, y las rachas del gimnasio."),
    ("PANEL", "Lo tuyo: tus medallas, asistencia, fuerza estimada (1RM), evolución y esfuerzo (RPE)."),
]
for name, desc in tabs:
    text(M, y, name, 10.5, GOLD, "MBold", tr=0.5)
    yend = para(M+82, y, desc, 9.4, SOFT, maxw=W-2*M-82, lh=1.3)
    gline(yend+2, M, W-M, 0.7, 0.22)
    y = yend - 12

y -= 8
y = sectitle(y, "SIN QUE HAGAS NADA", "Cómo sabe tu día y tu semana")
y -= 2
for t in [
    "El día avanza cuando terminás una sesión — no solo por abrirla o mirarla.",
    "La semana avanza sola, una por semana. Cambiala cuando quieras en Perfil → “Mi semana actual”.",
    "Si una celda de la semana está vacía en la planilla, la app repite los mismos kilos, repes y series de la semana anterior.",
]:
    y = bpara(y, t, 9.6, lh=1.32)
footer(6)
c.showPage()

# =====================================================================
# PAGE 7 — RÉCORDS, MEDALLAS Y CATEGORÍAS
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "TU ESFUERZO, PREMIADO", "Récords y medallas")
y -= 6

# medal row
mrow = y-6
labels = [(BRONZE, "Bronce"), (SILVER, "Plata"), (GOLD, "Oro"), (PLATINO, "Platino")]
x0 = M+24
for i, (ring, lbl) in enumerate(labels):
    cx = x0 + i*68
    medal(cx, mrow-4, 16, ring)
    ctext(cx, mrow-34, lbl, 8, WHITE, "MBold", tr=0.8)
tx = M+300
para(tx, y-2, "Constancia (sin fin): por semanas seguidas y entrenamientos, suben de Bronce a Platino y siguen contando para siempre.",
     9, SOFT, maxw=W-M-tx, lh=1.34)
para(tx, y-56, "Fuerza (por categoría): Bronce, Plata u Oro en cada ejercicio grande, ajustado a tu sexo y categoría para que sea justo.",
     9, SOFT, maxw=W-M-tx, lh=1.34)
y = mrow-58

gline(y, M, W-M, 0.8, 0.3); y -= 26
y = sectitle(y, "JUSTO Y A TU MEDIDA", "Categorías de peso")
y -= 2
ch = 66; gap = 14; cw = (W-2*M-gap)/2
card(M, y-ch, cw, ch, r=12)
text(M+18, y-20, "HOMBRES", 8.5, GOLD, "MBold", tr=2)
text(M+18, y-42, "Hasta 70 · 71–83 · 84–95 · +95", 12, WHITE, "MBold")
text(M+18, y-56, "kilos", 8, LEAD, "MMed", tr=1)
x2 = M+cw+gap
card(x2, y-ch, cw, ch, r=12)
text(x2+18, y-20, "MUJERES", 8.5, GOLD, "MBold", tr=2)
text(x2+18, y-42, "Hasta 55 · 56–65 · 66–75 · +75", 12, WHITE, "MBold")
text(x2+18, y-56, "kilos", 8, LEAD, "MMed", tr=1)
y -= ch+22

bpara(y, "Los récords se cargan solos, según tu sexo y tu peso. Vos no anotás nada a mano — solo entrenás.",
      9.6, lh=1.32)
footer(7)
c.showPage()

# =====================================================================
# PAGE 8 — SOPORTE (avisos + tips + ¿algo no anda?)
# =====================================================================
bg()
ghost()
y = header("MI RUTINA · GUÍA DEL CLIENTE")
y = sectitle(y, "TU TELÉFONO", "Avisos que vas a recibir")
y -= 2
for lbl, body in [
    ("Fin del descanso:", "cuando se termina tu pausa, aunque estés en otra app."),
    ("Te pasaron un récord:", "si alguien de tu categoría y sexo te supera, te avisamos para la revancha. Se gana entrenando inteligente y siguiendo al coach."),
]:
    y = brich(y, lbl, body, 9.6, lh=1.32)

y -= 6
y = sectitle(y, "BUENO SABER", "Tips rápidos")
y -= 2
for t in [
    "Se actualiza sola: los cambios de tu coach aparecen al volver a abrir la app. En iPhone, cerrala del todo y volvé a abrirla.",
    "Sin internet entrenás igual; lo que registres se sincroniza solo cuando vuelve la señal.",
    "La animación de cada ejercicio es una referencia. Ante dudas de técnica, preguntale a tu coach.",
]:
    y = bpara(y, t, 9.6, lh=1.32)

y -= 6
y = sectitle(y, "¿ALGO NO ANDA?", "Lo más común")
y -= 2
for q, a in [
    ("Se queda en “Cargando tu rutina…”", "esperá unos segundos y tocá Reintentar. Revisá tu señal."),
    ("Me pide activar de nuevo", "pegá tu link personal en esa pantalla."),
    ("Hice el día y sigue apareciendo", "se marca hecho recién al terminar la sesión."),
    ("No veo mis récords o medallas", "cargá tu sexo y tu peso en Perfil."),
]:
    y = brich(y, q+" —", a, 9.4, lcolor=GOLD_PALE, lh=1.3)
footer(8)
c.showPage()

# =====================================================================
# PAGE 9 — CLOSING BOOKEND (echoes the cover)
# =====================================================================
bg(cover=True)
emblem(W/2-70, H*0.60, 140)
ctext(W/2, H*0.60-24, "F A M I L I A   F O R C E", 9, GOLD, "MMed", tr=3.5)
hy = H*0.60-92
_s = sw("NOS VEMOS", 46, "MBlack", 2)
text(W/2-_s/2+1.2, hy-1.4, "NOS VEMOS", 46, GOLD_DEEP, "MBlack", tr=2, a=0.6)
text(W/2-_s/2, hy, "NOS VEMOS", 46, GOLD, "MBlack", tr=2)
_s2 = sw("EN LA SALA", 46, "MBlack", 2)
text(W/2-_s2/2+1.2, hy-46-1.4, "EN LA SALA", 46, GOLD_DEEP, "MBlack", tr=2, a=0.6)
text(W/2-_s2/2, hy-46, "EN LA SALA", 46, GOLD, "MBlack", tr=2)
gline(hy-72, W/2-110, W/2+110, 1.6, 1.0)
ctext(W/2, hy-98, "Gracias por confiar y por entrenar con nosotros.", 12, WHITE, "MReg")
ctext(W/2, hy-118, "Lo mejor está por venir.", 13, GOLD_PALE, "MMed")
ctext(W/2, 78, "F O R C E   ·   L A   P L A T A", 8.5, LEAD, "MMed", tr=3)
ctext(W/2, 56, "#TrustTheProcess", 9, GOLD_DEEP, "MMed", tr=1)
c.showPage()

c.save()
print("wrote", OUT)
