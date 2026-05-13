<?php
/**
 * Plugin Name: Urban Churn Bakery Orders
 * Plugin URI: https://urbanchurn.com
 * Description: Interactive bakery ordering form with animated visual assembly effects for ice cream cakes, custom baked cakes, and cupcakes. Designed for Urban Churn Louise Drive Scoop Shop & Bakery.
 * Version: 2.0.0
 * Author: Urban Churn
 * Author URI: https://urbanchurn.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: urban-churn-bakery
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('UCBO_VERSION', '2.0.0');
define('UCBO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('UCBO_PLUGIN_URL', plugin_dir_url(__FILE__));
define('UCBO_PLUGIN_BASENAME', plugin_basename(__FILE__));

class Urban_Churn_Bakery_Orders {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->load_dependencies();
        $this->define_hooks();
    }
    
    private function load_dependencies() {
        require_once UCBO_PLUGIN_DIR . 'includes/class-custom-post-type.php';
        require_once UCBO_PLUGIN_DIR . 'includes/class-form-handler.php';
        require_once UCBO_PLUGIN_DIR . 'public/class-public.php';
        require_once UCBO_PLUGIN_DIR . 'admin/class-admin.php';
    }
    
    private function define_hooks() {
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        add_action('init', array($this, 'load_textdomain'));
        add_action('init', array($this, 'init_components'));
    }
    
    public function activate() {
        // Register post type before flushing
        require_once UCBO_PLUGIN_DIR . 'includes/class-custom-post-type.php';
        $cpt = UCBO_Custom_Post_Type::get_instance();
        $cpt->register_post_type();
        flush_rewrite_rules();
        
        $default_settings = array(
            'email_recipient' => 'orders@urbanchurn.com',
            'lead_time_hours' => 96,
            'business_name' => 'Urban Churn Louise Drive Scoop Shop & Bakery'
        );
        
        if (!get_option('ucbo_settings')) {
            add_option('ucbo_settings', $default_settings);
        }
        
        // Update version
        update_option('ucbo_version', UCBO_VERSION);
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    public function load_textdomain() {
        load_plugin_textdomain('urban-churn-bakery', false, dirname(UCBO_PLUGIN_BASENAME) . '/languages');
    }
    
    public function init_components() {
        UCBO_Custom_Post_Type::get_instance();
        UCBO_Public::get_instance();
        
        if (is_admin()) {
            UCBO_Admin::get_instance();
        }
    }
}

function ucbo_run() {
    return Urban_Churn_Bakery_Orders::get_instance();
}

ucbo_run();
