# Urban Churn Bakery Orders - WordPress Plugin Installation Guide

## Plugin Information
- **Plugin Name:** Urban Churn Bakery Orders
- **Version:** 2.0.0
- **File:** `urban-churn-bakery-orders.zip`
- **File Size:** ~45 KB
- **Requirements:** WordPress 5.8+, PHP 7.4+

## ✅ Plugin Validation Status

### WordPress Standards Compliance
- ✓ Proper plugin header with all required fields
- ✓ All PHP files validated (no syntax errors)
- ✓ Security checks (ABSPATH) implemented in all files
- ✓ WordPress coding standards followed
- ✓ Singleton design patterns used
- ✓ Translation ready (i18n compatible)
- ✓ readme.txt in WordPress.org format
- ✓ GPL-2.0+ licensed

### Plugin Structure
```
urban-churn-bakery-orders/
├── urban-churn-bakery-orders.php (Main plugin file)
├── readme.txt (WordPress.org format)
├── README.md
├── CHANGELOG.md
├── admin/
│   └── class-admin.php (Admin interface & settings)
├── assets/
│   ├── css/
│   │   └── public.css
│   └── js/
│       ├── public.js
│       └── cake-renderer.js
├── includes/
│   ├── class-custom-post-type.php
│   └── class-form-handler.php
├── public/
│   └── class-public.php (Public-facing functionality)
└── languages/ (Translation directory)
```

## Installation Methods

### Method 1: WordPress Admin Upload (Recommended)

1. **Login to WordPress Admin**
   - Go to your WordPress admin panel
   - Navigate to: `Plugins → Add New → Upload Plugin`

2. **Upload the Plugin**
   - Click "Choose File"
   - Select: `urban-churn-bakery-orders.zip`
   - Click "Install Now"

3. **Activate the Plugin**
   - After installation completes, click "Activate Plugin"
   - You should see "Plugin activated" message

4. **Configure Settings**
   - Go to: `Bakery Orders → Settings`
   - Configure email recipient, lead time, and business name
   - Save settings

### Method 2: FTP/SFTP Upload

1. **Extract the ZIP file** on your computer
2. **Connect via FTP/SFTP** to your WordPress server
3. **Upload the folder** `urban-churn-bakery-orders/` to:
   ```
   /wp-content/plugins/
   ```
4. **Activate in WordPress**
   - Go to: `Plugins → Installed Plugins`
   - Find "Urban Churn Bakery Orders"
   - Click "Activate"

### Method 3: WP-CLI (Command Line)

```bash
# Upload the zip file to your server first, then:
wp plugin install /path/to/urban-churn-bakery-orders.zip --activate
```

## Post-Installation Setup

### 1. Configure Plugin Settings
Navigate to: **Bakery Orders → Settings**

Configure:
- **Email Recipient:** Where order notifications are sent
- **Lead Time Hours:** Minimum hours notice required (default: 96)
- **Business Name:** Your bakery name

### 2. Add Order Form to a Page

Create or edit a WordPress page and add the shortcode:
```
[bakery_order_form]
```

**Example:**
1. Go to: `Pages → Add New`
2. Title: "Order Custom Cakes"
3. In the content editor, add: `[bakery_order_form]`
4. Click "Publish"

### 3. Test the Form
- Visit the page where you added the shortcode
- The interactive order form should display
- Test by creating a sample order

## Features After Installation

### Order Management
- View all orders: `Bakery Orders → All Orders`
- Order details stored as custom post type
- Export orders to CSV
- Email notifications sent automatically

### Order Types Available
1. **Pre-Stacked Ice Cream Cakes** - $65 fixed price
2. **Custom Ice Cream Cakes** - Starting at $75 (2-layer)
3. **Custom Baked Cakes** - 3-layer cakes in 3 sizes
4. **Custom Cupcakes** - $36/dozen

### Interactive Features
- Real-time visual cake preview (SVG-based)
- Animated layer assembly
- Interactive "peek inside" feature
- 10 cake flavors, 7 frosting options
- Optional fillings and toppers
- Responsive design (mobile-friendly)

## Troubleshooting

### Plugin Won't Activate
- Check PHP version: Must be 7.4 or higher
- Check WordPress version: Must be 5.8 or higher
- Check for conflicting plugins

### Form Not Displaying
- Verify shortcode: `[bakery_order_form]` (no extra spaces)
- Check if JavaScript is enabled
- Clear WordPress and browser cache

### Orders Not Being Received
- Check email settings in: `Bakery Orders → Settings`
- Verify WordPress can send emails
- Check spam/junk folder
- Consider using SMTP plugin (WP Mail SMTP recommended)

### Visual Preview Not Working
- Ensure JavaScript is not blocked
- Check browser console for errors
- Try different browser
- Clear cache

## Uninstallation

To remove the plugin:
1. Go to: `Plugins → Installed Plugins`
2. Find "Urban Churn Bakery Orders"
3. Click "Deactivate"
4. Click "Delete"

**Note:** Order data will remain in database. To completely remove all data, manually delete the `bakery_order` custom post type entries before uninstalling.

## Support & Documentation

- **Full Documentation:** See README.md in plugin folder
- **Changelog:** See CHANGELOG.md for version history
- **GitHub Issues:** Report bugs and request features
- **WordPress.org:** Plugin page (when published)

## Security Notes

- Plugin follows WordPress security best practices
- All user input is sanitized
- CSRF protection via nonces
- Capability checks for admin functions
- No known security vulnerabilities

## Performance

- Lightweight: ~45 KB total size
- Minimal database queries
- Assets loaded only on pages with shortcode
- Optimized JavaScript and CSS

---

**Plugin is ready for production use!** 🎂🧁

For any questions or issues, refer to the README.md or contact support.
