# Generates the FORCE client quick-guide PDF (brand: gold on dark, Montserrat).
# Static font weights are instantiated by scripts/_mk_fonts.py first (run it once).
# Run: py scripts/make_guide_pdf.py  ->  docs/FORCE-Guia-Cliente.pdf
import os, math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = os.path.join(ROOT, "scripts/_fonts/Montserrat-Reg.ttf")
BOLD = os.path.join(ROOT, "scripts/_fonts/Montserrat-Bold.ttf")
EMBLEM = os.path.join(ROOT, "src/assets/logo/emblem_gold_t.png")
OUT = os.path.join(ROOT, "docs/FORCE-Guia-Cliente.pdf")

INK = (0x0E/255, 0x0E/255, 0x0F/255)
GOLD = (0xC6/255, 0xAE/255, 0x78/255)
GOLD_DEEP = (0x8A/255, 0x6A/255, 0x38/255)
WHITE = (1, 1, 1)
SOFT = (0.82, 0.81, 0.78)
LEAD = (0.55, 0.54, 0.51)
CELESTE = (0x74/255, 0xAC/255, 0xDF/255)

pdfmetrics.registerFont(TTFont("Mont", REG))
pdfmetrics.registerFont(TTFont("Mont-Bold", BOLD))
F, FB = "Mont", "Mont-Bold"

W, H = A4
M = 46
c = canvas.Canvas(OUT, pagesize=A4)


def bg():
    c.setFillColorRGB(*INK); c.rect(0, 0, W, H, fill=1, stroke=0)
    for r, a in [(240, 0.05), (175, 0.06), (110, 0.07)]:
        c.setFillColorRGB(*GOLD); c.setFillAlpha(a)
        c.ellipse(W/2-r, H-r*0.5, W/2+r, H+r*0.5, fill=1, stroke=0)
    c.setFillAlpha(1)


def sw(s, size, bold=False, tr=0):
    return pdfmetrics.stringWidth(s, FB if bold else F, size) + tr*max(0, len(s)-1)


def text(x, y, s, size, color=WHITE, bold=False, tr=0):
    c.setFillColorRGB(*color)
    to = c.beginText(); to.setFont(FB if bold else F, size)
    to.setCharSpace(tr)  # always set: Tc is persistent graphics state, must reset to 0
    to.setTextOrigin(x, y); to.textLine(s); c.drawText(to)


def wrap(s, size, maxw, bold=False, tr=0):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur+" "+w).strip()
        if sw(t, size, bold, tr) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def para(x, y, s, size, color=SOFT, maxw=None, lh=1.32, tr=0):
    maxw = maxw or (W-2*M)
    for ln in wrap(s, size, maxw, tr=tr):
        text(x, y, ln, size, color, tr=tr); y -= size*lh
    return y


def rule(y, x0=M, x1=W-M, alpha=0.5):
    c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(alpha); c.setLineWidth(1.3)
    c.line(x0, y, x1, y); c.setStrokeAlpha(1)


def card(x, y, w, h, r=10):
    c.setFillColorRGB(1, 1, 1); c.setFillAlpha(0.04)
    c.roundRect(x, y, w, h, r, fill=1, stroke=0)
    c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(0.30); c.setLineWidth(1)
    c.roundRect(x, y, w, h, r, fill=0, stroke=1)
    c.setFillAlpha(1); c.setStrokeAlpha(1)


def kicker(x, y, s): text(x, y, s, 8, GOLD, tr=2.6)


def badge(x, y, n, d=16):
    c.setFillColorRGB(*GOLD); c.circle(x+d/2, y+d/2, d/2, fill=1, stroke=0)
    text(x+d/2-sw(str(n), 9.5, True)/2, y+d/2-3.4, str(n), 9.5, INK, bold=True)


def flag(x, y, w):
    h = w*0.66; band = h/3
    c.saveState()
    c.setFillColorRGB(1, 1, 1); c.roundRect(x, y, w, h, 2, fill=1, stroke=0)
    c.setFillColorRGB(*CELESTE)
    c.rect(x, y+2*band, w, band, fill=1, stroke=0); c.rect(x, y, w, band, fill=1, stroke=0)
    cx, cy = x+w/2, y+h/2
    c.setStrokeColorRGB(*GOLD)
    for i in range(16):
        a = i*math.pi/8
        c.setLineWidth(1.0 if i % 2 == 0 else 0.6)
        c.line(cx+w*0.07*math.cos(a), cy+w*0.07*math.sin(a), cx+w*0.12*math.cos(a), cy+w*0.12*math.sin(a))
    c.setFillColorRGB(*GOLD); c.circle(cx, cy, w*0.06, fill=1, stroke=0)
    c.restoreState()


def emblem(x, y, w):
    im = Image.open(EMBLEM); h = w*im.height/im.width
    c.drawImage(EMBLEM, x, y, width=w, height=h, mask='auto', preserveAspectRatio=True)
    return h


def section(y, n, title):
    kicker(M, y, n); text(M, y-16, title, 14, WHITE, bold=True)
    return y-32


def step(y, n, head, body):
    badge(M, y-11, n)
    text(M+24, y, head, 10.5, WHITE, bold=True)
    yy = para(M+24, y-12, body, 9, SOFT, maxw=W-2*M-24)
    return yy-6


# ---------------- PAGE 1 ----------------
bg()
eh = emblem(M, H-M-44, 44)
ecy = H-M-44 + eh/2
text(M+56, ecy-9, "FORCE", 30, GOLD, bold=True, tr=1)
flag(M+56+sw("FORCE", 30, True, 1)+16, ecy-12, 36)
kicker(M, H-M-66, "MI RUTINA   ·   GUÍA RÁPIDA")
text(W-M-sw("#TrustTheProcess", 8.5), H-M-12, "#TrustTheProcess", 8.5, GOLD_DEEP, tr=1)
y = H-M-92
y = para(M, y, "Tu rutina, en el bolsillo. La app te muestra qué te toca hoy, te lleva serie por serie "
         "y guarda tu progreso y tus récords. Tu coach sigue armando todo en la planilla de siempre.",
         10, SOFT, lh=1.4)
rule(y-2); y -= 22

y = section(y, "1 · UNA SOLA VEZ", "Activá tu acceso")
y = step(y, 1, "Escaneá el QR (o tocá tu link)", "Se abre tu rutina con tu nombre. No necesitás usuario ni contraseña.")
y = step(y, 2, "Instalala como app", "Android: menú (tres puntitos) > Agregar a inicio. iPhone (Safari): Compartir > Agregar a inicio.")
y = step(y, 3, "Cargá tus datos en Perfil", "Tocá el ícono de perfil (arriba a la derecha en Inicio) y cargá nombre, sexo, cumpleaños y peso.")

y -= 8
y = section(y, "2 · PASO A PASO", "Tu día de entrenamiento")
for i, (h_, b_) in enumerate([
    ("Abrí la app", "Caés en INICIO: tu saludo, el clima de La Plata, el próximo feriado y el tip del coach del día."),
    ("Tocá \"Hoy te toca · Día X\"", "Te lleva directo a entrenar lo que corresponde hoy."),
    ("Registrá que viniste", "Suma a tu asistencia del mes y a tu racha de semanas seguidas."),
    ("Marcá cada serie", "Un ejercicio a la vez. Tocá el botón dorado \"Marcar serie hecha\" y la app avanza sola."),
    ("Ajustá lo que hiciste de verdad", "Corregí kg / reps / series: va a tu récord, tu progreso y tu planilla."),
    ("Descanso y observaciones", "Usá el cronómetro entre series y dejá una nota si algo molestó (tu coach la lee)."),
], 1):
    y = step(y, i, h_, b_)

y -= 4
ch = 36
card(M, y-ch, W-2*M, ch)
text(M+14, y-15, "DISCOS · PESOS POR LADO", 8, GOLD, bold=True, tr=1.5)
para(M+14, y-27, "Si el ejercicio dice \"x lado\", la app te muestra qué discos poner en la barra. No calculás nada.",
     9, SOFT, maxw=W-2*M-28)
text(W-M-sw("FORCE · La Plata", 8), 30, "FORCE · La Plata", 8, LEAD, tr=1)
c.showPage()

# ---------------- PAGE 2 ----------------
bg()
emblem(M, H-M-30, 30)
kicker(M+40, H-M-20, "MI RUTINA · GUÍA RÁPIDA")
rule(H-M-42)
y = H-M-66

y = section(y, "LA APP", "Las 5 pestañas (abajo)")
for name, desc in [
    ("INICIO", "tu tablero del día: clima, feriado, tip, racha y cumpleaños. Empezás acá."),
    ("HOY", "el detalle de la sesión y el botón para entrenar."),
    ("PLAN", "toda tu rutina de la semana / del ciclo."),
    ("RÉCORDS", "el ranking de FORCE por ejercicio, sexo y categoría de peso. Y tus rachas."),
    ("PANEL", "tu evolución: asistencia, fuerza y volumen."),
]:
    text(M, y, name, 10, GOLD, bold=True)
    para(M+74, y, desc, 9.5, SOFT, maxw=W-2*M-74, lh=1.25)
    y -= 18

y -= 10
y = section(y, "TUS DATOS", "Tu perfil")
y = para(M, y, "Peso: actualizalo una vez por mes (la app te lo recuerda) para mantener tu categoría al día.", 9.5, SOFT)
y = para(M, y-2, "Cumpleaños: el día de tu cumple aparecés en el tablero de Inicio.", 9.5, SOFT)
y -= 10
hw = (W-2*M-12)/2; ch = 56
card(M, y-ch, hw, ch); card(M+hw+12, y-ch, hw, ch)
text(M+14, y-16, "HOMBRES", 8.5, GOLD, bold=True, tr=2)
text(M+14, y-35, "Hasta 65   ·   66–80   ·   +80", 11, WHITE, bold=True)
text(M+14, y-47, "kilos", 8, LEAD)
x2 = M+hw+12
text(x2+14, y-16, "MUJERES", 8.5, GOLD, bold=True, tr=2)
text(x2+14, y-35, "Hasta 50   ·   51–65   ·   +65", 11, WHITE, bold=True)
text(x2+14, y-47, "kilos", 8, LEAD)
y -= ch+18

y = section(y, "TIPS", "Bueno saber")
for t in [
    "Funciona sin señal: entrená igual; cuando vuelve internet, se sincroniza solo.",
    "Se actualiza sola: si tu coach cambia la rutina, la ves sin reinstalar nada.",
    "Es gratis y es tuya. Cualquier duda con la técnica, preguntale a tu coach: la animación es solo una referencia.",
]:
    c.setFillColorRGB(*GOLD); c.circle(M+3, y-3, 2, fill=1, stroke=0)
    y = para(M+14, y, t, 9.5, SOFT, maxw=W-2*M-14) - 4

by = 72; bh = 66
c.setFillColorRGB(*GOLD); c.setFillAlpha(0.10)
c.roundRect(M, by, W-2*M, bh, 10, fill=1, stroke=0); c.setFillAlpha(1)
c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(0.3); c.roundRect(M, by, W-2*M, bh, 10, fill=0, stroke=1); c.setStrokeAlpha(1)
t1 = "NOS VEMOS EN LA SALA. A MOVER HIERRO."
text(W/2-sw(t1, 12, True)/2, by+44, t1, 12, WHITE, bold=True)
t2 = "Lo mejor está por venir."
text(W/2-sw(t2, 14, True)/2, by+24, t2, 14, GOLD, bold=True)
t3 = "FORCE — La Plata   ·   #TrustTheProcess"
text(W/2-sw(t3, 8)/2, by+9, t3, 8, GOLD_DEEP)

c.showPage()
c.save()
print("wrote", OUT)
