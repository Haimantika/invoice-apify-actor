# Professional Invoice Generator

Generate professional PDF invoices automatically from structured data. Perfect for businesses, freelancers, and consultants.

## What it does

Converts invoice data (JSON) into professional PDF invoices with:
- Automated tax and discount calculations
- Multi-currency support (USD, EUR, GBP, etc.)
- Customizable templates and branding
- Batch processing for multiple invoices

## How to use

1. **Input**: Provide invoice data in JSON format
2. **Run**: Execute the Actor
3. **Output**: Download PDF invoices from Key-Value Store

### Quick example

Input a JSON object with an `invoices` array:

```json
{
  "invoices": [
    {
      "invoiceNumber": "INV-001",
      "seller": { "name": "Your Company" },
      "client": { "name": "Client Name" },
      "lineItems": [
        {
          "description": "Web Development",
          "quantity": 10,
          "unitPrice": 100,
          "taxRate": 10
        }
      ]
    }
  ]
}
```

## Output

- **PDF invoices** saved to Key-Value Store as `invoice_{number}.pdf`
- **Invoice metadata** saved to Dataset

## Required fields

- `invoiceNumber` - Unique identifier
- `seller.name` - Your business name
- `client.name` - Customer name
- `lineItems` - Array with description, quantity, unitPrice

## Optional fields

- `currency` - USD, EUR, GBP, etc. (default: USD)
- `template` - "modern", "classic", "minimal"
- `primaryColor` - Brand color (hex code)
- Complete seller/client addresses, dates, payment terms, notes

See `INPUT.example.json` for a complete example.