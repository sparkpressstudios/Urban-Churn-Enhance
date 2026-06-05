<?php
if (!defined('ABSPATH')) {
    exit;
}

class UCBO_Form_Handler {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('wp_ajax_ucbo_submit_order', array($this, 'handle_order_submission'));
        add_action('wp_ajax_nopriv_ucbo_submit_order', array($this, 'handle_order_submission'));
    }
    
    public function handle_order_submission() {
        check_ajax_referer('ucbo_submit_order_nonce', 'nonce');
        
        $customer_name = sanitize_text_field($_POST['customer_name']);
        $customer_phone = sanitize_text_field($_POST['customer_phone']);
        $customer_email = sanitize_email($_POST['customer_email']);
        $pickup_date = sanitize_text_field($_POST['pickup_date']);
        $pickup_time = sanitize_text_field($_POST['pickup_time']);
        $referral = sanitize_text_field($_POST['referral']);
        $order_type = sanitize_text_field($_POST['order_type']);
        
        if (empty($customer_name) || empty($customer_email) || empty($pickup_date) || empty($order_type)) {
            wp_send_json_error(array('message' => 'Please fill in all required fields.'));
            return;
        }
        
        if (!is_email($customer_email)) {
            wp_send_json_error(array('message' => 'Please enter a valid email address.'));
            return;
        }
        
        $settings = get_option('ucbo_settings');
        $lead_time_hours = isset($settings['lead_time_hours']) ? absint($settings['lead_time_hours']) : 96;
        $lead_time_business_days = max(1, (int) ceil($lead_time_hours / 24));
        
        $timezone = wp_timezone();
        
        try {
            $pickup_datetime_obj = new DateTime($pickup_date . ' ' . $pickup_time, $timezone);
            $pickup_timestamp = $pickup_datetime_obj->getTimestamp();
        } catch (Exception $e) {
            wp_send_json_error(array('message' => 'Invalid pickup date or time format. Please check your selections.'));
            return;
        }
        
        $current_datetime_obj = new DateTime('now', $timezone);
        $min_pickup_datetime_obj = $this->add_business_days($current_datetime_obj, $lead_time_business_days);

        if ($pickup_timestamp < $min_pickup_datetime_obj->getTimestamp()) {
            wp_send_json_error(array('message' => sprintf('Please select a pickup date at least %d business days from today (Monday-Friday only). Earliest available pickup is %s.', $lead_time_business_days, $min_pickup_datetime_obj->format('F j, Y'))));
            return;
        }
        
        $post_title = sprintf('%s - %s - %s', $customer_name, $order_type, $pickup_date);
        
        $post_data = array(
            'post_type' => 'bakery_order',
            'post_title' => $post_title,
            'post_status' => 'publish',
        );
        
        $post_id = wp_insert_post($post_data);
        
        if (is_wp_error($post_id)) {
            wp_send_json_error(array('message' => 'Failed to save order. Please try again.'));
            return;
        }
        
        update_post_meta($post_id, '_ucbo_customer_name', $customer_name);
        update_post_meta($post_id, '_ucbo_customer_phone', $customer_phone);
        update_post_meta($post_id, '_ucbo_customer_email', $customer_email);
        update_post_meta($post_id, '_ucbo_pickup_date', $pickup_date);
        update_post_meta($post_id, '_ucbo_pickup_time', $pickup_time);
        update_post_meta($post_id, '_ucbo_referral', $referral);
        update_post_meta($post_id, '_ucbo_order_type', $order_type);
        
        $total_price = 0;
        
        if ($order_type === 'Pre-Stacked Ice Cream Cake') {
            $total_price = 65;
            $flavor = sanitize_text_field($_POST['flavor']);
            update_post_meta($post_id, '_ucbo_flavor', $flavor);
        } elseif ($order_type === 'Custom Ice Cream Cake') {
            $total_price = 75;
            $cake_flavor = sanitize_text_field($_POST['cake_flavor']);
            $ice_cream_flavor = sanitize_text_field($_POST['ice_cream_flavor']);
            $frosting_type = sanitize_text_field($_POST['frosting_type']);
            $filling = sanitize_text_field($_POST['filling']);
            
            update_post_meta($post_id, '_ucbo_cake_flavor', $cake_flavor);
            update_post_meta($post_id, '_ucbo_ice_cream_flavor', $ice_cream_flavor);
            update_post_meta($post_id, '_ucbo_frosting_type', $frosting_type);
            update_post_meta($post_id, '_ucbo_filling', $filling);
        } elseif ($order_type === 'Custom Cake') {
            // Custom baked cake with size-based pricing
            $cake_size = sanitize_text_field($_POST['baked_cake_size']);
            $baked_cake_flavor = sanitize_text_field($_POST['baked_cake_flavor']);
            $baked_frosting_flavor = sanitize_text_field($_POST['baked_frosting_flavor']);
            $baked_cake_filling = isset($_POST['baked_cake_filling']) && $_POST['baked_cake_filling'] === 'yes' ? 'yes' : 'no';
            $baked_filling_flavor = sanitize_text_field($_POST['baked_filling_flavor']);
            $baked_cake_topper = sanitize_text_field($_POST['baked_cake_topper']);
            
            // Size-based pricing
            switch ($cake_size) {
                case '6-inch':
                    $total_price = 75;
                    break;
                case '7-inch':
                    $total_price = 100;
                    break;
                case '8-inch':
                    $total_price = 125;
                    break;
                default:
                    $total_price = 75;
            }
            
            // Add filling upcharge
            if ($baked_cake_filling === 'yes') {
                $total_price += 15;
            }
            
            update_post_meta($post_id, '_ucbo_baked_cake_size', $cake_size);
            update_post_meta($post_id, '_ucbo_baked_cake_flavor', $baked_cake_flavor);
            update_post_meta($post_id, '_ucbo_baked_frosting_flavor', $baked_frosting_flavor);
            update_post_meta($post_id, '_ucbo_baked_cake_filling', $baked_cake_filling);
            update_post_meta($post_id, '_ucbo_baked_filling_flavor', $baked_filling_flavor);
            update_post_meta($post_id, '_ucbo_baked_cake_topper', $baked_cake_topper);
        } elseif ($order_type === 'Custom Cupcakes') {
            // Custom baked cupcakes
            $baked_cupcake_flavor = sanitize_text_field($_POST['baked_cupcake_flavor']);
            $baked_cupcake_frosting = sanitize_text_field($_POST['baked_cupcake_frosting']);
            $baked_cupcake_quantity = isset($_POST['baked_cupcake_quantity']) ? intval($_POST['baked_cupcake_quantity']) : 1;
            $baked_cupcake_filling = isset($_POST['baked_cupcake_filling']) && $_POST['baked_cupcake_filling'] === 'yes' ? 'yes' : 'no';
            $baked_cupcake_filling_flavor = sanitize_text_field($_POST['baked_cupcake_filling_flavor']);
            $decorative_accents = isset($_POST['decorative_accents']) && $_POST['decorative_accents'] === 'yes' ? 'yes' : 'no';
            
            // Base price: $36 per dozen
            $total_price = 36 * $baked_cupcake_quantity;
            
            // Add filling upcharge: $10 per dozen
            if ($baked_cupcake_filling === 'yes') {
                $total_price += 10 * $baked_cupcake_quantity;
            }
            
            // Note: Decorative accents ($12-$20) require follow-up, not added to automatic total
            
            update_post_meta($post_id, '_ucbo_baked_cupcake_flavor', $baked_cupcake_flavor);
            update_post_meta($post_id, '_ucbo_baked_cupcake_frosting', $baked_cupcake_frosting);
            update_post_meta($post_id, '_ucbo_baked_cupcake_quantity', $baked_cupcake_quantity);
            update_post_meta($post_id, '_ucbo_baked_cupcake_filling', $baked_cupcake_filling);
            update_post_meta($post_id, '_ucbo_baked_cupcake_filling_flavor', $baked_cupcake_filling_flavor);
            update_post_meta($post_id, '_ucbo_decorative_accents', $decorative_accents);
        }
        
        $topper = (isset($_POST['topper']) && $_POST['topper'] === 'yes') ? 'yes' : 'no';
        $topper_text = sanitize_text_field($_POST['topper_message'] ?? '');
        $color_accents = (isset($_POST['color_accents']) && $_POST['color_accents'] === 'yes') ? 'yes' : 'no';
        $color_request = sanitize_text_field($_POST['frosting_color'] ?? '');
        $special_requests = sanitize_textarea_field($_POST['special_requests']);
        
        if ($topper === 'yes') {
            $total_price += 8.50;
        }
        
        if ($color_accents === 'yes') {
            $total_price += 10;
        }
        
        update_post_meta($post_id, '_ucbo_topper', $topper);
        update_post_meta($post_id, '_ucbo_topper_text', $topper_text);
        update_post_meta($post_id, '_ucbo_color_accents', $color_accents);
        update_post_meta($post_id, '_ucbo_color_request', $color_request);
        update_post_meta($post_id, '_ucbo_special_requests', $special_requests);
        update_post_meta($post_id, '_ucbo_total_price', number_format($total_price, 2));
        
        // Handle photo upload if present
        if (!empty($_FILES['inspiration_photo']['name'])) {
            $this->handle_photo_upload($post_id);
        }
        
        // Send admin notification
        $this->send_order_notification($post_id, $customer_name, $customer_email, $order_type, $total_price);
        
        // Send customer confirmation if enabled
        $settings = get_option('ucbo_settings');
        if (isset($settings['send_customer_confirmation']) && $settings['send_customer_confirmation']) {
            $this->send_customer_confirmation($post_id, $customer_name, $customer_email, $order_type, $total_price);
        }
        
        wp_send_json_success(array(
            'message' => 'Order submitted successfully!',
            'order_id' => $post_id
        ));
    }
    
    private function send_order_notification($order_id, $customer_name, $customer_email, $order_type, $total_price) {
        $settings = get_option('ucbo_settings');
        $to = isset($settings['email_recipient']) ? $settings['email_recipient'] : 'orders@urbanchurn.com';
        $subject = sprintf('New Bakery Order #%d - %s', $order_id, $order_type);
        
        $customer_phone = get_post_meta($order_id, '_ucbo_customer_phone', true);
        $pickup_date = get_post_meta($order_id, '_ucbo_pickup_date', true);
        $pickup_time = get_post_meta($order_id, '_ucbo_pickup_time', true);
        
        $message = "New bakery order received from Urban Churn Bakery Order Form\n\n";
        $message .= "Order ID: #" . $order_id . "\n";
        $message .= "Order Type: " . $order_type . "\n\n";
        
        $message .= "CUSTOMER INFORMATION\n";
        $message .= "--------------------\n";
        $message .= "Name: " . $customer_name . "\n";
        $message .= "Email: " . $customer_email . "\n";
        $message .= "Phone: " . $customer_phone . "\n";
        $message .= "Pickup Date: " . $pickup_date . "\n";
        $message .= "Pickup Time: " . $pickup_time . "\n\n";
        
        $message .= "ORDER DETAILS\n";
        $message .= "-------------\n";
        
        if ($order_type === 'Pre-Stacked Ice Cream Cake') {
            $flavor = get_post_meta($order_id, '_ucbo_flavor', true);
            $message .= "Flavor: " . $flavor . "\n";
        } elseif ($order_type === 'Custom Ice Cream Cake') {
            $cake_flavor = get_post_meta($order_id, '_ucbo_cake_flavor', true);
            $ice_cream_flavor = get_post_meta($order_id, '_ucbo_ice_cream_flavor', true);
            $frosting_type = get_post_meta($order_id, '_ucbo_frosting_type', true);
            $filling = get_post_meta($order_id, '_ucbo_filling', true);
            
            $message .= "Cake Flavor: " . $cake_flavor . "\n";
            $message .= "Ice Cream Flavor: " . $ice_cream_flavor . "\n";
            $message .= "Frosting Type: " . $frosting_type . "\n";
            if ($filling) {
                $message .= "Filling: " . $filling . "\n";
            }
        } elseif ($order_type === 'Custom Cake') {
            $cake_size = get_post_meta($order_id, '_ucbo_baked_cake_size', true);
            $baked_cake_flavor = get_post_meta($order_id, '_ucbo_baked_cake_flavor', true);
            $baked_frosting_flavor = get_post_meta($order_id, '_ucbo_baked_frosting_flavor', true);
            $baked_cake_filling = get_post_meta($order_id, '_ucbo_baked_cake_filling', true);
            $baked_filling_flavor = get_post_meta($order_id, '_ucbo_baked_filling_flavor', true);
            $baked_cake_topper = get_post_meta($order_id, '_ucbo_baked_cake_topper', true);
            
            $message .= "Cake Size: " . $cake_size . "\n";
            $message .= "Cake Flavor: " . $baked_cake_flavor . "\n";
            $message .= "Buttercream Frosting: " . $baked_frosting_flavor . "\n";
            if ($baked_cake_filling === 'yes') {
                $message .= "Filling: " . $baked_filling_flavor . " (+$15)\n";
            }
            if ($baked_cake_topper) {
                $message .= "Cake Topper: " . $baked_cake_topper . "\n";
            }
        } elseif ($order_type === 'Custom Cupcakes') {
            $baked_cupcake_flavor = get_post_meta($order_id, '_ucbo_baked_cupcake_flavor', true);
            $baked_cupcake_frosting = get_post_meta($order_id, '_ucbo_baked_cupcake_frosting', true);
            $baked_cupcake_quantity = get_post_meta($order_id, '_ucbo_baked_cupcake_quantity', true);
            $baked_cupcake_filling = get_post_meta($order_id, '_ucbo_baked_cupcake_filling', true);
            $baked_cupcake_filling_flavor = get_post_meta($order_id, '_ucbo_baked_cupcake_filling_flavor', true);
            $decorative_accents = get_post_meta($order_id, '_ucbo_decorative_accents', true);
            
            $message .= "Cupcake Flavor: " . $baked_cupcake_flavor . "\n";
            $message .= "Buttercream Frosting: " . $baked_cupcake_frosting . "\n";
            $message .= "Quantity: " . $baked_cupcake_quantity . " dozen\n";
            if ($baked_cupcake_filling === 'yes') {
                $message .= "Filling: " . $baked_cupcake_filling_flavor . " (+$10/dozen)\n";
            }
            if ($decorative_accents === 'yes') {
                $message .= "*** DECORATIVE ACCENTS REQUESTED - Follow up required ($12-$20) ***\n";
            }
        }
        
        $topper = get_post_meta($order_id, '_ucbo_topper', true);
        if ($topper === 'yes') {
            $topper_text = get_post_meta($order_id, '_ucbo_topper_text', true);
            $message .= "Topper: " . $topper_text . " (+$8.50)\n";
        }
        
        $color_accents = get_post_meta($order_id, '_ucbo_color_accents', true);
        if ($color_accents === 'yes') {
            $color_request = get_post_meta($order_id, '_ucbo_color_request', true);
            $message .= "Color Accents: " . $color_request . " (+$10.00)\n";
        }
        
        $special_requests = get_post_meta($order_id, '_ucbo_special_requests', true);
        if ($special_requests) {
            $message .= "\nSpecial Requests:\n" . $special_requests . "\n";
        }
        
        // Add inspiration photo link if uploaded
        $inspiration_photo = get_post_meta($order_id, '_ucbo_inspiration_photo', true);
        if ($inspiration_photo) {
            $message .= "\nINSPIRATION PHOTO\n";
            $message .= "-----------------\n";
            $message .= "Customer uploaded an inspiration photo: " . $inspiration_photo . "\n";
        }
        
        $message .= "\nTOTAL PRICE: $" . number_format($total_price, 2) . "\n\n";
        $message .= "Please contact the customer within 24-48 hours to confirm details and send invoice.\n";
        $message .= "View order in admin: " . admin_url('post.php?post=' . $order_id . '&action=edit');
        
        $headers = array('Content-Type: text/plain; charset=UTF-8');
        
        // Add BCC if configured
        if (isset($settings['bcc_recipient']) && !empty($settings['bcc_recipient'])) {
            $headers[] = 'Bcc: ' . $settings['bcc_recipient'];
        }
        
        wp_mail($to, $subject, $message, $headers);
    }
    
    private function send_customer_confirmation($order_id, $customer_name, $customer_email, $order_type, $total_price) {
        $settings = get_option('ucbo_settings');
        $business_name = isset($settings['business_name']) ? $settings['business_name'] : 'Urban Churn Louise Drive Scoop Shop & Bakery';
        
        $subject = sprintf('Order Request Received #%d - %s', $order_id, $business_name);
        
        $customer_phone = get_post_meta($order_id, '_ucbo_customer_phone', true);
        $pickup_date = get_post_meta($order_id, '_ucbo_pickup_date', true);
        $pickup_time = get_post_meta($order_id, '_ucbo_pickup_time', true);
        
        $message = "Thank you for your order request!\n\n";
        $message .= "Dear " . $customer_name . ",\n\n";
        $message .= "We have received your bakery order request. This email is not an order confirmation.\n";
        $message .= "Your order will be confirmed once a bakery team member reaches out to review details and finalize payment.\n\n";
        
        $message .= "═══════════════════════════════════════════════\n";
        $message .= "ORDER REQUEST RECEIVED\n";
        $message .= "═══════════════════════════════════════════════\n\n";
        
        $message .= "Order Number: #" . $order_id . "\n";
        $message .= "Order Date: " . date('F j, Y g:i A') . "\n";
        $message .= "Order Type: " . $order_type . "\n\n";
        
        $message .= "───────────────────────────────────────────────\n";
        $message .= "PICKUP INFORMATION\n";
        $message .= "───────────────────────────────────────────────\n\n";
        
        $message .= "Pickup Date: " . $pickup_date . "\n";
        $message .= "Pickup Time: " . $pickup_time . "\n\n";
        
        $message .= "───────────────────────────────────────────────\n";
        $message .= "ORDER DETAILS\n";
        $message .= "───────────────────────────────────────────────\n\n";
        
        // Add order-specific details
        if ($order_type === 'Pre-Stacked Ice Cream Cake') {
            $flavor = get_post_meta($order_id, '_ucbo_flavor', true);
            $message .= "Flavor: " . $flavor . "\n";
        } elseif ($order_type === 'Custom Ice Cream Cake') {
            $cake_flavor = get_post_meta($order_id, '_ucbo_cake_flavor', true);
            $ice_cream_flavor = get_post_meta($order_id, '_ucbo_ice_cream_flavor', true);
            $frosting_type = get_post_meta($order_id, '_ucbo_frosting_type', true);
            $filling = get_post_meta($order_id, '_ucbo_filling', true);
            
            $message .= "Cake Flavor: " . $cake_flavor . "\n";
            $message .= "Ice Cream Flavor: " . $ice_cream_flavor . "\n";
            $message .= "Frosting: " . $frosting_type . "\n";
            if ($filling) {
                $message .= "Filling: " . $filling . "\n";
            }
        } elseif ($order_type === 'Custom Cake') {
            $cake_size = get_post_meta($order_id, '_ucbo_baked_cake_size', true);
            $baked_cake_flavor = get_post_meta($order_id, '_ucbo_baked_cake_flavor', true);
            $baked_frosting_flavor = get_post_meta($order_id, '_ucbo_baked_frosting_flavor', true);
            $baked_cake_filling = get_post_meta($order_id, '_ucbo_baked_cake_filling', true);
            $baked_filling_flavor = get_post_meta($order_id, '_ucbo_baked_filling_flavor', true);
            $baked_cake_topper = get_post_meta($order_id, '_ucbo_baked_cake_topper', true);
            
            $message .= "Size: " . $cake_size . "\n";
            $message .= "Cake Flavor: " . $baked_cake_flavor . "\n";
            $message .= "Frosting: " . $baked_frosting_flavor . "\n";
            if ($baked_cake_filling === 'yes') {
                $message .= "Filling: " . $baked_filling_flavor . "\n";
            }
            if ($baked_cake_topper) {
                $message .= "Topper: " . $baked_cake_topper . "\n";
            }
        } elseif ($order_type === 'Custom Cupcakes') {
            $baked_cupcake_flavor = get_post_meta($order_id, '_ucbo_baked_cupcake_flavor', true);
            $baked_cupcake_frosting = get_post_meta($order_id, '_ucbo_baked_cupcake_frosting', true);
            $baked_cupcake_quantity = get_post_meta($order_id, '_ucbo_baked_cupcake_quantity', true);
            $baked_cupcake_filling = get_post_meta($order_id, '_ucbo_baked_cupcake_filling', true);
            $baked_cupcake_filling_flavor = get_post_meta($order_id, '_ucbo_baked_cupcake_filling_flavor', true);
            
            $message .= "Quantity: " . $baked_cupcake_quantity . " dozen\n";
            $message .= "Flavor: " . $baked_cupcake_flavor . "\n";
            $message .= "Frosting: " . $baked_cupcake_frosting . "\n";
            if ($baked_cupcake_filling === 'yes') {
                $message .= "Filling: " . $baked_cupcake_filling_flavor . "\n";
            }
        }
        
        // Add optional items
        $topper = get_post_meta($order_id, '_ucbo_topper', true);
        if ($topper === 'yes') {
            $topper_text = get_post_meta($order_id, '_ucbo_topper_text', true);
            $message .= "Topper: " . $topper_text . "\n";
        }
        
        $color_accents = get_post_meta($order_id, '_ucbo_color_accents', true);
        if ($color_accents === 'yes') {
            $color_request = get_post_meta($order_id, '_ucbo_color_request', true);
            $message .= "Color Accents: " . $color_request . "\n";
        }
        
        $special_requests = get_post_meta($order_id, '_ucbo_special_requests', true);
        if ($special_requests) {
            $message .= "\nSpecial Requests:\n" . $special_requests . "\n";
        }
        
        // Add inspiration photo confirmation if uploaded
        $inspiration_photo = get_post_meta($order_id, '_ucbo_inspiration_photo', true);
        if ($inspiration_photo) {
            $message .= "\nInspiration Photo: Uploaded successfully\n";
            $message .= "(We have received your photo and will use it as reference)\n";
        }
        
        $message .= "\n───────────────────────────────────────────────\n";
        $message .= "ESTIMATED TOTAL: $" . number_format($total_price, 2) . "\n";
        $message .= "───────────────────────────────────────────────\n\n";
        
        $message .= "WHAT'S NEXT?\n\n";
        $message .= "We will review your order and contact you within 24-48 hours to:\n";
        $message .= "• Confirm all details and customizations\n";
        $message .= "• Provide final pricing and payment options\n";
        $message .= "• Answer any questions you may have\n\n";
        $message .= "Please note: this message confirms receipt of your request only.\n";
        $message .= "Your bakery order is confirmed only after our team reaches out.\n\n";
        
        $message .= "CONTACT INFORMATION\n\n";
        $message .= $business_name . "\n";
        if ($customer_phone) {
            $message .= "Your Phone: " . $customer_phone . "\n";
        }
        $message .= "Your Email: " . $customer_email . "\n\n";
        
        $message .= "If you have any questions or need to make changes to your order, ";
        $message .= "please reply to this email or call us directly.\n\n";
        $message .= "Thank you for choosing " . $business_name . "!\n\n";
        $message .= "═══════════════════════════════════════════════\n";
        $message .= "This is an automated request receipt, not a final order confirmation.\n";
        
        $headers = array('Content-Type: text/plain; charset=UTF-8');
        
        wp_mail($customer_email, $subject, $message, $headers);
    }
    
    private function handle_photo_upload($post_id) {
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        
        $uploadedfile = $_FILES['inspiration_photo'];
        $upload_overrides = array('test_form' => false);
        
        $movefile = wp_handle_upload($uploadedfile, $upload_overrides);
        
        if ($movefile && !isset($movefile['error'])) {
            update_post_meta($post_id, '_ucbo_inspiration_photo', $movefile['url']);
            update_post_meta($post_id, '_ucbo_inspiration_photo_path', $movefile['file']);
        }
    }

    private function add_business_days(DateTime $start_datetime, $business_days) {
        $result = clone $start_datetime;
        $added_days = 0;

        while ($added_days < $business_days) {
            $result->modify('+1 day');
            $day_of_week = (int) $result->format('N');
            if ($day_of_week <= 5) {
                $added_days++;
            }
        }

        return $result;
    }
}
