// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
import PDFDocument from 'pdfkit';
import axios from 'axios';

// The init() call configures the Actor for its environment
await Actor.init();

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', 
    AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', SEK: 'kr'
};

// Format currency
function formatCurrency(amount, currency = 'USD') {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
}

// Download image as buffer
async function downloadImage(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.log(`Failed to download logo: ${error.message}`);
        return null;
    }
}

// Calculate line item totals
function calculateLineItem(item) {
    const quantity = item.quantity || 1;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    const discount = parseFloat(item.discount) || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = discount;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100;
    const total = subtotalAfterDiscount + taxAmount;
    
    return { subtotal, discountAmount, taxAmount, total };
}

// Generate PDF invoice
async function generateInvoice(invoice) {
    const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        bufferPages: true
    });
    
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });
    
    // Get colors
    const primaryColor = invoice.primaryColor || '#007bff';
    const template = invoice.template || 'modern';
    const currency = invoice.currency || 'USD';
    
    // Modern template with primary color header
    if (template === 'modern') {
        // Header with colored background
        doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
        
        // Logo
        if (invoice.seller?.logoUrl) {
            const logoBuffer = await downloadImage(invoice.seller.logoUrl);
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, 50, 30, { width: 80, height: 60, fit: [80, 60] });
                } catch (e) {
                    console.log('Failed to add logo to PDF');
                }
            }
        }
        
        // Invoice title
        doc.fontSize(32).fillColor('white')
           .text('INVOICE', 400, 50, { align: 'right' });
        
        doc.moveDown(3);
    } else {
        // Classic/Minimal template
        doc.fontSize(28).fillColor(primaryColor)
           .text('INVOICE', 50, 50);
        doc.moveDown(2);
    }
    
    // Reset color
    doc.fillColor('#000000');
    
    // Invoice details
    const startY = template === 'modern' ? 140 : 120;
    doc.fontSize(10);
    
    // Left side - Seller info
    doc.fontSize(12).font('Helvetica-Bold').text('From:', 50, startY);
    doc.fontSize(10).font('Helvetica');
    
    let y = startY + 20;
    if (invoice.seller?.name) {
        doc.font('Helvetica-Bold').text(invoice.seller.name, 50, y);
        y += 15;
    }
    doc.font('Helvetica');
    if (invoice.seller?.address) { doc.text(invoice.seller.address, 50, y); y += 12; }
    if (invoice.seller?.city || invoice.seller?.state || invoice.seller?.zipCode) {
        const location = [invoice.seller.city, invoice.seller.state, invoice.seller.zipCode]
            .filter(Boolean).join(', ');
        doc.text(location, 50, y); y += 12;
    }
    if (invoice.seller?.country) { doc.text(invoice.seller.country, 50, y); y += 12; }
    if (invoice.seller?.email) { doc.text(invoice.seller.email, 50, y); y += 12; }
    if (invoice.seller?.phone) { doc.text(invoice.seller.phone, 50, y); y += 12; }
    if (invoice.seller?.taxId) { doc.text(`Tax ID: ${invoice.seller.taxId}`, 50, y); y += 12; }
    
    // Right side - Invoice info
    doc.fontSize(10);
    const rightX = 350;
    let rightY = startY;
    
    doc.font('Helvetica-Bold').text('Invoice Number:', rightX, rightY);
    doc.font('Helvetica').text(invoice.invoiceNumber || 'N/A', rightX + 100, rightY);
    rightY += 15;
    
    doc.font('Helvetica-Bold').text('Invoice Date:', rightX, rightY);
    doc.font('Helvetica').text(formatDate(invoice.invoiceDate), rightX + 100, rightY);
    rightY += 15;
    
    if (invoice.dueDate) {
        doc.font('Helvetica-Bold').text('Due Date:', rightX, rightY);
        doc.font('Helvetica').text(formatDate(invoice.dueDate), rightX + 100, rightY);
        rightY += 15;
    }
    
    // Client info
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, y + 20);
    doc.fontSize(10).font('Helvetica');
    
    y += 40;
    if (invoice.client?.name) {
        doc.font('Helvetica-Bold').text(invoice.client.name, 50, y);
        y += 15;
    }
    doc.font('Helvetica');
    if (invoice.client?.address) { doc.text(invoice.client.address, 50, y); y += 12; }
    if (invoice.client?.city || invoice.client?.state || invoice.client?.zipCode) {
        const location = [invoice.client.city, invoice.client.state, invoice.client.zipCode]
            .filter(Boolean).join(', ');
        doc.text(location, 50, y); y += 12;
    }
    if (invoice.client?.country) { doc.text(invoice.client.country, 50, y); y += 12; }
    if (invoice.client?.email) { doc.text(invoice.client.email, 50, y); y += 12; }
    if (invoice.client?.phone) { doc.text(invoice.client.phone, 50, y); y += 12; }
    
    // Line items table
    const tableTop = y + 40;
    doc.fontSize(10).font('Helvetica-Bold');
    
    // Table header
    doc.rect(50, tableTop, doc.page.width - 100, 25).fill('#f0f0f0');
    doc.fillColor('#000000');
    doc.text('Description', 60, tableTop + 8);
    doc.text('Qty', 320, tableTop + 8, { width: 40, align: 'right' });
    doc.text('Price', 370, tableTop + 8, { width: 60, align: 'right' });
    doc.text('Tax', 440, tableTop + 8, { width: 40, align: 'right' });
    doc.text('Total', 490, tableTop + 8, { width: 60, align: 'right' });
    
    doc.font('Helvetica');
    let itemY = tableTop + 35;
    let subtotalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    // Line items
    (invoice.lineItems || []).forEach((item, index) => {
        const calc = calculateLineItem(item);
        subtotalAmount += calc.subtotal;
        totalTax += calc.taxAmount;
        totalDiscount += calc.discountAmount;
        
        if (itemY > doc.page.height - 150) {
            doc.addPage();
            itemY = 50;
        }
        
        // Alternate row background
        if (index % 2 === 1) {
            doc.rect(50, itemY - 5, doc.page.width - 100, 25).fill('#fafafa');
            doc.fillColor('#000000');
        }
        
        doc.fontSize(9);
        doc.text(item.description || '', 60, itemY, { width: 250 });
        doc.text((item.quantity || 1).toString(), 320, itemY, { width: 40, align: 'right' });
        doc.text(formatCurrency(parseFloat(item.unitPrice) || 0, currency), 370, itemY, { width: 60, align: 'right' });
        doc.text(`${item.taxRate || 0}%`, 440, itemY, { width: 40, align: 'right' });
        doc.text(formatCurrency(calc.total, currency), 490, itemY, { width: 60, align: 'right' });
        
        itemY += 30;
    });
    
    // Totals section
    itemY += 20;
    doc.fontSize(10);
    const totalsX = 400;
    
    doc.font('Helvetica').text('Subtotal:', totalsX, itemY);
    doc.text(formatCurrency(subtotalAmount, currency), 490, itemY, { width: 60, align: 'right' });
    itemY += 20;
    
    if (totalDiscount > 0) {
        doc.text('Discount:', totalsX, itemY);
        doc.text(`-${formatCurrency(totalDiscount, currency)}`, 490, itemY, { width: 60, align: 'right' });
        itemY += 20;
    }
    
    doc.text('Tax:', totalsX, itemY);
    doc.text(formatCurrency(totalTax, currency), 490, itemY, { width: 60, align: 'right' });
    itemY += 20;
    
    // Grand total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.rect(totalsX - 10, itemY - 5, 170, 30).fill(primaryColor);
    doc.fillColor('white');
    doc.text('TOTAL:', totalsX, itemY + 5);
    doc.text(formatCurrency(subtotalAmount - totalDiscount + totalTax, currency), 490, itemY + 5, { width: 60, align: 'right' });
    doc.fillColor('#000000');
    
    itemY += 50;
    
    // Payment terms and notes
    doc.fontSize(10).font('Helvetica');
    if (invoice.paymentTerms) {
        doc.font('Helvetica-Bold').text('Payment Terms:', 50, itemY);
        doc.font('Helvetica').text(invoice.paymentTerms, 50, itemY + 15);
        itemY += 40;
    }
    
    if (invoice.notes) {
        doc.font('Helvetica-Bold').text('Notes:', 50, itemY);
        doc.font('Helvetica').text(invoice.notes, 50, itemY + 15, { width: 500 });
    }
    
    doc.end();
    return pdfPromise;
}

// Structure of input is defined in input_schema.json
const { invoices = [] } = (await Actor.getInput()) ?? {};

console.log(`Processing ${invoices.length} invoice(s)...`);

const results = [];

for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    console.log(`Generating invoice ${i + 1}/${invoices.length}: ${invoice.invoiceNumber}`);
    
    try {
        // Validate required fields
        if (!invoice.invoiceNumber) throw new Error('Missing invoiceNumber');
        if (!invoice.seller?.name) throw new Error('Missing seller.name');
        if (!invoice.client?.name) throw new Error('Missing client.name');
        if (!invoice.lineItems || invoice.lineItems.length === 0) {
            throw new Error('Missing or empty lineItems');
        }
        
        // Generate PDF
        const pdfBuffer = await generateInvoice(invoice);
        
        // Save to key-value store
        const filename = `invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        await Actor.setValue(filename, pdfBuffer, { contentType: 'application/pdf' });
        
        results.push({
            invoiceNumber: invoice.invoiceNumber,
            filename,
            status: 'success',
            url: `https://api.apify.com/v2/key-value-stores/${process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID}/records/${filename}`
        });
        
        console.log(`✓ Generated: ${filename}`);
    } catch (error) {
        console.error(`✗ Failed to generate invoice ${invoice.invoiceNumber}: ${error.message}`);
        results.push({
            invoiceNumber: invoice.invoiceNumber || 'unknown',
            status: 'error',
            error: error.message
        });
    }
}

// Push results to dataset
await Actor.pushData(results);

const successCount = results.filter(r => r.status === 'success').length;
console.log(`\n✓ Successfully generated ${successCount}/${invoices.length} invoices`);

// Gracefully exit the Actor process
await Actor.exit();