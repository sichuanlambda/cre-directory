#!/usr/bin/env python3
"""Integrate draft listings from data/drafts/ into data/products.json.
Validates schema/categories/slug-collisions/domain-dupes, fetches logos,
regenerates category membership. Run: python3 scripts/integrate_drafts.py
"""
import json, os, glob, io, re, urllib.request, concurrent.futures
from urllib.parse import urlparse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)

VALID_CATS = {"Property Management","CRM & Marketing","Investment & Valuation","Data & Analytics","Construction & Development","Broker Tools","Site Selection","Tenant Experience","Accounting & Finance","AI & Automation","Listing Services","Crowdfunding & Investing","Legal & Compliance","Workplace & Space Management","Lending & Debt","Energy & Sustainability"}
NAME_TO_SLUG = {n: re.sub(r'[^a-z0-9]+','-',n.lower()).strip('-').replace('--','-') for n in VALID_CATS}
NAME_TO_SLUG = {"Property Management":"property-management","CRM & Marketing":"crm-marketing","Investment & Valuation":"investment-valuation","Data & Analytics":"data-analytics","Construction & Development":"construction-development","Broker Tools":"broker-tools","Site Selection":"site-selection","Tenant Experience":"tenant-experience","Accounting & Finance":"accounting-finance","AI & Automation":"ai-automation","Listing Services":"listing-services","Crowdfunding & Investing":"crowdfunding-investing","Legal & Compliance":"legal-compliance","Workplace & Space Management":"workplace-space-management","Lending & Debt":"lending-debt","Energy & Sustainability":"energy-sustainability"}

def dom(u):
    if not u: return ''
    if not u.startswith('http'): u = 'https://' + u
    d = urlparse(u).netloc.lower()
    return d[4:] if d.startswith('www.') else d

prods = json.load(open('data/products.json'))
slugs = {p['slug'] for p in prods}
domains = {dom(p.get('url','')) for p in prods}

added, skipped = [], []
for f in sorted(glob.glob('data/drafts/*.json')):
    try:
        d = json.load(open(f))
    except Exception as e:
        skipped.append((f, f'bad json: {e}')); continue
    req = ['title','slug','url','description','short_description','categories','primary_category']
    missing = [k for k in req if not d.get(k)]
    if missing:
        skipped.append((f, f'missing {missing}')); continue
    d['categories'] = [c for c in d['categories'] if c in VALID_CATS][:3]
    if not d['categories']:
        skipped.append((f, 'no valid categories')); continue
    d['primary_category'] = NAME_TO_SLUG[d['categories'][0]]
    dd = dom(d['url'])
    if dd in domains:
        skipped.append((f, f'duplicate domain {dd}')); continue
    slug = re.sub(r'[^a-z0-9-]','', d['slug'].lower().replace(' ','-')) or 'unnamed'
    base = slug; n = 2
    while slug in slugs:
        slug = f'{base}-{n}'; n += 1
    d['slug'] = slug
    # enforced defaults
    d.setdefault('logo_url',''); d['logo_url'] = d.get('logo_url') or ''
    for k, v in [('is_verified',False),('is_featured',False),('review_count',0),('status','active'),('enriched',True),('last_updated','2026-08-30'),('deployment',['Cloud'])]:
        d.setdefault(k, v)
    d.setdefault('domain', dd)
    d.setdefault('tagline', d.get('headline',''))
    d.setdefault('headline', d.get('tagline') or d['short_description'])
    d.setdefault('target_audience', {'roles':[], 'company_sizes':[], 'property_types':[]})
    d.setdefault('feature_groups', [])
    d.setdefault('pricing', {})
    d.setdefault('pros', []); d.setdefault('cons', [])
    d.setdefault('pricing_model', (d.get('pricing') or {}).get('model',''))
    d.setdefault('is_free', bool((d.get('pricing') or {}).get('free_tier')))
    d.setdefault('property_types', (d.get('target_audience') or {}).get('property_types', []))
    d.setdefault('company', {'name': d['title']})
    prods.append(d)
    slugs.add(slug); domains.add(dd)
    added.append(slug)
    os.remove(f)

# logos for new slugs
def get_logo(p):
    try:
        req = urllib.request.Request(f'https://www.google.com/s2/favicons?domain={p["domain"]}&sz=128', headers={'User-Agent':'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=12).read()
        from PIL import Image
        img = Image.open(io.BytesIO(data)); img.load()
        if min(img.size) >= 32:
            img.convert('RGBA').save(f'img/logos/{p["slug"]}.png', optimize=True)
            return p['slug'], True
    except Exception:
        pass
    return p['slug'], False

new_prods = [p for p in prods if p['slug'] in set(added)]
logos = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    for slug, ok in ex.map(get_logo, new_prods):
        if ok:
            logos += 1
            next(p for p in prods if p['slug']==slug)['logo_url'] = f'/img/logos/{slug}.png'

json.dump(prods, open('data/products.json','w'), indent=2, ensure_ascii=False)

# regenerate category membership
cats = json.load(open('data/categories.json'))
for cslug, cat in cats.items():
    members = [p['slug'] for p in prods if cat['name'] in (p.get('categories') or [])]
    cat['products'] = members
    cat['product_count'] = len(members)
json.dump(cats, open('data/categories.json','w'), indent=2, ensure_ascii=False)

print(f'ADDED {len(added)} | logos {logos} | SKIPPED {len(skipped)} | total products {len(prods)}')
for f, r in skipped[:20]:
    print('  skip:', os.path.basename(f), '-', r)
