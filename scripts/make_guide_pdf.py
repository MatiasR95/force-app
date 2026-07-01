# Generates the FORCE client guide PDF (brand: gold on dark, Montserrat).
# Static font weights live in scripts/_fonts/ (run scripts/_mk_fonts.py once).
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
GOLD_PALE = (0xEA/255, 0xDE/255, 0xB4/255)
GOLD_DEEP = (0x8A/255, 0x6A/255, 0x38/255)
WHITE = (1, 1, 1)
SOFT = (0.82, 0.81, 0.78)
LEAD = (0.55, 0.54, 0.51)
CELESTE = (0x74/255, 0xAC/255, 0xDF/255)
BRONZE = (0xC7/255, 0x7B/255, 0x3E/255)
SILVER = (0xC9/255, 0xCC/255, 0xD2/255)
PLATINO = (0xBC/255, 0xD2/255, 0xDE/255)

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
    # signature gold spine
    c.setFillColorRGB(*GOLD); c.setFillAlpha(0.9)
    c.rect(0, 0, 4, H, fill=1, stroke=0); c.setFillAlpha(1)


def sw(s, size, bold=False, tr=0):
    return pdfmetrics.stringWidth(s, FB if bold else F, size) + tr*max(0, len(s)-1)


def text(x, y, s, size, color=WHITE, bold=False, tr=0):
    c.setFillColorRGB(*color)
    to = c.beginText(); to.setFont(FB if bold else F, size)
    to.setCharSpace(tr)
    to.setTextOrigin(x, y); to.textLine(s); c.drawText(to)


def ctext(cx, y, s, size, color=WHITE, bold=False, tr=0):
    text(cx - sw(s, size, bold, tr)/2, y, s, size, color, bold, tr)


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


def para(x, y, s, size, color=SOFT, maxw=None, lh=1.32, tr=0, bold=False):
    maxw = maxw or (W-2*M)
    for ln in wrap(s, size, maxw, bold, tr):
        text(x, y, ln, size, color, bold, tr); y -= size*lh
    return y


def rule(y, x0=M, x1=W-M, alpha=0.5):
    c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(alpha); c.setLineWidth(1.3)
    c.line(x0, y, x1, y); c.setStrokeAlpha(1)


def card(x, y, w, h, r=10, fa=0.04, sa=0.30):
    c.setFillColorRGB(1, 1, 1); c.setFillAlpha(fa)
    c.roundRect(x, y, w, h, r, fill=1, stroke=0)
    c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(sa); c.setLineWidth(1)
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


def medal(cx, cy, r, ring):
    c.setFillColorRGB(*ring); c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColorRGB(0.08, 0.08, 0.09); c.circle(cx, cy, r*0.72, fill=1, stroke=0)
    # tiny dumbbell glyph
    c.setStrokeColorRGB(*ring); c.setLineWidth(r*0.16); c.setLineCap(1)
    c.line(cx-r*0.24, cy, cx+r*0.24, cy)
    c.setFillColorRGB(*ring)
    c.circle(cx-r*0.3, cy, r*0.13, fill=1, stroke=0); c.circle(cx+r*0.3, cy, r*0.13, fill=1, stroke=0)
    c.setLineCap(0)


def section(y, n, title):
    kicker(M, y, n); text(M, y-16, title, 14, WHITE, bold=True)
    return y-32


def step(y, n, head, body):
    badge(M, y-11, n)
    text(M+24, y, head, 10.5, WHITE, bold=True)
    yy = para(M+24, y-12, body, 9, SOFT, maxw=W-2*M-24)
    return yy-7


def footer(pg):
    text(M, 30, "FORCE · La Plata   ·   #TrustTheProcess", 8, LEAD, tr=1)
    text(W-M-sw("%d / 3" % pg, 8), 30, "%d / 3" % pg, 8, LEAD)


# ================= PAGE 1 — acceso + tu día =================
bg()
eh = emblem(M, H-M-46, 46)
ecy = H-M-46 + eh/2
text(M+58, ecy-9, "FORCE", 30, GOLD, bold=True, tr=1)
flag(M+58+sw("FORCE", 30, True, 1)+16, ecy-12, 36)
kicker(M, H-M-68, "MI RUTINA   ·   GUÍA DEL CLIENTE")
text(W-M-sw("#TrustTheProcess", 8.5), H-M-14, "#TrustTheProcess", 8.5, GOLD_DEEP, tr=1)
y = H-M-94
y = para(M, y, "Tu rutina, en el bolsillo. La app te muestra qué te toca hoy, te lleva serie por serie, "
         "te calcula los discos y guarda tu progreso, tus récords y tus medallas. Vos solo entrenás.",
         10, SOFT, lh=1.4)
rule(y-2); y -= 22

y = section(y, "1 · UNA SOLA VEZ", "Activá tu acceso")
y = step(y, 1, "Escaneá el QR (o tocá tu link)", "Se abre tu rutina con tu nombre — sin usuario ni contraseña. El link es tuyo, no lo compartas.")
y = step(y, 2, "Instalala como app", "Android: menú (tres puntitos) > Agregar a inicio. iPhone (Safari): Compartir > Agregar a inicio. Si te pide activar de nuevo, pegá tu link en esa pantalla.")
y = step(y, 3, "Configurá y permití los avisos", "La primera vez elegís con qué DÍA y en qué SEMANA arrancás (clave si entrás a mitad de ciclo). Cargá nombre, sexo, cumple y peso en Perfil, y aceptá las notificaciones.")

y -= 6
y = section(y, "2 · PASO A PASO", "Tu día de entrenamiento")
for i, (h_, b_) in enumerate([
    ("Abrí la app y tocá \"Hoy te toca · Día X\"", "Caés en INICIO. El botón te lleva directo a lo de hoy y arranca por la entrada en calor."),
    ("Marcá cada serie", "Un ejercicio a la vez. Tocá el botón dorado \"Marcar serie hecha\" y avanza sola. Abajo, \"La vez pasada\" te recuerda tu última marca."),
    ("Mirá lo que viene", "Con el ícono de lista ves TODA la sesión y preparás el equipo. Podés saltar a cualquier paso sin perder tu progreso."),
    ("Ajustá lo que hiciste de verdad", "Corregí kg / reps / series: va a tu récord, tu progreso y tu planilla. Si dice \"x lado\", la app te muestra qué discos poner."),
    ("Descanso y cierre", "El cronómetro sigue corriendo aunque cambies de pantalla y te avisa al terminar. Al cerrar el día dejás tu RPE y podés compartir. Tu asistencia se registra sola."),
], 1):
    y = step(y, i, h_, b_)

card(M, y-30, W-2*M, 30)
text(M+14, y-13, "RÉCORDS AUTOMÁTICOS", 8, GOLD, bold=True, tr=1.5)
para(M+14, y-24, "Si hacés una marca en los ejercicios grandes, se carga sola a tu Salón de la Fama — según tu sexo y categoría.",
     8.5, SOFT, maxw=W-2*M-28)
footer(1)
c.showPage()

# ================= PAGE 2 — la app, medallas, compartir =================
bg()
emblem(M, H-M-30, 30)
kicker(M+40, H-M-20, "MI RUTINA · GUÍA DEL CLIENTE")
rule(H-M-42)
y = H-M-66

y = section(y, "LA APP", "Las 5 pestañas (abajo)")
for name, desc in [
    ("INICIO", "tu tablero: pronóstico de La Plata, próximo feriado, tip del coach y rachas. En fechas patrias, la app se viste para la ocasión."),
    ("HOY", "el detalle de la sesión y el botón para entrenar. Cambiás de día o de semana."),
    ("PLAN", "toda tu rutina del ciclo, con cargas, técnicas y tu progresión por semana."),
    ("RÉCORDS", "el ranking de FORCE por ejercicio, sexo y categoría de peso. Y las rachas."),
    ("PANEL", "lo tuyo: tus MEDALLAS, asistencia, fuerza estimada (1RM) y evolución."),
]:
    text(M, y, name, 10, GOLD, bold=True)
    yend = para(M+72, y, desc, 9, SOFT, maxw=W-2*M-72, lh=1.28)
    y = yend - 9

y -= 6
y = section(y, "LOGROS", "Medallas (en Panel)")
my = y-6
for cx0, ring, lbl in [(M+22, BRONZE, "Bronce"), (M+92, SILVER, "Plata"), (M+162, GOLD, "Oro"), (M+232, PLATINO, "Platino")]:
    medal(cx0, my-8, 15, ring)
    ctext(cx0, my-34, lbl, 8, WHITE, bold=True, tr=1)
tx = M+270
para(tx, y-2, "Constancia (sin fin): por semanas seguidas y entrenamientos, suben de Bronce a Platino y siguen contando.",
     8.6, SOFT, maxw=W-M-tx, lh=1.3)
para(tx, y-40, "Fuerza: Bronce / Plata / Oro en cada ejercicio, según tu sexo y categoría — justo para tu nivel.",
     8.6, SOFT, maxw=W-M-tx, lh=1.3)
y = my-52

y = section(y, "COMPARTÍ", "Tus logros, listos para Instagram")
y = para(M, y, "Al terminar el día armás una placa para tu historia con tu día, tus kilos y los grandes que hiciste. "
         "Y cuando desbloqueás una medalla, sale una placa especial de ese logro.", 9.5, SOFT, lh=1.32)
text(M, y-4, "Etiquetá a @force.ok — nos encanta ver tu progreso.", 9.5, GOLD, bold=True)
footer(2)
c.showPage()

# ================= PAGE 3 — categorías, avisos, tips, cierre =================
bg()
emblem(M, H-M-30, 30)
kicker(M+40, H-M-20, "MI RUTINA · GUÍA DEL CLIENTE")
rule(H-M-42)
y = H-M-66

y = section(y, "JUSTO Y A TU MEDIDA", "Categorías de peso")
hw = (W-2*M-12)/2; ch = 60
card(M, y-ch, hw, ch); card(M+hw+12, y-ch, hw, ch)
text(M+16, y-17, "HOMBRES", 8.5, GOLD, bold=True, tr=2)
text(M+16, y-37, "Hasta 70 · 71–83 · 84–95 · +95", 10.5, WHITE, bold=True)
text(M+16, y-50, "kilos", 8, LEAD)
x2 = M+hw+12
text(x2+16, y-17, "MUJERES", 8.5, GOLD, bold=True, tr=2)
text(x2+16, y-37, "Hasta 55 · 56–65 · 66–75 · +75", 10.5, WHITE, bold=True)
text(x2+16, y-50, "kilos", 8, LEAD)
y -= ch+20

y = section(y, "TU TELÉFONO", "Avisos que vas a recibir")
for t in [
    ("Fin del descanso", "cuando se termina tu pausa, aunque estés en otra app."),
    ("Te pasaron un récord", "si alguien de tu categoría y sexo te supera, te avisamos para la revancha. Se gana entrenando inteligente y siguiendo al coach."),
]:
    c.setFillColorRGB(*GOLD); c.circle(M+3, y-3, 2.2, fill=1, stroke=0)
    text(M+14, y, t[0]+":", 9.5, WHITE, bold=True)
    y = para(M+14+sw(t[0]+": ", 9.5, True), y, t[1], 9.5, SOFT, maxw=W-2*M-14-sw(t[0]+": ", 9.5, True)) - 5

y -= 8
y = section(y, "TIPS", "Bueno saber")
for t in [
    "Funciona sin señal: entrená igual; se sincroniza solo cuando vuelve internet.",
    "Se actualiza sola. Para traer la última versión, tocá Actualizar (arriba en Inicio); en iPhone, cerrá la app del todo y volvé a abrirla.",
    "Un día se marca como hecho recién cuando terminás la sesión (no solo por abrirlo).",
    "La animación de cada ejercicio es una referencia. Ante dudas de técnica, preguntale a tu coach.",
]:
    c.setFillColorRGB(*GOLD); c.circle(M+3, y-3, 2.2, fill=1, stroke=0)
    y = para(M+14, y, t, 9.5, SOFT, maxw=W-2*M-14) - 5

# closing box
bh = 92
c.setFillColorRGB(*GOLD); c.setFillAlpha(0.10)
c.roundRect(M, 58, W-2*M, bh, 10, fill=1, stroke=0); c.setFillAlpha(1)
c.setStrokeColorRGB(*GOLD); c.setStrokeAlpha(0.3); c.roundRect(M, 58, W-2*M, bh, 10, fill=0, stroke=1); c.setStrokeAlpha(1)
ctext(W/2, 58+68, "GRACIAS POR ENTRENAR CON NOSOTROS.", 11.5, WHITE, bold=True)
ctext(W/2, 58+50, "Esta app la hicimos con mucho laburo y cariño, y la seguimos mejorando semana a semana.", 8.5, SOFT)
ctext(W/2, 58+29, "La familia FORCE siempre merece lo mejor.", 13.5, GOLD, bold=True)
ctext(W/2, 58+12, "Nos vemos en la sala. Lo mejor está por venir.   ·   FORCE — La Plata", 8, GOLD_DEEP)
footer(3)

c.showPage()
c.save()
print("wrote", OUT)
