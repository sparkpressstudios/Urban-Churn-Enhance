# Urban Churn Bakery Orders WordPress Plugin

## Project Overview

This is a WordPress plugin that provides an interactive bakery ordering form with animated visual effects for Urban Churn Louise Drive Scoop Shop & Bakery. The plugin allows customers to order custom cakes, pre-stacked cakes, and cupcakes with real-time visual assembly animations.

## Purpose

Create an engaging, user-friendly ordering system for bakery items that:
- Shows animated visual previews of items being assembled
- Collects customer information and order specifications
- Sends notifications to orders@urbanchurn.com
- Stores orders in WordPress database
- Provides admin dashboard for order management

## Architecture

### Plugin Structure
```
urban-churn-bakery-orders/
├── urban-churn-bakery-orders.php (Main plugin file)
├── includes/
│   ├── class-custom-post-type.php (Bakery orders post type)
│   └── class-form-handler.php (AJAX form submission handler)
├── admin/
│   └── class-admin.php (Admin settings page)
├── public/
│   └── class-public.php (Frontend shortcode and display)
├── assets/
│   ├── css/
│   │   └── public.css (Styles with animations)
│   └── js/
│       └── public.js (Interactive form logic)
├── README.md
└── replit.md
```

### Key Components

**Custom Post Type**: `bakery_order`
- Stores all order submissions
- Meta fields for customer info and order details
- Admin interface for viewing orders

**Shortcode**: `[bakery_order_form]`
- Embeds the order form on any page
- Loads CSS and JavaScript assets
- Handles form display and interaction

**AJAX Handler**: Processes form submissions
- Validates customer input
- Saves order to database
- Sends email notifications
- Returns success/error responses

**Settings Page**: Configure plugin behavior
- Email recipient
- Lead time requirements
- Seasonal offerings toggle
- Business name

## Design System

### Colors
- Primary (Bakery Pink): #E91E63
- Secondary (Mint Green): #8BC34A
- Accent (Warm Orange): #FF9800
- Background (Cream): #FFF8E1
- Text (Chocolate Brown): #3E2723
- Success (Fresh Green): #4CAF50

### Typography
- Headings: Playfair Display (serif)
- Body: Lato (sans-serif)

### Animations
- Cake layer stacking animation
- Cupcake grid pop-in effects
- Price update transitions
- Form section slide-downs
- Success message animations

## Order Types

1. **Pre-Stacked Ice Cream Cake** ($65)
   - 5 flavor options
   - Add-ons available
   - 2-layer, 7-inch (serves 14-18)

2. **Custom Ice Cream Cake** ($75+)
   - Custom cake flavor
   - Ice cream flavor selection
   - Frosting type (Buttercream or Whipped)
   - Optional filling
   - Add-ons available
   - 2-layer, 7-inch (serves 14-18)

3. **Cupcakes by the Dozen** ($36)
   - 7 flavor options including seasonal Pumpkin
   - 12 cupcakes per order

### Available Add-Ons
- Topper (Happy Birthday, etc.): +$8.50
- Natural Color Accents: +$10.00

## Development Status

### Completed (MVP Phase)
- ✅ WordPress plugin structure
- ✅ Custom post type for orders
- ✅ Shortcode functionality
- ✅ Interactive form with three order types
- ✅ Visual preview with animations
- ✅ Dynamic pricing calculator
- ✅ Form validation (96-hour lead time)
- ✅ AJAX form submission
- ✅ Email notifications
- ✅ Admin order viewing
- ✅ Settings page
- ✅ Seasonal banner feature
- ✅ Bakery-themed design
- ✅ Responsive layout

### Future Enhancements (Next Phase)
- Image upload for custom cake inspiration
- Advanced admin dashboard with order status tracking
- Customizable pricing through admin interface
- Inventory management for pre-stacked cakes
- CSV export for orders
- SMS notifications integration
- Payment processing integration

## Installation Instructions

1. Upload plugin folder to `/wp-content/plugins/`
2. Activate through WordPress admin
3. Add `[bakery_order_form]` shortcode to desired page
4. Configure settings under Bakery Orders > Settings

## Technical Notes

- Uses WordPress AJAX API for form submissions
- Implements proper nonce verification for security
- All user input sanitized and validated
- Email sent via wp_mail()
- Responsive design (mobile-friendly)
- CSS animations use hardware acceleration
- jQuery dependency (included with WordPress)

## User Preferences

- Professional, warm bakery aesthetic
- Smooth animations inspired by Nike By You and Domino's Pizza Builder
- All-natural color accents emphasis
- 96-hour lead time requirement
- Email notifications to orders@urbanchurn.com

## Recent Changes

**October 30, 2025**
- Initial plugin development completed
- All core features implemented
- WordPress plugin structure established
- Visual animations and interactive builder created
- Admin dashboard and settings page added
