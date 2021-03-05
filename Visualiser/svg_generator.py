import svgwrite
import numpy as np
import random
import math
from sys import argv

if len(argv) > 2:
    afrom, ato = int(argv[1]), int(argv[2])
else:
    afrom = 0
    ato   = -1

def get_width(val):
    return 30

def get_heightd(val, utxo_dirt):
    return sum(get_height(v, utxo_dirt) for d, v in utxo_dirt if d != 0)

def get_height(val, utxo_dirt):
    #return math.log2(val)
    return val

def get_color(ct, dirt_type):

    if dirt_type not in ct:
        r = lambda: random.randint(0,255)
        ct[dirt_type] = '#%02X%02X%02X' % (r(),r(),r())

    return ct[dirt_type]

def draw_rect(dwg, xy, wh, fill="none", stroke="black", name="name", value="", taints=""):
    dwg.add(svgwrite.shapes.Rect(xy, wh, fill=fill, stroke=stroke, onclick="alert(\"UTXO:{} \\\nV:{} \\\nT:{}\")".format(name, value, taints)))

def draw_line(dwg, xy, to, color):
    dwg.add(svgwrite.shapes.Line(xy, to, style="stroke:{};stroke-width:1".format(color)))

def draw_utxo(dwg, xy, utxo_dirt, value, ct, name):
    global dirt_trans
    draw_rect(dwg, xy, (get_width(value), get_heightd(value, utxo_dirt)), fill="none", stroke="black", name=name, value = value, taints=" ".join([dirt_trans[dirt]+", "+str(val) for dirt, val in utxo_dirt]))

    offset = 0
    val_offset = 0
    for (dirt, val) in utxo_dirt:
        val_offset += val
        if dirt == 0:
            continue
        color = get_color(ct, dirt)
        h = get_height(val,dirt)
        draw_rect(dwg, (xy[0],xy[1]+offset), (get_width(val), h), fill=color, stroke="black", name=name, value="{}/{} starts at {}".format(val, value, val_offset-val), taints=dirt_trans[dirt] + ", " + str(val))
        offset += h


utxos = []
dirt_trans = {}

for line in open("/media/is410/Seagate/Other/SERGIO_FILES/ilias_file.csv"):
    name, num = line.strip().split(",")
    dirt_trans[int(num)] = name

i=0

lfrom, lto = 100000, 200000#4000000,5000000

for line in open("/media/is410/Seagate/Other/SERGIO_FILES/taint_timing_information.csv"):

    i += 1

    if i < lfrom:
        continue

    if i > lto:
        break

    sline = line.strip().split(",")

    blockno     = int(sline[0])
    utxo_itself = sline[1]
    num_inputs  = int(sline[2])
    inputs      = [ ff.split(";")[0] for ff in sline[3: 3 + num_inputs]]
    timestamp   = sline[4 + num_inputs]
    balance     = int(sline[5 + num_inputs])*1e-8
    dirts       = [(int(ff.split(" ")[0]), 1e-8*int(ff.split(" ")[1])) for ff in sline[6 + num_inputs: -1]]

    #if any(dt==2319 for dt, _ in dirts):
    if len(inputs) > 0 and sum(v for d, v in dirts if d!=0) > -1 and len(dirts) > 0:
        utxos.append((blockno, utxo_itself, balance, dirts, inputs))

print("UTXOs to print:", len(utxos))
if ato == -1:
    ato = len(utxos)

ct = {0: "white"}

while True:
    hryak = input("\nfrom,to:").split(",")
    afrom, ato = int(hryak[0]), int(hryak[1])

    krya = True
    if len(hryak) == 3:
        krya = False

    dwg = svgwrite.Drawing('test.svg', size=('1000000', '1000000'))
    coords = {}

    last = utxos[0][0]
    start_y  = 10
    y_offset = 25
    ll = 0
    draw_level = 0
    drawn = 0
    per_lvl = 40

    last_y = start_y
    num_utxos = 0
    for cutxo in utxos:
        num_utxos += 1

        if ll > ato:
            break

        if last != cutxo[0]:
            last = cutxo[0]
            ll+=1
            last_y = start_y
            if afrom < ll < ato:
                draw_level += 1

        print("Done: %.2f%%-- %d"%(float(num_utxos)*100/len(utxos), drawn), end='\r')

        xy =  (per_lvl*(draw_level), last_y)
        if afrom < ll < ato:
            drawn += 1
            draw_utxo(dwg,xy,cutxo[3],cutxo[2],ct,cutxo[1])

        my_tx = cutxo[1].split(";")[0]

        my_height = get_heightd(cutxo[2], cutxo[3])

        xy = (xy[0], xy[1] + my_height//2)
        if afrom < ll < ato:
            coords[my_tx] = xy

        if krya:
            if afrom < ll < ato:
                for inp in cutxo[4]:
                    if inp in coords:
                        draw_line(dwg, xy, coords[inp], color=get_color(ct, sorted([(d, v) for d, v in cutxo[3] if d != 0], key=lambda x:x[1], reverse=True)[0][0]))

        last_y += y_offset + my_height

    dwg.save()
    print("\nFinished writing")

#drawing = svg2rlg("test.svg")
#renderPDF.drawToFile(drawing, "file.pdf")
#renderPM.drawToFile(drawing, "file.png")
