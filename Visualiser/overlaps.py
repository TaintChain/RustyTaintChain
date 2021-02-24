from collections import defaultdict

folder = "/media/is410/Seagate/Other/ILIA_FIFO/"
olf = open(folder + "/taint_overlap.csv")
ttt = open(folder + "/ilias_file.csv")

translate = {}
for line in ttt:
    t, n = line.strip().split(",")
    translate[n] = t

counts = defaultdict(int)
nums   = defaultdict(int)
lost   = defaultdict(int)

for line in olf:
    lfrom, lto, lsize, ltx, lloc = line.strip().split(",")
    counts[(lfrom, lto)] += 1
    nums  [(lfrom, lto)] += int(lsize)
    lost  [lto]          += int(lsize)

for f, t in sorted(counts, key=lambda x: nums[x]):
    print(translate[f], "=>", translate[t], "=", counts[(f,t)], "| overall value", nums[(f,t)]*1e-8)

print("----------------")
for lto in lost:
    print(translate[lto], "=>", lost[lto]*1e-8)
