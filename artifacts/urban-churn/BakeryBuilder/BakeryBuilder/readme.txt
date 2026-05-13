=== Urban Churn Bakery Orders ===
Contributors: urbanchurn
Tags: bakery, orders, cakes, cupcakes, form, woocommerce-alternative
Requires at least: 5.8
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Interactive bakery ordering system with animated visual preview for ice cream cakes, custom baked cakes, and cupcakes.

== Description ==

Urban Churn Bakery Orders is a comprehensive WordPress plugin designed specifically for bakeries and dessert shops. It provides an interactive, visually engaging order form with real-time animated previews of customer selections.

**Perfect For:**
* Ice cream cake shops
* Custom bakeries
* Cupcake businesses
* Dessert shops with made-to-order products

**Key Features:**

= Order Types =
* **Pre-Stacked Ice Cream Cakes** - Quick selection with fixed pricing ($65)
* **Custom Ice Cream Cakes** - 2-layer customizable cakes (starting at $75)
* **Custom Baked Cakes** - 3-layer baked cakes in 3 sizes (6", 7", 8")
* **Custom Cupcakes** - Baked cupcakes sold by the dozen ($36/dozen)

= Interactive Visual Preview =
* Real-time SVG-based cake renderer
* Animated layer assembly
* Interactive "peek" feature to see cake layers
* Visual feedback for all customer selections
* Responsive preview that works on all devices

= Extensive Customization Options =

**Cake Flavors (10 options):**
Vanilla, Double Chocolate, Strawberry, Cookies & Cream, Salted Caramel, S'mores, Carrot Cake, Marble, Funfetti, Almond

**Buttercream Frosting (7 options):**
Vanilla, Double Chocolate, Salted Caramel, Almond, Cookies 'N Cream, Strawberry, Cream Cheese

**Optional Add-Ons:**
* Cake fillings (+$15 for cakes, +$10/dozen for cupcakes)
  - 7 filling options: Strawberry, Cherry, Marshmallow, Chocolate Fudge, Raspberry, Cream Cheese, Cookies 'N Cream
* Cake toppers (4 messages)
  - Happy Birthday, Happy Anniversary, Oh Baby, Congratulations
* Natural frosting colors for ice cream cakes (+$10)
  - 6 all-natural colors using beet, blueberry, spirulina, matcha, turmeric, carrot
* Decorative accents for cupcakes ($12-$20)

= Size Options for Baked Cakes =
* 6" cake - Feeds 10-12 people ($75)
* 7" cake - Feeds 16-20 people ($100)
* 8" cake - Feeds 26-30 people ($125)

= Smart Form Features =
* Multi-step accordion interface
* Automatic validation
* Real-time price calculation
* Mobile-responsive design
* Accessible and keyboard-friendly
* AJAX submission with confetti celebration
* Email notifications to shop owner
* 96-hour lead time enforcement

= Admin Features =
* Custom post type for order management
* Email notifications with complete order details
* Configurable settings
* Order history and tracking
* Easy-to-use shortcode: `[bakery_order_form]`

= Mobile Optimized =
* Fully responsive layout
* Touch-friendly interface
* Optimized for phones, tablets, and desktops
* 2x2 grid for order types on desktop
* Single column on mobile devices
* Compact flavor and topper cards on small screens

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/urban-churn-bakery-orders/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure settings in WordPress Admin > Bakery Orders > Settings
4. Add the shortcode `[bakery_order_form]` to any page or post

== Frequently Asked Questions ==

= How do I display the order form? =

Simply add the shortcode `[bakery_order_form]` to any page or post where you want the form to appear.

= Can I customize the flavors and options? =

Currently, flavors and options are configured in the plugin code. Custom flavor management through the admin panel is planned for a future release.

= How do customers receive confirmation? =

The shop owner receives an email notification with all order details. You'll need to follow up with customers directly to confirm orders and arrange payment.

= What happens after an order is submitted? =

Orders are saved as custom posts in WordPress and an email is sent to the configured recipient. The shop owner should contact the customer within 24-48 hours to confirm details and send an invoice.

= Can I integrate this with WooCommerce? =

This plugin is designed as a standalone solution and doesn't require WooCommerce. However, WooCommerce integration could be added in a future version.

= Is there a minimum order lead time? =

Yes, the plugin enforces a 96-hour (4-day) minimum lead time for all custom orders. This can be configured in the settings.

= Does it work with Gutenberg? =

Yes! The shortcode works perfectly in both the Classic Editor and Gutenberg block editor.

== Screenshots ==

1. Order form with interactive step-by-step interface
2. Visual cake preview with real-time updates
3. Custom cake size selection
4. Flavor and frosting options
5. Mobile-responsive layout
6. Admin order management interface

== Changelog ==

= 2.0.0 - 2026-02-02 =
**Major Update: Custom Baked Products**

*Added:*
* Custom Baked Cakes (3 sizes: 6", 7", 8")
* Custom Cupcakes (sold by the dozen)
* 10 new cake/cupcake flavors including Almond
* 7 buttercream frosting options
* Cake filling add-on for both ice cream and baked cakes
* Cupcake filling add-on
* Cake topper selection (4 options)
* Decorative accents option for cupcakes
* New 3-layer baked cake renderer
* Enhanced SVG visualization system
* Inspiration photo upload for custom cakes

*Changed:*
* Updated order type grid to 2x2 layout
* Improved mobile responsiveness across all devices
* Enhanced pricing calculation system
* Redesigned flavor selection cards
* Optimized form validation

*Removed:*
* Ice Cream Cupcakes order type (consolidated into Custom Cupcakes)
* Seasonal pumpkin special accordion (removed per client request)
* Pumpkin flavors from pre-stacked options

*Fixed:*
* Mobile layout issues on tablets
* Order type card sizing inconsistencies
* Form submission data collection for new order types
* Email notification formatting
* Preview rendering for multiple order types

= 1.0.0 - 2025-11-15 =
* Initial release
* Pre-stacked ice cream cakes
* Custom ice cream cakes
* Ice cream cupcakes
* Basic visual preview system
* Order management system

== Upgrade Notice ==

= 2.0.0 =
Major update adding custom baked cakes and cupcakes with enhanced customization options. Removes ice cream cupcakes order type in favor of unified Custom Cupcakes. Backup your database before upgrading.

== Additional Info ==

**Development:**
This plugin is actively developed and maintained by Urban Churn. Feature requests and bug reports are welcome.

**Support:**
For support inquiries, please contact orders@urbanchurn.com

**Credits:**
* Developed by Urban Churn team
* SVG animations inspired by modern confectionery design
* Built with accessibility and mobile-first principles
