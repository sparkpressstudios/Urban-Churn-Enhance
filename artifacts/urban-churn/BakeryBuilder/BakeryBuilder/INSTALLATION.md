# Urban Churn Bakery Orders v2.0.0 - Installation Guide

## Quick Start

### 1. Download the Plugin
You should have the file: `urban-churn-bakery-orders-v2.0.0.zip` (49KB)

### 2. Install in WordPress

**Option A: Upload via WordPress Admin (Recommended)**

1. Log into your WordPress admin panel
2. Go to **Plugins → Add New**
3. Click **Upload Plugin** button at the top
4. Click **Choose File** and select `urban-churn-bakery-orders-v2.0.0.zip`
5. Click **Install Now**
6. Click **Activate Plugin**

**Option B: Manual FTP Installation**

1. Extract the zip file on your computer
2. Upload the `urban-churn-bakery-orders` folder to `/wp-content/plugins/` via FTP
3. Go to WordPress Admin → Plugins
4. Find "Urban Churn Bakery Orders" and click **Activate**

### 3. Configure Settings

1. Go to **Bakery Orders → Settings** in WordPress admin
2. Configure the following:
   - **Email Recipient**: orders@urbanchurn.com (or your email)
   - **Lead Time Hours**: 96 (4 days minimum)
   - **Business Name**: Urban Churn Louise Drive Scoop Shop & Bakery
3. Click **Save Settings**

### 4. Add to Your Website

1. Create a new page or edit an existing one
2. Add the shortcode:
   ```
   [bakery_order_form]
   ```
3. **Publish** the page
4. Visit the page to see your order form!

## What's Included

✅ **4 Order Types:**
- Pre-Stacked Ice Cream Cake ($65)
- Custom Ice Cream Cake (Starting at $75)
- Custom Baked Cake (3 sizes: $75/$100/$125)
- Custom Cupcakes ($36/dozen)

✅ **10 Flavors:**
Vanilla, Double Chocolate, Strawberry, Cookies & Cream, Salted Caramel, S'mores, Carrot Cake, Marble, Funfetti, Almond

✅ **7 Buttercream Frostings:**
Vanilla, Double Chocolate, Salted Caramel, Almond, Cookies 'N Cream, Strawberry, Cream Cheese

✅ **Add-Ons:**
- Cake Fillings (+$15 for cakes, +$10/dozen for cupcakes)
- Cake Toppers (4 messages)
- Natural Frosting Colors (+$10)
- Decorative Accents ($12-$20)

✅ **Features:**
- Interactive SVG visual preview
- Real-time price calculation
- Mobile-responsive design
- Email notifications
- Order management in WordPress admin

## Post-Installation Checklist

- [ ] Plugin activated successfully
- [ ] Settings configured (email, lead time)
- [ ] Shortcode added to a page
- [ ] Test order submitted successfully
- [ ] Email notification received
- [ ] Order appears in WordPress Admin → Bakery Orders
- [ ] Form displays correctly on mobile devices
- [ ] Visual preview animates properly

## Testing the Form

1. Visit the page with your order form
2. Fill out customer information (Step 1)
3. Select an order type (Step 2)
4. Customize your order (Step 3)
5. Add special requests (Step 4)
6. Submit the form
7. Check for confetti celebration animation
8. Verify email notification was received
9. Check WordPress Admin → Bakery Orders for the order entry

## Common Issues & Solutions

### Form doesn't display
- **Solution**: Make sure you added the shortcode `[bakery_order_form]` to the page
- Check that the plugin is activated

### No email notifications
- **Solution**: Check your email settings in WordPress
- Verify the email address in Bakery Orders → Settings
- Check spam folder
- Consider using SMTP plugin for reliable email delivery

### Visual preview not showing
- **Solution**: Clear browser cache
- Check browser console for JavaScript errors
- Ensure jQuery is loaded (comes with WordPress)

### Mobile layout issues
- **Solution**: The plugin is mobile-responsive by default
- Clear cache and test on actual mobile device
- Check theme compatibility

### Orders not saving
- **Solution**: Check file permissions
- Verify WordPress database connection
- Check for plugin conflicts (disable other plugins temporarily)

## Requirements

✔️ WordPress 5.8 or higher  
✔️ PHP 7.4 or higher  
✔️ Modern browser with JavaScript enabled  
✔️ jQuery (included with WordPress)

## Upgrading from v1.0.0

If you're upgrading from version 1.0.0:

1. **Backup your database** before upgrading
2. Deactivate the old version
3. Delete the old plugin folder (orders are safe in the database)
4. Install v2.0.0 following the steps above
5. Reactivate the plugin

**Changes from v1.0:**
- ❌ Ice Cream Cupcakes removed (replaced by Custom Cupcakes)
- ✅ Custom Baked Cakes added
- ✅ Custom Cupcakes added (baked, not ice cream)
- ✅ Enhanced mobile responsiveness
- ✅ 2x2 order type grid layout

## Support

Need help? Contact us:
- **Email**: orders@urbanchurn.com
- **Documentation**: See README.md and CHANGELOG.md

## Next Steps

After installation:

1. **Test thoroughly** - Submit test orders and verify the workflow
2. **Customize email** - Update the recipient email address
3. **Add to navigation** - Link to your order form from your menu
4. **Promote** - Share the order form link with customers
5. **Train staff** - Show team how to manage orders in WordPress admin

## Files Included

```
urban-churn-bakery-orders/
├── urban-churn-bakery-orders.php  (Main plugin file)
├── readme.txt                     (WordPress repository info)
├── CHANGELOG.md                   (Version history)
├── README.md                      (Documentation)
├── admin/
│   └── class-admin.php           (Admin interface)
├── assets/
│   ├── css/
│   │   └── public.css            (Styles)
│   └── js/
│       ├── cake-renderer.js      (SVG visualizer)
│       └── public.js             (Form logic)
├── includes/
│   ├── class-custom-post-type.php
│   └── class-form-handler.php
├── public/
│   └── class-public.php          (Frontend form)
└── languages/                     (Translation files)
```

---

**Ready to start taking orders? Let's get baking! 🎂**
