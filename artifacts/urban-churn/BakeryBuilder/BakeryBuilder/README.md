# Urban Churn Bakery Orders - WordPress Plugin v2.0.0

An interactive bakery ordering form with animated visual assembly effects for ice cream cakes, custom baked cakes, and cupcakes. Designed specifically for Urban Churn Louise Drive Scoop Shop & Bakery.

## 🎂 Features

### Order Types
- **Pre-Stacked Ice Cream Cakes** - Quick selection, fixed $65 pricing
- **Custom Ice Cream Cakes** - 2-layer customizable cakes starting at $75
- **Custom Baked Cakes** - 3-layer baked cakes in three sizes (6"/7"/8")
- **Custom Cupcakes** - Baked cupcakes sold by the dozen ($36)

### Visual Experience
- **Interactive SVG Builder** - Real-time animated preview of customer selections
- **Layer Assembly Animation** - Watch cakes being built as options are chosen
- **Interactive Peek Feature** - Touch/click to separate and view cake layers
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### Customization Options

**Flavors (10 options):**
Vanilla, Double Chocolate, Strawberry, Cookies & Cream, Salted Caramel, S'mores, Carrot Cake, Marble, Funfetti, Almond

**Buttercream Frosting (7 options):**
Vanilla, Double Chocolate, Salted Caramel, Almond, Cookies 'N Cream, Strawberry, Cream Cheese

**Add-Ons:**
- Cake Fillings (+$15 for cakes, +$10/dozen for cupcakes)
- Cake Toppers (4 messages: Happy Birthday, Happy Anniversary, Oh Baby, Congratulations)
- Natural Frosting Colors for ice cream cakes (+$10)
- Decorative Accents for cupcakes ($12-$20)
- Inspiration Photo Upload

### Business Features
- **Email Notifications** - Automatic order emails with full details
- **Order Management** - Custom post type in WordPress admin
- **Price Calculator** - Real-time pricing with all add-ons
- **Lead Time Enforcement** - 96-hour minimum for custom orders
- **Mobile Optimized** - Touch-friendly interface on all devices

## 📦 Installation

### WordPress Plugin Installation

1. **Download** the plugin zip file: `urban-churn-bakery-orders-v2.0.0.zip`

2. **Upload to WordPress:**
   - Go to WordPress Admin > Plugins > Add New
   - Click "Upload Plugin"
   - Choose the zip file
   - Click "Install Now"
   - Click "Activate Plugin"

3. **Configure Settings:**
   - Go to WordPress Admin > Bakery Orders > Settings
   - Set your email recipient (default: orders@urbanchurn.com)
   - Adjust lead time if needed (default: 96 hours)
   - Save settings

4. **Add to Your Site:**
   - Create a new page or edit existing page
   - Add the shortcode: `[bakery_order_form]`
   - Publish the page

### Manual Installation

1. Upload the `urban-churn-bakery-orders` folder to `/wp-content/plugins/`
2. Activate through the 'Plugins' menu
3. Configure settings and add shortcode as above

## 🎨 Local Demo and Visual QA

Two demo pages are included for quick testing without WordPress:

- `demo/index.php` — full form experience (uses jQuery) with the same SVG preview logic as the plugin.
- `demo/cake-preview.html` — minimal renderer showcase with flavor/color controls (no jQuery dependency).

Run a quick PHP server and open the demo in your browser:

```bash
php -S 127.0.0.1:8080 -t demo
```

Then visit:

- http://127.0.0.1:8080/index.php (full demo)
- http://127.0.0.1:8080/cake-preview.html (renderer only)

### What to test

- Pre-Stacked and Custom Ice Cream Cakes both render as a two-layer SVG (cake + ice cream)
- Frosting options: Buttercream vs Whipped Topping vs None
- Color accents (when enabled) update frosting and drips
- Fillings (Custom cake only) render as a colored inter-layer band
- Sprinkles and toppers appear and animate correctly

In the full demo (`index.php`), the right panel has Preset buttons to quickly verify visuals:

- “Preset: Pre-Stacked” — Cookies ’N Cream with Buttercream
- “Preset: Custom” — Chocolate + Mint Chip + Buttercream with Raspberry filling
- “Reset” — Clears selections and restores the placeholder preview

## Shortcode Usage

```
[bakery_order_form]
```

Simply add this shortcode to any page where you want to display the bakery order form.

## Configuration

Navigate to **Bakery Orders > Settings** in your WordPress admin to configure:

- Email recipient for order notifications
- Lead time requirements (default: 96 hours)
- Business name
- Seasonal Pumpkin Cake banner visibility

## Order Management

All submitted orders are stored in WordPress as a custom post type called "Bakery Orders". Access them through the **Bakery Orders** menu in the WordPress admin.

Each order includes:
- Customer information (name, email, phone, pickup date/time)
- Order details (type, flavors, customizations)
- Add-ons (toppers, color accents)
- Total price calculation
- Special requests

## Design

The plugin uses a warm, inviting bakery aesthetic with:
- Primary Color: #E91E63 (Bakery Pink)
- Secondary Color: #8BC34A (Mint Green)
- Accent Color: #FF9800 (Warm Orange)
- Background: #FFF8E1 (Cream)
- Text: #3E2723 (Chocolate Brown)

Typography:
- Headings: Playfair Display
- Body: Lato

## Requirements

- WordPress 5.8 or higher
- PHP 7.4 or higher
- jQuery (included with WordPress)

## Extending the SVG Renderer

- Add or tweak flavors in `assets/js/cake-renderer.js` under `flavorColors`
- Extend filling colors in `fillingColors` so the inter-layer ring renders correctly
- The renderer is mirrored in `demo/assets/js/cake-renderer.js` for the demo; keep both in sync if you diverge

Tips:
- If you add a non-hex color name, the renderer’s safe color helpers will skip gradients to avoid SVG errors
- To disable top frosting visually, set frostingType to `None` (the renderer will skip those elements)

## Support

For support or questions, contact the Urban Churn team.

## Version

1.0.0

## License

GPL-2.0+

## 📞 Support

For questions, feature requests, or support:
- Email: orders@urbanchurn.com  
- Documentation: See readme.txt and CHANGELOG.md

## 📄 License

GPL-2.0+ - See LICENSE file for details

## 🎉 Version History

**Current Version:** 2.0.0 (February 2, 2026)

**Major Changes in v2.0:**
- Added Custom Baked Cakes (3 sizes)
- Added Custom Cupcakes
- 10 flavors, 7 frostings, cake fillings
- Cake toppers and decorative accents
- Enhanced mobile responsiveness
- Removed ice cream cupcakes
- 2x2 order type grid layout

**Previous Versions:**
- 1.0.0 - Initial release with ice cream products

---

**Developed with ❤️ by Urban Churn**
