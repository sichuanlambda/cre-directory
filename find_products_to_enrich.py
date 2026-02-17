#!/usr/bin/env python3

import json
import sys

def find_products_to_enrich():
    with open('data/products.json', 'r') as f:
        products = json.load(f)
    
    print(f"Total products: {len(products)}")
    
    # Find products with index 130+ that need enrichment
    products_to_enrich = []
    
    for i, product in enumerate(products):
        if i >= 130:  # Index 130 and above (0-based indexing)
            # Check if product needs enrichment
            has_enriched = product.get('enriched', False)
            has_enrichment_failed = product.get('enrichment_failed', False)
            
            if not has_enriched and not has_enrichment_failed:
                products_to_enrich.append({
                    'index': i,
                    'title': product['title'],
                    'url': product['url']
                })
    
    print(f"Products from index 130+ that need enrichment: {len(products_to_enrich)}")
    
    for product in products_to_enrich:
        print(f"Index {product['index']}: {product['title']} - {product['url']}")
    
    return products_to_enrich

if __name__ == "__main__":
    find_products_to_enrich()