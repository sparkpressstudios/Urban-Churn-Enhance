const CakeRenderer = {

    flavorColors: {
        'vanilla': { cake: '#F5E6D3', frosting: '#FEFBF7', accent: '#E8D7C3' },
        'chocolate': { cake: '#5D4037', frosting: '#6D4C41', accent: '#4E342E' },
        'double-chocolate': { cake: '#4E342E', frosting: '#5D4037', accent: '#3E2723' },
        'funfetti': { cake: '#FFF9C4', frosting: '#FFFFFF', accent: '#FFE082' },
        'red-velvet': { cake: '#8B0000', frosting: '#FFF8F0', accent: '#A52A2A' },
        'lemon': { cake: '#FFF9C4', frosting: '#FFFDE7', accent: '#FFF176' },
        'strawberry': { cake: '#FFB3BA', frosting: '#FFE5E8', accent: '#FF8A95' },
        'strawberries-cream': { cake: '#FFB3BA', frosting: '#FFE5E8', accent: '#FF8A95' },
        'strawberries-n-cream': { cake: '#FFB3BA', frosting: '#FFE5E8', accent: '#FF8A95' },
        'cookies-cream': { cake: '#F5F5F5', frosting: '#FFFFFF', accent: '#424242' },
        'cookies-n-cream': { cake: '#F5F5F5', frosting: '#FFFFFF', accent: '#424242' },
        'peanut-butter': { cake: '#D2B48C', frosting: '#F4E4C1', accent: '#C19A6B' },
        'peanut-butter-cup': { cake: '#D2B48C', frosting: '#F4E4C1', accent: '#C19A6B' },
        'mint-chocolate': { cake: '#4E342E', frosting: '#B2DFDB', accent: '#00897B' },
        'mint-chocolate-chip': { cake: '#4E342E', frosting: '#B2DFDB', accent: '#00897B' },
        'pumpkin': { cake: '#F57C00', frosting: '#FFE0B2', accent: '#E65100' },
        'pumpkin-spice': { cake: '#E8985E', frosting: '#FFE0B2', accent: '#D97B3D' },
        'salted-caramel': { cake: '#D2691E', frosting: '#FFE4B5', accent: '#8B4513' },
        'coffee': { cake: '#795548', frosting: '#EFEBE9', accent: '#5D4037' },
        'birthday-cake': { cake: '#FFF9C4', frosting: '#FFFFFF', accent: '#FFE082' },
        // New baked cake flavors
        'smores': { cake: '#8D6E63', frosting: '#FFFDE7', accent: '#5D4037' },
        'carrot': { cake: '#E65100', frosting: '#FFF8E1', accent: '#BF360C' },
        'carrot-cake': { cake: '#E65100', frosting: '#FFF8E1', accent: '#BF360C' },
        'marble': { cake: '#D7CCC8', frosting: '#FEFBF7', accent: '#5D4037' },
        'almond': { cake: '#D7CCC8', frosting: '#FFF8E1', accent: '#A1887F' },
        'cream-cheese': { cake: '#FFF8E1', frosting: '#FFFDE7', accent: '#FFF9C4' },
        'default': { cake: '#F5E6D3', frosting: '#FEFBF7', accent: '#E8D7C3' }
    },

    renderSideTexture(x, y, width, height, flavorKey) {
        let specks = '';
        function rand(min, max) { return Math.random() * (max - min) + min; }
        function circle(cx, cy, r, color, opacity = 0.4) {
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
        }
        // Cookies 'n Cream and Mint Chip: chocolatey specks
        if (flavorKey === 'cookies-cream' || flavorKey === 'cookies-n-cream' || flavorKey === 'mint-chocolate' || flavorKey === 'mint-chocolate-chip') {
            const count = flavorKey.includes('mint') ? 70 : 90;
            for (let i = 0; i < count; i++) {
                const cx = rand(x + 8, x + width - 8);
                const cy = rand(y + 6, y + height - 6);
                const r = rand(0.6, 1.7);
                specks += circle(cx, cy, r, '#3E2723', 0.45);
            }
        }
        // Funfetti: colorful confetti specks
        else if (flavorKey === 'funfetti' || flavorKey === 'birthday-cake') {
            const colors = ['#E91E63', '#2196F3', '#FFC107', '#4CAF50'];
            for (let i = 0; i < 80; i++) {
                const cx = rand(x + 8, x + width - 8);
                const cy = rand(y + 6, y + height - 6);
                const c = colors[Math.floor(rand(0, colors.length))];
                const w = rand(2, 4);
                const h = rand(1, 2);
                const rot = rand(0, 180);
                specks += `<rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="0.6" fill="${c}" opacity="0.75" transform="rotate(${rot} ${cx + w / 2} ${cy + h / 2})"/>`;
            }
        }
        // Strawberry: subtle pinkish seeds/flecks
        else if (flavorKey === 'strawberry' || flavorKey === 'strawberries-cream' || flavorKey === 'strawberries-n-cream') {
            for (let i = 0; i < 60; i++) {
                const cx = rand(x + 10, x + width - 10);
                const cy = rand(y + 8, y + height - 8);
                specks += circle(cx, cy, rand(0.4, 1.0), '#D81B60', 0.35);
            }
        }
        return specks;
    },

    renderTopTexture(cx, cy, rx, ry, flavorKey, clipId) {
        const groupStart = `<g clip-path="url(#${clipId})" opacity="0.85">`;
        const groupEnd = '</g>';
        let dots = '';
        function rand(min, max) { return Math.random() * (max - min) + min; }
        function dot(x, y, r, color, opacity = 0.6) {
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
        }
        if (flavorKey === 'cookies-cream' || flavorKey === 'cookies-n-cream') {
            for (let i = 0; i < 35; i++) {
                const x = rand(cx - rx + 8, cx + rx - 8);
                const y = rand(cy - ry + 4, cy + ry - 4);
                dots += dot(x, y, rand(0.8, 1.8), '#3E2723', 0.5);
            }
        } else if (flavorKey === 'funfetti' || flavorKey === 'birthday-cake') {
            const colors = ['#E91E63', '#2196F3', '#FFC107', '#4CAF50', '#9C27B0'];
            for (let i = 0; i < 28; i++) {
                const x = rand(cx - rx + 10, cx + rx - 10);
                const y = rand(cy - ry + 6, cy + ry - 6);
                const c = colors[Math.floor(rand(0, colors.length))];
                dots += `<rect x="${x}" y="${y}" width="4" height="1.6" rx="0.8" fill="${c}" opacity="0.8" transform="rotate(${rand(0, 180)} ${x + 2} ${y + 0.8})"/>`;
            }
        } else if (flavorKey === 'mint-chocolate' || flavorKey === 'mint-chocolate-chip') {
            for (let i = 0; i < 28; i++) {
                const x = rand(cx - rx + 10, cx + rx - 10);
                const y = rand(cy - ry + 6, cy + ry - 6);
                dots += dot(x, y, rand(0.7, 1.4), '#3E2723', 0.55);
            }
        } else if (flavorKey === 'strawberry' || flavorKey === 'strawberries-cream' || flavorKey === 'strawberries-n-cream') {
            for (let i = 0; i < 18; i++) {
                const x = rand(cx - rx + 12, cx + rx - 12);
                const y = rand(cy - ry + 6, cy + ry - 6);
                dots += dot(x, y, rand(0.6, 1.1), '#D81B60', 0.4);
            }
        } else {
            return '';
        }
        return groupStart + dots + groupEnd;
    },

    fillingColors: {
        'raspberry': '#C2185B',
        'chocolate-ganache': '#4E342E',
        'chocolate-fudge': '#3E2723',
        'cherry': '#D32F2F',
        'caramel': '#C19A6B',
        'peanut-butter': '#8D6E63',
        // New baked cake fillings
        'strawberry': '#E91E63',
        'marshmallow': '#FFFDE7',
        'cream-cheese': '#FFF8E1',
        'cookies-cream': '#BDBDBD',
        'cookies-n-cream': '#BDBDBD'
    },

    getFlavorColor(flavor) {
        if (!flavor) return this.flavorColors.default;

        // Normalize: lowercase, replace apostrophes and '&' with nothing, replace spaces with single hyphen
        const normalized = flavor.toLowerCase()
            .replace(/['&]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return this.flavorColors[normalized] || this.flavorColors.default;
    },

    normalizeKey(name) {
        if (!name) return '';
        return String(name).toLowerCase()
            .replace(/['&]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    },

    renderCake(container, options) {
        const {
            cakeFlavor = 'vanilla',
            iceCreamFlavor = 'vanilla',
            frostingType = 'buttercream',
            frostingColor = '#E91E63',
            frostingCoverage = 'top',
            fillingType = '',
            hasTopper = false,
            topperText = '',
            hasSprinkles = false,
            hasCandles = true,
            hasDrips = false
        } = options;

        const cakeColors = this.getFlavorColor(cakeFlavor);
        const iceCreamColors = this.getFlavorColor(iceCreamFlavor);
        const frostingShade = frostingColor || '#E91E63';
        const fillingShade = this.getFillingShade(fillingType);
        const frostingEnabled = this.isColorHex(frostingShade) && (!frostingType || (frostingType && frostingType.toLowerCase() !== 'none'));
        const cakeFlavorKey = this.normalizeKey ? this.normalizeKey(cakeFlavor) : String(cakeFlavor).toLowerCase();
        const iceKey = this.normalizeKey ? this.normalizeKey(iceCreamFlavor) : String(iceCreamFlavor).toLowerCase();

        const coverage = (String(frostingCoverage || 'top').toLowerCase().includes('all')) ? 'all' : 'top';
        const rimAmplitude = coverage === 'all' ? 5.5 : 7;
        const rimSegments = coverage === 'all' ? 18 : 16;
        const rimOffset = coverage === 'all' ? 1.2 : 0;
        const showDrips = hasDrips && frostingEnabled;

        const svg = `
            <svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg" class="ucbo-cake-svg">
                <defs>
                    <!-- Gradients for 3D effect -->
                    <linearGradient id="cakeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.safeLighten(cakeColors.cake, 20)};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${cakeColors.cake};stop-opacity:1" />
                    </linearGradient>
                    
                    <linearGradient id="iceCreamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.safeLighten(iceCreamColors.cake, 20)};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${iceCreamColors.cake};stop-opacity:1" />
                    </linearGradient>
                    ${frostingEnabled ? `
                    <linearGradient id="frostingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.safeLighten(frostingShade, 30)};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:${frostingShade};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${this.safeDarken(frostingShade, 10)};stop-opacity:1" />
                    </linearGradient>
                    ${coverage === 'all' ? `
                    <mask id="sideFrostMask">
                        <rect x="0" y="0" width="300" height="350" fill="white"/>
                        <!-- Center window to reveal layers -->
                        <rect x="90" y="150" width="120" height="160" rx="12" ry="12" fill="black"/>
                    </mask>` : ''}` : ''}
                    
                    <!-- Shadow filter -->
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <!-- Clip paths for top textures -->
                    <clipPath id="clipTopCake"><ellipse cx="150" cy="230" rx="100" ry="20"/></clipPath>
                    <clipPath id="clipTopIce"><ellipse cx="150" cy="140" rx="100" ry="20"/></clipPath>
                </defs>
                
                <!-- Cake Stand/Plate -->
                <ellipse cx="150" cy="320" rx="100" ry="15" fill="#E0E0E0" opacity="0.6"/>
                
                <!-- Bottom Cake Layer -->
                <g filter="url(#shadow)" class="cake-layer-bottom">
                    <!-- Side of cake -->
                    <rect x="50" y="230" width="200" height="90" fill="url(#cakeGradient)" rx="8"/>
                    ${this.renderSideTexture(50, 230, 200, 90, cakeFlavorKey)}
                    <!-- Top ellipse -->
                    <ellipse cx="150" cy="230" rx="100" ry="20" fill="${this.safeLighten(cakeColors.cake, 25)}"/>
                    ${this.renderTopTexture(150, 230, 100, 20, cakeFlavorKey, 'clipTopCake')}
                    <!-- Texture lines -->
                    ${this.renderCakeTexture(50, 240, 200, 80, cakeColors.accent, cakeFlavorKey)}
                </g>
                
                <!-- Optional Filling Layer (no frosting in the middle) -->
                ${fillingShade ? `<g class="filling-layer">
                    <ellipse cx="150" cy="230" rx="100" ry="10" fill="${fillingShade}" opacity="0.95"/>
                </g>` : ''}
                
                <!-- Top Ice Cream Layer -->
                <g filter="url(#shadow)" class="cake-layer-top">
                    <!-- Side of cake -->
                    <rect x="50" y="140" width="200" height="90" fill="url(#iceCreamGradient)" rx="8"/>
                    ${this.renderSideTexture(50, 140, 200, 90, iceKey)}
                    <!-- Top ellipse -->
                    <ellipse cx="150" cy="140" rx="100" ry="20" fill="${this.safeLighten(iceCreamColors.cake, 25)}"/>
                    ${this.renderTopTexture(150, 140, 100, 20, iceKey, 'clipTopIce')}
                    <!-- Texture -->
                    ${this.renderCakeTexture(50, 150, 200, 80, iceCreamColors.accent, iceKey)}
                </g>

                <!-- Side Frosting Coverage (All sides) -->
                ${frostingEnabled && coverage === 'all' ? `
                <g class="side-frosting" filter="url(#shadow)">
                    <rect x="50" y="140" width="200" height="180" rx="8" fill="url(#frostingGradient)" mask="url(#sideFrostMask)"/>
                </g>` : ''}
                
                <!-- Top Frosting (Swirl + Rim + optional Drips) -->
                    ${frostingEnabled ? `
                <g class="top-frosting">
                    ${this.renderFrostingWave(150, 140, 100, 20, rimAmplitude, rimSegments, rimOffset)}
                    ${showDrips ? this.renderFrostingDrips(150, 140, frostingShade, coverage) : ''}
                    ${this.renderSwirlTop(150, 140, 100, 15, frostingShade)}
                </g>` : ''}

                <!-- Candles on top -->
                ${hasCandles ? this.renderCandles(150) : ''}
                
                <!-- Sprinkles -->
                ${hasSprinkles ? this.renderSprinkles(150, 130) : ''}
                
                <!-- Topper -->
                ${hasTopper ? this.renderTopper(150, topperText) : ''}
            </svg>
        `;

        container.html(svg);

        setTimeout(() => {
            container.find('.cake-layer-bottom').addClass('animate-in');
            setTimeout(() => {
                container.find('.filling-layer').addClass('animate-in');
                setTimeout(() => {
                    container.find('.cake-layer-top').addClass('animate-in');
                    // Animate side frosting (if present)
                    setTimeout(() => {
                        container.find('.side-frosting').addClass('animate-in');
                        container.find('.top-frosting').addClass('animate-in');
                        setTimeout(() => {
                            container.find('.candles').addClass('animate-in');
                        }, 150);
                        if (hasTopper) {
                            setTimeout(() => {
                                container.find('.cake-topper').addClass('animate-in');
                            }, 200);
                        }
                    }, 200);
                }, 200);
            }, 200);
        }, 50);
    },

    getFillingShade(fillingType) {
        if (!fillingType) return '';
        const key = String(fillingType).toLowerCase().trim();
        return this.fillingColors[key] || '';
    },

    renderCakeTexture(x, y, width, height, color, flavorKey = '') {
        let lines = '';
        // Suppress horizontal texture lines for Cookies 'n Cream to avoid a "just lines" look
        const key = (flavorKey || '').toLowerCase();
        if (key === 'cookies-cream' || key === 'cookies-n-cream') {
            return '';
        }
        for (let i = 0; i < 5; i++) {
            const lineY = y + (i * height / 5);
            lines += `<line x1="${x + 10}" y1="${lineY}" x2="${x + width - 10}" y2="${lineY}" 
                stroke="${color}" stroke-width="0.5" opacity="0.2"/>`;
        }
        return lines;
    },

    renderFrostingDrips(cx, cy, color, coverage = 'top') {
        const drips = [];
        const fullCoverage = coverage === 'all';
        const numDrips = fullCoverage ? 18 : 14;
        const radius = fullCoverage ? 102 : 98;
        const baseY = cy + (fullCoverage ? 3 : 0);
        const heightBase = fullCoverage ? 30 : 22;
        const heightVariance = fullCoverage ? 18 : 14;
        const widthBase = fullCoverage ? 11 : 14;
        const widthVariance = fullCoverage ? 6 : 8;
        const jitterScale = fullCoverage ? 6 : 8;
        const highlightColor = this.safeLighten(color, 22);
        const shadowColor = this.safeDarken(color, 18);

        for (let i = 0; i < numDrips; i++) {
            const jitter = (Math.random() - 0.5) * jitterScale;
            const angle = (i / numDrips) * Math.PI * 2 + (Math.random() * (fullCoverage ? 0.12 : 0.15) - (fullCoverage ? 0.06 : 0.075));
            const x = cx + Math.cos(angle) * radius + jitter;
            const rootY = baseY;
            const h = heightBase + Math.random() * heightVariance;
            const w = widthBase + Math.random() * widthVariance;
            const xl = x - w / 2;
            const xr = x + w / 2;

            const basePath = `
                <path d="M ${xl} ${rootY}
                         C ${xl} ${rootY + 0.42 * h}, ${x - 0.55 * w} ${rootY + 0.78 * h}, ${x - 0.1 * w} ${rootY + 0.92 * h}
                         C ${x - 0.05 * w} ${rootY + h}, ${x + 0.05 * w} ${rootY + h}, ${x + 0.1 * w} ${rootY + 0.92 * h}
                         C ${x + 0.55 * w} ${rootY + 0.78 * h}, ${xr} ${rootY + 0.42 * h}, ${xr} ${rootY}
                         Z"
                      fill="url(#frostingGradient)" opacity="0.96"/>
            `;

            const highlightPath = `
                <path d="M ${x - 0.22 * w} ${rootY + 1.2}
                         C ${x - 0.32 * w} ${rootY + 0.48 * h}, ${x - 0.2 * w} ${rootY + 0.78 * h}, ${x - 0.12 * w} ${rootY + 0.9 * h}"
                      fill="none" stroke="${highlightColor}" stroke-width="${Math.max(0.8, w * 0.18)}" stroke-linecap="round" opacity="0.38"/>
            `;

            const shadowPath = `
                <path d="M ${x + 0.2 * w} ${rootY + 1.4}
                         C ${x + 0.3 * w} ${rootY + 0.5 * h}, ${x + 0.22 * w} ${rootY + 0.82 * h}, ${x + 0.1 * w} ${rootY + 0.94 * h}"
                      fill="none" stroke="${shadowColor}" stroke-width="${Math.max(0.6, w * 0.14)}" stroke-linecap="round" opacity="0.28"/>
            `;

            drips.push(`<g class="frosting-drip" opacity="0.94">${basePath}${highlightPath}${shadowPath}</g>`);
        }

        return drips.join('');
    },

    // New: Swirled rosette-style top frosting inspired by the referenced CodePen
    renderSwirlTop(cx, cy, rx, ry, color) {
        const layers = [
            { a0: -165, a1: 135, w: 15 },
            { a0: -145, a1: 105, w: 13 },
            { a0: -120, a1: 75, w: 11 },
            { a0: -95, a1: 45, w: 9 },
            { a0: -70, a1: 20, w: 7 }
        ];
        let g = `<g class="swirl-bands">`;
        const toRad = (deg) => deg * Math.PI / 180;
        const arc = (Rxi, Ryi, a0, a1, stroke, width, opacity = 1) => {
            const largeArc = (Math.abs(a1 - a0) % 360) > 180 ? 1 : 0;
            const sweep = a1 > a0 ? 1 : 0;
            const x0 = cx + Rxi * Math.cos(toRad(a0));
            const y0 = cy + Ryi * Math.sin(toRad(a0));
            const x1 = cx + Rxi * Math.cos(toRad(a1));
            const y1 = cy + Ryi * Math.sin(toRad(a1));
            return `<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${Rxi.toFixed(2)} ${Ryi.toFixed(2)} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
        };

        const base = color;
        // Soft base ellipse for fullness and seam coverage
        g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry + 1}" fill="${this.safeLighten(base, 8)}" opacity="0.98"/>`;
        // Subtle outer rim for visibility against light ice cream tops
        g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry + 1}" fill="none" stroke="${this.safeDarken(base, 14)}" stroke-width="1.6" opacity="0.25"/>`;

        for (let i = 0; i < layers.length; i++) {
            const L = layers[i];
            const Rxi = rx - i * 16;
            const Ryi = Math.max(4, ry - i * 3);
            if (Rxi <= 8) break;
            // Main creamy stroke
            g += arc(Rxi, Ryi, L.a0, L.a1, this.safeLighten(base, 10), L.w, 0.98);
            // Subtle underside shadow for depth
            g += arc(Rxi, Ryi + 1, L.a0 + 3, L.a1 + 3, this.safeDarken(base, 12), Math.max(1, L.w * 0.35), 0.25);
        }

        // Center dollop highlight
        g += `<ellipse cx="${cx}" cy="${cy}" rx="11" ry="6.5" fill="${this.safeLighten(base, 16)}"/>`;
        g += `<ellipse cx="${cx - 3}" cy="${cy - 2}" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.6"/>`;
        g += `</g>`;
        return g;
    },

    // Wavy frosting rim with scallops pointing downward (away from the ellipse)
    renderFrostingWave(cx, cy, rx, ry, amplitude = 8, segments = 14, offsetY = 0) {
        // Place the rim right at the ellipse edge and overlap slightly to avoid hairline gaps
        const rimY = cy + ry - 0.5 + offsetY; // slight overlap to avoid seam and adjustable drop
        const leftX = cx - rx;
        const rightX = cx + rx;
        const dx = (rightX - leftX) / segments;
        const thickness = 4; // thin band below the rim
        let d = `M ${leftX} ${rimY}`;
        for (let i = 0; i < segments; i++) {
            const x0 = leftX + i * dx;
            const xMid = x0 + dx / 2;
            const x1 = x0 + dx;
            const amp = amplitude * (0.8 + Math.random() * 0.4); // slight variation
            // Scallops face DOWN away from the ellipse (add amplitude)
            d += ` Q ${xMid} ${rimY + amp}, ${x1} ${rimY}`;
        }
        // Close as a thin band below the rim to ensure full coverage of the edge
        d += ` L ${rightX} ${rimY + thickness} L ${leftX} ${rimY + thickness} Z`;
        return `<path d="${d}" fill="url(#frostingGradient)" opacity="0.98"/>`;
    },

    renderTopFrostingSwirls(cx, cy, color) {
        return `
            <circle cx="${cx}" cy="${cy}" r="85" fill="none" 
                stroke="${this.lighten(color, 20)}" stroke-width="2" opacity="0.6"/>
            <circle cx="${cx}" cy="${cy}" r="70" fill="none" 
                stroke="${this.lighten(color, 15)}" stroke-width="1.5" opacity="0.5"/>
            <circle cx="${cx}" cy="${cy}" r="55" fill="none" 
                stroke="${this.lighten(color, 10)}" stroke-width="1" opacity="0.4"/>
        `;
    },

    renderSprinkles(cx, cy) {
        let sprinkles = '<g class="sprinkles">';
        const colors = ['#FF1744', '#2196F3', '#FFEB3B', '#4CAF50', '#FF9800', '#9C27B0'];

        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * 90;
            const x = cx + Math.cos(angle) * distance;
            const y = cy + Math.sin(angle) * distance * 0.3;
            const rotation = Math.random() * 180;
            const color = colors[Math.floor(Math.random() * colors.length)];

            sprinkles += `
                <rect x="${x}" y="${y}" width="6" height="2" rx="1" 
                    fill="${color}" 
                    transform="rotate(${rotation} ${x + 3} ${y + 1})"
                    opacity="0.9"/>
            `;
        }

        sprinkles += '</g>';
        return sprinkles;
    },

    renderTopper(cx, topperText) {
        const displayText = topperText || '🎉';
        const isEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(displayText);

        if (isEmoji) {
            return `
                <g class="cake-topper">
                    <line x1="${cx}" y1="110" x2="${cx}" y2="70" 
                        stroke="#8B4513" stroke-width="2"/>
                    <text x="${cx}" y="60" 
                        font-size="32" 
                        text-anchor="middle" 
                        dominant-baseline="middle">${displayText}</text>
                </g>
            `;
        } else {
            return `
                <g class="cake-topper">
                    <rect x="${cx - 60}" y="70" width="120" height="40" 
                        fill="#FFF" stroke="#E91E63" stroke-width="2" rx="5"/>
                    <text x="${cx}" y="90" 
                        font-family="'Playfair Display', serif" 
                        font-size="14" 
                        font-weight="600"
                        fill="#E91E63" 
                        text-anchor="middle" 
                        dominant-baseline="middle">${displayText}</text>
                </g>
            `;
        }
    },

    renderCandles(cx) {
        const candleColors = ['#FFD54F', '#81D4FA', '#CE93D8', '#80CBC4'];
        const positions = [-60, -20, 20, 60];
        const baseY = 125; // sits on top layer
        const height = 34;
        let g = '<g class="candles">';
        g += `
            <defs>
                <radialGradient id="flameGradient" cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#FFF59D"/>
                    <stop offset="70%" stop-color="#FFB300"/>
                    <stop offset="100%" stop-color="#F57C00"/>
                </radialGradient>
            </defs>`;
        positions.forEach((dx, idx) => {
            const x = cx + dx;
            const bodyColor = candleColors[idx % candleColors.length];
            const delay = (idx * 0.12).toFixed(2) + 's';
            g += `
                <g class="candle" style="--delay:${delay}" transform="translate(${x - 4}, ${baseY - height})">
                    <rect x="0" y="0" width="8" height="${height}" rx="2" fill="${bodyColor}" stroke="#E0E0E0" stroke-width="0.5"/>
                    <!-- stripes -->
                    <path d="M -1 6 L 9 0 M -1 18 L 9 12 M -1 30 L 9 24" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
                    <!-- wick -->
                    <rect x="3.5" y="-6" width="1" height="6" fill="#333"/>
                    <!-- flame -->
                    <path class="flame" d="M 4 -6 C 2 -11, 6 -14, 4 -18 C 8 -14, 6 -11, 4 -6 Z" fill="url(#flameGradient)"/>
                    <circle class="flame-glow" cx="4" cy="-12" r="6" fill="#FFECB3" opacity="0.25"/>
                </g>`;
        });
        g += '</g>';
        return g;
    },

    renderCupcakes(container, count, flavor, hasTopper) {
        const colors = this.getFlavorColor(flavor);
        const rows = Math.ceil(count / 4);
        const cols = Math.min(count, 4);

        let svg = `
            <svg viewBox="0 0 300 ${rows * 85 + 20}" xmlns="http://www.w3.org/2000/svg" class="ucbo-cupcakes-svg">
        `;

        let index = 0;
        for (let row = 0; row < rows; row++) {
            const cupcakesInRow = Math.min(4, count - (row * 4));
            for (let col = 0; col < cupcakesInRow; col++) {
                const x = 35 + col * 65;
                const y = 30 + row * 85;
                const delay = index * 0.05;

                svg += this.renderSingleCupcake(x, y, colors, hasTopper, delay);
                index++;
            }
        }

        svg += '</svg>';
        container.html(svg);
    },

    renderSingleCupcake(x, y, colors, hasTopper, delay) {
        return `
            <g class="cupcake" style="animation-delay: ${delay}s">
                <!-- Cupcake liner/wrapper -->
                <path d="M ${x - 20} ${y + 30} 
                         L ${x - 15} ${y + 55}
                         L ${x + 15} ${y + 55}
                         L ${x + 20} ${y + 30} Z"
                      fill="#8D6E63" stroke="#6D4C41" stroke-width="1"/>
                <!-- Liner ridges -->
                <line x1="${x - 18}" y1="${y + 35}" x2="${x - 14}" y2="${y + 55}" 
                    stroke="#6D4C41" stroke-width="0.5" opacity="0.5"/>
                <line x1="${x - 10}" y1="${y + 32}" x2="${x - 8}" y2="${y + 55}" 
                    stroke="#6D4C41" stroke-width="0.5" opacity="0.5"/>
                <line x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 55}" 
                    stroke="#6D4C41" stroke-width="0.5" opacity="0.5"/>
                <line x1="${x + 10}" y1="${y + 32}" x2="${x + 8}" y2="${y + 55}" 
                    stroke="#6D4C41" stroke-width="0.5" opacity="0.5"/>
                <line x1="${x + 18}" y1="${y + 35}" x2="${x + 14}" y2="${y + 55}" 
                    stroke="#6D4C41" stroke-width="0.5" opacity="0.5"/>
                
                <!-- Frosting swirl -->
                <path d="M ${x} ${y + 30}
                         C ${x - 25} ${y + 25}, ${x - 25} ${y}, ${x} ${y - 5}
                         C ${x + 25} ${y}, ${x + 25} ${y + 25}, ${x} ${y + 30} Z"
                      fill="${colors.frosting}" stroke="${colors.accent}" stroke-width="0.5"/>
                
                <!-- Frosting highlight -->
                <ellipse cx="${x - 8}" cy="${y + 5}" rx="8" ry="6" 
                    fill="white" opacity="0.4"/>
                
                <!-- Cherry/topper -->
                ${hasTopper ? `<circle cx="${x}" cy="${y - 8}" r="4" fill="#C62828"/>` : ''}
            </g>
        `;
    },

    isColorHex(color) {
        return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '');
    },

    safeLighten(color, percent) {
        if (!this.isColorHex(color)) return color;
        return this.lighten(color, percent);
    },

    safeDarken(color, percent) {
        if (!this.isColorHex(color)) return color;
        return this.darken(color, percent);
    },

    lighten(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    darken(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    // Render a 3-layer baked cake (for Custom Cake orders)
    renderBakedCake(container, options) {
        const {
            cakeFlavor = 'vanilla',
            frostingFlavor = 'vanilla',
            cakeSize = '6-inch',
            hasTopper = false,
            topperText = '',
            hasFilling = false,
            fillingType = '',
            layers = 3
        } = options;

        const cakeColors = this.getFlavorColor(cakeFlavor);
        const frostingColors = this.getFlavorColor(frostingFlavor);
        const fillingShade = hasFilling ? this.getFillingShade(fillingType) : '';
        const cakeFlavorKey = this.normalizeKey(cakeFlavor);

        // Adjust size based on cake size
        let scaleFactor = 1;
        let sizeLabel = '6"';
        if (cakeSize === '7-inch') {
            scaleFactor = 1.15;
            sizeLabel = '7"';
        } else if (cakeSize === '8-inch') {
            scaleFactor = 1.3;
            sizeLabel = '8"';
        }

        const baseWidth = 160 * scaleFactor;
        const layerHeight = 50;
        const fillingHeight = 8;
        const cx = 150;
        const startY = 280;

        // Calculate total height for positioning
        const totalHeight = (layers * layerHeight) + ((layers - 1) * fillingHeight);
        const topY = startY - totalHeight;

        let layersSvg = '';
        let currentY = startY;

        // Build layers from bottom to top
        for (let i = 0; i < layers; i++) {
            const layerTop = currentY - layerHeight;
            const layerNum = i + 1;

            // Cake layer
            layersSvg += `
                <g class="cake-layer-${layerNum}" filter="url(#shadow)">
                    <rect x="${cx - baseWidth / 2}" y="${layerTop}" width="${baseWidth}" height="${layerHeight}" 
                          fill="url(#bakedCakeGradient)" rx="6"/>
                    ${this.renderSideTexture(cx - baseWidth / 2, layerTop, baseWidth, layerHeight, cakeFlavorKey)}
                    <ellipse cx="${cx}" cy="${layerTop}" rx="${baseWidth / 2}" ry="15" 
                             fill="${this.safeLighten(cakeColors.cake, 25)}"/>
                    ${this.renderCakeTexture(cx - baseWidth / 2, layerTop + 5, baseWidth, layerHeight - 10, cakeColors.accent, cakeFlavorKey)}
                </g>
            `;

            currentY = layerTop;

            // Add filling between layers (except after top layer)
            if (i < layers - 1 && hasFilling && fillingShade) {
                layersSvg += `
                    <g class="filling-layer-${layerNum}">
                        <ellipse cx="${cx}" cy="${currentY}" rx="${baseWidth / 2 - 5}" ry="10" 
                                 fill="${fillingShade}" opacity="0.9"/>
                    </g>
                `;
            }
        }

        // Frosting on top
        const frostingColor = frostingColors.frosting;

        const svg = `
            <svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg" class="ucbo-cake-svg baked-cake">
                <defs>
                    <linearGradient id="bakedCakeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.safeLighten(cakeColors.cake, 20)};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${cakeColors.cake};stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="bakedFrostingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.safeLighten(frostingColor, 30)};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:${frostingColor};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${this.safeDarken(frostingColor, 10)};stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <!-- Size Label -->
                <text x="${cx}" y="30" text-anchor="middle" font-size="14" fill="#666" font-weight="600">
                    3-Layer ${sizeLabel} Custom Cake
                </text>
                
                <!-- Cake Stand/Plate -->
                <ellipse cx="${cx}" cy="${startY + 10}" rx="${baseWidth / 2 + 20}" ry="15" fill="#E0E0E0" opacity="0.6"/>
                
                <!-- Cake Layers -->
                ${layersSvg}
                
                <!-- Side Frosting -->
                <g class="side-frosting">
                    <rect x="${cx - baseWidth / 2 - 3}" y="${topY}" width="${baseWidth + 6}" height="${totalHeight}" 
                          rx="8" fill="url(#bakedFrostingGradient)" opacity="0.85"/>
                </g>
                
                <!-- Top Frosting Swirl -->
                <g class="top-frosting">
                    ${this.renderFrostingWave(cx, topY, baseWidth / 2, 18, 6, 18, 1)}
                    ${this.renderSwirlTop(cx, topY, baseWidth / 2 - 10, 12, frostingColor)}
                </g>
                
                <!-- Candles -->
                ${this.renderCandles(cx)}
                
                <!-- Topper -->
                ${hasTopper ? this.renderTopper(cx, topperText) : ''}
            </svg>
        `;

        container.html(svg);

        // Animate layers in
        setTimeout(() => {
            for (let i = 1; i <= layers; i++) {
                setTimeout(() => {
                    container.find('.cake-layer-' + i).addClass('animate-in');
                    if (hasFilling && i < layers) {
                        container.find('.filling-layer-' + i).addClass('animate-in');
                    }
                }, (i - 1) * 150);
            }
            setTimeout(() => {
                container.find('.side-frosting').addClass('animate-in');
                container.find('.top-frosting').addClass('animate-in');
                setTimeout(() => {
                    container.find('.candles').addClass('animate-in');
                    if (hasTopper) {
                        container.find('.cake-topper').addClass('animate-in');
                    }
                }, 150);
            }, layers * 150 + 100);
        }, 50);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CakeRenderer;
}
