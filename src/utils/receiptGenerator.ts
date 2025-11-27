export interface ReceiptData {
  orderNumber: string;
  shopName: string;
  shopDescription?: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  isPayLater?: boolean;
  multiPayments?: Array<{ method: string; amount: number }>;
}

export const generateReceipt = (data: ReceiptData) => {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${data.orderNumber}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 10mm;
      }
      .no-print {
        display: none;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 20px;
      max-width: 300px;
      margin: 0 auto;
    }
    .receipt {
      background: white;
      padding: 20px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .shop-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .shop-description {
      font-size: 10px;
      color: #666;
      margin-bottom: 10px;
    }
    .order-info {
      margin-bottom: 15px;
      font-size: 11px;
    }
    .order-info div {
      margin-bottom: 3px;
    }
    .order-number {
      font-weight: bold;
      font-size: 13px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 15px 0;
    }
    .items {
      margin-bottom: 15px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .item-name {
      flex: 1;
      margin-right: 10px;
    }
    .item-quantity {
      margin-right: 10px;
      min-width: 30px;
      text-align: center;
    }
    .item-price {
      min-width: 60px;
      text-align: right;
    }
    .item-total {
      min-width: 70px;
      text-align: right;
      font-weight: bold;
    }
    .totals {
      border-top: 2px dashed #000;
      padding-top: 10px;
      margin-top: 15px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .total-label {
      font-weight: bold;
    }
    .total-value {
      font-weight: bold;
    }
    .final-total {
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 14px;
    }
    .payment-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px dashed #000;
      font-size: 11px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px dashed #000;
      font-size: 10px;
      color: #666;
    }
    .thank-you {
      font-weight: bold;
      margin-top: 10px;
      font-size: 12px;
    }
    .no-print {
      text-align: center;
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 5px;
    }
    .print-button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      border-radius: 5px;
      cursor: pointer;
      margin: 5px;
    }
    .print-button:hover {
      background: #45a049;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="shop-name">${data.shopName}</div>
      ${data.shopDescription ? `<div class="shop-description">${data.shopDescription}</div>` : ''}
    </div>

    <div class="order-info">
      <div class="order-number">Order #: ${data.orderNumber}</div>
      <div>Date: ${formatDate(data.date)}</div>
      <div>Time: ${data.time}</div>
      <div>Customer: ${data.customerName}</div>
      ${data.customerPhone ? `<div>Phone: ${data.customerPhone}</div>` : ''}
    </div>

    <div class="divider"></div>

    <div class="items">
      <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
        <div class="item-name">Item</div>
        <div class="item-quantity">Qty</div>
        <div class="item-price">Price</div>
        <div class="item-total">Total</div>
      </div>
      ${data.items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.name}</div>
          <div class="item-quantity">${item.quantity}</div>
          <div class="item-price">${formatCurrency(item.unitPrice)}</div>
          <div class="item-total">${formatCurrency(item.total)}</div>
        </div>
      `).join('')}
    </div>

    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal:</span>
        <span class="total-value">${formatCurrency(data.subtotal)}</span>
      </div>
      ${data.discount > 0 ? `
        <div class="total-row">
          <span class="total-label">Discount:</span>
          <span class="total-value" style="color: #d32f2f;">-${formatCurrency(data.discount)}</span>
        </div>
      ` : ''}
      ${data.deliveryFee > 0 ? `
        <div class="total-row">
          <span class="total-label">Delivery Fee:</span>
          <span class="total-value" style="color: #388e3c;">+${formatCurrency(data.deliveryFee)}</span>
        </div>
      ` : ''}
      <div class="total-row final-total">
        <span class="total-label">TOTAL:</span>
        <span class="total-value">${formatCurrency(data.total)}</span>
      </div>
    </div>

    <div class="payment-info">
      ${data.multiPayments && data.multiPayments.length > 0 ? `
        <div class="payment-row" style="font-weight: bold; margin-bottom: 8px;">
          <span>Payment Method:</span>
          <span>MULTIPLE PAYMENTS</span>
        </div>
        ${data.multiPayments.map(payment => `
          <div class="payment-row" style="padding-left: 15px; border-left: 2px solid #ddd; margin-bottom: 5px;">
            <span>${payment.method.toUpperCase()}:</span>
            <span style="font-weight: bold;">${formatCurrency(payment.amount)}</span>
          </div>
        `).join('')}
        <div class="payment-row" style="border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; font-weight: bold;">
          <span>Total Paid:</span>
          <span>${formatCurrency(data.amountPaid || 0)}</span>
        </div>
        ${data.change !== undefined && data.change > 0 ? `
          <div class="payment-row">
            <span>Change:</span>
            <span style="font-weight: bold; color: #388e3c;">${formatCurrency(data.change)}</span>
          </div>
        ` : ''}
      ` : `
        <div class="payment-row">
          <span>Payment Method:</span>
          <span style="font-weight: bold;">${data.paymentMethod.toUpperCase()}</span>
        </div>
        ${data.isPayLater ? `
          <div class="payment-row" style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px;">
            <span style="font-weight: bold; color: #856404;">⚠️ Payment Pending - Pay Later</span>
          </div>
        ` : ''}
        ${data.amountPaid !== undefined ? `
          <div class="payment-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(data.amountPaid)}</span>
          </div>
        ` : ''}
        ${data.change !== undefined && data.change > 0 ? `
          <div class="payment-row">
            <span>Change:</span>
            <span style="font-weight: bold; color: #388e3c;">${formatCurrency(data.change)}</span>
          </div>
        ` : ''}
      `}
    </div>

    <div class="footer">
      <div class="thank-you">Thank you for your purchase!</div>
      <div style="margin-top: 10px;">This is your official receipt.</div>
      <div style="margin-top: 5px;">Please keep this for your records.</div>
    </div>
  </div>

  <div class="no-print">
    <button class="print-button" onclick="window.print()">🖨️ Print Receipt</button>
    <button class="print-button" onclick="window.close()">✕ Close</button>
  </div>
</body>
</html>
  `;

  return receiptHTML;
};

export const downloadReceipt = async (data: ReceiptData) => {
  const html2canvas = (await import('html2canvas')).default;
  
  // Extract just the receipt content from the HTML
  const receiptHTML = generateReceipt(data);
  const parser = new DOMParser();
  const doc = parser.parseFromString(receiptHTML, 'text/html');
  const receiptElement = doc.querySelector('.receipt');
  const styles = doc.querySelector('style')?.innerHTML || '';
  
  if (!receiptElement) {
    alert('Failed to generate receipt image.');
    return;
  }
  
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '300px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Courier New', monospace";
  container.style.fontSize = '12px';
  container.style.color = '#000';
  container.style.padding = '20px';
  
  // Inject styles
  const styleElement = document.createElement('style');
  styleElement.textContent = styles.replace(/@media print[^{]*\{[^}]*\}/g, ''); // Remove print media queries
  document.head.appendChild(styleElement);
  
  // Clone and append receipt element
  const clonedReceipt = receiptElement.cloneNode(true) as HTMLElement;
  container.appendChild(clonedReceipt);
  document.body.appendChild(container);
  
  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Convert to canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
      width: container.scrollWidth,
      height: container.scrollHeight
    });
    
    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${data.orderNumber}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 1.0);
  } catch (error) {
    console.error('Error generating receipt image:', error);
    alert('Failed to generate receipt image. Please try again.');
  } finally {
    // Clean up
    document.body.removeChild(container);
    document.head.removeChild(styleElement);
  }
};

export const printReceipt = (data: ReceiptData) => {
  const receiptHTML = generateReceipt(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
};

