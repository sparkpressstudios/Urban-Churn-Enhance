import { useMemo, useId } from "react";

/* ─────────────────────────  Flavor Colors  ───────────────────────── */

const FLAVOR_COLORS: Record<string, { cake: string; mid: string; accent: string }> = {
    vanilla: { cake: "#F5E6D3", mid: "#EDD9C4", accent: "#E0CBB3" },
    chocolate: { cake: "#6D4C41", mid: "#5D4037", accent: "#4E342E" },
    "double-chocolate": { cake: "#5D4037", mid: "#4E342E", accent: "#3E2723" },
    funfetti: { cake: "#FFFDE7", mid: "#FFF9C4", accent: "#FFF59D" },
    "red-velvet": { cake: "#A52A2A", mid: "#8B0000", accent: "#7B0000" },
    lemon: { cake: "#FFFDE7", mid: "#FFF9C4", accent: "#FFF176" },
    strawberry: { cake: "#FFD1D6", mid: "#FFB3BA", accent: "#FF8A95" },
    "strawberries-n-cream": { cake: "#FFD1D6", mid: "#FFB3BA", accent: "#FF8A95" },
    "strawberries-cream": { cake: "#FFD1D6", mid: "#FFB3BA", accent: "#FF8A95" },
    "cookies-n-cream": { cake: "#FAFAFA", mid: "#F5F5F5", accent: "#EEEEEE" },
    "cookies-cream": { cake: "#FAFAFA", mid: "#F5F5F5", accent: "#EEEEEE" },
    "peanut-butter-cup": { cake: "#DFC09F", mid: "#D2B48C", accent: "#C19A6B" },
    "mint-chocolate-chip": { cake: "#C8E6C9", mid: "#A5D6A7", accent: "#81C784" },
    pumpkin: { cake: "#FF9800", mid: "#F57C00", accent: "#E65100" },
    "pumpkin-spice": { cake: "#F0A96E", mid: "#E8985E", accent: "#D97B3D" },
    "salted-caramel": { cake: "#DEB887", mid: "#D2691E", accent: "#A0522D" },
    smores: { cake: "#A1887F", mid: "#8D6E63", accent: "#6D4C41" },
    "s-mores": { cake: "#A1887F", mid: "#8D6E63", accent: "#6D4C41" },
    "carrot-cake": { cake: "#FF8A65", mid: "#E65100", accent: "#BF360C" },
    marble: { cake: "#EFEBE9", mid: "#D7CCC8", accent: "#BCAAA4" },
    almond: { cake: "#EFEBE9", mid: "#D7CCC8", accent: "#A1887F" },
    default: { cake: "#F5E6D3", mid: "#EDD9C4", accent: "#E0CBB3" },
};

const FROSTING_COLORS: Record<string, string> = {
    vanilla: "#FEFBF7", chocolate: "#5D4037", "double-chocolate": "#4E342E",
    "cream-cheese": "#FFFDE7", strawberry: "#FFB3BA", lemon: "#FFF9C4",
    "salted-caramel": "#D2691E", "cookies-n-cream": "#F5F5F5", almond: "#F5F0E8",
};

function slug(s: string) {
    return s.toLowerCase().replace(/[' &]/g, "-").replace(/--+/g, "-");
}
function getColors(flavor: string) { return FLAVOR_COLORS[slug(flavor)] || FLAVOR_COLORS.default; }
function getFrostingColor(flavor: string) { return FROSTING_COLORS[slug(flavor)] || "#FEFBF7"; }

/** Seeded pseudo-random — deterministic so the preview doesn't jitter on re-render */
function seededRandom(seed: number) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/** Lighten a hex color by a percentage (0-100) */
function lightenColor(hex: string, pct: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * pct / 100));
    const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * pct / 100));
    const b = Math.min(255, (num & 0xFF) + Math.round(255 * pct / 100));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Darken a hex color by a percentage (0-100) */
function darkenColor(hex: string, pct: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * pct / 100));
    const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * pct / 100));
    const b = Math.max(0, (num & 0xFF) - Math.round(255 * pct / 100));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/* ─────────────────────  Flavor-Specific Textures  ───────────────── */

function renderTexture(flavorKey: string, x: number, y: number, w: number, h: number, seed: number, isTop = false): string {
    const rng = seededRandom(seed);
    const key = slug(flavorKey);
    let svg = "";
    if (key === "cookies-n-cream" || key === "cookies-cream") {
        const count = isTop ? 35 : 70;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            const r = 0.6 + rng() * 1.1;
            svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#3E2723" opacity="${0.3 + rng() * 0.2}"/>`;
        }
    } else if (key === "funfetti") {
        const colors = ["#EC407A", "#42A5F5", "#FFEE58", "#66BB6A", "#AB47BC"];
        const count = isTop ? 25 : 60;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            const rw = 2 + rng() * 2, rh = 1 + rng() * 1;
            const rot = rng() * 180;
            svg += `<rect x="${cx}" y="${cy}" width="${rw}" height="${rh}" rx="0.5" fill="${colors[i % 5]}" opacity="0.7" transform="rotate(${rot},${cx},${cy})"/>`;
        }
    } else if (key === "strawberry" || key === "strawberries-n-cream" || key === "strawberries-cream") {
        const count = isTop ? 20 : 45;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            svg += `<circle cx="${cx}" cy="${cy}" r="${0.5 + rng() * 0.6}" fill="#D81B60" opacity="0.3"/>`;
        }
    } else if (key === "mint-chocolate-chip") {
        const count = isTop ? 18 : 40;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            svg += `<circle cx="${cx}" cy="${cy}" r="${0.7 + rng() * 1.0}" fill="#4E342E" opacity="0.5"/>`;
        }
    } else if (key === "marble") {
        for (let i = 0; i < 5; i++) {
            const sx = x + rng() * w, sy = y + rng() * h;
            const ex = x + rng() * w, ey = y + rng() * h;
            const mx = (sx + ex) / 2 + (rng() - 0.5) * 30;
            const my = (sy + ey) / 2 + (rng() - 0.5) * 15;
            svg += `<path d="M${sx},${sy} Q${mx},${my} ${ex},${ey}" fill="none" stroke="#5D4037" stroke-width="${1.5 + rng()}" opacity="0.2" stroke-linecap="round"/>`;
        }
    } else if (key === "s-mores" || key === "smores") {
        // Graham cracker flecks + marshmallow bits
        const count = isTop ? 15 : 30;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            if (i % 3 === 0) {
                svg += `<circle cx="${cx}" cy="${cy}" r="${0.6 + rng() * 0.5}" fill="#FAFAFA" opacity="0.4"/>`;
            } else {
                svg += `<rect x="${cx}" y="${cy}" width="${1.5 + rng()}" height="${1 + rng()}" rx="0.3" fill="#D2B48C" opacity="0.35" transform="rotate(${rng() * 90},${cx},${cy})"/>`;
            }
        }
    } else if (key === "carrot-cake") {
        const count = isTop ? 12 : 25;
        for (let i = 0; i < count; i++) {
            const cx = x + rng() * w, cy = y + rng() * h;
            svg += `<rect x="${cx}" y="${cy}" width="${1 + rng()}" height="${1.5 + rng()}" rx="0.4" fill="#BF360C" opacity="0.25" transform="rotate(${rng() * 180},${cx},${cy})"/>`;
        }
    }
    return svg;
}

/* ───────────  Wavy icing drips  ───────────── */

function generateDrips(cx: number, topY: number, rx: number, count: number, seed: number, color: string): string {
    const rng = seededRandom(seed);
    const dc = darkenColor(color, 5);
    const lc = lightenColor(color, 8);
    let svg = "";

    // Generate a continuous wavy icing edge using scallops around the visible front arc
    const scallops = Math.max(8, Math.round(count * 1.1));
    const arcStart = -0.15;           // slightly past left edge (radians from -PI)
    const arcEnd = Math.PI + 0.15;    // slightly past right edge
    const step = (arcEnd - arcStart) / scallops;

    // Build the wavy bottom edge path
    let wavePath = "";
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= scallops; i++) {
        const angle = arcStart + i * step;
        const px = cx + Math.cos(angle) * (rx - 1);
        // Each scallop dips down by a gentle, consistent amount with slight variation
        const dip = 6 + rng() * 5;   // 6-11px — short, icing-like
        const py = topY + (i % 2 === 0 ? dip : dip * 0.35);
        points.push({ x: px, y: py });
    }

    // Start from top-left, draw wavy bottom, close back across top
    wavePath += `M${cx - rx - 1},${topY - 1}`;
    // Smooth curve through scallop points
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i === 0) {
            wavePath += ` L${p.x},${p.y}`;
        } else {
            const prev = points[i - 1];
            const cpx = (prev.x + p.x) / 2;
            wavePath += ` Q${prev.x + (p.x - prev.x) * 0.15},${prev.y} ${cpx},${(prev.y + p.y) / 2} Q${p.x - (p.x - prev.x) * 0.15},${p.y} ${p.x},${p.y}`;
        }
    }
    // Close back across top
    wavePath += ` L${cx + rx + 1},${topY - 1} Z`;

    svg += `<path d="${wavePath}" fill="${color}" opacity="0.9"/>`;

    // Darker shadow along the bottom of each wave trough
    for (let i = 0; i < points.length - 1; i += 2) {
        const p = points[i];
        const next = points[Math.min(i + 1, points.length - 1)];
        svg += `<ellipse cx="${(p.x + next.x) / 2}" cy="${p.y - 1}" rx="${Math.abs(next.x - p.x) * 0.35}" ry="2" fill="${dc}" opacity="0.2"/>`;
    }

    // Glossy highlight along the top edge
    svg += `<path d="M${cx - rx * 0.7},${topY} Q${cx},${topY - 2} ${cx + rx * 0.7},${topY}" fill="none" stroke="${lc}" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>`;

    return svg;
}

/* ──────────────  Buttercream texture lines  ─────────────────────── */

function renderButtercreamLines(x: number, y: number, w: number, h: number, seed: number, color: string): string {
    const rng = seededRandom(seed);
    const lc = lightenColor(color, 8);
    let svg = "";
    const count = Math.floor(h / 3.5);
    for (let i = 0; i < count; i++) {
        const ly = y + 2 + i * 3.5 + (rng() - 0.5) * 1;
        const wobble1 = (rng() - 0.5) * 3;
        const wobble2 = (rng() - 0.5) * 3;
        svg += `<path d="M${x + 2},${ly} Q${x + w * 0.33},${ly + wobble1} ${x + w * 0.66},${ly + wobble2} T${x + w - 2},${ly}" fill="none" stroke="${lc}" stroke-width="0.8" opacity="0.22" stroke-linecap="round"/>`;
    }
    return svg;
}

/* ─────────────────────  Animated Candle + Flame  ─────────────────── */

function renderCandle(x: number, y: number, idx: number, uid: string): string {
    const colors = ["#EC407A", "#42A5F5", "#FFEE58", "#66BB6A", "#AB47BC"];
    const c = colors[idx % colors.length];
    const delay = idx * 0.15;
    return `
    <g class="candle-${uid}">
      <rect x="${x - 2.5}" y="${y}" width="5" height="18" rx="2" fill="${c}"/>
      <rect x="${x - 1.8}" y="${y}" width="3.6" height="18" rx="1.5" fill="${lightenColor(c, 12)}" opacity="0.3"/>
      <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 5}" stroke="#777" stroke-width="0.8"/>
      <g style="animation: flameDance-${uid} 1.8s ease-in-out ${delay}s infinite">
        <ellipse cx="${x}" cy="${y - 8}" rx="3" ry="5" fill="#FFD54F" opacity="0.9"/>
        <ellipse cx="${x}" cy="${y - 9}" rx="1.8" ry="3.2" fill="#FF8F00"/>
        <ellipse cx="${x}" cy="${y - 10}" rx="0.8" ry="1.6" fill="#FFFFFF" opacity="0.75"/>
      </g>
      <ellipse cx="${x}" cy="${y - 8}" rx="7" ry="7" fill="#FFD54F" opacity="0.12" style="animation: flameGlow-${uid} 2.2s ease-in-out ${delay + 0.3}s infinite"/>
    </g>`;
}

/** Render a cake plate / board */
function renderPlate(cx: number, y: number, w: number, uid: string): string {
    const pw = w + 28;
    return `
    <g style="animation:layerIn-${uid} 0.4s ease 0s both">
      <ellipse cx="${cx}" cy="${y + 6}" rx="${pw / 2 + 4}" ry="5" fill="black" opacity="0.06"/>
      <ellipse cx="${cx}" cy="${y}" rx="${pw / 2}" ry="8" fill="#F5F5F5"/>
      <ellipse cx="${cx}" cy="${y}" rx="${pw / 2 - 2}" ry="6.5" fill="#FAFAFA"/>
      <ellipse cx="${cx}" cy="${y - 1}" rx="${pw / 2 - 8}" ry="4" fill="white" opacity="0.3"/>
    </g>`;
}

/** Render a 3D cylindrical layer with top ellipse, body, bottom rim */
function renderCylinderLayer(
    cx: number, y: number, w: number, h: number, ry: number,
    fill: string, topFill: string, bottomFill: string, uid: string,
    delay: number, clipId?: string,
): string {
    let s = `<g style="animation:layerIn-${uid} 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) ${delay}s both">`;
    // Body — left/right curve for 3D
    s += `<path d="M${cx - w / 2},${y} L${cx - w / 2},${y + h} Q${cx - w / 2},${y + h + ry} ${cx},${y + h + ry} Q${cx + w / 2},${y + h + ry} ${cx + w / 2},${y + h} L${cx + w / 2},${y} Z" fill="${fill}"/>`;
    // Right edge shadow for 3D depth
    s += `<path d="M${cx + w / 2 - 8},${y} L${cx + w / 2 - 8},${y + h} Q${cx + w / 2 - 4},${y + h + ry * 0.8} ${cx + w / 2},${y + h} L${cx + w / 2},${y} Z" fill="black" opacity="0.06"/>`;
    // Left edge highlight
    s += `<path d="M${cx - w / 2},${y} L${cx - w / 2},${y + h} Q${cx - w / 2 + 4},${y + h + ry * 0.4} ${cx - w / 2 + 8},${y + h} L${cx - w / 2 + 8},${y} Z" fill="white" opacity="0.06"/>`;
    // Bottom rim ellipse
    s += `<ellipse cx="${cx}" cy="${y + h}" rx="${w / 2}" ry="${ry}" fill="${bottomFill}" opacity="0.5"/>`;
    // Top surface ellipse
    s += `<ellipse cx="${cx}" cy="${y}" rx="${w / 2}" ry="${ry}" fill="${topFill}"/>`;
    // Subtle specular highlight on top
    s += `<ellipse cx="${cx - w * 0.08}" cy="${y - ry * 0.15}" rx="${w * 0.25}" ry="${ry * 0.5}" fill="white" opacity="0.1"/>`;
    s += `</g>`;
    return s;
}

/* ───────────────────────────  Props  ─────────────────────────────── */

interface CakePreviewProps {
    orderType: string;
    cakeFlavor?: string;
    iceCreamFlavor?: string;
    frostingType?: string;
    frostingCoverage?: string;
    frostingFlavor?: string;
    cakeSize?: string;
    quantity?: number;
    topper?: string;
    filling?: string;
    naturalFrostingColor?: string;
}

export default function CakePreview({
    orderType, cakeFlavor = "", iceCreamFlavor = "", frostingType = "",
    frostingCoverage = "", frostingFlavor = "", cakeSize = "",
    quantity = 1, topper = "", filling = "", naturalFrostingColor = "",
}: CakePreviewProps) {
    const uid = useId().replace(/:/g, "");
    const svgContent = useMemo(() => {
        if (!orderType) {
            return `<svg viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">
        <style>@keyframes floatEmoji{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}</style>
        <text x="160" y="100" text-anchor="middle" font-size="48" style="animation:floatEmoji 2.5s ease-in-out infinite">🎂</text>
        <text x="160" y="140" text-anchor="middle" fill="#999" font-size="13" font-family="sans-serif">Select an order type</text>
        <text x="160" y="162" text-anchor="middle" fill="#bbb" font-size="11" font-family="sans-serif">to see a live preview</text>
      </svg>`;
        }
        if (orderType === "Cupcakes by the Dozen" || orderType === "Custom Cupcakes") {
            return renderCupcakes(
                orderType === "Custom Cupcakes" ? (cakeFlavor || "vanilla") : (iceCreamFlavor || cakeFlavor || "vanilla"),
                frostingFlavor || frostingType || "vanilla", Math.min(quantity, 6), uid,
            );
        }
        if (orderType === "Custom Cake") {
            return renderBakedCake(cakeFlavor, frostingFlavor, cakeSize, filling, topper, uid);
        }
        return renderIceCreamCake(orderType, cakeFlavor || iceCreamFlavor || "vanilla",
            iceCreamFlavor || cakeFlavor || "vanilla", frostingType, frostingCoverage, topper, uid, naturalFrostingColor, filling);
    }, [orderType, cakeFlavor, iceCreamFlavor, frostingType, frostingCoverage, frostingFlavor, cakeSize, quantity, topper, filling, uid, naturalFrostingColor]);

    return <div className="w-full max-w-[320px] mx-auto transition-all duration-500" dangerouslySetInnerHTML={{ __html: svgContent }} />;
}

/** Render a text banner topper (white rect with pink border and text) */
function renderTopperBanner(cx: number, bannerY: number, text: string, uid: string): string {
    const textLen = text.length;
    const bw = Math.max(100, textLen * 8 + 24);
    const bh = 26;
    return `
    <g style="animation:layerIn-${uid} 0.4s ease 0.65s both">
      <rect x="${cx - bw / 2}" y="${bannerY}" width="${bw}" height="${bh}" rx="5" fill="#FFF" stroke="#E91E63" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="${cx}" y="${bannerY + bh / 2 + 1}" font-family="'Playfair Display', serif" font-size="10" font-weight="600" fill="#E91E63" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </g>`;
}

/** Shared keyframes + defs */
function sharedDefs(uid: string): string {
    return `<style>
      @keyframes layerIn-${uid}{0%{opacity:0;transform:translateY(-10px) scaleX(0.94)}100%{opacity:1;transform:none}}
      @keyframes flameDance-${uid}{0%,100%{transform:translateY(0) scale(1) rotate(0deg)}25%{transform:translateY(-0.8px) scale(1.03) rotate(1deg)}50%{transform:translateY(-1.4px) scale(0.97) rotate(-0.5deg)}75%{transform:translateY(-0.5px) scale(1.02) rotate(0.5deg)}}
      @keyframes flameGlow-${uid}{0%,100%{opacity:0.12}50%{opacity:0.25}}
    </style>
    <defs><filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter></defs>`;
}

/** Build a 3-stop gradient def */
function gradientDef(id: string, top: string, mid: string, bot: string): string {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${top}"/><stop offset="50%" stop-color="${mid}"/><stop offset="100%" stop-color="${bot}"/></linearGradient>`;
}

/** Build a frosting gradient def (lighten→base→darken) */
function frostGradientDef(id: string, color: string): string {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${lightenColor(color, 10)}"/><stop offset="50%" stop-color="${color}"/><stop offset="100%" stop-color="${darkenColor(color, 6)}"/></linearGradient>`;
}

/* Filling color palette shared across renderers */
const FILLING_COLORS: Record<string, string> = {
    "Raspberry Jam": "#C62828", "Chocolate Ganache": "#3E2723", "Cherry Filling": "#B71C1C",
    "Salted Caramel": "#D2691E", "Peanut Butter": "#D2B48C", "Strawberry Jam": "#E91E63",
    "Lemon Curd": "#FFF176", "Strawberry": "#E91E63", "Cherry": "#B71C1C",
    "Marshmallow": "#F5F5F5", "Chocolate Fudge": "#3E2723", "Raspberry": "#C62828",
    "Cream Cheese": "#FFFDE7", "Cookies N Cream": "#E0E0E0",
};

/* ═══════════════════  ICE CREAM CAKE RENDERER  ═══════════════════ */

function renderIceCreamCake(
    orderType: string, cakeFlavor: string, iceCreamFlavor: string,
    frostingType: string, frostingCoverage: string, topper: string, uid: string,
    naturalFrostingColor = "", filling = "",
): string {
    const isPreStacked = orderType === "Pre-Stacked Ice Cream Cake";
    const btm = getColors(cakeFlavor);
    const top = getColors(isPreStacked ? cakeFlavor : iceCreamFlavor);
    const hasFrost = frostingType && frostingType !== "None";
    const allSides = frostingCoverage === "All over" || frostingCoverage === "All sides";
    let frostCol = hasFrost ? (frostingType === "Buttercream" ? "#FEFBF7" : "#F5F5F5") : "transparent";
    if (hasFrost && naturalFrostingColor) frostCol = naturalFrostingColor;

    const cx = 160, w = 190, layerH = 46, ry = 14;
    const plateY = 248;
    const btmY = plateY - layerH - 4;
    const topY = btmY - layerH + 2;

    let s = `<svg viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">`;
    s += sharedDefs(uid);

    // Gradients
    s += `<defs>`;
    s += gradientDef(`bg-${uid}`, btm.cake, btm.mid, btm.accent);
    s += gradientDef(`tg-${uid}`, top.cake, top.mid, top.accent);
    if (hasFrost) s += frostGradientDef(`frost-${uid}`, frostCol);
    s += `</defs>`;

    // Plate
    s += renderPlate(cx, plateY, w, uid);

    // Bottom layer — cake base (cylindrical)
    s += renderCylinderLayer(cx, btmY, w, layerH, ry, `url(#bg-${uid})`, btm.cake, btm.accent, uid, 0.1);
    // Texture on body
    s += `<g style="animation:layerIn-${uid} 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) 0.1s both">`;
    s += renderTexture(cakeFlavor, cx - w / 2 + 4, btmY + 4, w - 8, layerH - 4, 100);
    s += renderTexture(cakeFlavor, cx - w / 2 + 15, btmY - ry * 0.3, w - 30, ry * 0.7, 150, true);
    s += `</g>`;

    // Filling between layers
    if (filling) {
        const fc = FILLING_COLORS[filling] || "#D2691E";
        s += `<g style="animation:layerIn-${uid} 0.5s ease 0.18s both">`;
        s += `<ellipse cx="${cx}" cy="${topY + layerH}" rx="${w / 2 - 2}" ry="${ry - 2}" fill="${fc}" opacity="0.85"/>`;
        s += `<ellipse cx="${cx}" cy="${topY + layerH}" rx="${w / 2 - 6}" ry="${ry - 4}" fill="${lightenColor(fc, 12)}" opacity="0.3"/>`;
        s += `</g>`;
    }

    // Top layer — ice cream (cylindrical with shimmer)
    s += renderCylinderLayer(cx, topY, w, layerH, ry, `url(#tg-${uid})`, top.cake, top.accent, uid, 0.22);
    // Texture + ice crystal shimmer
    s += `<g style="animation:layerIn-${uid} 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) 0.22s both">`;
    const topKey = isPreStacked ? cakeFlavor : iceCreamFlavor;
    s += renderTexture(topKey, cx - w / 2 + 4, topY + 4, w - 8, layerH - 4, 200);
    s += renderTexture(topKey, cx - w / 2 + 15, topY - ry * 0.3, w - 30, ry * 0.7, 250, true);
    // Frost shimmer — tiny white dots for frozen look
    const shimmerRng = seededRandom(777);
    for (let i = 0; i < 20; i++) {
        const sx = cx - w / 2 + 8 + shimmerRng() * (w - 16);
        const sy = topY + 4 + shimmerRng() * (layerH - 8);
        s += `<circle cx="${sx}" cy="${sy}" r="${0.4 + shimmerRng() * 0.4}" fill="white" opacity="${0.15 + shimmerRng() * 0.15}"/>`;
    }
    s += `</g>`;

    // Frosting
    if (hasFrost) {
        s += `<g style="animation:layerIn-${uid} 0.5s ease 0.38s both">`;
        if (allSides) {
            // Full coverage — frosting wrap over entire cake sides
            s += `<path d="M${cx - w / 2 - 3},${topY + ry * 0.3} L${cx - w / 2 - 3},${btmY + layerH} Q${cx - w / 2 - 3},${btmY + layerH + ry + 2} ${cx},${btmY + layerH + ry + 2} Q${cx + w / 2 + 3},${btmY + layerH + ry + 2} ${cx + w / 2 + 3},${btmY + layerH} L${cx + w / 2 + 3},${topY + ry * 0.3} Z" fill="url(#frost-${uid})" opacity="0.5"/>`;
            // Buttercream lines on sides
            s += renderButtercreamLines(cx - w / 2 - 2, topY + ry, w + 4, btmY + layerH - topY - ry, 800, frostCol);
        }
        // Top frosting — thick ellipse with depth
        s += `<ellipse cx="${cx}" cy="${topY}" rx="${w / 2 + 3}" ry="${ry + 4}" fill="url(#frost-${uid})"/>`;
        // Glossy highlight on top
        s += `<ellipse cx="${cx - 10}" cy="${topY - 3}" rx="${w * 0.22}" ry="${ry * 0.45}" fill="white" opacity="0.18"/>`;
        // Drips
        s += generateDrips(cx, topY + ry * 0.6, w / 2, allSides ? 16 : 10, 42, frostCol);
        s += `</g>`;
    }

    // Candles — always visible on cakes
    s += `<g style="animation:layerIn-${uid} 0.4s ease 0.5s both">`;
    for (let i = 0; i < 3; i++) {
        s += renderCandle(cx - 18 + i * 18, topY - (hasFrost ? 18 : 12), i, uid);
    }
    s += `</g>`;

    if (topper) {
        s += renderTopperBanner(cx, topY - ry - 40, topper, uid);
    }

    s += `</svg>`;
    return s;
}

/* ═══════════════════  BAKED CAKE RENDERER  ═══════════════════════ */

function renderBakedCake(
    cakeFlavor: string, frostingFlavor: string, cakeSize: string,
    filling: string, topper: string, uid: string,
): string {
    const colors = getColors(cakeFlavor || "vanilla");
    const frostCol = getFrostingColor(frostingFlavor || "vanilla");
    const cx = 160;
    const sizeMap: Record<string, number> = { "6-inch": 140, "7-inch": 168, "8-inch": 192 };
    const w = sizeMap[cakeSize] || 168;
    const layerH = 24, layers = 3, ry = 12;
    const plateY = 260;
    const totalStackH = layers * layerH;
    const startY = plateY - totalStackH - 6;

    let s = `<svg viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">`;
    s += sharedDefs(uid);

    // Gradients
    s += `<defs>`;
    s += gradientDef(`cake-${uid}`, colors.cake, colors.mid, colors.accent);
    s += frostGradientDef(`frost-${uid}`, frostCol);
    s += `</defs>`;

    // Plate
    s += renderPlate(cx, plateY, w, uid);

    // Frosting wrap — contoured around the full cake (rendered BEHIND layers so layers peek through)
    s += `<g style="animation:layerIn-${uid} 0.5s ease 0.05s both">`;
    const frostW = w + 8, frostH = totalStackH + 10;
    s += `<path d="M${cx - frostW / 2},${startY - 2} L${cx - frostW / 2},${startY + frostH - ry} Q${cx - frostW / 2},${startY + frostH + ry * 0.5} ${cx},${startY + frostH + ry * 0.5} Q${cx + frostW / 2},${startY + frostH + ry * 0.5} ${cx + frostW / 2},${startY + frostH - ry} L${cx + frostW / 2},${startY - 2} Z" fill="url(#frost-${uid})" opacity="0.88"/>`;
    // Right-side shadow on frosting
    s += `<path d="M${cx + frostW / 2 - 10},${startY} L${cx + frostW / 2 - 10},${startY + frostH - ry} Q${cx + frostW / 2 - 5},${startY + frostH + ry * 0.3} ${cx + frostW / 2},${startY + frostH - ry} L${cx + frostW / 2},${startY} Z" fill="black" opacity="0.05"/>`;
    // Left highlight on frosting
    s += `<path d="M${cx - frostW / 2},${startY} L${cx - frostW / 2},${startY + frostH - ry} Q${cx - frostW / 2 + 5},${startY + frostH + ry * 0.2} ${cx - frostW / 2 + 10},${startY + frostH - ry} L${cx - frostW / 2 + 10},${startY} Z" fill="white" opacity="0.08"/>`;
    // Buttercream texture lines on frosting surface
    s += renderButtercreamLines(cx - frostW / 2 + 2, startY + 2, frostW - 4, frostH - 6, 900, frostCol);
    s += `</g>`;

    // Cake layers — visible as cross-section peeks where frosting is slightly transparent
    for (let i = 0; i < layers; i++) {
        const y = startY + i * layerH + 2;
        const del = 0.12 + i * 0.1;
        s += `<g style="animation:layerIn-${uid} 0.55s cubic-bezier(0.68,-0.55,0.265,1.55) ${del}s both">`;
        // Layer body (slightly narrower than frosting so frosting wraps around)
        const lw = w - 4;
        s += `<rect x="${cx - lw / 2}" y="${y}" width="${lw}" height="${layerH - 1}" rx="1" fill="url(#cake-${uid})" opacity="0.6"/>`;
        s += renderTexture(cakeFlavor, cx - lw / 2 + 2, y + 1, lw - 4, layerH - 3, 300 + i * 100);
        // Filling between layers
        if (i < layers - 1 && filling) {
            const fc = FILLING_COLORS[filling] || "#D2691E";
            s += `<rect x="${cx - lw / 2 + 4}" y="${y + layerH - 3}" width="${lw - 8}" height="4" rx="2" fill="${fc}" opacity="0.85"/>`;
            s += `<rect x="${cx - lw / 2 + 8}" y="${y + layerH - 2.5}" width="${lw - 16}" height="2" rx="1" fill="${lightenColor(fc, 14)}" opacity="0.35"/>`;
        }
        s += `</g>`;
    }

    // Top frosting surface — thick elliptical cap with rosette hint
    s += `<g style="animation:layerIn-${uid} 0.5s ease 0.42s both">`;
    s += `<ellipse cx="${cx}" cy="${startY}" rx="${frostW / 2}" ry="${ry + 3}" fill="url(#frost-${uid})"/>`;
    // Specular highlight
    s += `<ellipse cx="${cx - 10}" cy="${startY - 3}" rx="${w * 0.2}" ry="${ry * 0.4}" fill="white" opacity="0.2"/>`;
    // Rosette swirl on top — concentric rings in slightly different shade
    const rosCol = lightenColor(frostCol, 6);
    s += `<ellipse cx="${cx}" cy="${startY - 1}" rx="18" ry="8" fill="none" stroke="${rosCol}" stroke-width="1.5" opacity="0.25"/>`;
    s += `<ellipse cx="${cx}" cy="${startY - 1}" rx="10" ry="4.5" fill="none" stroke="${rosCol}" stroke-width="1.2" opacity="0.2"/>`;
    s += `<circle cx="${cx}" cy="${startY - 1}" r="3" fill="${rosCol}" opacity="0.2"/>`;
    // Drips
    s += generateDrips(cx, startY + ry * 0.5, frostW / 2 - 2, 16, 17, frostCol);
    s += `</g>`;

    // Bottom frosting ellipse
    s += `<g style="animation:layerIn-${uid} 0.4s ease 0.1s both">`;
    s += `<ellipse cx="${cx}" cy="${startY + totalStackH + 4}" rx="${frostW / 2}" ry="${ry}" fill="url(#frost-${uid})" opacity="0.7"/>`;
    s += `</g>`;

    // Size label
    s += `<text x="${cx}" y="${plateY + 20}" text-anchor="middle" fill="#aaa" font-size="10" font-family="sans-serif">${cakeSize || "7-inch"}</text>`;

    // Candles — always visible on cakes
    s += `<g style="animation:layerIn-${uid} 0.4s ease 0.55s both">`;
    for (let i = 0; i < 5; i++) {
        s += renderCandle(cx - 28 + i * 14, startY - 16, i, uid);
    }
    s += `</g>`;
    if (topper && topper !== "No Topper") {
        s += renderTopperBanner(cx, startY - ry - 46, topper, uid);
    }

    s += `</svg>`;
    return s;
}

/* ═══════════════════════  CUPCAKE RENDERER  ════════════════════════ */

/** Generate a frosting rosette swirl path */
function renderFrostingSwirl(x: number, y: number, frostCol: string, seed: number): string {
    const dc = darkenColor(frostCol, 5);
    const lc = lightenColor(frostCol, 8);
    let s = "";
    // Base dome
    s += `<path d="M${x - 18},${y + 18} Q${x - 22},${y + 6} ${x - 12},${y + 2} Q${x - 4},${y - 4} ${x},${y - 6} Q${x + 4},${y - 4} ${x + 12},${y + 2} Q${x + 22},${y + 6} ${x + 18},${y + 18} Z" fill="${frostCol}"/>`;
    // Depth shadow on right side
    s += `<path d="M${x + 10},${y + 4} Q${x + 18},${y + 8} ${x + 18},${y + 18} L${x + 14},${y + 18} Q${x + 16},${y + 10} ${x + 10},${y + 6} Z" fill="${dc}" opacity="0.25"/>`;
    // Swirl rings — concentric ovals getting smaller toward peak
    s += `<ellipse cx="${x}" cy="${y + 10}" rx="14" ry="5" fill="none" stroke="${lc}" stroke-width="1.6" opacity="0.3"/>`;
    s += `<ellipse cx="${x}" cy="${y + 4}" rx="10" ry="3.8" fill="none" stroke="${lc}" stroke-width="1.4" opacity="0.28"/>`;
    s += `<ellipse cx="${x}" cy="${y - 1}" rx="6" ry="2.8" fill="none" stroke="${lc}" stroke-width="1.2" opacity="0.25"/>`;
    // Peak
    s += `<circle cx="${x}" cy="${y - 5}" r="3" fill="${frostCol}"/>`;
    s += `<circle cx="${x}" cy="${y - 5}" r="1.5" fill="${lc}" opacity="0.35"/>`;
    // Main specular highlight
    s += `<path d="M${x - 10},${y + 12} Q${x - 5},${y + 3} ${x},${y + 4}" fill="none" stroke="white" stroke-width="2" opacity="0.3" stroke-linecap="round"/>`;
    return s;
}

function renderCupcakes(cakeFlavor: string, frostingFlavor: string, count: number, uid: string): string {
    const colors = getColors(cakeFlavor || "vanilla");
    const frostCol = getFrostingColor(frostingFlavor || "vanilla");
    const cols = Math.min(count, 3);
    const rows = Math.ceil(count / 3);
    const cW = 68, cH = 80, gx = 12, gy = 10;
    const totalW = cols * cW + (cols - 1) * gx;
    const startX = 160 - totalW / 2;
    const startY = 145 - (rows * cH + (rows - 1) * gy) / 2;

    let s = `<svg viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">`;
    s += `<style>@keyframes popIn-${uid}{0%{opacity:0;transform:scale(0.5)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}</style>`;

    for (let i = 0; i < count; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const x = startX + col * (cW + gx) + cW / 2;
        const y = startY + row * (cH + gy);
        const del = i * 0.08;
        const rng = seededRandom(500 + i * 37);
        const tilt = (rng() - 0.5) * 3; // slight random tilt for personality

        s += `<g style="animation:popIn-${uid} 0.4s cubic-bezier(0.68,-0.55,0.265,1.55) ${del}s both;transform-origin:${x}px ${y + 36}px" transform="rotate(${tilt},${x},${y + 36})">`;

        // Shadow
        s += `<ellipse cx="${x}" cy="${y + 62}" rx="18" ry="3.5" fill="black" opacity="0.07"/>`;

        // Wrapper — fluted with scalloped top edge
        const wTop = y + 26, wBot = y + 58;
        const wTopHalf = 19, wBotHalf = 15;
        // Main wrapper shape
        s += `<path d="M${x - wTopHalf},${wTop} L${x - wBotHalf},${wBot} Q${x},${wBot + 4} ${x + wBotHalf},${wBot} L${x + wTopHalf},${wTop} Z" fill="#A1887F"/>`;
        // Inner wrapper slightly lighter
        s += `<path d="M${x - wTopHalf + 2},${wTop + 1} L${x - wBotHalf + 2},${wBot - 1} Q${x},${wBot + 2} ${x + wBotHalf - 2},${wBot - 1} L${x + wTopHalf - 2},${wTop + 1} Z" fill="#BCAAA4" opacity="0.4"/>`;
        // Ridge lines
        for (let r = -14; r <= 14; r += 4) {
            const t = r / 14;
            const x1 = x + t * wTopHalf;
            const x2 = x + t * wBotHalf;
            s += `<line x1="${x1}" y1="${wTop + 1}" x2="${x2}" y2="${wBot - 1}" stroke="#8D6E63" stroke-width="0.5" opacity="0.35"/>`;
        }
        // Scalloped edge at top of wrapper
        const scallops = 8;
        for (let sc = 0; sc < scallops; sc++) {
            const sx = x - wTopHalf + (sc / scallops) * (wTopHalf * 2);
            const sw = (wTopHalf * 2) / scallops;
            s += `<path d="M${sx},${wTop} Q${sx + sw / 2},${wTop - 2.5} ${sx + sw},${wTop}" fill="#A1887F" stroke="#8D6E63" stroke-width="0.3"/>`;
        }

        // Cake muffin top (visible above wrapper rim)
        s += `<ellipse cx="${x}" cy="${wTop}" rx="${wTopHalf - 1}" ry="5" fill="${colors.mid}"/>`;
        s += `<rect x="${x - wTopHalf + 1}" y="${wTop - 3}" width="${(wTopHalf - 1) * 2}" height="6" rx="3" fill="${colors.cake}" opacity="0.7"/>`;
        s += renderTexture(cakeFlavor, x - wTopHalf + 3, wTop - 4, (wTopHalf - 3) * 2, 8, 400 + i * 50);

        // Frosting swirl
        renderFrostingSwirl(x, y, frostCol, 600 + i * 31);
        s += renderFrostingSwirl(x, y, frostCol, 600 + i * 31);

        s += `</g>`;
    }

    s += `<text x="160" y="286" text-anchor="middle" fill="#aaa" font-size="10" font-family="sans-serif">${count} dozen</text>`;
    s += `</svg>`;
    return s;
}
