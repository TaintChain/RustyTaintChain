# Script to operate on the time series data
# The current version of the file looks like this:
# <address>,<date-time>,balance, ... , <crime names> <taint value>
# Currently we aint putting any restrictons on balance having more money then taint

import numpy as np
from collections import Counter, defaultdict
import multiprocessing as mp,os
import datetime
import sys

def load_originals(path):
    outs = defaultdict(int)
    adr = []
    for line in open(path):
        sline = line.split(",")
        if sline[0] in adr:
            continue
        adr.append(sline[0])

        outs[sline[1]] += int(sline[2])

    return outs

def load_translation(path):
    out = dict()
    for line in open(path):
        name, num = line.strip().split(",")
        out[name] = num

    return out

def load_rtranslation(path):
    translate = {}
    for line in open(path):
        t, n = line.strip().split(",")
        translate[n] = t
    return translate

def load_lost(path):
    lost = defaultdict(int)
    try:
        for line in open(path):
            lfrom,lto,lsize,ltx,lloc = line.strip().split(",")
            lost[lto] += int(lsize)
    except Exception as e:
        print(e)
        return None
    return lost

orig_file              = "/home/is410/code/taintchain/DATASETS/addresses_cut.txt"

fold = "/media/is410/Seagate/Other/ILIA_AVG"
orig_transalation_file = fold+"/ilias_file.csv"
infile                 = fold+"/address_info.csv"
olf                    = fold+"/taint_overlap.csv"

orgs   = load_originals    (orig_file)
trans  = load_translation  (orig_transalation_file)
rtrans = load_rtranslation (orig_transalation_file)
ovlps  = load_lost         (olf)

balances = []
all_taints = []
taint_types = set()

for key in trans:
    if key != "Clean":
        taint_types.add(key)

print("Loading the file...")
myiter = 0

overall_utxos    = 0
overall_tainted_utxos = 0
tainted_per_type = defaultdict(int)

for line in open(infile):
    print("Line {}".format(myiter), end="\r")
    myiter += 1
    sl = line.strip().split(",")
    #balance = int(sl[2])
    taints = defaultdict(int)
    overall_utxos += 1

    for f in sl[3:-1]:
        taint_type  = " ".join(f.split()[:-1])
        taint_value = float(f.split()[-1])
        if taint_type != "0":
            #taints[trans[taint_type]] += taint_value
            taints[taint_type] += taint_value
            taint_types.add(taint_type)

    un = np.unique(sl[3:-1])
    if len(un) > 0:
        overall_tainted_utxos += 1

    for f in un:
        taint_type = " ".join(f.split()[:-1])
        tainted_per_type[taint_type] += 1


    #balances.append(balance)
    all_taints.append(taints)

    #if myiter == 1000:
    #    break

print("\nDone")

#balances = np.array(balances)
all_taints = np.array(all_taints)

#nonzero = all_taints[balances != 0]
#vals = np.array([sum(n.values()) for n in nonzero])

vals_all = np.array([0 if len(n) == 0 else sum(n.values()) for n in all_taints])

ghru = sum(vals_all)
print("All originally tainted satoshies: ", ghru, "from", sum(orgs.values()), "or", float(ghru)/sum(orgs.values())*100, "%")
print("Mean of all accounts taints:", vals_all.mean(), "2*std:", 2*vals_all.std())
print("Tainted UTXOs: ", overall_tainted_utxos, "of", overall_utxos, "or", float(overall_tainted_utxos*100)/float(overall_utxos), "%")
#print("Mean of non-zero taints:", vals.mean(), "2*std:", 2*vals.std())
#print("Nonzero balances", float(len(nonzero))/len(balances)*100, "%(", len(nonzero), ")")
#€print("Accounts with nonzero balance and zero taint", float(sum(vals == 0))/len(vals)*100, "%(", sum(vals==0), ")")

for tt in sorted(list(taint_types)):
    print("\n---------------------", tt)
    if tt in trans:
        tt_mapping = trans[tt]
    elif tt in rtrans:
        tt_mapping = rtrans[tt]
    else:
        tt_mapping = tt

    print("\tTaint name:", tt, "maps to", tt_mapping, '...')

    mn = np.array([ff[tt] if tt in ff else ff[tt_mapping] for ff in all_taints if tt in ff or tt_mapping in ff])
    hru = sum(mn)
    if orgs[tt] > 0:
        print("\tAll taint: ", hru, "from", len(mn), "acconts. Originally: ", orgs[tt], "or", float(hru)/orgs[tt]*100, "% (", orgs[tt]-hru, ")")
    if orgs[tt]-hru > 0 and ovlps is not None:
        print("\tLost moneys from overlaps", ovlps[tt_mapping], "explains", float(ovlps[tt_mapping]*100)/(orgs[tt]-hru), "%")
        print("\tUnexplained", orgs[tt]-hru-ovlps[tt_mapping], "satoshies")
    print("\tMean of", tt, "taint type:", mn.mean(), "2*std", 2*mn.std())
    print("\tAccounts with", tt, "taint of all addresses:", float(len(mn))/len(vals_all)*100, "%(", len(mn), ")")
    #print("Accounts with", tt, "taint of tainted addresses:", float(len(mn))/len(vals)*100, "%(", len(mn), ")")
