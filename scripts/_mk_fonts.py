import os
from fontTools import varLib
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib import TTFont
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=os.path.join(ROOT,"src/assets/fonts/Montserrat.ttf")
out=os.path.join(ROOT,"scripts/_fonts"); os.makedirs(out,exist_ok=True)
for name,wght in [("Montserrat-Reg",500),("Montserrat-Bold",800)]:
    f=TTFont(src)
    instantiateVariableFont(f,{"wght":wght},inplace=True)
    p=os.path.join(out,name+".ttf"); f.save(p); print("wrote",p)
