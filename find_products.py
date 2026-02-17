#!/usr/bin/env python3
import json

def find_products():
    with open('data/products.json', 'r') as f:
        products = json.load(f)
    
    print(f"Total products: {len(products)}")
    print("\nProducts 31-80 (indices 30-79):")
    for i in range(30, min(80, len(products))):
        product = products[i]
        enriched = product.get('enriched', False)
        print(f"{i+1:2d}. {product['title']} - {product.get('url', 'No URL')} - Enriched: {enriched}")

if __name__ == "__main__":
    find_products()