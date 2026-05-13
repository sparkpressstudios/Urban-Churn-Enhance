<?php
if (!defined('ABSPATH')) {
    exit;
}

class UCBO_Public {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_shortcode('bakery_order_form', array($this, 'render_order_form'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        UCBO_Form_Handler::get_instance();
    }
    
    public function enqueue_scripts() {
        if (!is_singular() && !is_page()) {
            return;
        }
        
        global $post;
        if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'bakery_order_form')) {
            return;
        }
        
        wp_enqueue_style(
            'ucbo-public-styles',
            UCBO_PLUGIN_URL . 'assets/css/public.css',
            array(),
            UCBO_VERSION
        );
        
        wp_enqueue_style(
            'google-fonts-playfair',
            'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&family=Caveat:wght@400;600;700&display=swap',
            array(),
            null
        );
        
        wp_enqueue_style(
            'font-awesome',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            array(),
            '6.4.0'
        );
        
        wp_enqueue_script(
            'ucbo-cake-renderer',
            UCBO_PLUGIN_URL . 'assets/js/cake-renderer.js',
            array('jquery'),
            UCBO_VERSION,
            true
        );
        
        wp_enqueue_script(
            'ucbo-public-script',
            UCBO_PLUGIN_URL . 'assets/js/public.js',
            array('jquery', 'ucbo-cake-renderer'),
            UCBO_VERSION,
            true
        );
        
        $settings = get_option('ucbo_settings');
        $lead_time_hours = isset($settings['lead_time_hours']) ? $settings['lead_time_hours'] : 96;
        
        wp_localize_script('ucbo-public-script', 'ucboData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ucbo_submit_order_nonce'),
            'leadTimeHours' => $lead_time_hours,
        ));
    }
    
    public function render_order_form($atts) {
        ob_start();
        ?>
        
        <div class="ucbo-wrapper">
            
            <div class="ucbo-form-container">
                <div class="ucbo-form-left">
                    <div class="ucbo-header">
                        <h1>Order Your Custom Bakery Treats</h1>
                        <p class="ucbo-subtitle">Handcrafted at Urban Churn Louise Drive Scoop Shop & Bakery</p>
                    </div>
                    
                    <form id="ucbo-order-form" class="ucbo-form">
                        
                        <!-- Step 1: Customer Information -->
                        <div class="ucbo-accordion-step" data-step="1">
                            <div class="ucbo-accordion-header active">
                                <div class="ucbo-step-indicator">
                                    <span class="ucbo-step-number">1</span>
                                    <span class="ucbo-step-checkmark">✓</span>
                                </div>
                                <h2>Customer Information</h2>
                                <span class="ucbo-accordion-icon">▼</span>
                            </div>
                            <div class="ucbo-accordion-content active">
                                <div class="ucbo-form-group">
                                    <label for="customer_name">Full Name <span class="required">*</span></label>
                                    <input type="text" id="customer_name" name="customer_name" required>
                                </div>
                                
                                <div class="ucbo-form-row">
                                    <div class="ucbo-form-group">
                                        <label for="customer_phone">Phone Number <span class="required">*</span></label>
                                        <input type="tel" id="customer_phone" name="customer_phone" required>
                                    </div>
                                    
                                    <div class="ucbo-form-group">
                                        <label for="customer_email">Email Address <span class="required">*</span></label>
                                        <input type="email" id="customer_email" name="customer_email" required>
                                    </div>
                                </div>
                                
                                <div class="ucbo-form-row">
                                    <div class="ucbo-form-group">
                                        <label for="pickup_date">Preferred Pickup Date <span class="required">*</span></label>
                                        <input type="date" id="pickup_date" name="pickup_date" required>
                                    </div>
                                    
                                    <div class="ucbo-form-group">
                                        <label for="pickup_time">Preferred Pickup Time <span class="required">*</span></label>
                                        <input type="time" id="pickup_time" name="pickup_time" required>
                                    </div>
                                </div>
                                
                                <div class="ucbo-form-group">
                                    <label for="referral">How did you hear about us?</label>
                                    <input type="text" id="referral" name="referral" placeholder="Optional">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 2: Order Type -->
                        <div class="ucbo-accordion-step" data-step="2">
                            <div class="ucbo-accordion-header">
                                <div class="ucbo-step-indicator">
                                    <span class="ucbo-step-number">2</span>
                                    <span class="ucbo-step-checkmark">✓</span>
                                </div>
                                <h2>Order Type</h2>
                                <span class="ucbo-accordion-icon">▼</span>
                            </div>
                            <div class="ucbo-accordion-content">
                                <div class="ucbo-order-types">
                                    <label class="ucbo-order-type-card">
                                        <input type="radio" name="order_type" value="Pre-Stacked Ice Cream Cake" required>
                                        <div class="ucbo-card-content">
                                            <h3>Pre-Stacked Ice Cream Cake</h3>
                                            <p class="ucbo-price">$65</p>
                                            <p class="ucbo-description">2-layer, 7-inch (serves 14–18 people)</p>
                                        </div>
                                    </label>
                                    
                                    <label class="ucbo-order-type-card">
                                        <input type="radio" name="order_type" value="Custom Ice Cream Cake" required>
                                        <div class="ucbo-card-content">
                                            <h3>Custom Ice Cream Cake</h3>
                                            <p class="ucbo-price">Starting at $75</p>
                                            <p class="ucbo-description">2-layer, 7-inch (serves 14–18 people)</p>
                                        </div>
                                    </label>
                                    
                                    <label class="ucbo-order-type-card">
                                        <input type="radio" name="order_type" value="Custom Cake" required>
                                        <div class="ucbo-card-content">
                                            <h3>Custom Cake</h3>
                                            <p class="ucbo-price">Starting at $75</p>
                                            <p class="ucbo-description">3-layer baked cake, made to order</p>
                                        </div>
                                    </label>
                                    
                                    <label class="ucbo-order-type-card">
                                        <input type="radio" name="order_type" value="Custom Cupcakes" required>
                                        <div class="ucbo-card-content">
                                            <h3>Custom Cupcakes</h3>
                                            <p class="ucbo-price">$36 per dozen</p>
                                            <p class="ucbo-description">Baked cupcakes with buttercream frosting</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 3: Customize Your Order -->
                        <div class="ucbo-accordion-step" data-step="3">
                            <div class="ucbo-accordion-header">
                                <div class="ucbo-step-indicator">
                                    <span class="ucbo-step-number">3</span>
                                    <span class="ucbo-step-checkmark">✓</span>
                                </div>
                                <h2>Customize Your Order</h2>
                                <span class="ucbo-accordion-icon">▼</span>
                            </div>
                            <div class="ucbo-accordion-content">
                                
                                <div id="no-order-type-message" class="ucbo-no-selection-message">
                                    <div class="ucbo-message-icon">📝</div>
                                    <p>Please choose an Order Type in Step 2 to continue.</p>
                                </div>
                                
                                <!-- Pre-Stacked Options -->
                                <div id="pre-stacked-options" class="ucbo-order-options" style="display: none;">
                                    <div class="ucbo-form-group">
                                        <label for="pre_stacked_flavor">Choose Your Flavor <span class="required">*</span></label>
                                        <div class="ucbo-flavor-cards">
                                            <label class="ucbo-flavor-card">
                                                <input type="radio" name="pre_stacked_flavor" value="Cookies 'N Cream" required>
                                                <div class="ucbo-flavor-card-content">
                                                    <div class="ucbo-flavor-icon">🍪</div>
                                                    <h4>Cookies 'N Cream</h4>
                                                    <p>Classic cookies with vanilla</p>
                                                </div>
                                            </label>
                                            <label class="ucbo-flavor-card">
                                                <input type="radio" name="pre_stacked_flavor" value="Peanut Butter Cup" required>
                                                <div class="ucbo-flavor-card-content">
                                                    <div class="ucbo-flavor-icon">🥜</div>
                                                    <h4>Peanut Butter Cup</h4>
                                                    <p>Rich peanut butter</p>
                                                </div>
                                            </label>
                                            <label class="ucbo-flavor-card">
                                                <input type="radio" name="pre_stacked_flavor" value="Strawberries & Cream" required>
                                                <div class="ucbo-flavor-card-content">
                                                    <div class="ucbo-flavor-icon">🍓</div>
                                                    <h4>Strawberries & Cream</h4>
                                                    <p>Sweet and fruity</p>
                                                </div>
                                            </label>
                                            <label class="ucbo-flavor-card">
                                                <input type="radio" name="pre_stacked_flavor" value="Funfetti" required>
                                                <div class="ucbo-flavor-card-content">
                                                    <div class="ucbo-flavor-icon">🎉</div>
                                                    <h4>Funfetti</h4>
                                                    <p>Colorful celebration</p>
                                                </div>
                                            </label>
                                            <label class="ucbo-flavor-card">
                                                <input type="radio" name="pre_stacked_flavor" value="Vanilla" required>
                                                <div class="ucbo-flavor-card-content">
                                                    <div class="ucbo-flavor-icon">⚪</div>
                                                    <h4>Vanilla</h4>
                                                    <p>Classic & timeless</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div class="ucbo-form-group">
                                        <label>Frosting Type <span class="required">*</span></label>
                                        <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0;">Frosting covers the entire cake on all exposed sides.</p>
                                        <div class="ucbo-radio-group">
                                            <label class="ucbo-radio-label">
                                                <input type="radio" name="pre_stacked_frosting_type" value="Buttercream">
                                                <span>Buttercream</span>
                                            </label>
                                            <label class="ucbo-radio-label">
                                                <input type="radio" name="pre_stacked_frosting_type" value="Whipped Topping">
                                                <span>Whipped Topping (Cool Whip-style)</span>
                                            </label>
                                            <label class="ucbo-radio-label">
                                                <input type="radio" name="pre_stacked_frosting_type" value="None">
                                                <span>None (No Frosting)</span>
                                            </label>
                                        </div>
                                        <div class="ucbo-form-group" style="margin-top:10px;">
                                            <label>Frosting Coverage</label>
                                            <div class="ucbo-radio-group">
                                                <label class="ucbo-radio-label">
                                                    <input type="radio" name="pre_stacked_frosting_coverage" value="Top only" checked>
                                                    <span>Top only</span>
                                                </label>
                                                <label class="ucbo-radio-label">
                                                    <input type="radio" name="pre_stacked_frosting_coverage" value="All sides">
                                                    <span>All sides</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Custom Ice Cream Cake Options -->
                                <?php echo $this->render_custom_cake_html(); ?>
                                <!-- Custom Baked Cake Options -->
                                <?php echo $this->render_custom_baked_cake_html(); ?>
                                <!-- Custom Baked Cupcakes Options -->
                                <?php echo $this->render_custom_baked_cupcakes_html(); ?>
                                <!-- Add-ons Section -->
                                <?php echo $this->render_addons_html(); ?>
                                
                            </div>
                        </div>
                        
                        <!-- Step 4: Special Requests -->
                        <div class="ucbo-accordion-step" data-step="4">
                            <div class="ucbo-accordion-header">
                                <div class="ucbo-step-indicator">
                                    <span class="ucbo-step-number">4</span>
                                    <span class="ucbo-step-checkmark">✓</span>
                                </div>
                                <h2>Special Requests</h2>
                                <span class="ucbo-accordion-icon">▼</span>
                            </div>
                            <div class="ucbo-accordion-content">
                                <div class="ucbo-form-group">
                                    <label for="special_requests">Additional Notes / Requests</label>
                                    <textarea id="special_requests" name="special_requests" rows="4" placeholder="Any special requests or additional details..."></textarea>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ucbo-form-section ucbo-info-section">
                            <h3>Order Information</h3>
                            <ul>
                                <li>All cakes and cupcakes are handcrafted at our Louise Drive Scoop Shop & Bakery.</li>
                                <li>Please allow <strong>96 hours (4 days)</strong> for all orders.</li>
                                <li>Pre-stacked cakes are available in limited weekly quantities.</li>
                                <li>Custom cakes start at $75; final pricing will be confirmed before invoicing.</li>
                                <li>Orders are not confirmed until we contact you and payment is received.</li>
                            </ul>
                        </div>
                        
                        <div class="ucbo-form-actions">
                            <button type="submit" class="ucbo-submit-btn">
                                <span class="ucbo-btn-text">Submit Order Request</span>
                                <span class="ucbo-btn-loading" style="display: none;">Submitting...</span>
                            </button>
                        </div>
                    </form>
                    
                    <div id="ucbo-success-message" class="ucbo-success-message" style="display: none;">
                        <div class="ucbo-success-icon">✓</div>
                        <h2>Thank you for your request!</h2>
                        <p>Our bakery team will review your order and reach out within 24–48 hours to confirm details and send your invoice.</p>
                        <p><strong>Please note:</strong> All cake and cupcake orders require a minimum of 96 hours (4 days) lead time for preparation.</p>
                        <p style="margin-top: 20px;"><button onclick="location.reload()" style="padding: 10px 20px; background: #E91E63; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">Start New Order</button></p>
                    </div>
                </div>
                
                <div class="ucbo-form-right">
                    <div class="ucbo-visual-builder">
                        <h3>Your Creation</h3>
                        <div class="ucbo-preview-controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:10px;">
                            <label style="display:flex; align-items:center; gap:6px; margin-left:auto; font-weight:600;">
                                <input type="checkbox" id="candles_toggle" checked>
                                <span>Show candles</span>
                            </label>
                        </div>
                        
                        <div class="ucbo-preview-container">
                            <div id="ucbo-cake-preview" class="ucbo-cake-preview">
                                <div class="ucbo-placeholder-icon">🎂</div>
                                <p class="ucbo-placeholder-text">Select your order type to see a preview</p>
                            </div>
                        </div>
                        
                        <div class="ucbo-price-summary">
                            <h4>Price Summary 
                                <span class="ucbo-info-tooltip">
                                    <span class="ucbo-info-icon">ⓘ</span>
                                    <span class="ucbo-tooltip-content">
                                        <strong>Price Breakdown:</strong><br>
                                        Base prices include all standard ingredients and preparation.<br><br>
                                        <strong>Custom Cakes:</strong> Starting at $75 (may vary based on complexity)<br>
                                        <strong>Pre-Stacked Cakes:</strong> Fixed at $65<br>
                                        <strong>Cupcakes:</strong> $36 per dozen<br><br>
                                        Final pricing confirmed before payment.
                                    </span>
                                </span>
                            </h4>
                            <div class="ucbo-price-line">
                                <span>Base Price:</span>
                                <span id="ucbo-base-price">$0.00</span>
                            </div>
                            <div id="ucbo-quantity-price" class="ucbo-price-line" style="display: none;">
                                <span>Quantity:</span>
                                <span id="ucbo-quantity-display">1x</span>
                            </div>
                            <div id="ucbo-topper-price" class="ucbo-price-line" style="display: none;">
                                <span>Topper:</span>
                                <span>+$8.50</span>
                            </div>
                            <div id="ucbo-color-price" class="ucbo-price-line" style="display: none;">
                                <span>Color Accents:</span>
                                <span>+$10.00</span>
                            </div>
                            <div class="ucbo-price-total">
                                <span>Total:</span>
                                <span id="ucbo-total-price">$0.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <?php
        return ob_get_clean();
    }
    
    private function render_custom_cake_html() {
        ob_start();
        ?>
        <div id="custom-cake-options" class="ucbo-order-options" style="display: none;">
            <div class="ucbo-form-group">
                <label for="cake_flavor">Cake Flavor <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="cake_flavor" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍰</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="cake_flavor" value="Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="cake_flavor" value="Red Velvet" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">❤️</div>
                            <h4>Red Velvet</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="cake_flavor" value="Funfetti" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎉</div>
                            <h4>Funfetti</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label for="ice_cream_flavor">Ice Cream Flavor <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Cookies 'N Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍪</div>
                            <h4>Cookies 'N Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Peanut Butter Cup" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🥜</div>
                            <h4>Peanut Butter Cup</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Strawberries & Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍓</div>
                            <h4>Strawberries & Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Funfetti" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎉</div>
                            <h4>Funfetti</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">⚪</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="ice_cream_flavor" value="Mint Chocolate Chip" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍃</div>
                            <h4>Mint Chocolate Chip</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label>Frosting Type <span class="required">*</span></label>
                <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0;">Frosting covers the entire cake on all exposed sides.</p>
                <div class="ucbo-radio-group">
                    <label class="ucbo-radio-label">
                        <input type="radio" name="frosting_type" value="Buttercream">
                        <span>Buttercream</span>
                    </label>
                    <label class="ucbo-radio-label">
                        <input type="radio" name="frosting_type" value="Whipped Topping">
                        <span>Whipped Topping (Cool Whip-style)</span>
                    </label>
                    <label class="ucbo-radio-label">
                        <input type="radio" name="frosting_type" value="None">
                        <span>None (No Frosting)</span>
                    </label>
                </div>
                <div class="ucbo-form-group" style="margin-top:10px;">
                    <label>Frosting Coverage</label>
                    <div class="ucbo-radio-group">
                        <label class="ucbo-radio-label">
                            <input type="radio" name="frosting_coverage" value="Top only" checked>
                            <span>Top only</span>
                        </label>
                        <label class="ucbo-radio-label">
                            <input type="radio" name="frosting_coverage" value="All sides">
                            <span>All sides</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label for="inspiration_photo">Inspiration Photo (Optional)</label>
                <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0;">Upload a photo for design inspiration. Accepted formats: JPG, PNG (max 5MB)</p>
                <input type="file" id="inspiration_photo" name="inspiration_photo" accept="image/jpeg,image/png,image/jpg" style="display: block; padding: 10px; border: 2px dashed #E0E0E0; border-radius: 8px; width: 100%; cursor: pointer;">
                <div id="photo_preview" style="margin-top: 10px; display: none;">
                    <img id="photo_preview_img" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #E0E0E0;">
                    <button type="button" id="remove_photo" style="display: block; margin-top: 5px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Remove Photo</button>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label for="filling">Filling (Optional)</label>
                <div class="ucbo-flavor-cards ucbo-filling-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🚫</div>
                            <h4>No Filling</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="Raspberry Jam">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon"><i class="fa-solid fa-jar" style="color: #dc143c;"></i></div>
                            <h4>Raspberry Jam</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="Chocolate Ganache">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Chocolate Ganache</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="Cherry Filling">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍒</div>
                            <h4>Cherry Filling</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="Salted Caramel">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍬</div>
                            <h4>Salted Caramel</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="filling" value="Peanut Butter">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🥜</div>
                            <h4>Peanut Butter</h4>
                        </div>
                    </label>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    private function render_addons_html() {
        ob_start();
        ?>
        <div id="addons-section" style="display: none;">
            <h3 style="margin-top: 20px; margin-bottom: 15px; font-size: 1.2em;">Add-Ons</h3>
            
            <div class="ucbo-addon-group">
                <label class="ucbo-checkbox-label">
                    <input type="checkbox" name="topper" id="topper_checkbox">
                    <span>Add Cake Topper (+$8.50)</span>
                </label>
                <div id="topper_select_container" style="display: none;">
                    <label for="topper_message" style="font-size: 0.9em; color: #666; display: block; margin-bottom: 5px;">Choose Topper Message (Physical plastic topper)</label>
                    <select id="topper_message" name="topper_message" style="width: 100%; padding: 10px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 1em;">
                        <option value="">Select a message...</option>
                        <option value="Happy Birthday">Happy Birthday</option>
                        <option value="Happy Anniversary">Happy Anniversary</option>
                        <option value="Congratulations">Congratulations</option>
                    </select>
                </div>
            </div>
            
            <div class="ucbo-addon-group">
                <label class="ucbo-checkbox-label">
                    <input type="checkbox" name="color_accents" id="color_accents_checkbox">
                    <span>Natural Frosting Color (+$10.00)</span>
                </label>
                <div id="color_request_container" style="display: none;">
                    <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0;">All-natural frosting colors (no artificial food coloring). Choose one color, or keep unchecked for natural frosting color. Frosting covers all exposed sides of the cake.</p>
                    <div class="ucbo-color-selection">
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Pink" data-color="#FFB6C1">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%);"></span>
                            <span class="ucbo-color-name">Pink (Beet)</span>
                        </label>
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Purple" data-color="#DDA0DD">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #DDA0DD 0%, #BA55D3 100%);"></span>
                            <span class="ucbo-color-name">Purple (Blueberry)</span>
                        </label>
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Blue" data-color="#87CEEB">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%);"></span>
                            <span class="ucbo-color-name">Blue (Spirulina)</span>
                        </label>
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Green" data-color="#90EE90">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #90EE90 0%, #32CD32 100%);"></span>
                            <span class="ucbo-color-name">Green (Matcha)</span>
                        </label>
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Yellow" data-color="#FFE87C">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #FFE87C 0%, #FFD700 100%);"></span>
                            <span class="ucbo-color-name">Yellow (Turmeric)</span>
                        </label>
                        <label class="ucbo-color-option">
                            <input type="radio" name="frosting_color" value="Orange" data-color="#FFB347">
                            <span class="ucbo-color-swatch" style="background: linear-gradient(135deg, #FFB347 0%, #FF8C00 100%);"></span>
                            <span class="ucbo-color-name">Orange (Carrot)</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    private function render_custom_baked_cake_html() {
        ob_start();
        ?>
        <div id="custom-baked-cake-options" class="ucbo-order-options" style="display: none;">
            <div class="ucbo-form-group">
                <label>Cake Size <span class="required">*</span></label>
                <div class="ucbo-size-cards">
                    <label class="ucbo-size-card">
                        <input type="radio" name="baked_cake_size" value="6-inch" required>
                        <div class="ucbo-size-card-content">
                            <h4>6" Cake</h4>
                            <p class="ucbo-size-price">$75</p>
                            <p class="ucbo-size-serves">Feeds 10–12</p>
                        </div>
                    </label>
                    <label class="ucbo-size-card">
                        <input type="radio" name="baked_cake_size" value="7-inch" required>
                        <div class="ucbo-size-card-content">
                            <h4>7" Cake</h4>
                            <p class="ucbo-size-price">$100</p>
                            <p class="ucbo-size-serves">Feeds 16–20</p>
                        </div>
                    </label>
                    <label class="ucbo-size-card">
                        <input type="radio" name="baked_cake_size" value="8-inch" required>
                        <div class="ucbo-size-card-content">
                            <h4>8" Cake</h4>
                            <p class="ucbo-size-price">$125</p>
                            <p class="ucbo-size-serves">Feeds 26–30</p>
                        </div>
                    </label>
                </div>
                <p style="font-size: 0.9em; color: #666; margin-top: 10px;">All custom cakes are 3-layer and made to order.</p>
            </div>
            
            <div class="ucbo-form-group">
                <label>Cake Flavor <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍰</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Double Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Double Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Strawberry" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍓</div>
                            <h4>Strawberry</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Cookies & Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍪</div>
                            <h4>Cookies & Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Salted Caramel" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍬</div>
                            <h4>Salted Caramel</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="S'mores" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🔥</div>
                            <h4>S'mores</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Carrot Cake" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🥕</div>
                            <h4>Carrot Cake</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Marble" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎨</div>
                            <h4>Marble</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Funfetti" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎉</div>
                            <h4>Funfetti</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Almond" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🌰</div>
                            <h4>Almond</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_flavor" value="Lemon" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍋</div>
                            <h4>Lemon</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label>Buttercream Frosting <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">⚪</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Double Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Double Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Salted Caramel" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍬</div>
                            <h4>Salted Caramel</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Almond" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🌰</div>
                            <h4>Almond</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Cookies N Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍪</div>
                            <h4>Cookies 'N Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Strawberry" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍓</div>
                            <h4>Strawberry</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Cream Cheese" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🧀</div>
                            <h4>Cream Cheese</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_frosting_flavor" value="Lemon" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍋</div>
                            <h4>Lemon</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label class="ucbo-checkbox-label">
                    <input type="checkbox" name="baked_cake_filling" id="baked_cake_filling_checkbox">
                    <span>Add Cake Filling (+$15)</span>
                </label>
                <div id="baked_cake_filling_container" style="display: none; margin-top: 10px;">
                    <div class="ucbo-flavor-cards ucbo-filling-cards">
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Strawberry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍓</div>
                                <h4>Strawberry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Cherry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍒</div>
                                <h4>Cherry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Marshmallow">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">☁️</div>
                                <h4>Marshmallow</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Chocolate Fudge">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍫</div>
                                <h4>Chocolate Fudge</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Raspberry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon"><i class="fa-solid fa-jar" style="color: #dc143c;"></i></div>
                                <h4>Raspberry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Cream Cheese">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🧀</div>
                                <h4>Cream Cheese</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_filling_flavor" value="Cookies N Cream">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍪</div>
                                <h4>Cookies 'N Cream</h4>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label>Cake Topper</label>
                <div class="ucbo-flavor-cards ucbo-topper-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_topper" value="">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🚫</div>
                            <h4>No Topper</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_topper" value="Happy Birthday">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎂</div>
                            <h4>Happy Birthday</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_topper" value="Happy Anniversary">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">💕</div>
                            <h4>Happy Anniversary</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_topper" value="Oh Baby">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">👶</div>
                            <h4>Oh Baby</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cake_topper" value="Congratulations">
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎉</div>
                            <h4>Congratulations</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label for="baked_inspiration_photo">Inspiration Photo (Optional)</label>
                <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0;">Upload a photo for design inspiration. Accepted formats: JPG, PNG (max 5MB)</p>
                <input type="file" id="baked_inspiration_photo" name="baked_inspiration_photo" accept="image/jpeg,image/png,image/jpg" style="display: block; padding: 10px; border: 2px dashed #E0E0E0; border-radius: 8px; width: 100%; cursor: pointer;">
                <div id="baked_photo_preview" style="margin-top: 10px; display: none;">
                    <img id="baked_photo_preview_img" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #E0E0E0;">
                    <button type="button" id="baked_remove_photo" style="display: block; margin-top: 5px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Remove Photo</button>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    private function render_custom_baked_cupcakes_html() {
        ob_start();
        ?>
        <div id="custom-baked-cupcakes-options" class="ucbo-order-options" style="display: none;">
            <div class="ucbo-form-group">
                <label>Number of Dozens <span class="required">*</span></label>
                <div class="ucbo-quantity-selector">
                    <button type="button" class="ucbo-qty-btn ucbo-qty-minus" data-item="baked-cupcakes">−</button>
                    <input type="number" id="baked_cupcake_quantity" name="baked_cupcake_quantity" value="1" min="1" max="10" readonly>
                    <button type="button" class="ucbo-qty-btn ucbo-qty-plus" data-item="baked-cupcakes">+</button>
                    <span class="ucbo-qty-label">dozen ($36/dozen)</span>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label>Cupcake Flavor <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🧁</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Double Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Double Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Strawberry" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍓</div>
                            <h4>Strawberry</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Cookies & Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍪</div>
                            <h4>Cookies & Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Salted Caramel" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍬</div>
                            <h4>Salted Caramel</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="S'mores" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🔥</div>
                            <h4>S'mores</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Carrot Cake" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🥕</div>
                            <h4>Carrot Cake</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Marble" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎨</div>
                            <h4>Marble</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Funfetti" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🎉</div>
                            <h4>Funfetti</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Almond" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🌰</div>
                            <h4>Almond</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_flavor" value="Lemon" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍋</div>
                            <h4>Lemon</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label>Buttercream Frosting <span class="required">*</span></label>
                <div class="ucbo-flavor-cards">
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Vanilla" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">⚪</div>
                            <h4>Vanilla</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Double Chocolate" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍫</div>
                            <h4>Double Chocolate</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Salted Caramel" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍬</div>
                            <h4>Salted Caramel</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Almond" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🌰</div>
                            <h4>Almond</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Cookies N Cream" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍪</div>
                            <h4>Cookies 'N Cream</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Strawberry" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍓</div>
                            <h4>Strawberry</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Cream Cheese" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🧀</div>
                            <h4>Cream Cheese</h4>
                        </div>
                    </label>
                    <label class="ucbo-flavor-card">
                        <input type="radio" name="baked_cupcake_frosting" value="Lemon" required>
                        <div class="ucbo-flavor-card-content">
                            <div class="ucbo-flavor-icon">🍋</div>
                            <h4>Lemon</h4>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label class="ucbo-checkbox-label">
                    <input type="checkbox" name="baked_cupcake_filling" id="baked_cupcake_filling_checkbox">
                    <span>Add Cupcake Filling (+$10 per dozen)</span>
                </label>
                <div id="baked_cupcake_filling_container" style="display: none; margin-top: 10px;">
                    <div class="ucbo-flavor-cards ucbo-filling-cards">
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Strawberry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍓</div>
                                <h4>Strawberry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Cherry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍒</div>
                                <h4>Cherry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Marshmallow">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">☁️</div>
                                <h4>Marshmallow</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Chocolate Fudge">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍫</div>
                                <h4>Chocolate Fudge</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Raspberry">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon"><i class="fa-solid fa-jar" style="color: #dc143c;"></i></div>
                                <h4>Raspberry</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Cream Cheese">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🧀</div>
                                <h4>Cream Cheese</h4>
                            </div>
                        </label>
                        <label class="ucbo-flavor-card">
                            <input type="radio" name="baked_cupcake_filling_flavor" value="Cookies N Cream">
                            <div class="ucbo-flavor-card-content">
                                <div class="ucbo-flavor-icon">🍪</div>
                                <h4>Cookies 'N Cream</h4>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="ucbo-form-group">
                <label class="ucbo-checkbox-label">
                    <input type="checkbox" name="decorative_accents" id="decorative_accents_checkbox">
                    <span>Request Decorative Accents ($12–$20)</span>
                </label>
                <p style="font-size: 0.9em; color: #666; margin: 5px 0 0 28px;">Includes themed toppers, buttercream details, pearls, etc. We'll contact you within 48 hours to finalize details and pricing.</p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}