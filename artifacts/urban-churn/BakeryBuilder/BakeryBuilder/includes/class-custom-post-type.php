<?php
if (!defined('ABSPATH')) {
    exit;
}

class UCBO_Custom_Post_Type {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Register post type immediately since we're already in init hook
        $this->register_post_type();
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'));
    }
    
    public function register_post_type() {
        $labels = array(
            'name' => __('Bakery Orders', 'urban-churn-bakery'),
            'singular_name' => __('Bakery Order', 'urban-churn-bakery'),
            'menu_name' => __('Bakery Orders', 'urban-churn-bakery'),
            'add_new' => __('Add New Order', 'urban-churn-bakery'),
            'add_new_item' => __('Add New Order', 'urban-churn-bakery'),
            'edit_item' => __('Edit Order', 'urban-churn-bakery'),
            'new_item' => __('New Order', 'urban-churn-bakery'),
            'view_item' => __('View Order', 'urban-churn-bakery'),
            'search_items' => __('Search Orders', 'urban-churn-bakery'),
            'not_found' => __('No orders found', 'urban-churn-bakery'),
            'not_found_in_trash' => __('No orders found in trash', 'urban-churn-bakery'),
        );
        
        $args = array(
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false, // Hidden from menu - we use custom admin menu instead
            'menu_icon' => 'dashicons-carrot',
            'capability_type' => 'post',
            'hierarchical' => false,
            'supports' => array('title'),
            'has_archive' => false,
            'rewrite' => false,
            'query_var' => false,
        );
        
        register_post_type('bakery_order', $args);
    }
    
    public function add_meta_boxes() {
        add_meta_box(
            'ucbo_order_details',
            __('Order Details', 'urban-churn-bakery'),
            array($this, 'render_order_details_metabox'),
            'bakery_order',
            'normal',
            'high'
        );
        
        add_meta_box(
            'ucbo_customer_info',
            __('Customer Information', 'urban-churn-bakery'),
            array($this, 'render_customer_info_metabox'),
            'bakery_order',
            'side',
            'default'
        );
    }
    
    public function render_order_details_metabox($post) {
        wp_nonce_field('ucbo_save_order_details', 'ucbo_order_nonce');
        
        $order_type = get_post_meta($post->ID, '_ucbo_order_type', true);
        $flavor = get_post_meta($post->ID, '_ucbo_flavor', true);
        $ice_cream_flavor = get_post_meta($post->ID, '_ucbo_ice_cream_flavor', true);
        $cake_flavor = get_post_meta($post->ID, '_ucbo_cake_flavor', true);
        $frosting_type = get_post_meta($post->ID, '_ucbo_frosting_type', true);
        $filling = get_post_meta($post->ID, '_ucbo_filling', true);
        $topper = get_post_meta($post->ID, '_ucbo_topper', true);
        $topper_text = get_post_meta($post->ID, '_ucbo_topper_text', true);
        $color_accents = get_post_meta($post->ID, '_ucbo_color_accents', true);
        $color_request = get_post_meta($post->ID, '_ucbo_color_request', true);
        $special_requests = get_post_meta($post->ID, '_ucbo_special_requests', true);
        $total_price = get_post_meta($post->ID, '_ucbo_total_price', true);
        $inspiration_photo = get_post_meta($post->ID, '_ucbo_inspiration_photo', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label><?php _e('Order Type', 'urban-churn-bakery'); ?></label></th>
                <td><strong><?php echo esc_html($order_type); ?></strong></td>
            </tr>
            <?php if ($order_type !== 'Cupcakes by the Dozen'): ?>
            <tr>
                <th><label><?php _e('Flavor', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($flavor); ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($order_type === 'Custom Ice Cream Cake'): ?>
            <tr>
                <th><label><?php _e('Cake Flavor', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($cake_flavor); ?></td>
            </tr>
            <tr>
                <th><label><?php _e('Ice Cream Flavor', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($ice_cream_flavor); ?></td>
            </tr>
            <tr>
                <th><label><?php _e('Frosting Type', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($frosting_type); ?></td>
            </tr>
            <tr>
                <th><label><?php _e('Filling', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($filling); ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($topper === 'yes'): ?>
            <tr>
                <th><label><?php _e('Topper', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($topper_text); ?> (+$8.50)</td>
            </tr>
            <?php endif; ?>
            <?php if ($color_accents === 'yes'): ?>
            <tr>
                <th><label><?php _e('Color Accents', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo esc_html($color_request); ?> (+$10.00)</td>
            </tr>
            <?php endif; ?>
            <tr>
                <th><label><?php _e('Special Requests', 'urban-churn-bakery'); ?></label></th>
                <td><?php echo nl2br(esc_html($special_requests)); ?></td>
            </tr>
            <tr>
                <th><label><?php _e('Total Price', 'urban-churn-bakery'); ?></label></th>
                <td><strong>$<?php echo esc_html($total_price); ?></strong></td>
            </tr>
            <?php if ($inspiration_photo): ?>
            <tr>
                <th><label><?php _e('Inspiration Photo', 'urban-churn-bakery'); ?></label></th>
                <td>
                    <a href="<?php echo esc_url($inspiration_photo); ?>" target="_blank">
                        <img src="<?php echo esc_url($inspiration_photo); ?>" style="max-width: 300px; height: auto; border-radius: 8px; border: 2px solid #E0E0E0;">
                    </a>
                    <br><small><a href="<?php echo esc_url($inspiration_photo); ?>" target="_blank"><?php _e('View Full Size', 'urban-churn-bakery'); ?></a></small>
                </td>
            </tr>
            <?php endif; ?>
        </table>
        <?php
    }
    
    public function render_customer_info_metabox($post) {
        $customer_name = get_post_meta($post->ID, '_ucbo_customer_name', true);
        $customer_phone = get_post_meta($post->ID, '_ucbo_customer_phone', true);
        $customer_email = get_post_meta($post->ID, '_ucbo_customer_email', true);
        $pickup_date = get_post_meta($post->ID, '_ucbo_pickup_date', true);
        $pickup_time = get_post_meta($post->ID, '_ucbo_pickup_time', true);
        $referral = get_post_meta($post->ID, '_ucbo_referral', true);
        ?>
        <p><strong><?php _e('Name:', 'urban-churn-bakery'); ?></strong><br>
        <?php echo esc_html($customer_name); ?></p>
        
        <p><strong><?php _e('Phone:', 'urban-churn-bakery'); ?></strong><br>
        <a href="tel:<?php echo esc_attr($customer_phone); ?>"><?php echo esc_html($customer_phone); ?></a></p>
        
        <p><strong><?php _e('Email:', 'urban-churn-bakery'); ?></strong><br>
        <a href="mailto:<?php echo esc_attr($customer_email); ?>"><?php echo esc_html($customer_email); ?></a></p>
        
        <p><strong><?php _e('Pickup Date:', 'urban-churn-bakery'); ?></strong><br>
        <?php echo esc_html($pickup_date); ?></p>
        
        <p><strong><?php _e('Pickup Time:', 'urban-churn-bakery'); ?></strong><br>
        <?php echo esc_html($pickup_time); ?></p>
        
        <?php if ($referral): ?>
        <p><strong><?php _e('Referral Source:', 'urban-churn-bakery'); ?></strong><br>
        <?php echo esc_html($referral); ?></p>
        <?php endif; ?>
        <?php
    }
    
    public function save_meta_boxes($post_id) {
        if (!isset($_POST['ucbo_order_nonce']) || !wp_verify_nonce($_POST['ucbo_order_nonce'], 'ucbo_save_order_details')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
    }
}
