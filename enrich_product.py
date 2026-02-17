#!/usr/bin/env python3
import json
from datetime import datetime

def update_product(index, updates):
    """Update a product at the given index with enriched data"""
    with open('data/products.json', 'r') as f:
        products = json.load(f)
    
    if index >= len(products):
        print(f"Error: Index {index} out of range. Total products: {len(products)}")
        return
    
    product = products[index]
    print(f"Updating product {index + 1}: {product['title']}")
    
    # Update the product with new data
    for key, value in updates.items():
        product[key] = value
    
    # Mark as enriched
    product['enriched'] = True
    product['enrichedAt'] = datetime.utcnow().isoformat() + 'Z'
    
    # Write back to file
    with open('data/products.json', 'w') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully updated {product['title']}")

if __name__ == "__main__":
    # Example usage
    updates = {
        "description": "Example description",
        "features": ["Feature 1", "Feature 2"],
        "pricing": "Quote-based pricing"
    }
    # update_product(30, updates)  # Product 31