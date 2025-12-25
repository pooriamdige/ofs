<?php
/**
 * Plugin Name: OneFunders Connect
 * Description: Connects WordPress/WooCommerce to the OneFunders Analysis Dashboard via Shortcode.
 * Version: 1.0
 * Author: OneFunders
 */

if (!defined('ABSPATH')) {
    exit;
}

class OneFunders_Connect {
    private $api_url;
    private $hmac_secret;

    public function __construct() {
        // Load settings
        $this->api_url = get_option('onefunders_api_url', 'http://185.8.173.37:3001/api'); // Default to VPS API
        $this->hmac_secret = get_option('onefunders_hmac_secret', '');

        // Hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_shortcode('onefunders_dashboard', array($this, 'render_dashboard'));
        
        // WooCommerce Order Hook (Example for auto-connect)
        add_action('woocommerce_order_status_completed', array($this, 'handle_new_order'));
    }

    public function add_admin_menu() {
        add_menu_page(
            'OneFunders',
            'OneFunders',
            'manage_options',
            'onefunders-settings',
            array($this, 'settings_page_html'),
            'dashicons-chart-area',
            60
        );
    }

    public function register_settings() {
        register_setting('onefunders_options', 'onefunders_api_url');
        register_setting('onefunders_options', 'onefunders_hmac_secret');
        register_setting('onefunders_options', 'onefunders_dashboard_url'); // URL of the React App
    }

    public function settings_page_html() {
        ?>
        <div class="wrap">
            <h1>OneFunders Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('onefunders_options'); ?>
                <?php do_settings_sections('onefunders_options'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">API URL</th>
                        <td><input type="text" name="onefunders_api_url" value="<?php echo esc_attr(get_option('onefunders_api_url')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Dashboard URL (React App)</th>
                        <td><input type="text" name="onefunders_dashboard_url" value="<?php echo esc_attr(get_option('onefunders_dashboard_url')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">HMAC Secret</th>
                        <td><input type="password" name="onefunders_hmac_secret" value="<?php echo esc_attr(get_option('onefunders_hmac_secret')); ?>" class="regular-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * Generate HMAC Signature
     */
    private function generate_signature($payload) {
        return hash_hmac('sha256', json_encode($payload), $this->hmac_secret);
    }

    /**
     * Get JWT for current user
     */
    private function get_user_token($user_id) {
        $user = get_userdata($user_id);
        $payload = array(
            'wp_user_id' => $user_id,
            'email' => $user->user_email,
            'fullName' => $user->display_name
        );

        $timestamp = time();
        $signature = $this->generate_signature($payload);

        $response = wp_remote_post($this->api_url . '/auth/exchange', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-OneFunders-Signature' => $signature,
                'X-OneFunders-Timestamp' => $timestamp
            ),
            'body' => json_encode($payload)
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        return isset($body['token']) ? $body['token'] : false;
    }

    /**
     * Shortcode: [onefunders_dashboard]
     */
    public function render_dashboard($atts) {
        if (!is_user_logged_in()) {
            return '<p>Please log in to view your dashboard.</p>';
        }

        $user_id = get_current_user_id();
        $token = $this->get_user_token($user_id);

        if (!$token) {
            return '<p>Error connecting to trading server. Please contact support.</p>';
        }

        $dashboard_url = get_option('onefunders_dashboard_url', 'http://185.8.173.37');
        // Ensure trailing slash
        $dashboard_url = rtrim($dashboard_url, '/');

        // Render Iframe
        return sprintf(
            '<iframe src="%s/?token=%s" width="100%%" height="800px" frameborder="0" style="border:none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px;"></iframe>',
            esc_url($dashboard_url),
            esc_attr($token)
        );
    }

    /**
     * Handle New Order (Example stub)
     */
    public function handle_new_order($order_id) {
        // Logic to send S2S /api/connect request would go here
    }
}

new OneFunders_Connect();
