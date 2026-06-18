import {
    resolveSocialPlatform,
    SOCIAL_PLATFORM_STYLES,
    type SocialPlatform,
} from "./social-icons";

export { SOCIAL_PLATFORM_OPTIONS } from "./social-icons";

export interface EmailSection {
    id: string;
    type: string;
    props: Record<string, any>;
}

export interface EmailGlobalStyles {
    backgroundColor?: string;
    contentBackgroundColor?: string;
    fontFamily?: string;
    linkColor?: string;
    containerWidth?: number;
}

export interface EmailDocument {
    version: 1;
    sections: EmailSection[];
    globalStyles?: EmailGlobalStyles;
}

export interface EmailColumn {
    content?: string;
    width?: number;
    backgroundColor?: string;
    padding?: number;
}

export interface CompileOptions {
    /** Force stacked column layout (mobile preview in editor). */
    forceMobileLayout?: boolean;
}

const DEFAULT_BRAND = {
    name: "Urban Churn",
    accentColor: "#A1AB74",
    logoUrl: "https://urbanchurn.com/images/uc-logo-white.png",
    address: { city: "Harrisburg", state: "PA" },
};

const DEFAULT_STYLES: Required<EmailGlobalStyles> = {
    backgroundColor: "#f3f4f6",
    contentBackgroundColor: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    linkColor: DEFAULT_BRAND.accentColor,
    containerWidth: 600,
};

const RESPONSIVE_COLUMN_CSS = `
@media only screen and (max-width: 480px) {
  .email-stack-col {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .email-cols-row {
    display: block !important;
    width: 100% !important;
  }
}
.email-preview-mobile .email-stack-col {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.email-preview-mobile .email-cols-row {
  display: block !important;
  width: 100% !important;
}
`;

function esc(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function padStyle(p: Record<string, any>, defaultY: number, defaultX: number): string {
    const py = typeof p.paddingY === "number" ? p.paddingY : defaultY;
    const px = typeof p.paddingX === "number" ? p.paddingX : defaultX;
    return `${py}px ${px}px`;
}

function resolveColumnWidths(cols: EmailColumn[]): number[] {
    const explicit = cols.map((col) =>
        typeof col.width === "number" && col.width > 0 ? col.width : null,
    );
    const explicitSum = explicit
        .filter((width): width is number => width !== null)
        .reduce((sum, width) => sum + width, 0);
    const unsetCount = explicit.filter((width) => width === null).length;
    const remaining = Math.max(0, 100 - explicitSum);
    const fallback = unsetCount > 0 ? Math.floor(remaining / unsetCount) : 0;
    return explicit.map((width) => width ?? fallback);
}

function documentUsesStackedColumns(sections: EmailSection[]): boolean {
    return sections.some(
        (section) => section.type === "emailColumns" && section.props?.stackOnMobile !== false,
    );
}

function renderSocialIconLink(
    link: { label?: string; url?: string; platform?: string },
    size: number,
    spacing: number,
    textColor: string,
    displayMode: string,
): string {
    if (!link.url) return "";

    if (displayMode !== "icons") {
        return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 ${spacing / 2}px;color:${textColor};font-size:14px;text-decoration:none">${esc(link.label || link.url)}</a>`;
    }

    const platform = resolveSocialPlatform(link.platform, link.label, link.url);
    const style = SOCIAL_PLATFORM_STYLES[platform as SocialPlatform] ?? SOCIAL_PLATFORM_STYLES.custom;
    const fontSize = Math.max(10, Math.round(size * 0.38));

    return `<a href="${esc(link.url)}" target="_blank" title="${esc(link.label || style.label)}" style="display:inline-block;margin:0 ${spacing / 2}px;text-decoration:none">
  <span style="display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;text-align:center;background:${style.bg};color:#ffffff;border-radius:50%;font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}px;font-weight:bold">${style.glyph}</span>
</a>`;
}

function renderColumnsSection(
    p: Record<string, any>,
    styles: Required<EmailGlobalStyles>,
): string {
    const cols: EmailColumn[] = Array.isArray(p.columns)
        ? p.columns
        : [{ content: "<p>Left column</p>" }, { content: "<p>Right column</p>" }];
    const stackOnMobile = p.stackOnMobile !== false;
    const gap = typeof p.gap === "number" ? p.gap : 16;
    const valign = p.verticalAlign || "top";
    const widths = resolveColumnWidths(cols);
    const stackClass = stackOnMobile ? ' class="email-stack-col"' : "";
    const sectionBg = p.backgroundColor ? `background:${p.backgroundColor};` : "";

    const cells = cols
        .map((col, index) => {
            const widthPct = widths[index] ?? Math.floor(100 / cols.length);
            const colPad = typeof col.padding === "number" ? col.padding : gap / 2;
            const colBg = col.backgroundColor ? `background:${col.backgroundColor};` : "";
            return `<td${stackClass} width="${widthPct}%" valign="${esc(valign)}" style="padding:${colPad}px;width:${widthPct}%;font-family:${styles.fontFamily};font-size:14px;line-height:1.5;color:#374151;vertical-align:${esc(valign)};${colBg}">${col.content || ""}</td>`;
        })
        .join("");

    return `
<tr><td style="${sectionBg}padding:${padStyle(p, 8, 16)}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-cols-table">
    <tr class="email-cols-row">${cells}</tr>
  </table>
</td></tr>`;
}

function renderProductCard(
    p: Record<string, any>,
    styles: Required<EmailGlobalStyles>,
): string {
    const cardBg = p.backgroundColor || "#ffffff";
    const cardBorder = p.borderColor || "#e5e7eb";
    const priceColor = p.priceColor || styles.linkColor;
    const buttonBg = p.buttonBg || styles.linkColor;
    const buttonColor = p.buttonColor || "#ffffff";
    const imagePosition = p.imagePosition === "top" ? "top" : "left";

    const imageCell = p.imageUrl
        ? imagePosition === "top"
            ? `<tr><td colspan="2" style="padding:0"><img src="${esc(p.imageUrl)}" alt="" style="width:100%;max-height:220px;object-fit:cover;display:block" /></td></tr>`
            : `<td width="120" style="padding:0;vertical-align:top"><img src="${esc(p.imageUrl)}" alt="" style="width:120px;height:120px;object-fit:cover;display:block" /></td>`
        : "";

    const contentCell = `
<td style="padding:16px;font-family:${styles.fontFamily};vertical-align:top">
  <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#111827">${esc(p.title || "Product name")}</p>
  ${p.description ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.5">${esc(p.description)}</p>` : ""}
  ${p.price ? `<p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:${priceColor}">${esc(p.price)}</p>` : ""}
  ${p.buttonLabel ? `<a href="${esc(p.buttonHref || "#")}" target="_blank" style="display:inline-block;padding:8px 16px;background:${buttonBg};color:${buttonColor};font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px">${esc(p.buttonLabel)}</a>` : ""}
</td>`;

    if (imagePosition === "top") {
        return `
<tr><td style="padding:${padStyle(p, 16, 24)}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${cardBorder};border-radius:8px;overflow:hidden;background:${cardBg}">
    ${imageCell}
    <tr>${contentCell}</tr>
  </table>
</td></tr>`;
    }

    return `
<tr><td style="padding:${padStyle(p, 16, 24)}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${cardBorder};border-radius:8px;overflow:hidden;background:${cardBg}">
    <tr>
      ${imageCell}
      ${contentCell}
    </tr>
  </table>
</td></tr>`;
}

export function renderEmailSection(
    section: EmailSection,
    styles: Required<EmailGlobalStyles>,
): string {
    const p = section.props ?? {};

    switch (section.type) {
        case "emailHeader": {
            const headerBg = p.backgroundColor || "#0a0a0f";
            const headerTitleColor = p.titleColor || "#ffffff";
            const headerSubtitleColor = p.subtitleColor || "#60a5fa";
            const logoMaxHeight = typeof p.logoMaxHeight === "number" && p.logoMaxHeight > 0 ? p.logoMaxHeight : 48;
            const roundTop = p.roundTopCorners !== false;
            const borderRadius = roundTop ? "border-radius:12px 12px 0 0;" : "";
            return `
<tr><td style="background:${headerBg};padding:${padStyle(p, 24, 24)};text-align:center;${borderRadius}">
  ${p.logoUrl ? `<img src="${esc(p.logoUrl)}" alt="${esc(p.alt || DEFAULT_BRAND.name)}" style="max-height:${logoMaxHeight}px;max-width:220px;height:auto;display:block;margin:0 auto" />` : `<span style="color:${headerTitleColor};font-size:20px;font-weight:bold">${esc(p.title || DEFAULT_BRAND.name)}</span>`}
  ${p.subtitle ? `<p style="color:${headerSubtitleColor};margin:8px 0 0;font-size:14px">${esc(p.subtitle)}</p>` : ""}
</td></tr>`;
        }

        case "emailText": {
            const textBg = p.backgroundColor ? `background:${p.backgroundColor};` : "";
            const lineHeight = typeof p.lineHeight === "number" ? p.lineHeight : 1.6;
            return `
<tr><td style="${textBg}padding:${padStyle(p, 16, 24)};font-family:${styles.fontFamily};font-size:${p.fontSize || 16}px;line-height:${lineHeight};color:${p.color || "#374151"};text-align:${p.align || "left"}">
  ${p.content || "<p>Your text here</p>"}
</td></tr>`;
        }

        case "emailImage": {
            if (!p.src) return "";
            const imageBg = p.backgroundColor ? `background:${p.backgroundColor};` : "";
            const radius = typeof p.borderRadius === "number" ? p.borderRadius : 0;
            const imgStyle = `max-width:100%;height:auto;display:inline-block;border-radius:${radius}px;${p.width && p.width > 0 ? `width:${p.width}px;` : ""}`;
            return `
<tr><td style="${imageBg}padding:${padStyle(p, 16, 24)};text-align:${p.align || "center"}">
  ${p.href ? `<a href="${esc(p.href)}" target="_blank">` : ""}
  <img src="${esc(p.src)}" alt="${esc(p.alt || "")}" style="${imgStyle}" />
  ${p.href ? "</a>" : ""}
  ${p.caption ? `<p style="margin:8px 0 0;font-family:${styles.fontFamily};font-size:13px;color:#6b7280;text-align:${p.align || "center"}">${esc(p.caption)}</p>` : ""}
</td></tr>`;
        }

        case "emailButton": {
            const btnRadius = typeof p.borderRadius === "number" ? p.borderRadius : 8;
            const btnPadY = typeof p.paddingY === "number" ? p.paddingY : 12;
            const btnPadX = typeof p.paddingX === "number" ? p.paddingX : 24;
            const fullWidth = !!p.fullWidth;
            const align = p.align || "center";
            const tableWidth = fullWidth ? ' width="100%"' : "";
            const cellAlign = fullWidth ? align : "center";

            return `
<tr><td style="padding:${padStyle(p, 16, 24)};text-align:${align}">
  <table role="presentation"${tableWidth} cellpadding="0" cellspacing="0" style="${fullWidth ? "" : "margin:0 auto;"}">
    <tr>
      <td align="${cellAlign}" style="background:${p.backgroundColor || styles.linkColor};border-radius:${btnRadius}px;${fullWidth ? "width:100%;" : ""}">
        <a href="${esc(p.href || "#")}" target="_blank" style="display:inline-block;padding:${btnPadY}px ${btnPadX}px;color:${p.textColor || "#ffffff"};font-family:${styles.fontFamily};font-size:16px;font-weight:bold;text-decoration:none;${fullWidth ? "width:100%;text-align:center;box-sizing:border-box;" : ""}">${esc(p.label || "Click here")}</a>
      </td>
    </tr>
  </table>
</td></tr>`;
        }

        case "emailDivider":
            return `
<tr><td style="padding:8px 24px">
  <hr style="border:none;border-top:${p.thickness || 1}px solid ${p.color || "#e5e7eb"};margin:0" />
</td></tr>`;

        case "emailColumns":
            return renderColumnsSection(p, styles);

        case "emailFooter": {
            const footerBg = p.backgroundColor || "transparent";
            const footerColor = p.textColor || "#9ca3af";
            const footerBorder = p.borderColor || "#e5e7eb";
            const footerFontSize = typeof p.fontSize === "number" ? p.fontSize : 12;
            const unsubText = p.unsubscribeText || "Unsubscribe";
            return `
<tr><td style="padding:${padStyle(p, 24, 24)};border-top:1px solid ${footerBorder};background:${footerBg};font-family:${styles.fontFamily};font-size:${footerFontSize}px;color:${footerColor};text-align:center">
  <p style="margin:0 0 8px">${esc(p.companyName || DEFAULT_BRAND.name)} · ${esc(p.address || `${DEFAULT_BRAND.address.city}, ${DEFAULT_BRAND.address.state}`)}</p>
  ${p.showUnsubscribe !== false ? `<p style="margin:0 0 8px"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${footerColor}">${esc(unsubText)}</a></p>` : ""}
  ${p.extraText ? `<p style="margin:0">${esc(p.extraText)}</p>` : ""}
</td></tr>`;
        }

        case "emailSpacer": {
            const spacerBg = p.backgroundColor ? `background:${p.backgroundColor};` : "";
            return `
<tr><td style="${spacerBg}height:${p.height || 24}px;line-height:${p.height || 24}px;font-size:0">&nbsp;</td></tr>`;
        }

        case "emailHero": {
            const heroPadTop = typeof p.paddingTop === "number" ? p.paddingTop : 32;
            const heroPadBottom = typeof p.paddingBottom === "number" ? p.paddingBottom : 32;
            const minHeight = typeof p.minHeight === "number" && p.minHeight > 0 ? `min-height:${p.minHeight}px;` : "";
            return `
<tr><td style="padding:0">
  ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="" style="width:100%;max-width:100%;display:block" />` : ""}
  <div style="padding:${heroPadTop}px 24px ${heroPadBottom}px;text-align:center;background:${p.backgroundColor || styles.linkColor};${minHeight}">
    <h1 style="margin:0 0 12px;font-family:${styles.fontFamily};font-size:${p.titleSize || 28}px;color:${p.titleColor || "#ffffff"}">${esc(p.title || "Hero headline")}</h1>
    ${p.subtitle ? `<p style="margin:0 0 20px;font-family:${styles.fontFamily};font-size:16px;color:${p.subtitleColor || "#e0e7ff"}">${esc(p.subtitle)}</p>` : ""}
    ${p.buttonLabel ? `<a href="${esc(p.buttonHref || "#")}" target="_blank" style="display:inline-block;padding:12px 28px;background:${p.buttonBg || "#ffffff"};color:${p.buttonColor || styles.linkColor};font-family:${styles.fontFamily};font-size:16px;font-weight:bold;text-decoration:none;border-radius:8px">${esc(p.buttonLabel)}</a>` : ""}
  </div>
</td></tr>`;
        }

        case "emailSocial": {
            const links = Array.isArray(p.links) ? p.links : [];
            const socialAlign = p.align || "center";
            const displayMode = p.displayMode || "text";
            const linkColor = p.linkColor || styles.linkColor;
            const iconSize = typeof p.iconSize === "number" ? p.iconSize : 36;
            const iconSpacing = typeof p.iconSpacing === "number" ? p.iconSpacing : 8;
            const icons = links
                .map((link: { label?: string; url?: string; platform?: string }) =>
                    renderSocialIconLink(link, iconSize, iconSpacing, linkColor, displayMode),
                )
                .join("");
            return `
<tr><td style="padding:${padStyle(p, 20, 24)};text-align:${socialAlign};font-family:${styles.fontFamily}">
  ${icons || "<span style='color:#9ca3af;font-size:13px'>Add social links</span>"}
</td></tr>`;
        }

        case "emailProductCard":
            return renderProductCard(p, styles);

        default:
            return "";
    }
}

export function getResponsiveColumnCss(): string {
    return RESPONSIVE_COLUMN_CSS;
}

export function compileSectionPreview(
    section: EmailSection,
    globalStyles?: EmailGlobalStyles,
    options?: CompileOptions,
): string {
    const styles = { ...DEFAULT_STYLES, ...(globalStyles ?? {}) };
    const bodyClass = options?.forceMobileLayout ? ' class="email-preview-mobile"' : "";
    const needsStackCss =
        section.type === "emailColumns" && section.props?.stackOnMobile !== false;
    const sectionHtml = renderEmailSection(section, styles);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${needsStackCss ? `<style type="text/css">${RESPONSIVE_COLUMN_CSS}</style>` : ""}
</head>
<body${bodyClass} style="margin:0;padding:0;background:${styles.contentBackgroundColor};font-family:${styles.fontFamily}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${styles.contentBackgroundColor}">
    ${sectionHtml}
  </table>
</body>
</html>`;
}

export function compileEmailDocument(doc: EmailDocument, options?: CompileOptions): string {
    const styles = { ...DEFAULT_STYLES, ...(doc.globalStyles ?? {}) };
    const sections = (doc.sections ?? []).map((section) => renderEmailSection(section, styles)).join("");
    const needsStackCss = documentUsesStackedColumns(doc.sections ?? []);
    const bodyClass = options?.forceMobileLayout ? ' class="email-preview-mobile"' : "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${needsStackCss || options?.forceMobileLayout ? `<style type="text/css">${RESPONSIVE_COLUMN_CSS}</style>` : ""}
</head>
<body${bodyClass} style="margin:0;padding:0;background:${styles.backgroundColor};font-family:${styles.fontFamily}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${styles.backgroundColor}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="${styles.containerWidth}" cellpadding="0" cellspacing="0" style="max-width:${styles.containerWidth}px;width:100%;background:${styles.contentBackgroundColor};border-radius:12px;overflow:hidden">
        ${sections}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function createBlankEmailDocument(): EmailDocument {
    return {
        version: 1,
        globalStyles: { ...DEFAULT_STYLES },
        sections: [
            {
                id: "header-1",
                type: "emailHeader",
                props: { logoUrl: DEFAULT_BRAND.logoUrl, title: DEFAULT_BRAND.name },
            },
            {
                id: "text-1",
                type: "emailText",
                props: {
                    content: "<p>Hi {{{contact.first_name|there}}},</p><p>Write your message here.</p>",
                },
            },
            {
                id: "footer-1",
                type: "emailFooter",
                props: { showUnsubscribe: true },
            },
        ],
    };
}
