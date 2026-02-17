#!/usr/bin/env python3
"""Process raw CRE directory CSV into structured JSON."""
import csv
import json
import re
import os
from urllib.parse import urlparse

RAW_CSV = "/home/openclaw/.openclaw/workspace/cre-directory/raw-data.csv"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# Canonical categories and mapping from messy CSV categories
CANONICAL_CATEGORIES = {
    "Property Management": "Tools for managing commercial and residential properties, tenants, and maintenance.",
    "CRM & Marketing": "Customer relationship management and marketing tools for real estate professionals.",
    "Investment & Valuation": "Software for real estate investment analysis, valuation, and portfolio management.",
    "Construction & Development": "Tools for construction management, project development, and planning.",
    "Lease Administration": "Lease management, tracking, and administration software.",
    "Data & Analytics": "Data platforms, analytics, and business intelligence for real estate.",
    "Broker Tools": "Software designed specifically for commercial real estate brokers.",
    "Site Selection": "Tools for location analysis, site selection, and market research.",
    "Tenant Experience": "Platforms enhancing tenant engagement, communication, and building experience.",
    "Accounting & Finance": "Financial management, accounting, and budgeting for real estate.",
    "AI & Automation": "Artificial intelligence and automation tools for real estate workflows.",
    "Listing Services": "Property listing platforms and marketing for available spaces.",
    "Crowdfunding & Investing": "Real estate crowdfunding and investment platforms.",
    "Energy & Sustainability": "Energy management, sustainability, and green building tools.",
    "Legal & Compliance": "Legal, regulatory, and compliance tools for real estate.",
    "Workplace & Space Management": "Workspace planning, space utilization, and facility management.",
}

# Map messy category keywords to canonical
CATEGORY_MAP = {
    "property management": "Property Management",
    "management": "Property Management",
    "asset management": "Property Management",
    "facilities management": "Property Management",
    "facility management": "Property Management",
    "portfolio management": "Investment & Valuation",
    "crm": "CRM & Marketing",
    "marketing": "CRM & Marketing",
    "lead generation": "CRM & Marketing",
    "customer relationship": "CRM & Marketing",
    "investment": "Investment & Valuation",
    "valuation": "Investment & Valuation",
    "appraisal": "Investment & Valuation",
    "underwriting": "Investment & Valuation",
    "financial analysis": "Investment & Valuation",
    "real estate investment": "Investment & Valuation",
    "construction": "Construction & Development",
    "development": "Construction & Development",
    "project management": "Construction & Development",
    "building": "Construction & Development",
    "lease": "Lease Administration",
    "lease management": "Lease Administration",
    "lease administration": "Lease Administration",
    "lease accounting": "Lease Administration",
    "data": "Data & Analytics",
    "analytics": "Data & Analytics",
    "data analytics": "Data & Analytics",
    "real estate data": "Data & Analytics",
    "market insights": "Data & Analytics",
    "market research": "Data & Analytics",
    "market data": "Data & Analytics",
    "research": "Data & Analytics",
    "broker": "Broker Tools",
    "brokerage": "Broker Tools",
    "deal management": "Broker Tools",
    "transactions": "Broker Tools",
    "transaction management": "Broker Tools",
    "site selection": "Site Selection",
    "location intelligence": "Site Selection",
    "location analytics": "Site Selection",
    "geospatial": "Site Selection",
    "mapping": "Site Selection",
    "gis": "Site Selection",
    "tenant": "Tenant Experience",
    "tenant experience": "Tenant Experience",
    "tenant engagement": "Tenant Experience",
    "occupier": "Tenant Experience",
    "accounting": "Accounting & Finance",
    "finance": "Accounting & Finance",
    "financial": "Accounting & Finance",
    "budgeting": "Accounting & Finance",
    "payments": "Accounting & Finance",
    "ai": "AI & Automation",
    "artificial intelligence": "AI & Automation",
    "automation": "AI & Automation",
    "machine learning": "AI & Automation",
    "listing": "Listing Services",
    "listings": "Listing Services",
    "marketplace": "Listing Services",
    "commercial real estate": "Broker Tools",
    "crowdfunding": "Crowdfunding & Investing",
    "investing": "Crowdfunding & Investing",
    "fundraising": "Crowdfunding & Investing",
    "energy": "Energy & Sustainability",
    "sustainability": "Energy & Sustainability",
    "green": "Energy & Sustainability",
    "esg": "Energy & Sustainability",
    "legal": "Legal & Compliance",
    "compliance": "Legal & Compliance",
    "regulatory": "Legal & Compliance",
    "law": "Legal & Compliance",
    "municipal": "Legal & Compliance",
    "zoning": "Legal & Compliance",
    "workspace": "Workplace & Space Management",
    "space management": "Workplace & Space Management",
    "space planning": "Workplace & Space Management",
    "coworking": "Workplace & Space Management",
    "workplace": "Workplace & Space Management",
    "facilities": "Workplace & Space Management",
    "operations": "Property Management",
    "maintenance": "Property Management",
    "inspections": "Property Management",
    "proptech": "Data & Analytics",
    "technology": "Data & Analytics",
    "visualization": "Data & Analytics",
    "reporting": "Data & Analytics",
    "document management": "Legal & Compliance",
    "communication": "Tenant Experience",
    "collaboration": "Workplace & Space Management",
    "design": "Construction & Development",
    "architecture": "Construction & Development",
    "planning": "Construction & Development",
    "insurance": "Accounting & Finance",
    "tax": "Accounting & Finance",
    "debt": "Accounting & Finance",
    "lending": "Accounting & Finance",
    "mortgage": "Accounting & Finance",
    "residential": "Property Management",
    "multifamily": "Property Management",
}


def slugify(text):
    s = text.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def get_domain(url):
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        domain = domain.replace("www.", "")
        return domain
    except:
        return ""


def map_categories(raw_cats, row):
    """Map raw category string + boolean flags to canonical categories."""
    cats = set()
    
    # From Category field
    if raw_cats:
        for cat in re.split(r'[;,]', raw_cats):
            cat_lower = cat.strip().lower()
            if not cat_lower:
                continue
            # Try exact match first
            if cat_lower in CATEGORY_MAP:
                cats.add(CATEGORY_MAP[cat_lower])
            else:
                # Try substring match
                for key, val in CATEGORY_MAP.items():
                    if key in cat_lower or cat_lower in key:
                        cats.add(val)
                        break
    
    # From boolean flags
    flag_map = {
        "Cat - DevelopmentY/N": "Construction & Development",
        "Cat - Constr Y/N": "Construction & Development",
        "Cat - Law & Muni Y/N": "Legal & Compliance",
        "Cat - Search & Sele Y/N": "Site Selection",
        "Cat - CRM & Mar Y/N": "CRM & Marketing",
        "Cat - Fin & Eval Y/N": "Investment & Valuation",
        "Cat - AI ": "AI & Automation",
    }
    for col, canonical in flag_map.items():
        if row.get(col, "").strip().upper() == "TRUE":
            cats.add(canonical)
    
    if not cats:
        cats.add("Data & Analytics")  # fallback
    
    return sorted(cats)


def infer_property_types(desc):
    types = []
    desc_lower = (desc or "").lower()
    for pt in ["Office", "Retail", "Industrial", "Multifamily", "Mixed-Use"]:
        if pt.lower() in desc_lower:
            types.append(pt)
    if "residential" in desc_lower:
        types.append("Residential")
    if "commercial" in desc_lower and not types:
        types.extend(["Office", "Retail", "Industrial"])
    if not types:
        types.append("Commercial")
    return sorted(set(types))


def infer_deployment(desc):
    dep = []
    desc_lower = (desc or "").lower()
    if any(w in desc_lower for w in ["cloud", "saas", "web-based", "web based", "browser", "online"]):
        dep.append("Cloud")
    if any(w in desc_lower for w in ["on-premise", "on premise", "desktop", "installed"]):
        dep.append("On-Premise")
    if any(w in desc_lower for w in ["mobile", "ios", "android", "app"]):
        dep.append("Mobile")
    if not dep:
        dep.append("Cloud")  # default assumption for modern SaaS
    return dep


def infer_pricing(desc):
    desc_lower = (desc or "").lower()
    if "free" in desc_lower and ("trial" not in desc_lower):
        if "freemium" in desc_lower or "premium" in desc_lower:
            return "Freemium"
        return "Free"
    if "subscription" in desc_lower or "monthly" in desc_lower or "per month" in desc_lower:
        return "Subscription"
    if "quote" in desc_lower or "contact" in desc_lower or "custom pricing" in desc_lower:
        return "Quote-based"
    return "Quote-based"  # default for B2B


def process():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    products = []
    seen_slugs = set()
    
    with open(RAW_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = (row.get("title") or "").strip()
            if not title:
                continue
            
            # Skip hidden
            if row.get("Hide", "").strip().upper() == "TRUE":
                continue
            
            url = (row.get("url") or "").strip()
            tagline = (row.get("text") or "").strip()
            description = (row.get("Details") or "").strip()
            raw_cats = (row.get("Category") or "").strip()
            
            # Skip entries with no real content
            if len(tagline) <= 2 and not description:
                continue
            
            slug = row.get("page", "").strip() or slugify(title)
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            
            domain = get_domain(url)
            logo_url = f"https://logo.clearbit.com/{domain}" if domain else ""
            
            # Use existing logo if available
            existing_logo = (row.get("logoUrl") or "").strip()
            if existing_logo:
                logo_url = existing_logo
            
            categories = map_categories(raw_cats, row)
            
            # Ensure description is SEO-worthy (at least 100 chars)
            if len(description) < 100 and tagline:
                description = f"{tagline}. {description}" if description else tagline
            
            product = {
                "title": title,
                "slug": slug,
                "url": url,
                "domain": domain,
                "tagline": tagline if len(tagline) > 2 else description[:150].rstrip('.') + '.',
                "description": description,
                "categories": categories,
                "property_types": infer_property_types(description),
                "deployment": infer_deployment(description),
                "pricing_model": infer_pricing(description),
                "logo_url": logo_url,
                "is_free": row.get("isFree", "").strip().upper() == "TRUE",
                "is_top_rated": row.get("isTopRated", "").strip().upper() == "TRUE",
                "is_verified": row.get("verified", "").strip().upper() == "TRUE",
                "seo_headline": (row.get("SEOHeadline") or "").strip(),
                "seo_description": (row.get("SEODescription") or "").strip(),
            }
            products.append(product)
    
    # Build categories data
    cat_data = {}
    for cat_name, cat_desc in CANONICAL_CATEGORIES.items():
        cat_slug = slugify(cat_name)
        cat_products = [p["slug"] for p in products if cat_name in p["categories"]]
        if cat_products:
            cat_data[cat_slug] = {
                "name": cat_name,
                "slug": cat_slug,
                "description": cat_desc,
                "product_count": len(cat_products),
                "products": cat_products,
            }
    
    # Write outputs
    with open(os.path.join(OUT_DIR, "products.json"), 'w') as f:
        json.dump(products, f, indent=2)
    
    with open(os.path.join(OUT_DIR, "categories.json"), 'w') as f:
        json.dump(cat_data, f, indent=2)
    
    print(f"Processed {len(products)} products into {len(cat_data)} categories")
    
    # Generate sitemap
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    base = "https://sichuanlambda.github.io/cre-directory"
    sitemap += f'  <url><loc>{base}/</loc><priority>1.0</priority></url>\n'
    for p in products:
        sitemap += f'  <url><loc>{base}/product.html#{p["slug"]}</loc><priority>0.8</priority></url>\n'
    for cs in cat_data.values():
        sitemap += f'  <url><loc>{base}/category.html#{cs["slug"]}</loc><priority>0.9</priority></url>\n'
    sitemap += '</urlset>'
    
    root = os.path.dirname(OUT_DIR)
    with open(os.path.join(root, "sitemap.xml"), 'w') as f:
        f.write(sitemap)
    
    with open(os.path.join(root, "robots.txt"), 'w') as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n")
    
    print("Generated sitemap.xml and robots.txt")


if __name__ == "__main__":
    process()
