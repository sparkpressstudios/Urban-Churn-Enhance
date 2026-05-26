import { Resend } from "resend";
import { db } from "@workspace/db";
import { sentEmailsLogTable } from "@workspace/db/schema";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "Urban Churn <noreply@urbanchurn.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

// ── Shared types ──

export interface LocationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mapUrl: string | null;
}

function formatLocationBlock(loc: LocationInfo): string {
  const addressLine = `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`;
  const phoneLine = loc.phone ? `<p style="margin:0 0 4px"><strong>📞 Phone:</strong> <a href="tel:${loc.phone}" style="color:#A1AB74">${loc.phone}</a></p>` : "";
  const mapLink = loc.mapUrl ? `<p style="margin:0"><a href="${loc.mapUrl}" style="color:#A1AB74;font-weight:bold" target="_blank">📍 Get Directions →</a></p>` : "";
  return `
    <p style="margin:0 0 4px"><strong>📍 Pickup Location:</strong> ${loc.name}</p>
    <p style="margin:0 0 4px;color:#374151">${addressLine}</p>
    ${phoneLine}
    ${mapLink}`;
}

const LOGO_URL = "https://urbanchurn.com/images/uc-logo-white.png";

const HEADER_HTML = `
      <div style="background:#111118;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <a href="https://urbanchurn.com" target="_blank"><img src="${LOGO_URL}" alt="Urban Churn" style="max-width:180px;height:auto;display:block;margin:0 auto" /></a>
      </div>`;

function headerHtml(subtitle: string): string {
  return `
      <div style="background:#111118;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <a href="https://urbanchurn.com" target="_blank"><img src="${LOGO_URL}" alt="Urban Churn" style="max-width:180px;height:auto;display:block;margin:0 auto 8px" /></a>
        <p style="color:#A1AB74;margin:0;font-size:14px">${subtitle}</p>
      </div>`;
}

const FOOTER_HTML = `
  <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px">Urban Churn Craft Ice Cream · Harrisburg, PA</p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px">📞 <a href="tel:7172087256" style="color:#9ca3af">(717) 208-7256</a> · ✉️ <a href="mailto:contact@urbanchurn.com" style="color:#9ca3af">contact@urbanchurn.com</a></p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 8px"><a href="https://urbanchurn.com" style="color:#9ca3af">urbanchurn.com</a></p>
    <p style="color:#b0b0b0;font-size:11px;margin:0">Ecommerce powered by <a href="https://sparkpressstudios.com" style="color:#A1AB74;text-decoration:none;font-weight:bold" target="_blank">SparkPress Studios</a></p>
  </div>`;

const HOURS_REMINDER_HTML = `
  <div style="background:#e0f2fe;padding:12px;border-radius:8px;font-size:13px;color:#0c4a6e;margin:16px 0">
    <strong>🕐 Check Store Hours:</strong> Hours vary by location. Please check our <a href="https://urbanchurn.com/locations" style="color:#0c4a6e;font-weight:bold">locations page</a> or call ahead to confirm store hours before visiting for pickup.
  </div>`;

if (!resend) {
  console.warn("[EMAIL] ⚠️  RESEND_API_KEY is not set — all emails will be skipped");
} else {
  // Validate the API key on startup
  resend.domains.list().then(({ error }) => {
    if (error) {
      console.error("[EMAIL] ⚠️  RESEND_API_KEY is INVALID:", error.message, "— emails will fail");
    } else {
      console.log("[EMAIL] ✓ Resend API key validated successfully");
    }
  }).catch((err) => {
    console.error("[EMAIL] ⚠️  Failed to validate Resend API key:", err);
  });
}

if (!ADMIN_EMAIL) {
  console.warn("[EMAIL] ⚠️  ADMIN_EMAIL is not set — admin notifications will be skipped");
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[EMAIL SKIPPED] No RESEND_API_KEY configured. To: ${to}, Subject: ${subject}`);
    return null;
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });

      if (error) {
        const isRateLimit = (error as { name?: string }).name === "rate_limit_exceeded";
        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          console.warn(`[EMAIL] Rate limit hit sending to ${to} — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.error(`[EMAIL ERROR] Failed to send to ${to} (Subject: "${subject}"):`, error);
        db.insert(sentEmailsLogTable).values({ toEmail: to, subject, status: "failed", errorMessage: String(error) }).catch(() => { });
        return null;
      }
      console.log(`[EMAIL SENT] To: ${to}, Subject: "${subject}", ID: ${data?.id}`);
      db.insert(sentEmailsLogTable).values({ toEmail: to, subject, status: "sent", resendId: data?.id ?? null }).catch(() => { });
      return data;
    } catch (err) {
      console.error(`[EMAIL EXCEPTION] Failed to send to ${to} (Subject: "${subject}"):`, err);
      db.insert(sentEmailsLogTable).values({ toEmail: to, subject, status: "failed", errorMessage: String(err) }).catch(() => { });
      return null;
    }
  }

  return null;
}

// ── Customer Emails ──

export async function sendWelcomeEmail(customer: {
  customerName: string;
  customerEmail: string;
}) {
  const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Welcome to Urban Churn! 🍦</h2>
        <p>Hi ${customer.customerName},</p>
        <p>Thanks for creating your Urban Churn account! Here's what you can do:</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>🛒 Faster checkout</strong> — Your details are saved for next time</p>
          <p style="margin:0 0 8px"><strong>📦 Track your orders</strong> — View order status and history</p>
          <p style="margin:0"><strong>🎉 Be the first to know</strong> — Get notified about new flavours and events</p>
        </div>
        <p>We're a small-batch craft ice cream shop in Central PA, and we're so glad to have you. Whether you're here for a pre-order, a custom cake, or just browsing — welcome to the family.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${baseUrl}/pre-order" style="display:inline-block;background:#A1AB74;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Browse Flavours & Pre-Order →</a>
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(customer.customerEmail, "Welcome to Urban Churn! 🍦", html);
}

export async function sendOrderConfirmation(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  discountCents: number;
  location: LocationInfo;
  pickupDateRange: string | null;
  items: { flavourName: string; sizeName: string; priceCents: number; quantity: number }[];
}) {
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.flavourName} – ${i.sizeName}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${((i.priceCents * i.quantity) / 100).toFixed(2)}</td></tr>`,
    )
    .join("");

  const discountLine =
    order.discountCents > 0
      ? `<tr><td colspan="2" style="padding:8px;text-align:right;color:#16a34a">Discount</td><td style="padding:8px;text-align:right;color:#16a34a">-$${(order.discountCents / 100).toFixed(2)}</td></tr>`
      : "";

  const pickupDateHtml = order.pickupDateRange
    ? `<p style="margin:0 0 8px"><strong>📅 Pickup Window:</strong> ${order.pickupDateRange}</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Order Confirmed! 🎉</h2>
        <p>Hi ${order.customerName},</p>
        <p>Thanks for your pre-order <strong>#${order.orderNumber}</strong>! Here are your details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Price</th></tr></thead>
          <tbody>${itemsHtml}${discountLine}</tbody>
          <tfoot><tr><td colspan="2" style="padding:12px 8px;font-weight:bold;text-align:right">Total</td><td style="padding:12px 8px;font-weight:bold;text-align:right">$${(order.totalCents / 100).toFixed(2)}</td></tr></tfoot>
        </table>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          ${pickupDateHtml}
          ${formatLocationBlock(order.location)}
        </div>
        ${HOURS_REMINDER_HTML}
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:13px;color:#92400e;margin:16px 0">
          <strong>Reminder:</strong> We hold orders up to 2 weeks. If not picked up by week 3, you may request a credit. After week 4, orders are nonrefundable.
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Order Confirmed! #${order.orderNumber}`, html);
}

export async function sendOrderStatusUpdate(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  location: LocationInfo;
  items?: { flavourName: string; sizeName: string; quantity: number }[];
  totalCents?: number;
}) {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being prepared!",
    ready: "Your order is ready for pickup! 🍦",
    picked_up: "Thank you for picking up your order. Enjoy!",
    cancelled: "Your order has been cancelled. If you have questions, please contact us at <a href=\"mailto:contact@urbanchurn.com\" style=\"color:#A1AB74\">contact@urbanchurn.com</a> or call <a href=\"tel:7172087256\" style=\"color:#A1AB74\">(717) 208-7256</a>.",
    refunded: "Your order has been refunded. The refund will appear in your account shortly.",
  };

  const message = statusMessages[order.status] || `Your order status has been updated to: ${order.status}`;

  const itemsSection = order.items && order.items.length > 0
    ? `<div style="margin:12px 0"><p style="margin:0 0 4px;font-weight:bold;font-size:13px">Order Items:</p>${order.items.map(i => `<p style="margin:0 0 2px;font-size:13px;color:#374151">• ${i.flavourName} – ${i.sizeName} × ${i.quantity}</p>`).join("")}${order.totalCents ? `<p style="margin:4px 0 0;font-weight:bold;font-size:13px">Total: $${(order.totalCents / 100).toFixed(2)}</p>` : ""}</div>`
    : "";

  const pickupSection = ["confirmed", "ready"].includes(order.status)
    ? `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #A1AB74">
        ${formatLocationBlock(order.location)}
      </div>
      ${HOURS_REMINDER_HTML}`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Order Update</h2>
        <p>Hi ${order.customerName},</p>
        <p>${message}</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>Status:</strong> ${order.status.replace("_", " ")}</p>
          <p style="margin:0"><strong>Location:</strong> ${order.location.name}</p>
          ${itemsSection}
        </div>
        ${pickupSection}
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(
    order.customerEmail,
    `Order #${order.orderNumber} — ${order.status.replace("_", " ")}`,
    html,
  );
}

// ── Admin Alerts ──

export async function sendAdminNewOrderAlert(order: {
  orderNumber: string;
  customerName: string;
  totalCents: number;
  locationName: string;
  itemCount: number;
}) {
  if (!ADMIN_EMAIL) return null;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="color:#111;margin-top:0">New Order: #${order.orderNumber}</h2>
      <ul>
        <li><strong>Customer:</strong> ${order.customerName}</li>
        <li><strong>Location:</strong> ${order.locationName}</li>
        <li><strong>Items:</strong> ${order.itemCount}</li>
        <li><strong>Total:</strong> $${(order.totalCents / 100).toFixed(2)}</li>
      </ul>
        <p><a href="${process.env.APP_URL || ""}/admin/orders" style="color:#A1AB74">View in Dashboard →</a></p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(ADMIN_EMAIL, `🍦 New Order #${order.orderNumber} — $${(order.totalCents / 100).toFixed(2)}`, html);
}

export async function sendAdminLowStockAlert(products: { flavourName: string; sizeName: string; stockQuantity: number }[]) {
  if (!ADMIN_EMAIL || products.length === 0) return null;

  const list = products
    .map((p) => `<li><strong>${p.flavourName} (${p.sizeName})</strong>: ${p.stockQuantity} left</li>`)
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="color:#c2410c;margin-top:0">⚠️ Low Stock Alert</h2>
      <p>The following products are running low:</p>
      <ul>${list}</ul>
        <p><a href="${process.env.APP_URL || ""}/admin/products" style="color:#A1AB74">Manage Stock →</a></p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(ADMIN_EMAIL, `⚠️ Low Stock Alert — ${products.length} products`, html);
}

// ── Event Ticket Emails ──

export async function sendTicketConfirmation(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  venueName: string;
  tickets: { ticketCode: string; ticketTypeName: string; priceCents: number }[];
}) {
  const ticketsHtml = order.tickets
    .map(
      (t) =>
        `<tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">${t.ticketTypeName}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(t.priceCents / 100).toFixed(2)}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-family:monospace;font-size:12px">${t.ticketCode.slice(0, 12).toUpperCase()}</td>
                </tr>`,
    )
    .join("");

  const dateFormatted = new Date(order.eventDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Your Tickets Are Confirmed! 🎟️</h2>
        <p>Hi ${order.customerName},</p>
        <p>You're all set for <strong>${order.eventTitle}</strong>!</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>📅 Date:</strong> ${dateFormatted}</p>
          <p style="margin:0 0 4px"><strong>🕐 Time:</strong> ${order.startTime}</p>
          <p style="margin:0 0 4px"><strong>📍 Venue:</strong> ${order.venueName}</p>
          <p style="margin:0"><strong>🎫 Order:</strong> #${order.orderNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">Ticket</th><th style="padding:8px;text-align:right">Price</th><th style="padding:8px;text-align:center">Code</th></tr></thead>
          <tbody>${ticketsHtml}</tbody>
          <tfoot><tr><td style="padding:12px 8px;font-weight:bold;text-align:right">Total</td><td style="padding:12px 8px;font-weight:bold;text-align:right">$${(order.totalCents / 100).toFixed(2)}</td><td></td></tr></tfoot>
        </table>
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:13px;color:#92400e;margin:16px 0">
          <strong>Important:</strong> Please have your ticket code ready at the door for check-in. You can show this email or use the QR code on the event page.
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Your Tickets for ${order.eventTitle} 🎟️ #${order.orderNumber}`, html);
}

// ── Form Submission Emails ──

const CONTACT_EMAIL = "contact@urbanchurn.com";

export async function sendContactFormNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:120px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Subject</td><td style="padding:8px;border-bottom:1px solid #eee">${data.subject || "(none)"}</td></tr>
        </table>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Message:</strong></p>
          <p style="margin:0;white-space:pre-wrap">${data.message}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Contact Form</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Contact Form: ${data.subject || "General"} — ${data.name}`, html);
}

export async function sendContactFormConfirmation(data: {
  name: string;
  email: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">We got your message! 🍦</h2>
        <p>Hi ${data.name},</p>
        <p>Thanks for reaching out to Urban Churn. We've received your message and will get back to you within 1–2 business days.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(data.email, "We got your message — Urban Churn", html);
}

export async function sendWholesaleFormNotification(data: {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  businessType: string;
  location: string;
  interest: string;
  message: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Wholesale Application</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:140px">Business Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.businessName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Contact Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.contactName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${data.phone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Business Type</td><td style="padding:8px;border-bottom:1px solid #eee">${data.businessType}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Location</td><td style="padding:8px;border-bottom:1px solid #eee">${data.location}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Interest</td><td style="padding:8px;border-bottom:1px solid #eee">${data.interest || "(not specified)"}</td></tr>
        </table>
        ${data.message ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>Message:</strong></p><p style="margin:0;white-space:pre-wrap">${data.message}</p></div>` : ""}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Wholesale Application</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Wholesale Application: ${data.businessName} — ${data.contactName}`, html);
}

export async function sendWholesaleFormConfirmation(data: {
  contactName: string;
  email: string;
  businessName: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Application Received! 🤝</h2>
        <p>Hi ${data.contactName},</p>
        <p>Thanks for your wholesale application for <strong>${data.businessName}</strong>. We'll review your details and reach out within 2–3 business days with pricing, minimum orders, and next steps.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(data.email, "Wholesale Application Received — Urban Churn", html);
}

export async function sendCateringFormNotification(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventType: string;
  date: string;
  guestCount: string;
  message: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Catering Request</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:140px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.firstName} ${data.lastName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${data.phone || "(not provided)"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Event Type</td><td style="padding:8px;border-bottom:1px solid #eee">${data.eventType}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Event Date</td><td style="padding:8px;border-bottom:1px solid #eee">${data.date || "(not specified)"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Guest Count</td><td style="padding:8px;border-bottom:1px solid #eee">${data.guestCount || "(not specified)"}</td></tr>
        </table>
        ${data.message ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>Additional Details:</strong></p><p style="margin:0;white-space:pre-wrap">${data.message}</p></div>` : ""}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Catering Request</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Catering Request: ${data.eventType} — ${data.firstName} ${data.lastName}`, html);
}

export async function sendCateringFormConfirmation(data: {
  firstName: string;
  email: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Catering Request Received! 🎉</h2>
        <p>Hi ${data.firstName},</p>
        <p>Thanks for your catering enquiry. We'll reach out within 1–2 business days with flavour options, pricing and availability.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(data.email, "Catering Request Received — Urban Churn", html);
}

export async function sendEventUpdate(info: {
  eventTitle: string;
  eventDate: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
}) {
  const dateFormatted = new Date(info.eventDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Event Update: ${info.eventTitle}</h2>
        <p>Hi ${info.customerName},</p>
        <p>${info.message}</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>📅 Event Date:</strong> ${dateFormatted}</p>
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(info.customerEmail, info.subject, html);
}

// ── Bakery Order Emails ──

const ORDERS_EMAIL = "orders@urbanchurn.com";
const LOUISE_DRIVE_BAKERY_EMAIL = "louisedriveurbanchurn@gmail.com";

export async function sendBakeryOrderNotification(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string;
  pickupTime: string;
  referral: string;
  orderType: string;
  orderDetails: Record<string, any>;
  addOns: Record<string, any>;
  specialRequests: string;
  inspirationPhotoUrl: string | null;
  totalPriceCents: number;
}) {
  const detailRows = Object.entries(order.orderDetails)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;text-transform:capitalize">${k.replace(/([A-Z])/g, " $1").trim()}</td><td style="padding:8px;border-bottom:1px solid #eee">${v}</td></tr>`,
    )
    .join("");

  const addOnRows = Object.entries(order.addOns)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;text-transform:capitalize">${k.replace(/([A-Z])/g, " $1").trim()}</td><td style="padding:8px;border-bottom:1px solid #eee">${v}</td></tr>`,
    )
    .join("");

  const photoSection = order.inspirationPhotoUrl
    ? `<div style="margin:16px 0"><strong>Inspiration Photo:</strong><br/><a href="${order.inspirationPhotoUrl}" style="color:#A1AB74">${order.inspirationPhotoUrl}</a></div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">🎂 New Bakery Order: #${order.orderNumber}</h2>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Customer:</strong> ${order.customerName}</p>
          <p style="margin:0 0 4px"><strong>Email:</strong> <a href="mailto:${order.customerEmail}">${order.customerEmail}</a></p>
          <p style="margin:0 0 4px"><strong>Phone:</strong> ${order.customerPhone}</p>
          <p style="margin:0 0 4px"><strong>Pickup:</strong> ${order.pickupDate} at ${order.pickupTime}</p>
          ${order.referral ? `<p style="margin:0"><strong>Referral:</strong> ${order.referral}</p>` : ""}
        </div>
        <h3 style="margin-bottom:8px">Order Type: ${order.orderType}</h3>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${detailRows}
          ${addOnRows}
        </table>
        ${order.specialRequests ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>Special Requests:</strong></p><p style="margin:0;white-space:pre-wrap">${order.specialRequests}</p></div>` : ""}
        ${photoSection}
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:16px;color:#92400e;margin:16px 0;text-align:center">
          <strong>Total: $${(order.totalPriceCents / 100).toFixed(2)}</strong>
        </div>
        <p><a href="${process.env.APP_URL || ""}/admin/bakery-orders" style="color:#A1AB74">View in Dashboard →</a></p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  const subject = `🎂 Bakery Order #${order.orderNumber} — ${order.orderType} — $${(order.totalPriceCents / 100).toFixed(2)}`;

  // Send to orders@, contact@, and Louise Drive bakery
  await Promise.all([
    send(CONTACT_EMAIL, subject, html),
    send(ORDERS_EMAIL, subject, html),
    send(LOUISE_DRIVE_BAKERY_EMAIL, subject, html),
  ]);
}

export async function sendBakeryOrderConfirmation(order: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderType: string;
  pickupDate: string;
  pickupTime: string;
  totalPriceCents: number;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Bakery Order Received! 🎂</h2>
        <p>Hi ${order.customerName},</p>
        <p>Thank you for your bakery order request! Our bakery team will review your order and reach out within 24–48 hours to confirm details and send your invoice.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>Type:</strong> ${order.orderType}</p>
          <p style="margin:0 0 4px"><strong>Pickup:</strong> ${order.pickupDate} at ${order.pickupTime}</p>
          <p style="margin:0"><strong>Estimated Total:</strong> $${(order.totalPriceCents / 100).toFixed(2)}</p>
        </div>
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:13px;color:#92400e;margin:16px 0">
          <strong>Please note:</strong> All cake and cupcake orders require a minimum of 96 hours (4 days) lead time for preparation. Orders are not confirmed until we contact you and payment is received.
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Bakery Order Received — #${order.orderNumber}`, html);
}

// ── Pre-Order Window Emails ──

export async function sendWindowClosingReport(
  window: { id: number; name: string; closeAt: Date },
  report: {
    totalOrders: number;
    totalRevenueCents: number;
    lineItems: { orderType: string; details: string; locationName: string; quantity: number; orderCount: number }[];
    locationSummaries: { locationName: string; orderCount: number; pickupStartDate: Date; pickupEndDate: Date | null }[];
  },
  csvContent: string,
) {
  const tableRows = report.lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.orderType}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.details}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.locationName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.orderCount}</td>
        </tr>`,
    )
    .join("");

  const locationRows = report.locationSummaries
    .map(
      (loc) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${loc.locationName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${loc.orderCount}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${new Date(loc.pickupStartDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${loc.pickupEndDate ? new Date(loc.pickupEndDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—"}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">📋 Pre-Order Window Closed: ${window.name}</h2>
        <p>The ordering window <strong>${window.name}</strong> closed on <strong>${new Date(window.closeAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong>.</p>

        <div style="display:flex;gap:16px;margin:16px 0">
          <div style="background:#f9fafb;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:28px;font-weight:bold;color:#111">${report.totalOrders}</div>
            <div style="font-size:13px;color:#6b7280">Total Orders</div>
          </div>
          <div style="background:#f9fafb;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:28px;font-weight:bold;color:#111">$${(report.totalRevenueCents / 100).toFixed(2)}</div>
            <div style="font-size:13px;color:#6b7280">Total Revenue</div>
          </div>
        </div>

        <h3 style="margin:24px 0 8px">Fulfillment Summary</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left">Order Type</th>
              <th style="padding:8px;text-align:left">Details</th>
              <th style="padding:8px;text-align:left">Location</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:center">Orders</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280">No orders in this window</td></tr>'}</tbody>
        </table>

        ${report.locationSummaries.length > 0
      ? `
        <h3 style="margin:24px 0 8px">Pickup Schedule by Location</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left">Location</th>
              <th style="padding:8px;text-align:center">Orders</th>
              <th style="padding:8px;text-align:left">Pickup Start</th>
              <th style="padding:8px;text-align:left">Pickup End</th>
            </tr>
          </thead>
          <tbody>${locationRows}</tbody>
        </table>`
      : ""
    }

        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:13px;color:#92400e;margin:16px 0">
          <strong>Action Required:</strong> Please begin preparation and coordinate delivery to each pickup location by the specified dates. A CSV report is attached for your records.
        </div>

        <p><a href="${process.env.APP_URL || ""}/admin/pre-orders" style="color:#A1AB74">View in Dashboard →</a></p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  const subject = `📋 Orders Closed: ${window.name} — ${report.totalOrders} orders, $${(report.totalRevenueCents / 100).toFixed(2)}`;

  // Send to admin emails with CSV attachment
  if (!resend) {
    console.log(`[EMAIL SKIPPED] No RESEND_API_KEY. Subject: ${subject}`);
    return null;
  }

  const recipients = [ORDERS_EMAIL, CONTACT_EMAIL];
  if (ADMIN_EMAIL) recipients.push(ADMIN_EMAIL);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject,
    html,
    attachments: [
      {
        filename: `fulfillment-report-${window.id}.csv`,
        content: Buffer.from(csvContent).toString("base64"),
        contentType: "text/csv",
      },
    ],
  });

  if (error) {
    console.error("[EMAIL ERROR] Window closing report:", error);
    return null;
  }
  return data;
}

export async function sendAdminOrdersClosedReminder(
  window: { id: number; name: string; closeAt: Date },
  orderCount: number,
) {
  if (!ADMIN_EMAIL) return null;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">⏰ Reminder: Orders Closed</h2>
        <p>This is a reminder that the pre-order window <strong>${window.name}</strong> has closed.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Window:</strong> ${window.name}</p>
          <p style="margin:0 0 4px"><strong>Closed:</strong> ${new Date(window.closeAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
          <p style="margin:0"><strong>Total Orders:</strong> ${orderCount}</p>
        </div>
        <p>Please ensure all orders are being prepared and will be ready for pickup at the designated locations.</p>
        <p><a href="${process.env.APP_URL || ""}/admin/pre-orders" style="color:#A1AB74">View Window Details →</a></p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(ADMIN_EMAIL, `⏰ Reminder: ${window.name} — ${orderCount} orders closed`, html);
}

export async function sendCustomerPickupReminder(order: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderType: string;
  pickupDate: string;
  pickupTime: string;
  location?: LocationInfo;
  items?: { flavourName: string; sizeName: string; quantity: number }[];
}) {
  const locationSection = order.location
    ? `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #A1AB74">
        ${formatLocationBlock(order.location)}
      </div>`
    : "";

  const itemsSection = order.items && order.items.length > 0
    ? `<div style="margin:12px 0"><p style="margin:0 0 4px;font-weight:bold;font-size:13px">Your Items:</p>${order.items.map(i => `<p style="margin:0 0 2px;font-size:13px;color:#374151">• ${i.flavourName} – ${i.sizeName} × ${i.quantity}</p>`).join("")}</div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Your Order is Ready for Pickup! 🍦</h2>
        <p>Hi ${order.customerName},</p>
        <p>Great news! Your pre-order is ready and available for pickup.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>Type:</strong> ${order.orderType}</p>
          <p style="margin:0 0 4px"><strong>📅 Pickup Date:</strong> ${order.pickupDate}</p>
          <p style="margin:0"><strong>🕐 Pickup Window:</strong> ${order.pickupTime}</p>
          ${itemsSection}
        </div>
        ${locationSection}
        ${HOURS_REMINDER_HTML}
        <div style="background:#dcfce7;padding:12px;border-radius:8px;font-size:14px;color:#166534;margin:16px 0;text-align:center">
          <strong>Come pick up your order!</strong>
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Your Order #${order.orderNumber} is Ready for Pickup! 🍦`, html);
}

export async function sendCustomerLastChancePickup(order: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  pickupDeadline: string;
  location: LocationInfo;
  items?: { flavourName: string; sizeName: string; quantity: number }[];
}) {
  const itemsSection = order.items && order.items.length > 0
    ? `<div style="margin:12px 0"><p style="margin:0 0 4px;font-weight:bold;font-size:13px">Your Items:</p>${order.items.map(i => `<p style="margin:0 0 2px;font-size:13px;color:#374151">• ${i.flavourName} – ${i.sizeName} × ${i.quantity}</p>`).join("")}</div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">⚠️ Last Chance to Pick Up Your Order!</h2>
        <p>Hi ${order.customerName},</p>
        <p>This is a friendly reminder that your order pickup window is closing soon. Please pick up your order within the next <strong>2 days</strong> before the window closes.</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>⏰ Pickup Deadline:</strong> ${order.pickupDeadline}</p>
          ${formatLocationBlock(order.location)}
          ${itemsSection}
        </div>
        ${HOURS_REMINDER_HTML}
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:14px;color:#92400e;margin:16px 0;text-align:center">
          <strong>Orders not picked up within 14 days of pickup availability are non-refundable.</strong>
        </div>
        <p>If you have any questions or need to arrange an alternative pickup time, please contact us at <a href="mailto:contact@urbanchurn.com" style="color:#A1AB74;font-weight:bold">contact@urbanchurn.com</a> or call <a href="tel:7172087256" style="color:#A1AB74;font-weight:bold">(717) 208-7256</a>.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `⚠️ Last Chance — Order #${order.orderNumber} Pickup Closes Soon!`, html);
}

// ── Pickup Window Started Email ──

export async function sendCustomerPickupStarted(order: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  pickupDateRange: string;
  location: LocationInfo;
  items: { flavourName: string; sizeName: string; quantity: number }[];
}) {
  const itemsHtml = order.items
    .map(i => `<p style="margin:0 0 2px;font-size:14px;color:#374151">• ${i.flavourName} – ${i.sizeName} × ${i.quantity}</p>`)
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Your Pre-Order is Ready for Pickup! 🍦</h2>
        <p>Hi ${order.customerName},</p>
        <p>Great news — your pre-order pickup window is now open! Your order is available and waiting for you.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 8px"><strong>📅 Pickup Window:</strong> ${order.pickupDateRange}</p>
          <p style="margin:0 0 4px;font-weight:bold">Your Items:</p>
          ${itemsHtml}
        </div>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #A1AB74">
          ${formatLocationBlock(order.location)}
        </div>
        ${HOURS_REMINDER_HTML}
        <div style="background:#fef3c7;padding:12px;border-radius:8px;font-size:13px;color:#92400e;margin:16px 0">
          <strong>Reminder:</strong> We hold orders up to 2 weeks. If not picked up by week 3, you may request a credit. After week 4, orders are nonrefundable.
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Your Pre-Order #${order.orderNumber} is Ready for Pickup! 🍦`, html);
}

// ── Staff Credentials Email ──

export async function sendStaffCredentialsEmail(staff: {
  email: string;
  username: string;
  password: string;
  role: string;
  locationName?: string | null;
}) {
  const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
  const portalPath = staff.role === "staff" || staff.role === "manager" ? "/store" : "/admin";
  const loginUrl = `${baseUrl}/admin/login`;
  const roleLabel = staff.role.charAt(0).toUpperCase() + staff.role.slice(1);
  const locationLine = staff.locationName
    ? `<p style="margin:0 0 8px"><strong>Assigned Location:</strong> ${staff.locationName}</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Your Urban Churn dashboard account is ready</h2>
        <p>Welcome! An account has been created for you to access the Urban Churn dashboard.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Username:</strong> ${staff.username}</p>
          <p style="margin:0 0 8px"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px">${staff.password}</code></p>
          <p style="margin:0 0 8px"><strong>Role:</strong> ${roleLabel}</p>
          ${locationLine}
          <p style="margin:0"><strong>Login URL:</strong> <a href="${loginUrl}" style="color:#A1AB74">${loginUrl}</a></p>
        </div>
        <p>After signing in, you'll land on the <strong>${portalPath === "/store" ? "Store Portal" : "Admin Dashboard"}</strong>. Please change your password from your profile settings as soon as possible.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${loginUrl}" style="display:inline-block;background:#A1AB74;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Sign In →</a>
        </div>
        <p style="color:#6b7280;font-size:13px">If you didn't expect this email, please contact your administrator.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(staff.email, "Your Urban Churn dashboard account", html);
}

// ── Bakery Invoice Email ──

export async function sendBakeryInvoiceEmail(order: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderType: string;
  pickupDate: string;
  pickupTime: string;
  totalPriceCents: number;
  adminMessage: string;
}) {
  const messageParagraph = order.adminMessage
    ? `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #A1AB74"><p style="margin:0;white-space:pre-wrap">${order.adminMessage}</p></div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Invoice for Bakery Order #${order.orderNumber} 🧾</h2>
        <p>Hi ${order.customerName},</p>
        <p>Your bakery order has been reviewed and confirmed. Please see the details below and submit payment to complete your order.</p>
        ${messageParagraph}
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${order.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>Type:</strong> ${order.orderType}</p>
          <p style="margin:0 0 4px"><strong>Pickup:</strong> ${order.pickupDate} at ${order.pickupTime}</p>
        </div>
        <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:16px 0;text-align:center">
          <p style="margin:0 0 4px;font-size:13px;color:#92400e">Amount Due</p>
          <p style="margin:0;font-size:28px;font-weight:bold;color:#92400e">$${(order.totalPriceCents / 100).toFixed(2)}</p>
        </div>
        <p style="font-size:14px;color:#374151">To pay, please reply to this email or call us at <strong>(717) 208-7256</strong>. Payment options include credit card over the phone, Venmo, or in-store.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(order.customerEmail, `Invoice — Bakery Order #${order.orderNumber} — $${(order.totalPriceCents / 100).toFixed(2)}`, html);
}

// ── Customer Password Reset ──

export async function sendCustomerPasswordReset(opts: {
  customerEmail: string;
  customerName: string;
  resetUrl: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#1a1a1a;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#A1AB74;margin:0;font-size:22px">Urban Churn</h1>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:15px;color:#374151">Hi ${opts.customerName},</p>
        <p style="font-size:14px;color:#374151">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${opts.resetUrl}" style="display:inline-block;background:#A1AB74;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
        </div>
        <p style="font-size:13px;color:#6b7280">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.customerEmail, "Reset Your Password — Urban Churn", html);
}

export async function sendEventQuestionNotification(opts: {
  eventTitle: string;
  name: string;
  email: string;
  message: string;
}) {
  const CONTACT_EMAIL = "contact@urbanchurn.com";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${headerHtml('Event Question')}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Question About: ${opts.eventTitle}</h2>
        <p style="font-size:14px;color:#374151"><strong>From:</strong> ${opts.name} (${opts.email})</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="font-size:14px;color:#374151;margin:0;white-space:pre-line">${opts.message}</p>
        </div>
        <p style="font-size:13px;color:#6b7280">Reply directly to ${opts.email} to respond.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Events</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Event Question: ${opts.eventTitle} — from ${opts.name}`, html);
}

// ── Career Application Emails ──

export async function sendCareerApplicationNotification(data: {
  name: string;
  email: string;
  phone: string;
  location: string;
  about: string;
  why: string;
}) {
  const CONTACT_EMAIL = "contact@urbanchurn.com";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Career Application 🎉</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:120px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${data.phone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Location</td><td style="padding:8px;border-bottom:1px solid #eee">${data.location}</td></tr>
        </table>
        ${data.about ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>About Themselves:</strong></p><p style="margin:0;white-space:pre-wrap">${data.about}</p></div>` : ""}
        ${data.why ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>Why They Want to Join:</strong></p><p style="margin:0;white-space:pre-wrap">${data.why}</p></div>` : ""}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Career Application</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Career Application: ${data.location} — ${data.name}`, html);
}

export async function sendCareerApplicationConfirmation(data: {
  name: string;
  email: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Thanks for applying! 🍦</h2>
        <p>Hi ${data.name},</p>
        <p>We've received your application to join the Urban Churn team. We'll review it and reach out shortly for a quick conversation.</p>
        <p>In the meantime, feel free to stop by one of our shops — we'd love to meet you!</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(data.email, "Application Received — Urban Churn", html);
}

// ── Wholesale Order Emails ──

export async function sendFundraisingFormNotification(data: {
  orgName: string;
  contactName: string;
  email: string;
  phone: string;
  orgType: string;
  message: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Fundraiser Application</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:140px">Organization</td><td style="padding:8px;border-bottom:1px solid #eee">${data.orgName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Contact Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.contactName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${data.phone || "(not provided)"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Programme Interest</td><td style="padding:8px;border-bottom:1px solid #eee">${data.orgType}</td></tr>
        </table>
        ${data.message ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0 0 4px"><strong>About the Organization:</strong></p><p style="margin:0;white-space:pre-wrap">${data.message}</p></div>` : ""}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Fundraiser Application</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(CONTACT_EMAIL, `Fundraiser Application: ${data.orgName} — ${data.contactName}`, html);
}

export async function sendFundraisingFormConfirmation(data: {
  contactName: string;
  email: string;
  orgName: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Application Received! 🏫</h2>
        <p>Hi ${data.contactName},</p>
        <p>Thanks for your fundraiser application for <strong>${data.orgName}</strong>. We'll review your details and reach out within 2 business days with next steps.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(data.email, "Fundraiser Application Received — Urban Churn", html);
}

export async function sendWholesaleOrderReceived(opts: {
  to: string;
  customerName: string;
  orderNumber: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Order Received ✓</h2>
        <p>Hi ${opts.customerName},</p>
        <p>We received your wholesale order (<strong>${opts.orderNumber}</strong>) and are reviewing it now. We'll confirm the details and delivery date shortly.</p>
        <p>If you need to make any changes, just reply to this email or contact us directly.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Wholesale</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.to, `Order Received — ${opts.orderNumber}`, html);
}

export async function sendWholesaleOrderConfirmed(opts: {
  to: string;
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
  items: { description: string; quantity: number }[];
}) {
  const itemRows = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Order Confirmed! 🍦</h2>
        <p>Hi ${opts.customerName},</p>
        <p>Your wholesale order <strong>${opts.orderNumber}</strong> has been confirmed.</p>
        <p><strong>Delivery/Pickup Date:</strong> ${opts.deliveryDate}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Item</th><th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Qty</th></tr>
          ${itemRows}
        </table>
        <p>If anything looks off, please reply to this email right away.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn Craft Ice Cream — Wholesale</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.to, `Order Confirmed — ${opts.orderNumber}`, html);
}

export async function sendDeliveryRunAssignment(opts: {
  to: string;
  driverName: string;
  runName: string;
  scheduledDate: string;
  vehicleNotes: string;
  notes: string;
  driverUrl?: string;
}) {
  const dateStr = new Date(opts.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const vehicleLine = opts.vehicleNotes
    ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:120px">Vehicle</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.vehicleNotes}</td></tr>`
    : "";
  const notesLine = opts.notes
    ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Notes</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.notes}</td></tr>`
    : "";
  const driverLinkSection = opts.driverUrl
    ? `<p style="margin-top:20px"><a href="${opts.driverUrl}" style="display:inline-block;background:#A1AB74;color:#111118;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open Driver App &rarr;</a></p><p style="color:#9ca3af;font-size:12px">Or copy this link: ${opts.driverUrl}</p>`
    : `<p>Log in to the admin dashboard to see the full route with stop details.</p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Delivery Run Assignment 🚚</h2>
        <p>Hi ${opts.driverName || "there"},</p>
        <p>You've been assigned to a delivery run:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:120px">Run</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.runName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee">${dateStr}</td></tr>
          ${vehicleLine}
          ${notesLine}
        </table>
        ${driverLinkSection}
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.to, `Delivery Run Assignment — ${opts.runName}`, html);
}

export async function sendAdminWholesaleOrderAlert(opts: {
  customerName: string;
  orderNumber: string;
  confidence: number;
  itemCount: number;
  note?: string;
}) {
  const confidenceColor =
    opts.confidence >= 0.9
      ? "#22c55e"
      : opts.confidence >= 0.7
        ? "#eab308"
        : "#ef4444";
  const confidencePct = Math.round(opts.confidence * 100);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${headerHtml('Admin')}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">New Wholesale Order 📦</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:140px">Customer</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.customerName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Order</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.orderNumber}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Items</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.itemCount} line items</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">AI Confidence</td><td style="padding:8px;border-bottom:1px solid #eee"><span style="color:${confidenceColor};font-weight:bold">${confidencePct}%</span></td></tr>
        </table>
        ${opts.note ? `<div style="background:#fef3c7;padding:12px;border-radius:8px;margin:16px 0"><strong>⚠️ Note:</strong> ${opts.note}</div>` : ""}
        <p>Review and confirm this order in the admin dashboard.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn — Wholesale Admin Alert</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(
    ADMIN_EMAIL,
    `Wholesale Order: ${opts.orderNumber} — ${opts.customerName}`,
    html,
  );
}

export async function sendWholesaleParseFailureAlert(opts: {
  customerName: string;
  senderEmail: string;
  subject: string;
  error: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${headerHtml('Admin')}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0;color:#ef4444">⚠️ Email Parse Failure</h2>
        <p>A wholesale email could not be parsed automatically:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;width:120px">Customer</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.customerName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">From</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.senderEmail}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Subject</td><td style="padding:8px;border-bottom:1px solid #eee">${opts.subject}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Error</td><td style="padding:8px;border-bottom:1px solid #eee;color:#ef4444">${opts.error}</td></tr>
        </table>
        <p>The email has been logged. Please review it manually and create the order if needed.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Urban Churn — Wholesale Admin Alert</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(
    ADMIN_EMAIL,
    `⚠️ Wholesale Email Parse Failure — ${opts.customerName}`,
    html,
  );
}

// ── Wholesale Portal Emails ──

export async function sendWholesaleInvite(opts: {
  contactName: string;
  email: string;
  businessName: string;
  registerUrl: string;
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">You're Invited to the Wholesale Portal! 🤝</h2>
        <p>Hi ${opts.contactName},</p>
        <p>You've been invited to create an account on the Urban Churn wholesale ordering portal for <strong>${opts.businessName}</strong>.</p>
        <p>With your portal account you can:</p>
        <ul>
          <li>Browse available products and sizes</li>
          <li>Submit orders directly</li>
          <li>Track your order history and status</li>
        </ul>
        <div style="text-align:center;margin:24px 0">
          <a href="${opts.registerUrl}" style="display:inline-block;background:#A1AB74;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Create Your Account</a>
        </div>
        <p style="font-size:13px;color:#6b7280">This invite link expires in 7 days.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.email, "You're Invited — Urban Churn Wholesale Portal", html);
}

export async function sendWholesaleAccountApproved(opts: {
  contactName: string;
  email: string;
  businessName: string;
}) {
  const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Your Wholesale Account is Approved! ✅</h2>
        <p>Hi ${opts.contactName},</p>
        <p>Great news — your wholesale account for <strong>${opts.businessName}</strong> has been approved. You can now log in and start placing orders.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${baseUrl}/wholesale/portal" style="display:inline-block;background:#A1AB74;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Go to Wholesale Portal</a>
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.email, "Wholesale Account Approved — Urban Churn", html);
}

export async function sendWholesalePortalOrderConfirmation(opts: {
  customerEmail: string;
  contactName: string;
  businessName: string;
  orderNumber: string;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  deliveryMethod: string;
  requestedDeliveryDate: string | null;
}) {
  const itemsHtml = opts.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${i.description}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${i.unitPriceCents > 0 ? `$${((i.unitPriceCents * i.quantity) / 100).toFixed(2)}` : "TBD"}</td>
        </tr>`,
    )
    .join("");

  const deliveryInfo = opts.deliveryMethod === "pickup" ? "Pickup" : "Delivery";
  const dateInfo = opts.requestedDeliveryDate
    ? new Date(opts.requestedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be confirmed";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Wholesale Order Received! 📦</h2>
        <p>Hi ${opts.contactName},</p>
        <p>We've received your wholesale order <strong>#${opts.orderNumber}</strong> for ${opts.businessName}. Our team will review and confirm it shortly.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr><td colspan="2" style="padding:12px 8px;font-weight:bold;text-align:right">Estimated Total</td><td style="padding:12px 8px;font-weight:bold;text-align:right">$${(opts.subtotalCents / 100).toFixed(2)}</td></tr></tfoot>
        </table>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Method:</strong> ${deliveryInfo}</p>
          <p style="margin:0"><strong>Requested Date:</strong> ${dateInfo}</p>
        </div>
        <p>We'll send you an update once the order is confirmed.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.customerEmail, `Wholesale Order Received — #${opts.orderNumber}`, html);
}

export async function sendAdminWholesalePortalOrderAlert(opts: {
  businessName: string;
  orderNumber: string;
  itemCount: number;
  subtotalCents: number;
  deliveryMethod: string;
  requestedDeliveryDate: string | null;
}) {
  if (!ADMIN_EMAIL) return null;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#111">📦 New Wholesale Portal Order: #${opts.orderNumber}</h2>
      <ul>
        <li><strong>Business:</strong> ${opts.businessName}</li>
        <li><strong>Items:</strong> ${opts.itemCount}</li>
        <li><strong>Subtotal:</strong> $${(opts.subtotalCents / 100).toFixed(2)}</li>
        <li><strong>Method:</strong> ${opts.deliveryMethod}</li>
        <li><strong>Requested Date:</strong> ${opts.requestedDeliveryDate || "Not specified"}</li>
      </ul>
      <p><a href="${process.env.APP_URL || ""}/admin/wholesale" style="color:#A1AB74">View in Dashboard →</a></p>
    </div>`;

  return send(ADMIN_EMAIL, `📦 Wholesale Portal Order #${opts.orderNumber} — ${opts.businessName}`, html);
}

// ── Wholesale Welcome Email (auto-created account with temp password) ──

export async function sendWholesaleWelcomeEmail(opts: {
  email: string;
  contactName: string;
  businessName: string;
  tempPassword: string;
}) {
  const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
  const loginUrl = `${baseUrl}/account/login`;
  const portalUrl = `${baseUrl}/wholesale/portal`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Welcome to the Urban Churn Wholesale Program! 🤝</h2>
        <p>Hi ${opts.contactName},</p>
        <p>Your wholesale account for <strong>${opts.businessName}</strong> has been created. You can now log in to the wholesale portal to browse products and place orders.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Login Email:</strong> ${opts.email}</p>
          <p style="margin:0 0 8px"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;font-size:15px">${opts.tempPassword}</code></p>
          <p style="margin:0"><strong>Login URL:</strong> <a href="${loginUrl}" style="color:#A1AB74">${loginUrl}</a></p>
        </div>
        <p style="color:#6b7280;font-size:13px">Please change your password from your account settings after your first login.</p>
        <p>With your portal account you can:</p>
        <ul>
          <li>Browse available wholesale products and sizes</li>
          <li>Submit orders directly online</li>
          <li>Track your order history and status</li>
        </ul>
        <div style="text-align:center;margin:24px 0">
          <a href="${portalUrl}" style="display:inline-block;background:#A1AB74;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Go to Wholesale Portal →</a>
        </div>
        <p style="color:#6b7280;font-size:13px">If you have any questions, contact us at <a href="mailto:contact@urbanchurn.com" style="color:#A1AB74">contact@urbanchurn.com</a> or call (717) 208-7256.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.email, "Welcome to Urban Churn Wholesale — Your Account is Ready", html);
}

// ── Gift Card Emails ──

export async function sendGiftCardDelivery(opts: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  amountCents: number;
  gan: string;
  personalMessage?: string | null;
}) {
  const amountFormatted = `$${(opts.amountCents / 100).toFixed(2)}`;
  const maskedGan = opts.gan.replace(/(.{4})/g, "$1 ").trim();

  const messageBlock = opts.personalMessage
    ? `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #A1AB74">
        <p style="margin:0;font-style:italic;color:#374151">"${opts.personalMessage}"</p>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280">— ${opts.senderName}</p>
      </div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">You've Received a Gift Card! 🎁</h2>
        <p>Hi ${opts.recipientName},</p>
        <p>${opts.senderName} sent you an Urban Churn digital gift card!</p>
        ${messageBlock}
        <div style="background:#111118;padding:24px;border-radius:12px;margin:20px 0;text-align:center">
          <p style="color:#A1AB74;font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Gift Card Value</p>
          <p style="color:#fff;font-size:32px;font-weight:bold;margin:0 0 16px">${amountFormatted}</p>
          <p style="color:#A1AB74;font-size:14px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Card Number</p>
          <p style="color:#fff;font-size:20px;font-family:monospace;margin:0;letter-spacing:2px">${maskedGan}</p>
        </div>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>How to Use Your Gift Card:</strong></p>
          <p style="margin:0 0 4px;font-size:14px">Present this card number at any Urban Churn location when you order.</p>
          <p style="margin:0;font-size:14px"><a href="https://app.squareup.com/gift/47S511R07983P/check-balance" style="color:#A1AB74">Check your balance</a> · <a href="https://app.squareup.com/gift/47S511R07983P/reload" style="color:#A1AB74">Reload your card</a></p>
        </div>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.recipientEmail, `${opts.senderName} sent you an Urban Churn gift card! 🎁`, html);
}

export async function sendGiftCardPurchaseConfirmation(opts: {
  buyerEmail: string;
  buyerName: string;
  recipientName: string;
  recipientEmail: string;
  amountCents: number;
  orderNumber: string;
}) {
  const amountFormatted = `$${(opts.amountCents / 100).toFixed(2)}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      ${HEADER_HTML}
      <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h2 style="margin-top:0">Gift Card Purchase Confirmed! 🎉</h2>
        <p>Hi ${opts.buyerName},</p>
        <p>Your digital gift card purchase has been processed successfully.</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px"><strong>Order:</strong> #${opts.orderNumber}</p>
          <p style="margin:0 0 4px"><strong>Amount:</strong> ${amountFormatted}</p>
          <p style="margin:0 0 4px"><strong>To:</strong> ${opts.recipientName} (${opts.recipientEmail})</p>
          <p style="margin:0"><strong>Delivery:</strong> Sent via email</p>
        </div>
        <p>The recipient will receive their gift card by email shortly.</p>
        ${FOOTER_HTML}
      </div>
    </div>`;

  return send(opts.buyerEmail, `Gift Card Purchase Confirmed — #${opts.orderNumber}`, html);
}
