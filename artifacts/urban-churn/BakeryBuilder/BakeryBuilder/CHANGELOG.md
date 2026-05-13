# Changelog

All notable changes to Urban Churn Bakery Orders plugin will be documented in this file.

## [2.0.0] - 2026-02-02

### Added
- **Custom Baked Cakes** order type with 3 size options
  - 6" cake ($75) - Feeds 10-12
  - 7" cake ($100) - Feeds 16-20  
  - 8" cake ($125) - Feeds 26-30
- **Custom Cupcakes** order type ($36/dozen)
- 10 cake and cupcake flavors:
  - Vanilla, Double Chocolate, Strawberry
  - Cookies & Cream, Salted Caramel, S'mores
  - Carrot Cake, Marble, Funfetti, Almond
- 7 buttercream frosting options:
  - Vanilla, Double Chocolate, Salted Caramel
  - Almond, Cookies 'N Cream, Strawberry, Cream Cheese
- Cake filling add-on system
  - +$15 for baked cakes
  - +$10/dozen for cupcakes
  - 7 filling flavors available
- Cake topper selection (4 options)
  - Happy Birthday, Happy Anniversary
  - Oh Baby, Congratulations
- Decorative accents option for cupcakes ($12-$20)
- Inspiration photo upload field for custom cakes
- Enhanced 3-layer baked cake visualization
- New flavor colors in SVG renderer
- Size-based pricing system for baked cakes
- Quantity-based pricing for cupcakes

### Changed
- Order type grid layout changed from 3-column to 2x2 for 4 cards
- Enhanced mobile responsiveness
  - 2-column grid on tablet (≤1024px)
  - Single column on mobile (≤768px)
  - Optimized touch targets and spacing
- Improved form validation for new order types
- Updated pricing calculation to handle size variations
- Enhanced visual preview system for multiple cake types
- Redesigned flavor selection cards with better visual hierarchy
- Order type cards now have consistent min-height
- Improved text sizing and readability across devices

### Removed
- "Ice Cream Cupcakes" order type (replaced by Custom Cupcakes)
- Seasonal pumpkin special accordion banner
- Pumpkin flavor from pre-stacked ice cream cake options
- Pumpkin flavor from ice cream cupcakes
- `seasonal_pumpkin_enabled` setting

### Fixed
- Order type card alignment issues on different screen sizes
- Mobile layout breaking on tablets
- Form submission data collection for complex order types
- Email notification formatting for new order types
- JavaScript preview rendering for baked products
- CSS grid inconsistencies
- Topper display issues in demo file
- Form handler pricing calculations

### Technical
- Updated plugin version to 2.0.0
- Synced demo files with plugin files
- Added extra small mobile breakpoint (≤480px)
- Improved CSS organization and mobile queries
- Enhanced JavaScript modularity
- Optimized form data serialization

## [1.0.0] - 2025-11-15

### Added
- Initial plugin release
- Pre-Stacked Ice Cream Cake order type ($65 fixed price)
- Custom Ice Cream Cake order type (starting at $75)
- Ice Cream Cupcakes order type ($36/dozen)
- 7 ice cream cake flavors
- Ice cream cake customization options
- Cake topper add-on (+$8.50)
- Natural frosting color add-on (+$10)
- Interactive SVG-based visual preview
- Animated layer assembly effects
- Multi-step accordion form interface
- Real-time price calculation
- AJAX form submission
- Confetti celebration animation
- Email notifications to shop owner
- Custom post type for order management
- Admin settings page
- 96-hour lead time enforcement
- Mobile responsive design
- WordPress shortcode: `[bakery_order_form]`
- Accessibility features (keyboard navigation, screen reader support)

### Technical
- WordPress 5.8+ compatibility
- PHP 7.4+ requirement
- Custom post type: `bakery_order`
- Admin menu integration
- Email template system
- SVG rendering engine
- jQuery-based interactivity
- CSS animations and transitions

---

## Version History

- **2.0.0** - Major update with baked products
- **1.0.0** - Initial release with ice cream products
