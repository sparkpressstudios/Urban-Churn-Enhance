const fs = require('fs');
const file = '/home/runner/workspace/artifacts/api-server/src/lib/email.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace inline "Urban Churn Craft Ice Cream" footer lines with FOOTER_HTML
const inlineFooter3 = `        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream</p>`;
const f3Count = content.split(inlineFooter3).length - 1;
console.log(`Inline footer "Craft Ice Cream" found: ${f3Count}`);
content = content.replaceAll(inlineFooter3, '        ${FOOTER_HTML}');

// 2. Wrap sendAdminNewOrderAlert with full header + footer
content = content.replace(
  [
    '  const html = `',
    '    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">',
    '      <h2 style="color:#111">New Order: #${order.orderNumber}</h2>',
  ].join('\n'),
  [
    '  const html = `',
    '    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">',
    '      ${HEADER_HTML}',
    '      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">',
    '        <h2 style="color:#111;margin-top:0">New Order: #${order.orderNumber}</h2>',
  ].join('\n')
);

content = content.replace(
  [
    '      <p><a href="${process.env.APP_URL || ""}/admin/orders" style="color:#A1AB74">View in Dashboard →</a></p>',
    '    </div>`;',
    '',
    '  return send(ADMIN_EMAIL, `🍦 New Order',
  ].join('\n'),
  [
    '        <p><a href="${process.env.APP_URL || ""}/admin/orders" style="color:#A1AB74">View in Dashboard →</a></p>',
    '        ${FOOTER_HTML}',
    '      </div>',
    '    </div>`;',
    '',
    '  return send(ADMIN_EMAIL, `🍦 New Order',
  ].join('\n')
);
console.log('Wrapped sendAdminNewOrderAlert');

// 3. Wrap sendAdminLowStockAlert with full header + footer
content = content.replace(
  [
    '  const html = `',
    '    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">',
    '      <h2 style="color:#c2410c">⚠️ Low Stock Alert</h2>',
  ].join('\n'),
  [
    '  const html = `',
    '    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">',
    '      ${HEADER_HTML}',
    '      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">',
    '        <h2 style="color:#c2410c;margin-top:0">⚠️ Low Stock Alert</h2>',
  ].join('\n')
);

content = content.replace(
  [
    '      <p><a href="${process.env.APP_URL || ""}/admin/products" style="color:#A1AB74">Manage Stock →</a></p>',
    '    </div>`;',
    '',
    '  return send(ADMIN_EMAIL, `⚠️ Low Stock Alert',
  ].join('\n'),
  [
    '        <p><a href="${process.env.APP_URL || ""}/admin/products" style="color:#A1AB74">Manage Stock →</a></p>',
    '        ${FOOTER_HTML}',
    '      </div>',
    '    </div>`;',
    '',
    '  return send(ADMIN_EMAIL, `⚠️ Low Stock Alert',
  ].join('\n')
);
console.log('Wrapped sendAdminLowStockAlert');

// 4. Add FOOTER_HTML to all emails that are missing it
// Find the closing pattern "      </div>\n    </div>`;" followed by return send
const closingPattern = /      <\/div>\n    <\/div>`;\n\n  return send/g;
let match;
const positions = [];
while ((match = closingPattern.exec(content)) !== null) {
  positions.push(match.index);
}
console.log(`Found ${positions.length} email closing patterns`);

let addedCount = 0;
for (let i = positions.length - 1; i >= 0; i--) {
  const pos = positions[i];
  const contextBefore = content.substring(Math.max(0, pos - 400), pos);
  if (!contextBefore.includes('${FOOTER_HTML}')) {
    content = content.substring(0, pos) +
      '        ${FOOTER_HTML}\n' +
      content.substring(pos);
    addedCount++;
  }
}
console.log(`Added FOOTER_HTML to ${addedCount} additional emails`);

const footerCount = (content.match(/\$\{FOOTER_HTML\}/g) || []).length;
const headerCount = (content.match(/\$\{HEADER_HTML\}|\$\{headerHtml\(/g) || []).length;
console.log(`Total FOOTER_HTML: ${footerCount}, Total HEADER_HTML: ${headerCount}`);

fs.writeFileSync(file, content);
console.log('Done!');
/**
 * Phase 2: Add FOOTER_HTML to all emails missing it,
 * replace inline simple footers, and wrap the 2 simple admin emails.
 */
const fs = require('fs');
const file = '/home/runner/workspace/artifacts/api-server/src/lib/email.ts';
let content = fs.readFileSync(file, 'utf8');

// --- 1. Replace inline "Urban Churn Craft Ice Cream" footer lines with FOOTER_HTML ---
const inlineFooter3 = `        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream</p>`;
const f3Count = content.split(inlineFooter3).length - 1;
console.log(`Inline footer "Craft Ice Cream" (no dot) found: ${f3Count}`);
content = content.replaceAll(inlineFooter3, '        ${FOOTER_HTML}');

// --- 2. Wrap sendAdminNewOrderAlert with full header + footer ---
content = content.replace(
  `  const html = \`
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#111">New Order: #\${order.orderNumber}</h2>
      <ul>
        <li><strong>Customer:</strong> \${order.customerName}</li>
        <li><strong>Location:</strong> \${order.locationName}</li>
        <li><strong>Items:</strong> \${order.itemCount}</li>
        <li><strong>Total:</strong> $\${(order.totalCents / 100).toFixed(2)}</li>
      </ul>
      <p><a href="\${process.env.APP_URL || ""}/admin/orders" style="color:#A1AB74">View in Dashboard →</a></p>
    </div>\`;`,
  `  const html = \`
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      \${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="color:#111;margin-top:0">New Order: #\${order.orderNumber}</h2>
        <ul>
          <li><strong>Customer:</strong> \${order.customerName}</li>
          <li><strong>Location:</strong> \${order.locationName}</li>
          <li><strong>Items:</strong> \${order.itemCount}</li>
          <li><strong>Total:</strong> $\${(order.totalCents / 100).toFixed(2)}</li>
        </ul>
        <p><a href="\${process.env.APP_URL || ""}/admin/orders" style="color:#A1AB74">View in Dashboard →</a></p>
        \${FOOTER_HTML}
      </div>
    </div>\`;`
);
console.log('Wrapped sendAdminNewOrderAlert');

// --- 3. Wrap sendAdminLowStockAlert with full header + footer ---
content = content.replace(
  `  const html = \`
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#c2410c">⚠️ Low Stock Alert</h2>
      <p>The following products are running low:</p>
      <ul>\${list}</ul>
      <p><a href="\${process.env.APP_URL || ""}/admin/products" style="color:#A1AB74">Manage Stock →</a></p>
    </div>\`;`,
  `  const html = \`
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      \${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="color:#c2410c;margin-top:0">⚠️ Low Stock Alert</h2>
        <p>The following products are running low:</p>
        <ul>\${list}</ul>
        <p><a href="\${process.env.APP_URL || ""}/admin/products" style="color:#A1AB74">Manage Stock →</a></p>
        \${FOOTER_HTML}
      </div>
    </div>\`;`
);
console.log('Wrapped sendAdminLowStockAlert');

// --- 4. Now find all email functions that have HEADER_HTML but no FOOTER_HTML ---
// We'll look for the pattern: closing of content div without FOOTER_HTML before it
// Pattern to find: content that ends with </div>\n    </div>`; but doesn't have FOOTER_HTML before it
// We need to add ${FOOTER_HTML} before the closing </div>

// Strategy: Find all closing sequences "      </div>\n    </div>`;" 
// that are NOT preceded by ${FOOTER_HTML}

// More robust approach: count FOOTER_HTML references
const footerCountBefore = (content.match(/\$\{FOOTER_HTML\}/g) || []).length;
console.log(`FOOTER_HTML references before phase 4: ${footerCountBefore}`);

// Find all positions of the email closing pattern
const closingPattern = /      <\/div>\n    <\/div>`;\n\n  return send/g;
let match;
const positions = [];
while ((match = closingPattern.exec(content)) !== null) {
  positions.push(match.index);
}
console.log(`Found ${positions.length} email closing patterns`);

// For each position, check if FOOTER_HTML appears within ~200 chars before it
let addedCount = 0;
// Process in reverse order so positions don't shift
for (let i = positions.length - 1; i >= 0; i--) {
  const pos = positions[i];
  const contextBefore = content.substring(Math.max(0, pos - 300), pos);
  if (!contextBefore.includes('${FOOTER_HTML}')) {
    // Need to add FOOTER_HTML before the closing </div>
    const insertPoint = pos;
    content = content.substring(0, insertPoint) +
      '        ${FOOTER_HTML}\n' +
      content.substring(insertPoint);
    addedCount++;
  }
}
console.log(`Added FOOTER_HTML to ${addedCount} additional emails`);

const footerCountAfter = (content.match(/\$\{FOOTER_HTML\}/g) || []).length;
console.log(`Total FOOTER_HTML references after: ${footerCountAfter}`);

// Verify all functions that call send have FOOTER_HTML
const headerCount = (content.match(/\$\{HEADER_HTML\}|\$\{headerHtml\(/g) || []).length;
console.log(`Total HEADER_HTML/headerHtml references: ${headerCount}`);

fs.writeFileSync(file, content);
console.log('\nPhase 2 transformation complete!');
/**
 * Phase 2: Add FOOTER_HTML to emails that are missing it,
 * and wrap the 2 simple admin emails with header + footer.
 */
const fs = require('fs');
const file = '/home/runner/workspace/artifacts/api-server/src/lib/email.ts';
let content = fs.readFileSync(file, 'utf8');

// --- Step 1: Replace standard inline headers (32 occurrences) ---
const stdHeader = [
  '      <div style="background:#111118;padding:24px;border-radius:12px 12px 0 0">',
  '        <h1 style="color:#A1AB74;margin:0;font-size:20px">Urban Churn</h1>',
  '      </div>'
].join('\n');

const stdCount = content.split(stdHeader).length - 1;
console.log(`Standard headers found: ${stdCount}`);
content = content.replaceAll(stdHeader, '      ${HEADER_HTML}');

// --- Step 2: Replace "Admin" variant headers (2 occurrences) ---
const adminHeader = [
  '      <div style="background:#111118;padding:24px;border-radius:12px 12px 0 0">',
  '        <h1 style="color:#A1AB74;margin:0;font-size:20px">Urban Churn — Admin</h1>',
  '      </div>'
].join('\n');

const adminCount = content.split(adminHeader).length - 1;
console.log(`Admin headers found: ${adminCount}`);
content = content.replaceAll(adminHeader, "      ${headerHtml('Admin')}");

// --- Step 3: Replace "Event Question" variant header (1 occurrence) ---
const eventHeader = [
  '      <div style="background:#111118;padding:24px;border-radius:12px 12px 0 0">',
  '        <h1 style="color:#A1AB74;margin:0;font-size:20px">Urban Churn — Event Question</h1>',
  '      </div>'
].join('\n');

const eventCount = content.split(eventHeader).length - 1;
console.log(`Event Question headers found: ${eventCount}`);
content = content.replaceAll(eventHeader, "      ${headerHtml('Event Question')}");

// --- Step 4: Replace inline simple footers with ${FOOTER_HTML} ---
// Pattern: <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn LLC · Harrisburg, PA</p>
const inlineFooter1 = '        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn LLC · Harrisburg, PA</p>';
const f1Count = content.split(inlineFooter1).length - 1;
console.log(`Inline footer (LLC) found: ${f1Count}`);
content = content.replaceAll(inlineFooter1, '        ${FOOTER_HTML}');

// Pattern: <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream · Harrisburg, PA</p>
const inlineFooter2 = '        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream · Harrisburg, PA</p>';
const f2Count = content.split(inlineFooter2).length - 1;
console.log(`Inline footer (Craft) found: ${f2Count}`);
content = content.replaceAll(inlineFooter2, '        ${FOOTER_HTML}');

// --- Step 5: Verify no remaining inline headers ---
const remaining = (content.match(/<div style="background:#111118;padding:24px;border-radius:12px 12px 0 0">/g) || []).length;
// One occurrence is the gift card value display box (line 1527), not a header
console.log(`Remaining #111118 divs (should be 1, the gift card value box): ${remaining}`);

// --- Step 6: Add FOOTER_HTML to emails that have neither ---
// Find closing pattern: </div>\n    </div>`; that marks end of email
// We need to add ${FOOTER_HTML} before the closing </div> of the content area
// for emails that don't already have it.

// Count emails with footer
const footerRefs = (content.match(/\$\{FOOTER_HTML\}/g) || []).length;
console.log(`Total FOOTER_HTML references: ${footerRefs}`);

fs.writeFileSync(file, content);
console.log('\nTransformation complete!');
