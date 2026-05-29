<?php
if (!defined('ABSPATH')) {
    exit;
}

class UCBO_Admin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_init', array($this, 'handle_export'));
        add_filter('manage_bakery_order_posts_columns', array($this, 'set_custom_columns'));
        add_action('manage_bakery_order_posts_custom_column', array($this, 'custom_column_content'), 10, 2);
        add_filter('manage_edit-bakery_order_sortable_columns', array($this, 'sortable_columns'));
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
    }
    
    public function add_admin_menu() {
        // Add top-level menu for Bakery Orders Dashboard
        add_menu_page(
            __('Bakery Orders', 'urban-churn-bakery'),
            __('Bakery Orders', 'urban-churn-bakery'),
            'manage_options',
            'ucbo-dashboard',
            array($this, 'render_dashboard_page'),
            'dashicons-carrot',
            26
        );
        
        // Add Dashboard as first submenu (replaces the duplicate parent menu item)
        add_submenu_page(
            'ucbo-dashboard',
            __('Dashboard', 'urban-churn-bakery'),
            __('Dashboard', 'urban-churn-bakery'),
            'manage_options',
            'ucbo-dashboard',
            array($this, 'render_dashboard_page')
        );
        
        // Add All Orders submenu linking to custom post type
        add_submenu_page(
            'ucbo-dashboard',
            __('All Orders', 'urban-churn-bakery'),
            __('All Orders', 'urban-churn-bakery'),
            'manage_options',
            'edit.php?post_type=bakery_order'
        );
        
        // Add New Order submenu
        add_submenu_page(
            'ucbo-dashboard',
            __('Add New Order', 'urban-churn-bakery'),
            __('Add New', 'urban-churn-bakery'),
            'manage_options',
            'post-new.php?post_type=bakery_order'
        );
        
        // Add settings page
        add_submenu_page(
            'ucbo-dashboard',
            __('Settings', 'urban-churn-bakery'),
            __('Settings', 'urban-churn-bakery'),
            'manage_options',
            'ucbo-settings',
            array($this, 'render_settings_page')
        );
        
        // Add export page
        add_submenu_page(
            'ucbo-dashboard',
            __('Export Orders', 'urban-churn-bakery'),
            __('Export Orders', 'urban-churn-bakery'),
            'manage_options',
            'ucbo-export',
            array($this, 'render_export_page')
        );
    }
    
    public function render_dashboard_page() {
        $pending_count = wp_count_posts('bakery_order')->pending;
        $completed_count = wp_count_posts('bakery_order')->publish;
        $total_count = $pending_count + $completed_count;
        
        // Get recent orders
        $recent_orders = get_posts(array(
            'post_type' => 'bakery_order',
            'posts_per_page' => 5,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
        ?>
        <div class="wrap">
            <h1><?php _e('Bakery Orders Dashboard', 'urban-churn-bakery'); ?></h1>
            
            <div class="ucbo-dashboard-widgets" style="display: flex; gap: 20px; margin-top: 20px;">
                <div class="ucbo-widget" style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1;">
                    <h3 style="margin-top: 0;"><?php _e('Order Statistics', 'urban-churn-bakery'); ?></h3>
                    <p><strong><?php _e('Total Orders:', 'urban-churn-bakery'); ?></strong> <?php echo esc_html($total_count); ?></p>
                    <p><strong><?php _e('Pending:', 'urban-churn-bakery'); ?></strong> <?php echo esc_html($pending_count); ?></p>
                    <p><strong><?php _e('Completed:', 'urban-churn-bakery'); ?></strong> <?php echo esc_html($completed_count); ?></p>
                </div>
                
                <div class="ucbo-widget" style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 2;">
                    <h3 style="margin-top: 0;"><?php _e('Recent Orders', 'urban-churn-bakery'); ?></h3>
                    <?php if (!empty($recent_orders)) : ?>
                        <table class="widefat striped">
                            <thead>
                                <tr>
                                    <th><?php _e('Order', 'urban-churn-bakery'); ?></th>
                                    <th><?php _e('Customer', 'urban-churn-bakery'); ?></th>
                                    <th><?php _e('Date', 'urban-churn-bakery'); ?></th>
                                    <th><?php _e('Status', 'urban-churn-bakery'); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recent_orders as $order) : 
                                    $customer_name = get_post_meta($order->ID, '_ucbo_customer_name', true);
                                ?>
                                    <tr>
                                        <td><a href="<?php echo get_edit_post_link($order->ID); ?>">#<?php echo $order->ID; ?></a></td>
                                        <td><?php echo esc_html($customer_name ?: __('N/A', 'urban-churn-bakery')); ?></td>
                                        <td><?php echo get_the_date('M j, Y', $order); ?></td>
                                        <td><?php echo esc_html(ucfirst($order->post_status)); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else : ?>
                        <p><?php _e('No orders yet.', 'urban-churn-bakery'); ?></p>
                    <?php endif; ?>
                    <p style="margin-bottom: 0;">
                        <a href="<?php echo admin_url('edit.php?post_type=bakery_order'); ?>" class="button"><?php _e('View All Orders', 'urban-churn-bakery'); ?></a>
                    </p>
                </div>
            </div>
            
            <div class="ucbo-quick-links" style="margin-top: 20px; background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px;">
                <h3 style="margin-top: 0;"><?php _e('Quick Links', 'urban-churn-bakery'); ?></h3>
                <a href="<?php echo admin_url('post-new.php?post_type=bakery_order'); ?>" class="button button-primary"><?php _e('Add New Order', 'urban-churn-bakery'); ?></a>
                <a href="<?php echo admin_url('admin.php?page=ucbo-settings'); ?>" class="button"><?php _e('Settings', 'urban-churn-bakery'); ?></a>
                <a href="<?php echo admin_url('admin.php?page=ucbo-export'); ?>" class="button"><?php _e('Export Orders', 'urban-churn-bakery'); ?></a>
            </div>
        </div>
        <?php
    }
    
    public function register_settings() {
        register_setting('ucbo_settings_group', 'ucbo_settings', array($this, 'sanitize_settings'));
        
        add_settings_section(
            'ucbo_general_section',
            __('General Settings', 'urban-churn-bakery'),
            null,
            'ucbo-settings'
        );
        
        add_settings_field(
            'email_recipient',
            __('Email Recipient', 'urban-churn-bakery'),
            array($this, 'render_email_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
        
        add_settings_field(
            'lead_time_hours',
            __('Lead Time (Hours)', 'urban-churn-bakery'),
            array($this, 'render_lead_time_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
        
        add_settings_field(
            'business_name',
            __('Business Name', 'urban-churn-bakery'),
            array($this, 'render_business_name_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
        
        add_settings_field(
            'send_customer_confirmation',
            __('Customer Confirmation Email', 'urban-churn-bakery'),
            array($this, 'render_customer_confirmation_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
        
        add_settings_field(
            'bcc_recipient',
            __('BCC Recipient (Optional)', 'urban-churn-bakery'),
            array($this, 'render_bcc_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
        
        add_settings_field(
            'seasonal_pumpkin_enabled',
            __('Show Seasonal Pumpkin Cake Banner', 'urban-churn-bakery'),
            array($this, 'render_seasonal_field'),
            'ucbo-settings',
            'ucbo_general_section'
        );
    }
    
    public function sanitize_settings($input) {
        $sanitized = array();
        
        if (isset($input['email_recipient'])) {
            $sanitized['email_recipient'] = sanitize_email($input['email_recipient']);
        }
        
        if (isset($input['lead_time_hours'])) {
            $sanitized['lead_time_hours'] = absint($input['lead_time_hours']);
        }
        
        if (isset($input['business_name'])) {
            $sanitized['business_name'] = sanitize_text_field($input['business_name']);
        }
        
        $sanitized['send_customer_confirmation'] = isset($input['send_customer_confirmation']) ? true : false;
        
        if (isset($input['bcc_recipient']) && !empty($input['bcc_recipient'])) {
            $sanitized['bcc_recipient'] = sanitize_email($input['bcc_recipient']);
        }
        
        $sanitized['seasonal_pumpkin_enabled'] = isset($input['seasonal_pumpkin_enabled']) ? true : false;
        
        return $sanitized;
    }
    
    public function render_email_field() {
        $settings = get_option('ucbo_settings');
        $value = isset($settings['email_recipient']) ? $settings['email_recipient'] : 'orders@urbanchurn.com';
        ?>
        <input type="email" name="ucbo_settings[email_recipient]" value="<?php echo esc_attr($value); ?>" class="regular-text">
        <p class="description"><?php _e('Email address where order notifications will be sent.', 'urban-churn-bakery'); ?></p>
        <?php
    }
    
    public function render_lead_time_field() {
        $settings = get_option('ucbo_settings');
        $value = isset($settings['lead_time_hours']) ? $settings['lead_time_hours'] : 96;
        ?>
        <input type="number" name="ucbo_settings[lead_time_hours]" value="<?php echo esc_attr($value); ?>" min="1" class="small-text">
        <p class="description"><?php _e('Configured in hours and enforced as equivalent business days (weekends excluded). 96 hours = 4 business days.', 'urban-churn-bakery'); ?></p>
        <?php
    }
    
    public function render_business_name_field() {
        $settings = get_option('ucbo_settings');
        $value = isset($settings['business_name']) ? $settings['business_name'] : 'Urban Churn Louise Drive Scoop Shop & Bakery';
        ?>
        <input type="text" name="ucbo_settings[business_name]" value="<?php echo esc_attr($value); ?>" class="regular-text">
        <p class="description"><?php _e('Your business name for display purposes.', 'urban-churn-bakery'); ?></p>
        <?php
    }
    
    public function render_customer_confirmation_field() {
        $settings = get_option('ucbo_settings');
        $checked = isset($settings['send_customer_confirmation']) && $settings['send_customer_confirmation'];
        ?>
        <label>
            <input type="checkbox" name="ucbo_settings[send_customer_confirmation]" value="1" <?php checked($checked, true); ?>>
            <?php _e('Send order request receipt email to customers (not a final confirmation)', 'urban-churn-bakery'); ?>
        </label>
        <p class="description"><?php _e('When enabled, customers will receive an email confirmation of their order.', 'urban-churn-bakery'); ?></p>
        <?php
    }
    
    public function render_bcc_field() {
        $settings = get_option('ucbo_settings');
        $value = isset($settings['bcc_recipient']) ? $settings['bcc_recipient'] : '';
        ?>
        <input type="email" name="ucbo_settings[bcc_recipient]" value="<?php echo esc_attr($value); ?>" class="regular-text">
        <p class="description"><?php _e('Optional: BCC a copy of all order notifications to this email address.', 'urban-churn-bakery'); ?></p>
        <?php
    }
    
    public function render_seasonal_field() {
        $settings = get_option('ucbo_settings');
        $checked = isset($settings['seasonal_pumpkin_enabled']) && $settings['seasonal_pumpkin_enabled'];
        ?>
        <label>
            <input type="checkbox" name="ucbo_settings[seasonal_pumpkin_enabled]" value="1" <?php checked($checked, true); ?>>
            <?php _e('Display the seasonal Pumpkin Ice Cream Cake banner on the order form', 'urban-churn-bakery'); ?>
        </label>
        <?php
    }
    
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_GET['settings-updated'])) {
            add_settings_error('ucbo_messages', 'ucbo_message', __('Settings Saved', 'urban-churn-bakery'), 'updated');
        }
        
        settings_errors('ucbo_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="ucbo-admin-notice" style="background: #fff; border-left: 4px solid #E91E63; padding: 12px; margin: 20px 0;">
                <p><strong>Shortcode:</strong> Use <code>[bakery_order_form]</code> to display the order form on any page or post.</p>
            </div>
            
            <form action="options.php" method="post">
                <?php
                settings_fields('ucbo_settings_group');
                do_settings_sections('ucbo-settings');
                submit_button(__('Save Settings', 'urban-churn-bakery'));
                ?>
            </form>
        </div>
        <?php
    }
    
    public function set_custom_columns($columns) {
        $new_columns = array();
        $new_columns['cb'] = $columns['cb'];
        $new_columns['title'] = __('Customer & Order Type', 'urban-churn-bakery');
        $new_columns['pickup'] = __('Pickup Date/Time', 'urban-churn-bakery');
        $new_columns['contact'] = __('Contact Info', 'urban-churn-bakery');
        $new_columns['details'] = __('Order Details', 'urban-churn-bakery');
        $new_columns['photo'] = __('Photo', 'urban-churn-bakery');
        $new_columns['total'] = __('Total', 'urban-churn-bakery');
        $new_columns['date'] = __('Submitted', 'urban-churn-bakery');
        return $new_columns;
    }
    
    public function custom_column_content($column, $post_id) {
        switch ($column) {
            case 'pickup':
                $pickup_date = get_post_meta($post_id, '_ucbo_pickup_date', true);
                $pickup_time = get_post_meta($post_id, '_ucbo_pickup_time', true);
                echo '<strong>' . esc_html($pickup_date) . '</strong><br>';
                echo esc_html($pickup_time);
                break;
                
            case 'contact':
                $email = get_post_meta($post_id, '_ucbo_customer_email', true);
                $phone = get_post_meta($post_id, '_ucbo_customer_phone', true);
                echo '<a href="mailto:' . esc_attr($email) . '">' . esc_html($email) . '</a><br>';
                echo esc_html($phone);
                break;
                
            case 'details':
                $order_type = get_post_meta($post_id, '_ucbo_order_type', true);
                
                if ($order_type === 'Pre-Stacked Ice Cream Cake' || $order_type === 'Cupcakes by the Dozen') {
                    $flavor = get_post_meta($post_id, '_ucbo_flavor', true);
                    echo '<strong>' . esc_html($flavor) . '</strong>';
                } elseif ($order_type === 'Custom Ice Cream Cake') {
                    $cake = get_post_meta($post_id, '_ucbo_cake_flavor', true);
                    $ice = get_post_meta($post_id, '_ucbo_ice_cream_flavor', true);
                    echo 'Cake: ' . esc_html($cake) . '<br>';
                    echo 'Ice Cream: ' . esc_html($ice);
                }
                
                $topper = get_post_meta($post_id, '_ucbo_topper', true);
                if ($topper === 'yes') {
                    $topper_msg = get_post_meta($post_id, '_ucbo_topper_message', true);
                    echo '<br><small>Topper: ' . esc_html($topper_msg) . '</small>';
                }
                break;
                
            case 'photo':
                $photo_url = get_post_meta($post_id, '_ucbo_inspiration_photo', true);
                if ($photo_url) {
                    echo '<a href="' . esc_url($photo_url) . '" target="_blank"><img src="' . esc_url($photo_url) . '" style="max-width: 50px; height: auto; border-radius: 4px;"></a>';
                } else {
                    echo '—';
                }
                break;
                
            case 'total':
                $total = get_post_meta($post_id, '_ucbo_total_price', true);
                echo '<strong>$' . esc_html($total) . '</strong>';
                break;
        }
    }
    
    public function sortable_columns($columns) {
        $columns['pickup'] = 'pickup_date';
        $columns['total'] = 'total_price';
        return $columns;
    }
    
    public function render_export_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php _e('Export Orders', 'urban-churn-bakery'); ?></h1>
            
            <div class="card" style="max-width: 600px;">
                <h2><?php _e('Download Orders as CSV', 'urban-churn-bakery'); ?></h2>
                <p><?php _e('Export all bakery orders to a CSV file for use in Excel, Google Sheets, or other applications.', 'urban-churn-bakery'); ?></p>
                
                <form method="post" action="">
                    <?php wp_nonce_field('ucbo_export_orders', 'ucbo_export_nonce'); ?>
                    
                    <p>
                        <label>
                            <strong><?php _e('Date Range:', 'urban-churn-bakery'); ?></strong><br>
                            <select name="date_range">
                                <option value="all"><?php _e('All Time', 'urban-churn-bakery'); ?></option>
                                <option value="today"><?php _e('Today', 'urban-churn-bakery'); ?></option>
                                <option value="week"><?php _e('Last 7 Days', 'urban-churn-bakery'); ?></option>
                                <option value="month"><?php _e('Last 30 Days', 'urban-churn-bakery'); ?></option>
                                <option value="year"><?php _e('Last Year', 'urban-churn-bakery'); ?></option>
                            </select>
                        </label>
                    </p>
                    
                    <p>
                        <label>
                            <input type="checkbox" name="include_photos" value="1" checked>
                            <?php _e('Include photo URLs in export', 'urban-churn-bakery'); ?>
                        </label>
                    </p>
                    
                    <?php submit_button(__('Download CSV', 'urban-churn-bakery'), 'primary', 'export_orders'); ?>
                </form>
            </div>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!isset($_POST['export_orders'])) {
            return;
        }
        
        if (!current_user_can('manage_options')) {
            return;
        }
        
        check_admin_referer('ucbo_export_orders', 'ucbo_export_nonce');
        
        $date_range = isset($_POST['date_range']) ? sanitize_text_field($_POST['date_range']) : 'all';
        $include_photos = isset($_POST['include_photos']);
        
        $args = array(
            'post_type' => 'bakery_order',
            'posts_per_page' => -1,
            'post_status' => 'any',
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        if ($date_range !== 'all') {
            $date_query = array();
            switch ($date_range) {
                case 'today':
                    $date_query['after'] = 'today';
                    break;
                case 'week':
                    $date_query['after'] = '7 days ago';
                    break;
                case 'month':
                    $date_query['after'] = '30 days ago';
                    break;
                case 'year':
                    $date_query['after'] = '1 year ago';
                    break;
            }
            $args['date_query'] = array($date_query);
        }
        
        $orders = get_posts($args);
        
        // Set headers for CSV download
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=bakery-orders-' . date('Y-m-d') . '.csv');
        
        $output = fopen('php://output', 'w');
        
        // CSV Headers
        $headers = array(
            'Order ID',
            'Order Date',
            'Customer Name',
            'Email',
            'Phone',
            'Pickup Date',
            'Pickup Time',
            'Order Type',
            'Flavor/Details',
            'Topper',
            'Topper Message',
            'Color Accents',
            'Color Choice',
            'Special Requests',
            'Total Price'
        );
        
        if ($include_photos) {
            $headers[] = 'Photo URL';
        }
        
        fputcsv($output, $headers);
        
        // Data rows
        foreach ($orders as $order) {
            $order_type = get_post_meta($order->ID, '_ucbo_order_type', true);
            
            $flavor_details = '';
            if ($order_type === 'Pre-Stacked Ice Cream Cake' || $order_type === 'Cupcakes by the Dozen') {
                $flavor_details = get_post_meta($order->ID, '_ucbo_flavor', true);
            } elseif ($order_type === 'Custom Ice Cream Cake') {
                $cake = get_post_meta($order->ID, '_ucbo_cake_flavor', true);
                $ice = get_post_meta($order->ID, '_ucbo_ice_cream_flavor', true);
                $frosting = get_post_meta($order->ID, '_ucbo_frosting_type', true);
                $filling = get_post_meta($order->ID, '_ucbo_filling', true);
                $flavor_details = "Cake: $cake | Ice Cream: $ice | Frosting: $frosting";
                if ($filling) {
                    $flavor_details .= " | Filling: $filling";
                }
            }
            
            $row = array(
                $order->ID,
                get_the_date('Y-m-d H:i:s', $order),
                get_post_meta($order->ID, '_ucbo_customer_name', true),
                get_post_meta($order->ID, '_ucbo_customer_email', true),
                get_post_meta($order->ID, '_ucbo_customer_phone', true),
                get_post_meta($order->ID, '_ucbo_pickup_date', true),
                get_post_meta($order->ID, '_ucbo_pickup_time', true),
                $order_type,
                $flavor_details,
                get_post_meta($order->ID, '_ucbo_topper', true),
                get_post_meta($order->ID, '_ucbo_topper_message', true),
                get_post_meta($order->ID, '_ucbo_color_accents', true),
                get_post_meta($order->ID, '_ucbo_frosting_color', true),
                get_post_meta($order->ID, '_ucbo_special_requests', true),
                get_post_meta($order->ID, '_ucbo_total_price', true)
            );
            
            if ($include_photos) {
                $row[] = get_post_meta($order->ID, '_ucbo_inspiration_photo', true);
            }
            
            fputcsv($output, $row);
        }
        
        fclose($output);
        exit;
    }
    
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'ucbo_recent_orders_widget',
            __('Recent Bakery Orders', 'urban-churn-bakery'),
            array($this, 'render_dashboard_widget')
        );
    }
    
    public function render_dashboard_widget() {
        $args = array(
            'post_type' => 'bakery_order',
            'posts_per_page' => 5,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        $orders = new WP_Query($args);
        
        if ($orders->have_posts()) {
            echo '<table class="widefat" style="margin-top: 10px;">';
            echo '<thead>';
            echo '<tr>';
            echo '<th>' . __('Customer', 'urban-churn-bakery') . '</th>';
            echo '<th>' . __('Order Type', 'urban-churn-bakery') . '</th>';
            echo '<th>' . __('Pickup Date', 'urban-churn-bakery') . '</th>';
            echo '<th>' . __('Total', 'urban-churn-bakery') . '</th>';
            echo '</tr>';
            echo '</thead>';
            echo '<tbody>';
            
            while ($orders->have_posts()) {
                $orders->the_post();
                $post_id = get_the_ID();
                $customer_name = get_post_meta($post_id, '_ucbo_customer_name', true);
                $order_type = get_post_meta($post_id, '_ucbo_order_type', true);
                $pickup_date = get_post_meta($post_id, '_ucbo_pickup_date', true);
                $total_price = get_post_meta($post_id, '_ucbo_total_price', true);
                
                echo '<tr>';
                echo '<td><strong><a href="' . get_edit_post_link($post_id) . '">' . esc_html($customer_name) . '</a></strong></td>';
                echo '<td>' . esc_html($order_type) . '</td>';
                echo '<td>' . esc_html($pickup_date) . '</td>';
                echo '<td>$' . esc_html($total_price) . '</td>';
                echo '</tr>';
            }
            
            echo '</tbody>';
            echo '</table>';
            
            echo '<p style="margin-top: 10px;">';
            echo '<a href="' . admin_url('edit.php?post_type=bakery_order') . '" class="button button-primary">' . __('View All Orders', 'urban-churn-bakery') . '</a>';
            echo '</p>';
            
            wp_reset_postdata();
        } else {
            echo '<p>' . __('No orders yet.', 'urban-churn-bakery') . '</p>';
            echo '<p><strong>' . __('Shortcode:', 'urban-churn-bakery') . '</strong> <code>[bakery_order_form]</code></p>';
        }
    }
}
