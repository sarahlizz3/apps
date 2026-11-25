"""Build src/travel/places.json for the Travel Tracker from Natural Earth data.

Natural Earth (https://www.naturalearthdata.com) is public domain. To rebuild the
map, for example after Natural Earth publishes border changes:

  1. Download these three 1:50m GeoJSON files into one folder:
       https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
       https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson
       https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson
  2. python3 scripts/build-travel-map.py <that folder> src/travel/places.json
  3. Build and deploy as usual.

Saved visits are keyed by place code (ISO 3166: "FRA", "US-MI", "CA-ON", "T-MQ"),
never by map shape, so a rebuilt map keeps them. If a code ever disappears from
the map (a country splits or merges), the Visited screen lists that visit under
"Not on the current map" instead of dropping it.

The script prints any UN country missing from the map and asserts every listed
territory was found, so a changed Natural Earth file fails loudly here.
"""
import json,sys
src,out=sys.argv[1],sys.argv[2]
UN = """AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG COD CRI CIV HRV CUB CYP CZE DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR PRK KOR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MDA MCO MNG MNE MAR MOZ MMR NAM NRU NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK TZA THA TLS TGO TON TTO TUN TUR TKM TUV UGA UKR ARE GBR USA URY UZB VUT VEN VNM YEM ZMB ZWE VAT PSE""".split()
assert len(UN)==195 and len(set(UN))==195, len(UN)
ALIAS={"SDS":"SSD","PSX":"PSE"}  # Natural Earth codes that differ from ISO
def r(c): return [round(c[0],2),round(c[1],2)]
def area(ring):
    return sum(ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1] for i in range(len(ring)-1))/2
def fix_poly(poly):
    outp=[]
    for i,ring in enumerate(poly):
        ring=[r(c) for c in ring]
        ded=[ring[0]]+[c for j,c in enumerate(ring[1:],1) if c!=ring[j-1]]
        if len(ded)<4: continue
        a=area(ded)
        # d3 wants exterior rings clockwise (negative planar area), holes counter-clockwise
        if (i==0 and a>0) or (i>0 and a<0): ded=ded[::-1]
        outp.append(ded)
    return outp
def fix(g):
    if g["type"]=="Polygon":
        p=fix_poly(g["coordinates"]); return {"type":"Polygon","coordinates":p} if p else None
    ps=[q for q in (fix_poly(p) for p in g["coordinates"]) if q]
    return {"type":"MultiPolygon","coordinates":ps} if ps else None
import collections
def _fra(x,y):
    if x<-50 and y>10: return "Martinique" if y<15 else "Guadeloupe"
    if x<-40: return "French Guiana"
    if 50<x<60: return "Réunion"
    if 40<x<50: return "Mayotte"
    return None
OVERSEAS={"FRA":_fra,
          "NLD":lambda x,y:"Caribbean Netherlands" if x<-50 else None,
          "NZL":lambda x,y:"Tokelau" if y>-20 else None}
feats=[]; seen=set()
for f in json.load(open(src+"/ne_50m_admin_0_countries.geojson"))["features"]:
    p=f["properties"]; a3=ALIAS.get(p["ADM0_A3"],p["ADM0_A3"])
    if a3 in ("USA","CAN"): continue
    g=fix(f["geometry"]);
    if not g: continue
    # Overseas pieces that Natural Earth draws as part of the mother country are
    # split off as their own non-counted shapes, so tapping Martinique doesn't log France.
    if a3 in OVERSEAS and g["type"]=="MultiPolygon":
        home_parts=[]; split=collections.defaultdict(list)
        for poly in g["coordinates"]:
            xs=[c[0] for c in poly[0]]; ys=[c[1] for c in poly[0]]
            nm=OVERSEAS[a3](sum(xs)/len(xs),sum(ys)/len(ys))
            (split[nm] if nm else home_parts).append(poly)
        g={"type":"MultiPolygon","coordinates":home_parts}
        for nm,polys in split.items():
            feats.append({"id":"x-"+nm,"name":nm,"kind":"other","g":{"type":"MultiPolygon","coordinates":polys}})
    kind="country" if a3 in UN else "other"
    if kind=="country": seen.add(a3)
    feats.append({"id":a3 if kind=="country" else "x-"+p["ADM0_A3"],"name":p["NAME_LONG"] or p["NAME"],"kind":kind,"g":g})
for f in json.load(open(src+"/ne_50m_admin_1_states_provinces.geojson"))["features"]:
    p=f["properties"]
    if p["admin"] not in ("United States of America","Canada"): continue
    g=fix(f["geometry"])
    us=p["admin"]!="Canada"
    feats.append({"id":p["iso_3166_2"],"name":p["name"],"kind":"us" if us else "ca","g":g})
# Island territories Sarah would likely visit from the US: tappable and logged under
# their own Territories count, never toward countries. Keyed by ISO 3166 code so a
# future map update can't orphan a saved visit. Map name -> (code, shown name).
TERR={
 "Puerto Rico":("PR","Puerto Rico (U.S. Territories)"),
 "United States Virgin Islands":("VI","U.S. Virgin Islands (U.S. Territories)"),
 "Guam":("GU","Guam (U.S. Territories)"),
 "American Samoa":("AS","American Samoa (U.S. Territories)"),
 "Northern Mariana Islands":("MP","Northern Mariana Islands (U.S. Territories)"),
 "British Virgin Islands":("VG","British Virgin Islands (British Territories)"),
 "Anguilla":("AI","Anguilla (British Territories)"),
 "Montserrat":("MS","Montserrat (British Territories)"),
 "Cayman Islands":("KY","Cayman Islands (British Territories)"),
 "Turks and Caicos Islands":("TC","Turks and Caicos Islands (British Territories)"),
 "Bermuda":("BM","Bermuda (British Territories)"),
 "Aruba":("AW","Aruba (Dutch Territories)"),
 "Curaçao":("CW","Curaçao (Dutch Territories)"),
 "Sint Maarten":("SX","Sint Maarten (Dutch Territories)"),
 "Caribbean Netherlands":("BQ","Bonaire, Saba and Sint Eustatius (Dutch Territories)"),
 "Saint-Martin":("MF","Saint Martin (French Territories)"),
 "Saint-Barthélemy":("BL","Saint Barthélemy (French Territories)"),
 "Guadeloupe":("GP","Guadeloupe (French Territories)"),
 "Martinique":("MQ","Martinique (French Territories)"),
 "French Polynesia":("PF","French Polynesia (French Territories)"),
}
for f in feats:
    if f["kind"]=="other" and f["name"] in TERR:
        code,shown=TERR.pop(f["name"]); f.update(id="T-"+code,name=shown,kind="terr")
assert not TERR, "territories not found in map: %s"%list(TERR)
print("territories",sum(x["kind"]=="terr" for x in feats))
# Lakes are drawn on top of the land in the sea colour. Natural Earth's state and
# province shapes run out to the borders in the middle of the Great Lakes, so
# without this Michigan and its neighbours look like solid land.
for i,f in enumerate(json.load(open(src+"/ne_50m_lakes.geojson"))["features"]):
    g=fix(f["geometry"])
    if g: feats.append({"id":"lake-%d"%i,"name":f["properties"].get("name") or "","kind":"lake","g":g})
print("lakes",sum(x["kind"]=="lake" for x in feats))
# Map colouring: places that share a border get different colour slots (0-5), so
# neighbours never look like one shape. Neighbours are found by shared border
# points, snapped to a 0.1-degree grid so the US/Canada state shapes still meet
# the country shapes around them. A false neighbour only adds a constraint.
import collections
land=[f for f in feats if f["kind"]!="lake"]
cells=collections.defaultdict(set)
def rings(g):
    polys=[g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]
    for poly in polys:
        for ring in poly: yield ring
for i,f in enumerate(land):
    for ring in rings(f["g"]):
        for x,y in ring: cells[(round(x,1),round(y,1))].add(i)
shared=collections.Counter()
for ids in cells.values():
    ids=sorted(ids)
    for a_ in range(len(ids)):
        for b_ in range(a_+1,len(ids)): shared[(ids[a_],ids[b_])]+=1
nbr=collections.defaultdict(set)
for (i,j),n in shared.items():
    if n>=2: nbr[i].add(j); nbr[j].add(i)
NC=6
order=sorted(range(len(land)),key=lambda i:-len(nbr[i]))
use=collections.Counter()
for i in order:
    taken={land[j].get("c") for j in nbr[i]}
    free=[c for c in range(NC) if c not in taken]
    # among free slots pick the least-used one so the shades are spread evenly
    land[i]["c"]=min(free,key=lambda c:use[c]) if free else 0
    use[land[i]["c"]]+=1
clash=sum(1 for i in nbr for j in nbr[i] if land[i]["c"]==land[j]["c"])//2
print("colour slots used",dict(use),"neighbour clashes",clash)
print("missing UN countries in map:", sorted(set(UN)-seen-{"USA","CAN"}))
print("non-counted shapes:", sorted(x["name"] for x in feats if x["kind"]=="other"))
print("us",sum(x["kind"]=="us" for x in feats),"ca",sum(x["kind"]=="ca" for x in feats),"countries",len(seen)+2)
json.dump(feats,open(out,"w"),separators=(",",":"),ensure_ascii=False)
