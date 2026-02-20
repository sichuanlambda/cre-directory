#!/usr/bin/env python3
"""Apply enrichments to thin products in products.json"""
import json
import copy

with open('products.json') as f:
    products = json.load(f)

# Build index by title
idx = {p['title']: i for i, p in enumerate(products)}

def enrich(title, updates):
    """Update a product by title with the given dict of fields."""
    i = idx.get(title)
    if i is None:
        print(f"WARNING: {title} not found")
        return
    for k, v in updates.items():
        products[i][k] = v
    print(f"  Enriched: {title}")

def feat(name, desc):
    return {"name": name, "description": desc}

# === ARGUS by Altus Group ===
enrich("Argus by Altus Group", {
    "description": "ARGUS by Altus Group is the industry-standard commercial real estate valuation and asset management software suite, used by investors, lenders, and advisors worldwide. The platform includes ARGUS Intelligence for portfolio performance monitoring, ARGUS Enterprise for property valuation and cash flow forecasting, ARGUS EstateMaster for development feasibility, ARGUS Developer for multi-stage project management, ARGUS Taliance for fund management, and ARGUS ValueInsight for valuation lifecycle management. Recognized across 200+ universities and taught as a core CRE skill, ARGUS provides institutional-grade financial modeling capabilities for commercial property analysis.",
    "feature_groups": [
        {"name": "Valuation & Cash Flow", "features": [
            feat("DCF Analysis", "Discounted cash flow modeling for commercial property valuation with granular lease-level inputs."),
            feat("Cash Flow Forecasting", "Multi-year cash flow projections with market rent growth, expense escalation, and vacancy assumptions."),
            feat("Lease-by-Lease Modeling", "Individual lease modeling with rent steps, options, and tenant-specific terms."),
        ]},
        {"name": "Portfolio & Fund Management", "features": [
            feat("ARGUS Intelligence", "Next-level portfolio performance solution for modeling, monitoring, and managing assets, portfolios, and funds."),
            feat("Fund Modeling (Taliance)", "Real estate fund management software for modeling and managing fund performance and waterfalls."),
            feat("Valuation Management (ValueInsight)", "End-to-end asset valuation lifecycle management platform."),
        ]},
        {"name": "Development Feasibility", "features": [
            feat("Development Feasibility (EstateMaster)", "Property development feasibility and management for complex development projects."),
            feat("Multi-Stage Projects (Developer)", "Manage complex, multi-stage development projects with detailed cost and revenue modeling."),
        ]},
        {"name": "Reporting & Collaboration", "features": [
            feat("Standardized Reporting", "Industry-standard output formats recognized by institutional investors and lenders."),
            feat("Training & Certification", "Comprehensive training courses and certification programs for CRE professionals."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": None,
        "billing_options": ["Annual"],
        "free_trial": False,
        "free_tier": False,
        "plans": [{"name": "Enterprise", "price": "Contact for pricing", "description": "Custom pricing based on modules and seat count."}]
    },
    "pros": [
        "Industry-standard software recognized by institutional investors and lenders",
        "Taught in 200+ universities, making trained users widely available",
        "Comprehensive suite covering valuation, development, and fund management",
        "Granular lease-level modeling with sophisticated DCF analysis",
    ],
    "cons": [
        "Steep learning curve for new users unfamiliar with DCF modeling",
        "Enterprise pricing puts it out of reach for small firms",
        "Legacy desktop components (Enterprise) being migrated to cloud-based Intelligence",
        "Complex licensing structure across multiple product modules",
    ],
})

# === HqO ===
enrich("HqO", {
    "description": "HqO is a commercial real estate experience platform that helps landlords and property operators bridge the gap between rising tenant expectations and building operations. The platform serves as a CRM purpose-built for CRE, unifying portfolio management with tenant engagement, building operations, leasing, and vendor management. HqO's Real Estate Experience (REX) platform includes an Intelligence Suite powered by AI for portfolio analytics, an Experience Suite for amenity booking and access management, a Tenant Suite for space discovery and lease management, an Operations Suite for cloud-native building management, and a Leasing Suite for marketing and tenant acquisition. Used by major office landlords globally to drive retention and asset performance.",
    "feature_groups": [
        {"name": "Tenant Experience", "features": [
            feat("Tenant App", "White-labeled mobile app for tenants to access building amenities, services, and communications."),
            feat("Amenity Booking", "Online booking system for conference rooms, fitness centers, and shared spaces."),
            feat("Access Management", "Digital access control integrated with building security systems."),
            feat("Community Engagement", "Events, perks, and content to foster tenant community and satisfaction."),
        ]},
        {"name": "Intelligence & Analytics", "features": [
            feat("AI-Powered Analytics", "Portfolio-wide visibility across operations, leasing, experience, and engagement metrics."),
            feat("Tenant Satisfaction Scoring", "Data-driven measurement of tenant experience and satisfaction trends."),
            feat("Benchmarking", "Compare building performance across your portfolio and against market standards."),
        ]},
        {"name": "Building Operations", "features": [
            feat("Cloud-Native BMS", "Vertically-integrated, cloud-native building management system with real-time insights."),
            feat("Work Order Management", "Streamlined maintenance request handling from submission to resolution."),
            feat("System Integration", "Seamless integration with existing building systems and property management software."),
        ]},
        {"name": "Leasing & Marketing", "features": [
            feat("Digital Leasing Tools", "Accelerate leasing with enhanced visibility and tenant engagement tools."),
            feat("Vendor Management", "Connected ecosystem for vendor discovery, compliance, contracting, and billing."),
        ]},
    ],
    "pricing": {
        "model": "Quote-based",
        "starting_price": None,
        "billing_options": ["Annual"],
        "free_trial": False,
        "free_tier": False,
        "plans": [{"name": "Enterprise", "price": "Contact for pricing", "description": "Custom pricing based on portfolio size and modules selected."}]
    },
    "pros": [
        "Purpose-built CRM for commercial real estate with unified portfolio view",
        "Comprehensive platform covering tenant experience, operations, and leasing",
        "AI-powered analytics for data-driven portfolio decisions",
        "Strong tenant engagement tools that improve retention rates",
    ],
    "cons": [
        "Enterprise pricing may be prohibitive for smaller landlords",
        "Requires significant onboarding to fully integrate with existing building systems",
        "Best suited for Class A office buildings; less relevant for industrial or retail",
        "Feature set may be overwhelming for single-building operators",
    ],
})

# === Envoy Technologies ===
enrich("Envoy Technologies", {
    "description": "Envoy is an electric car-sharing platform designed as an amenity for multifamily, commercial, and hospitality properties. The service provides on-demand electric vehicles stationed at properties, offering residents, guests, and employees sustainable transportation without the need for personal car ownership. Property owners benefit from increased occupancy appeal, reduced parking demand, and a modern sustainability amenity. Envoy handles all vehicle management, maintenance, insurance, and charging infrastructure, making it a turnkey mobility solution. The platform serves 600+ properties and is positioned as a differentiator for properties competing for environmentally conscious tenants.",
    "feature_groups": [
        {"name": "Vehicle & Fleet Management", "features": [
            feat("Electric Vehicle Fleet", "On-site electric vehicles available for resident and tenant use on demand."),
            feat("Charging Infrastructure", "EV charging stations installed and maintained at the property."),
            feat("Vehicle Maintenance", "Full-service maintenance, cleaning, and insurance coverage included."),
        ]},
        {"name": "Booking & Access", "features": [
            feat("Mobile App Booking", "Residents book vehicles through a mobile app with real-time availability."),
            feat("Keyless Access", "Digital vehicle access without physical keys or fobs."),
            feat("Flexible Scheduling", "Hourly and daily booking options to match usage needs."),
        ]},
        {"name": "Property Integration", "features": [
            feat("Amenity Positioning", "Marketed as a premium property amenity to attract and retain tenants."),
            feat("Parking Optimization", "Reduces overall parking demand by replacing personal vehicle needs."),
            feat("Sustainability Reporting", "Carbon offset tracking and environmental impact reporting for ESG compliance."),
        ]},
    ],
    "pricing": {
        "model": "Partnership",
        "starting_price": None,
        "billing_options": [],
        "free_trial": False,
        "free_tier": False,
        "plans": [{"name": "Property Partnership", "price": "Contact for pricing", "description": "Custom partnership model based on property size and vehicle count."}]
    },
    "pros": [
        "Turnkey solution with no vehicle management burden on property operators",
        "Strong differentiator for attracting environmentally conscious tenants",
        "Reduces parking demand and associated infrastructure costs",
        "Full insurance, maintenance, and charging included",
    ],
    "cons": [
        "Limited to markets where Envoy operates; not available nationwide",
        "Requires dedicated parking spaces for EV fleet",
        "Usage dependent on tenant adoption; underutilization possible at some properties",
        "Not a standalone tech product; more of a managed service",
    ],
})

# === Fifth Wall ===
enrich("Fifth Wall", {
    "description": "Fifth Wall is the largest venture capital and growth equity firm focused on technology for the built world. Founded in 2016, the firm invests at the intersection of real estate and technology, partnering with over 110 of the largest real estate owner-operators across 20+ countries and every major asset class. Fifth Wall's portfolio includes 150+ category-leading proptech startups, with over $107 billion in enterprise value created and $1.9 billion raised across portfolio companies. The firm's model connects real estate corporations with cutting-edge technology companies, enabling strategic partnerships, distribution deals, and contracts that accelerate portfolio company growth while giving real estate LPs access to innovation. Fifth Wall focuses on making the built world more efficient and resilient.",
    "feature_groups": [
        {"name": "Investment Strategy", "features": [
            feat("Venture Capital", "Early-stage and growth equity investments in proptech and built world technology startups."),
            feat("Climate Technology", "Dedicated investment focus on sustainability and climate tech for real estate."),
            feat("Global Coverage", "Investment activity spanning 20+ countries across all major real estate asset classes."),
        ]},
        {"name": "Strategic Network", "features": [
            feat("Corporate LP Network", "110+ strategic limited partners including the world's largest real estate owner-operators."),
            feat("Industry Introductions", "900+ industry introductions annually connecting portfolio companies with potential customers."),
            feat("Distribution Acceleration", "Structured partnerships and contracts that rapidly scale portfolio company adoption."),
        ]},
        {"name": "Portfolio Support", "features": [
            feat("Go-to-Market Support", "Strategic guidance and customer introductions to accelerate commercial traction."),
            feat("Follow-On Investment", "Multi-stage investment support as portfolio companies scale."),
            feat("Diversity Focus", "40% diversity rate among portfolio company founders."),
        ]},
    ],
    "pricing": {
        "model": "Not applicable",
        "starting_price": None,
        "billing_options": [],
        "free_trial": False,
        "free_tier": False,
        "plans": []
    },
    "pros": [
        "Largest and most connected proptech-focused VC firm globally",
        "Unmatched distribution network through 110+ real estate owner-operator LPs",
        "Track record of $107B+ in portfolio company enterprise value",
        "900+ industry introductions per year accelerate go-to-market",
    ],
    "cons": [
        "Not a software product; investment firm without direct technology offering",
        "Portfolio companies must compete for attention within a 150+ company portfolio",
        "LP-driven model may bias investment toward solutions for large institutional owners",
        "Limited relevance for small and mid-size CRE firms seeking technology tools",
    ],
})

# === SmartRent ===
enrich("SmartRent", {
    "description": "SmartRent is a smart home and building automation platform designed for multifamily communities and rental properties. The platform connects cloud-based enterprise software with IoT hardware to provide smart apartments, access control, self-guided tours, community WiFi, parking management, work management, and answer automation. SmartRent serves 600+ clients across 1.3 million rental homes with 3.5 million connected devices. The system integrates with most property management and CRM tools, allowing operators to select from compatible smart home hardware from major manufacturers. SmartRent helps property operators reduce costs, boost revenue through $30-60 in added value per unit per month, and simplify workflows while offering residents a modern living experience.",
    "feature_groups": [
        {"name": "Smart Home", "features": [
            feat("Smart Apartments", "Connected smart locks, thermostats, lights, and leak sensors for individual units."),
            feat("Resident App", "Mobile app for residents to control smart home devices and access building features."),
            feat("Hardware Flexibility", "Compatible with devices from multiple major smart home hardware manufacturers."),
        ]},
        {"name": "Access & Security", "features": [
            feat("Cloud-Based Access Control", "Centralized access management for buildings, amenities, and common areas."),
            feat("Self-Guided Tours", "Automated leasing process allowing prospects to tour units independently."),
            feat("Parking Management", "Smart parking solutions to monetize empty spaces and manage access."),
        ]},
        {"name": "Operations", "features": [
            feat("Work Management", "Mobile maintenance platform for efficient work order handling."),
            feat("Answer Automation", "Automated call-handling to save leasing team time and resources."),
            feat("Community WiFi", "Managed WiFi infrastructure for reliable property-wide connectivity."),
        ]},
        {"name": "Integration & Analytics", "features": [
            feat("PMS Integration", "Seamless integration with major property management software platforms."),
            feat("IoT Device Management", "Centralized management of 3.5M+ connected devices across properties."),
            feat("NOI Analytics", "Data views and analyses to maximize net operating income."),
        ]},
    ],
    "pricing": {
        "model": "Quote-based",
        "starting_price": None,
        "billing_options": [],
        "free_trial": False,
        "free_tier": False,
        "plans": [{"name": "Enterprise", "price": "Contact for pricing", "description": "Custom pricing based on unit count and selected modules."}]
    },
    "pros": [
        "End-to-end smart home platform covering hardware and software",
        "Proven scale with 600+ clients and 3.5M connected devices",
        "Hardware-agnostic approach allows flexibility in device selection",
        "$30-60/unit/month added value demonstrated by customers",
    ],
    "cons": [
        "Primarily focused on multifamily; limited commercial office features",
        "Hardware installation requires upfront capital investment per unit",
        "IoT device reliability depends on property WiFi infrastructure",
        "Publicly traded company (NYSE: SMRT) has faced revenue growth challenges",
    ],
})

# === VTS ===
enrich("VTS", {
    "description": "VTS is the commercial real estate industry's leading leasing, asset management, and tenant experience platform. The platform provides landlords, brokers, and tenants with tools to manage the entire CRE lifecycle across office, retail, industrial, and multifamily assets. VTS Lease handles deal pipeline management and portfolio analytics, VTS Market provides listing and marketing tools, VTS Data offers market intelligence powered by 57B+ square feet of deal data, and VTS Activate delivers tenant and resident experience apps. The platform recently launched VTS AI with Proposal AI (creating proposals 93% faster), VTS Analyst for instant market insights, Work Order AI for automated service requests, and Asset Intelligence for AI-powered lease abstraction. VTS integrates with major CRE technology platforms and serves the largest landlords globally.",
    "feature_groups": [
        {"name": "Leasing & Deal Management", "features": [
            feat("VTS Lease", "End-to-end deal pipeline management from prospect to signed lease."),
            feat("Proposal AI", "AI-powered proposal generation that creates proposals 93% faster."),
            feat("VTS Market", "Listing and marketing platform to promote available spaces."),
            feat("Deal Analytics", "Pipeline analytics and forecasting for leasing teams."),
        ]},
        {"name": "Market Intelligence", "features": [
            feat("VTS Data", "Market analytics powered by 57B+ square feet of real deal data."),
            feat("VTS Analyst", "AI assistant providing instant answers to office market questions."),
            feat("Office Demand Index (VODI)", "Industry's most accurate demand data tracking tenant activity."),
        ]},
        {"name": "Tenant & Resident Experience", "features": [
            feat("Activate Office", "Tenant experience app for office buildings with amenity booking and access."),
            feat("Activate Workplace", "Workplace experience tools for corporate occupiers."),
            feat("Activate Multifamily", "Resident experience platform for multifamily communities."),
        ]},
        {"name": "Asset Management", "features": [
            feat("Portfolio Dashboard", "Centralized view of asset performance across the entire portfolio."),
            feat("Asset Intelligence", "AI-powered lease abstraction and document analysis."),
            feat("Work Order AI", "Automatically converts tenant emails and texts into work orders."),
        ]},
        {"name": "Integration & Platform", "features": [
            feat("CRE Integrations", "Integrations with major property management and accounting platforms."),
            feat("VTS Marketplace", "Ecosystem of third-party apps and services."),
            feat("VTS Certification", "Training and certification programs for platform users."),
        ]},
    ],
    "pros": [
        "Industry-leading platform used by the largest CRE landlords globally",
        "AI features (Proposal AI, Analyst, Work Order AI) deliver measurable productivity gains",
        "57B+ SF of deal data provides unmatched market intelligence",
        "Comprehensive coverage across office, retail, industrial, and multifamily",
    ],
    "cons": [
        "Enterprise pricing is prohibitive for small landlords and brokers",
        "Primarily designed for institutional landlords; less suited for tenant-rep brokers",
        "Multiple product modules can create complexity in implementation",
        "Some features (like VTS Data) are most valuable in major metro markets",
    ],
})

# === Yardi ===
enrich("Yardi", {
    "description": "Yardi is the largest property management and real estate technology company, providing an AI-enabled platform that covers property management, asset management, investment management, and tenant services across every real estate sector. The Voyager Suite is the core web-based platform for operations, leasing, analytics, and services. Yardi Breeze offers a simplified property management solution for smaller portfolios. The Investment Suite manages the full investment lifecycle, while the Energy Suite handles sustainability and cost recovery. Additional products include Procure to Pay for paperless procurement and Aspire for employee training. Yardi serves multifamily, commercial, affordable housing, PHA, senior living, and coworking/flex space markets, making it the most comprehensive single-stack real estate software available.",
    "feature_groups": [
        {"name": "Property Management", "features": [
            feat("Voyager Suite", "Enterprise web-based platform for operations, leasing, analytics, and services."),
            feat("Yardi Breeze", "Simplified property management for residential, commercial, affordable, self storage, and associations."),
            feat("Tenant Services", "Online portals for rent payments, maintenance requests, and communications."),
            feat("Lease Management", "Full lease lifecycle management with automated renewals and escalations."),
        ]},
        {"name": "Accounting & Finance", "features": [
            feat("General Ledger", "Full accounting suite with GL, AP, AR, and financial reporting."),
            feat("Procure to Pay", "End-to-end paperless procurement and invoice processing."),
            feat("Budget Management", "Portfolio-wide budgeting and variance analysis tools."),
            feat("CAM Reconciliation", "Automated common area maintenance reconciliation and billing."),
        ]},
        {"name": "Investment Management", "features": [
            feat("Investment Suite", "Complete investment lifecycle management from fundraising to disposition."),
            feat("Investor Portal", "Self-service portal for investor reporting and document access."),
            feat("Fund Accounting", "Specialized fund-level accounting and waterfall calculations."),
        ]},
        {"name": "AI & Analytics", "features": [
            feat("Yardi Virtuoso", "AI platform for transforming workflows and scaling operations across portfolios."),
            feat("Business Intelligence", "Advanced analytics and reporting across all property types."),
            feat("Market Analytics", "Market-level data and benchmarking for investment decisions."),
        ]},
        {"name": "Energy & Sustainability", "features": [
            feat("Energy Suite", "Utility management, cost recovery, and sustainability tracking."),
            feat("Resident Billing", "Automated utility billing and submetering for residents."),
            feat("ESG Reporting", "Environmental and sustainability reporting for compliance and investors."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": "$1/unit/month",
        "billing_options": ["Monthly", "Annual"],
        "free_trial": False,
        "free_tier": False,
        "plans": [
            {"name": "Yardi Breeze", "price": "From $1/unit/month", "description": "Simplified property management for smaller portfolios."},
            {"name": "Yardi Breeze Premier", "price": "From $2/unit/month", "description": "Enhanced features including job costing, custom reports, and more."},
            {"name": "Voyager", "price": "Contact for pricing", "description": "Enterprise platform for large, complex portfolios."},
        ]
    },
    "pros": [
        "Most comprehensive single-stack real estate platform covering all property types",
        "Serves every market segment from small landlords (Breeze) to institutional (Voyager)",
        "40+ years of industry experience with continuous platform investment",
        "AI-enabled features through Yardi Virtuoso across the platform",
        "Massive integration ecosystem and industry adoption",
    ],
    "cons": [
        "Voyager implementation is complex and expensive for mid-market firms",
        "User interface can feel dated compared to newer proptech competitors",
        "Customer support quality varies by region and product tier",
        "Contract lock-in with long-term agreements common for enterprise tier",
        "Breeze has limited customization compared to Voyager",
    ],
})

# === Matterport ===
enrich("Matterport", {
    "description": "Matterport is the leading spatial data platform for creating, managing, and sharing digital twins of physical spaces. The technology captures 3D scans of buildings and converts them into immersive virtual walkthroughs, floor plans, and measurement tools used across real estate, construction, facilities management, and insurance. For commercial real estate, Matterport enables remote property tours that increase buyer and seller confidence, digital twin-based facilities management for smarter operations, and construction documentation to keep projects on time and budget. The platform works with various 3D cameras as well as smartphone-based capture, making it accessible for both professional service providers and individual property managers.",
    "feature_groups": [
        {"name": "3D Capture & Digital Twins", "features": [
            feat("3D Space Capture", "Create photorealistic digital twins using 3D cameras or smartphones."),
            feat("Virtual Walkthroughs", "Immersive dollhouse and guided tour views of captured spaces."),
            feat("Schematic Floor Plans", "Automatically generated 2D floor plans from 3D scans."),
            feat("Measurement Tools", "Take accurate measurements directly within the digital twin."),
        ]},
        {"name": "Property Marketing", "features": [
            feat("Virtual Tours", "Embeddable 3D tours for property listings and marketing materials."),
            feat("Media Hosting", "Cloud hosting for 3D models with shareable links and embed codes."),
            feat("MLS Integration", "Publish virtual tours directly to real estate listing platforms."),
        ]},
        {"name": "Facilities & Construction", "features": [
            feat("Digital Twin Operations", "Use 3D models for facilities management, space planning, and maintenance."),
            feat("Construction Documentation", "Capture progress photos and 3D scans for construction oversight."),
            feat("BIM Integration", "Connect digital twins with building information modeling workflows."),
        ]},
        {"name": "Platform & API", "features": [
            feat("Matterport SDK", "Developer tools for building custom applications on top of spatial data."),
            feat("Cloud Processing", "Automated cloud-based processing of 3D scans into navigable models."),
            feat("Enterprise Management", "Portfolio-level management of digital twins across multiple properties."),
        ]},
    ],
    "pricing": {
        "model": "Freemium",
        "starting_price": "Free",
        "billing_options": ["Monthly", "Annual"],
        "free_trial": True,
        "free_tier": True,
        "plans": [
            {"name": "Free", "price": "Free", "description": "1 active space with basic features."},
            {"name": "Starter", "price": "Contact for pricing", "description": "Multiple spaces with enhanced features."},
            {"name": "Professional", "price": "Contact for pricing", "description": "Advanced features for real estate professionals."},
            {"name": "Enterprise", "price": "Contact for pricing", "description": "Custom solution for large organizations."},
        ]
    },
    "pros": [
        "Industry-leading 3D capture quality with photorealistic digital twins",
        "Free tier available for getting started",
        "Works with smartphone cameras, lowering barrier to entry",
        "Strong adoption across real estate, construction, and facilities management",
    ],
    "cons": [
        "Best results require dedicated Matterport or Leica 3D cameras ($2,000+)",
        "Cloud-dependent; requires internet for processing and viewing",
        "Per-space pricing can add up for large portfolios",
        "Limited offline capabilities for captured models",
    ],
})

# === MetaProp ===
enrich("MetaProp", {
    "description": "MetaProp is one of the most active venture capital and growth equity firms focused on technology for the built world. The firm invests in proptech startups across all stages, from early-stage venture to growth equity, and has made over 150 investments. MetaProp's portfolio companies have raised $1.9 billion in aggregate and created over $107 billion in enterprise value. The firm maintains a 40% diversity rate among portfolio company founders and facilitates 900+ industry introductions annually. MetaProp operates at the intersection of real estate and technology, helping portfolio companies accelerate growth through strategic introductions to real estate owners, operators, and industry leaders.",
    "feature_groups": [
        {"name": "Investment Activity", "features": [
            feat("Venture Capital", "Early-stage investments in proptech and built world technology startups."),
            feat("Growth Equity", "Later-stage investments to help scaling proptech companies expand."),
            feat("Multi-Stage Follow-On", "Continued investment across multiple funding rounds."),
        ]},
        {"name": "Portfolio Support", "features": [
            feat("Industry Introductions", "900+ industry introductions annually connecting startups with real estate leaders."),
            feat("Go-to-Market Acceleration", "Strategic guidance to help portfolio companies reach commercial traction."),
            feat("Credibility Building", "Investor backing that helps early companies establish industry credibility."),
        ]},
        {"name": "Market Intelligence", "features": [
            feat("Proptech Research", "Deep expertise in proptech market trends and opportunities."),
            feat("Industry Network", "Relationships with major real estate owners, operators, and developers."),
        ]},
    ],
    "pricing": {
        "model": "Not applicable",
        "starting_price": None,
        "billing_options": [],
        "free_trial": False,
        "free_tier": False,
        "plans": []
    },
    "pros": [
        "One of the most active and well-connected proptech VC firms",
        "150+ investments provide deep proptech market knowledge",
        "900+ annual industry introductions accelerate portfolio company growth",
        "Strong diversity commitment with 40% diverse founders",
    ],
    "cons": [
        "Not a software product; venture capital firm without direct technology offering",
        "Portfolio companies compete for attention within a large portfolio",
        "Investment focus may not benefit CRE firms looking for software solutions",
        "Limited public information on fund performance and returns",
    ],
})

# === AppFolio ===
enrich("AppFolio", {
    "description": "AppFolio is a cloud-based property management and investment management platform built with native agentic AI at its core. The AppFolio Performance Platform unifies property operations, accounting, leasing, maintenance, and investor management into a single system. Unlike traditional property management software focused purely on efficiency, AppFolio targets performance outcomes through AI-powered workflow automation (Realm-X Flows), unified data across property and investment management, and revenue-generating resident services. The platform serves property managers from 400 to 14,000+ units and has expanded to include investment management capabilities for capital raisers and fund operators seeking a single system for both property and portfolio operations.",
    "feature_groups": [
        {"name": "Property Management", "features": [
            feat("Leasing & Marketing", "Online listing syndication, lead tracking, and application processing."),
            feat("Rent Collection", "Online rent payments with automated late fee assessment and bank integration."),
            feat("Maintenance Management", "Work order tracking with vendor coordination and resident communication."),
            feat("Resident Portal", "Self-service portal for residents to pay rent, submit requests, and communicate."),
        ]},
        {"name": "Accounting & Finance", "features": [
            feat("Full Accounting Suite", "General ledger, accounts payable/receivable, and bank reconciliation."),
            feat("Financial Reporting", "Standard and custom financial reports for owners and investors."),
            feat("1099 eFiling", "Automated year-end tax filing for vendors and owners."),
        ]},
        {"name": "AI & Automation", "features": [
            feat("Agentic AI", "Native AI that handles busywork and surfaces insights proactively."),
            feat("Realm-X Flows", "Workflow automation engine that standardizes processes and guides teams."),
            feat("Smart Maintenance", "AI-assisted maintenance triage and vendor assignment."),
        ]},
        {"name": "Investment Management", "features": [
            feat("Investor Portal", "Self-service portal for investor reporting, documents, and distributions."),
            feat("Fund Management", "Capital raise tracking, waterfall calculations, and fund accounting."),
            feat("Unified Data", "Single system connecting property operations with investment performance."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": None,
        "billing_options": ["Monthly"],
        "free_trial": False,
        "free_tier": False,
        "plans": [
            {"name": "Core", "price": "Contact for pricing", "description": "Essential property management features."},
            {"name": "Plus", "price": "Contact for pricing", "description": "Advanced features with AI and automation."},
            {"name": "Max", "price": "Contact for pricing", "description": "Full platform with investment management."},
        ]
    },
    "pros": [
        "Native AI integration throughout the platform, not bolted on",
        "Unified property and investment management in a single system",
        "Modern, intuitive interface compared to legacy competitors",
        "Strong mobile experience for on-the-go property management",
    ],
    "cons": [
        "Less customizable than enterprise platforms like Yardi Voyager",
        "Pricing not publicly disclosed; requires demo to learn costs",
        "Investment management module is newer and less mature than dedicated tools",
        "Limited commercial property features compared to residential focus",
    ],
})

# === LightBox ===
enrich("LightBox", {
    "description": "LightBox is a commercial real estate data and analytics platform that provides connected property data, CRE workflows, and industry connections. The platform aggregates the most comprehensive set of property characteristics, tax parcels, building footprints, spatial data, and environmental data to help CRE professionals locate, analyze, and act on property information. LightBox's product suite includes ClientLook CRM for broker relationship management, Vision for property data and location intelligence, Real Capital Markets for investment sales marketing, PARCEL for environmental data, and Valuation for appraisal management. The platform serves brokers, appraisers, investors, lenders, environmental consultants, and government agencies across the commercial real estate industry.",
    "feature_groups": [
        {"name": "Property Data & Intelligence", "features": [
            feat("Property Database", "Comprehensive commercial property characteristics, tax, and ownership data."),
            feat("Location Intelligence (Vision)", "Spatial and environmental data with mapping and analytics tools."),
            feat("Parcel Data", "Tax parcel boundaries, building footprints, and zoning information."),
            feat("Environmental Data (PARCEL)", "Environmental site assessment data for due diligence and compliance."),
        ]},
        {"name": "CRM & Brokerage", "features": [
            feat("ClientLook CRM", "CRM purpose-built for commercial real estate brokers with deal and contact tracking."),
            feat("Property Marketing", "Marketing materials and listing distribution tools for commercial properties."),
            feat("Deal Pipeline", "Track deals from prospect to close with integrated property data."),
        ]},
        {"name": "Investment Sales", "features": [
            feat("Real Capital Markets", "Online platform for marketing and distributing investment sales offerings."),
            feat("Buyer Database", "Extensive database of qualified CRE buyers and investors."),
            feat("Offering Memorandums", "Professional-quality teasers and offering documents."),
        ]},
        {"name": "Valuation & Appraisal", "features": [
            feat("Valuation Software", "Excel-to-Word based appraisal process connected to online database."),
            feat("Comp Analysis", "Comparable sales and lease data for property valuation."),
            feat("Report Generation", "Streamlined appraisal report generation saving 4-5 hours per report."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": None,
        "billing_options": ["Monthly", "Annual"],
        "free_trial": True,
        "free_tier": False,
        "plans": [
            {"name": "Individual", "price": "Contact for pricing", "description": "Single-user access to selected LightBox products."},
            {"name": "Enterprise", "price": "Contact for pricing", "description": "Multi-user licenses with full product suite access."},
        ]
    },
    "pros": [
        "Most comprehensive connected CRE data platform combining multiple data sources",
        "Purpose-built tools for different CRE roles (brokers, appraisers, investors)",
        "Strong environmental data capabilities for due diligence",
        "ClientLook CRM well-regarded by commercial brokers",
    ],
    "cons": [
        "Product suite assembled through acquisitions; integration can feel fragmented",
        "Pricing is opaque and varies significantly by product combination",
        "Some acquired products (like ClientLook) have smaller user bases",
        "Environmental data features may overlap with specialized environmental firms",
    ],
})

# === PropertyMetrics ===
enrich("Property Metrics", {
    "description": "PropertyMetrics is a web-based commercial real estate analysis and marketing platform offering proforma software, brochure publishing tools, and on-demand educational courses. The proforma software enables users to build and share commercial real estate valuations online using discounted cash flow analysis, handling complex leases, reimbursements, and development costs through a clean interface. Unlike enterprise tools like ARGUS, PropertyMetrics is designed to be simple, affordable, and 100% web-based with no desktop installation required. The Publisher tool creates presentation-quality brochures, offering memos, flyers, market reports, and development proposals. The platform also offers CRE analysis courses taught by seasoned professionals for industry newcomers and experienced practitioners.",
    "feature_groups": [
        {"name": "Financial Analysis", "features": [
            feat("DCF Proforma Builder", "Web-based discounted cash flow analysis with multi-tenant modeling."),
            feat("Complex Lease Modeling", "Handle rent escalations, percentage rent, and tenant improvement allowances."),
            feat("Reimbursement Calculations", "CAM, tax, and insurance reimbursement modeling."),
            feat("Development Pro Forma", "Development cost modeling with construction timelines and absorption."),
        ]},
        {"name": "Marketing & Publishing", "features": [
            feat("Brochure Builder", "Create professional commercial real estate brochures and flyers online."),
            feat("Offering Memorandums", "Generate investment offering memorandums from deal data."),
            feat("Market Reports", "Publish market reports and case studies with professional templates."),
        ]},
        {"name": "Education", "features": [
            feat("On-Demand Courses", "Self-paced commercial real estate analysis courses taught by professionals."),
            feat("Industry Resources", "Blog articles and guides covering CRE analysis concepts and techniques."),
        ]},
        {"name": "Collaboration", "features": [
            feat("Online Sharing", "Share live proforma models with team members via web links."),
            feat("Version Control", "Single source of truth eliminates email attachments and version conflicts."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": None,
        "billing_options": ["Monthly", "Annual"],
        "free_trial": True,
        "free_tier": False,
        "plans": [
            {"name": "Proforma", "price": "Contact for pricing", "description": "Web-based CRE valuation and analysis software."},
            {"name": "Publisher", "price": "Contact for pricing", "description": "Commercial real estate brochure and marketing tool."},
        ]
    },
    "pros": [
        "Much simpler and more affordable than ARGUS for basic CRE analysis",
        "100% web-based with no installation or desktop software required",
        "Excellent educational content for learning CRE financial analysis",
        "Clean interface suitable for both beginners and experienced analysts",
    ],
    "cons": [
        "Lacks the depth and institutional acceptance of ARGUS Enterprise",
        "Limited integration with other CRE platforms and data sources",
        "Not suitable for complex institutional portfolio analysis",
        "Publisher templates may not match custom branding requirements",
    ],
})

# === Reonomy ===
enrich("Reonomy", {
    "description": "Reonomy is a commercial real estate property intelligence platform that combines exclusive data partnerships with machine learning to deliver connected property, ownership, and market data. The platform aggregates data from industry-leading providers of title and assessor records, geospatial data, demographic information, and more, creating a comprehensive property database for commercial real estate professionals. Users can search properties, identify ownership structures, uncover off-market opportunities, and analyze market trends. Reonomy's machine learning technology links disparate data sources to provide a unified view of commercial properties, their owners, and transaction history across the United States. The platform serves brokers, investors, lenders, and other CRE professionals who need accurate property and ownership intelligence.",
    "feature_groups": [
        {"name": "Property Data", "features": [
            feat("Property Search", "Search and filter commercial properties by location, type, size, and characteristics."),
            feat("Ownership Intelligence", "Identify true property owners through LLC structures and corporate hierarchies."),
            feat("Transaction History", "Historical sales data, deed transfers, and mortgage records."),
            feat("Property Details", "Building characteristics, tax assessments, zoning, and parcel data."),
        ]},
        {"name": "Market Intelligence", "features": [
            feat("Demographic Data", "Census, population, income, and consumer data overlaid on property maps."),
            feat("Geospatial Analytics", "Location-based analysis with mapping and spatial data tools."),
            feat("Market Trends", "Analyze pricing trends, cap rates, and market activity by geography."),
        ]},
        {"name": "Prospecting & Outreach", "features": [
            feat("Owner Contact Information", "Phone numbers, emails, and mailing addresses for property owners."),
            feat("Lead Lists", "Build targeted prospect lists based on property and owner criteria."),
            feat("Off-Market Discovery", "Identify properties not actively listed but potentially available."),
        ]},
    ],
    "pricing": {
        "model": "Subscription",
        "starting_price": None,
        "billing_options": ["Annual"],
        "free_trial": True,
        "free_tier": False,
        "plans": [
            {"name": "Professional", "price": "Contact for pricing", "description": "Individual access to property data and prospecting tools."},
            {"name": "Enterprise", "price": "Contact for pricing", "description": "Team access with API and advanced analytics."},
        ]
    },
    "pros": [
        "Strong ownership intelligence that pierces LLC structures",
        "Machine learning links disparate data sources for unified property views",
        "Free trial available to evaluate the platform",
        "Extensive data partnerships provide broad coverage",
    ],
    "cons": [
        "Pricing is not publicly disclosed and reportedly expensive",
        "Data accuracy varies by market and property type",
        "US-only coverage limits international use",
        "Contact information for owners can be outdated",
    ],
})

# Save
with open('products.json', 'w') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)
print("\nDone! Saved products.json")
