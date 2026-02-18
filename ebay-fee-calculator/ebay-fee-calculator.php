<?php
/*
Plugin Name: eBay Fee Calculator Shortcode
Plugin URI: https://sellercave.com/ebay-fee-calculator/
Description: Shortcode [ebay_fee_calculator] — responsive eBay fee calculator. Inherits theme typography & colors via CSS variables.
Version: 1.0.1
Author: Sohaib S. Khan
Author URI: https://isohaibkhan.github.io/
Text Domain: ebay-fee-calculator
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function efc_register_assets() {
    wp_register_style( 'ebay-fee-calculator-css', plugins_url('assets/css/ebay-fee-calculator.css', __FILE__) );
    wp_register_script( 'ebay-fee-calculator-js', plugins_url('assets/js/ebay-fee-calculator.js', __FILE__), array(), '1.0.0', true );

    // Default mappings & rates (filterable)
    $config = array(
        'currency' => '$',
        'insertion_fee' => 0.35,
        'per_order_fee' => array('buy_it_now' => 0.40, 'auction' => 0.30),
        'performance_penalty_rate' => 0.0134, // 1.34% applied when Below Standard
        'international_rate' => 0.0165, // 1.65% of (sale + shipping)
        'promoted_default' => 0, // default % (user input)
        // final value rates (defaults)
        'final_value_rates' => array(
            'most' => 0.14,
            'books_jewelry_movie_music' => 0.15,
            'store_discount' => 0.01, // subtract when store level reduces FVF
        ),
        // mapping of category keys used in JS dropdown
        'categories_variant_15pct' => array(
            'Books & Magazines','Jewelry & Watches','Movies & TV','Music'
        )
    );

    $config = apply_filters('efc_calc_config', $config);

    wp_localize_script( 'ebay-fee-calculator-js', 'EFCConfig', $config );

    wp_enqueue_style( 'ebay-fee-calculator-css' );
    wp_enqueue_script( 'ebay-fee-calculator-js' );
}
add_action( 'wp_enqueue_scripts', 'efc_register_assets' );

function efc_shortcode( $atts = array() ) {
    ob_start();
    ?>
    <div class="efc-calc">
        <div class="efc-card">
            <!-- SECTION 1: Item Details -->
            <div class="efc-section">
                <h4 class="efc-section-title">Item Details</h4>
                <div class="efc-grid">
                    <div class="efc-field"><label>Sold Price</label><input id="efc-sold-price" type="number" min="0" step="0.01" /></div>
                    <div class="efc-field"><label>Shipping Charge</label><input id="efc-shipping-charge" type="number" min="0" step="0.01" /></div>
                    <div class="efc-field"><label>Item Cost</label><input id="efc-item-cost" type="number" min="0" step="0.01" /></div>
                    <div class="efc-field"><label>Shipping Cost</label><input id="efc-shipping-cost" type="number" min="0" step="0.01" /></div>
                    <div class="efc-field"><label>Quantity</label><input id="efc-quantity" type="number" min="1" step="1" value="1" /></div>
                    <div class="efc-field"><label>Listing Type</label>
                        <select id="efc-listing-type">
                            <option>Buy It Now</option>
                            <option>Auction</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: Category & Seller Status -->
            <div class="efc-section">
                <h4 class="efc-section-title">Category & Seller Status</h4>
                <div class="efc-grid">
                    <div class="efc-field"><label>Item Category</label>
                        <select id="efc-category">
                            <option>Most Categories</option>
                            <option>Antiques</option>
                            <option>Arts</option>
                            <option>Books & Magazines</option>
                            <option>Business & Industrial</option>
                            <option>Clothing, Shoes & Accessories</option>
                            <option>Coins & Paper Money</option>
                            <option>Collectibles</option>
                            <option>Computers/Tablets & Networking</option>
                            <option>Consumer Electronics</option>
                            <option>eBay Motors</option>
                            <option>Jewelry & Watches</option>
                            <option>Movies & TV</option>
                            <option>Music</option>
                            <option>Musical Instruments & Gears</option>
                            <option>Sports Mem, Cards & Fan Shop</option>
                            <option>Stamps</option>
                            <option>Toys & Hobbies</option>
                            <option>Video Games & Consoles</option>
                        </select>
                    </div>

                    <div class="efc-field"><label>eBay Store</label>
                        <select id="efc-store">
                            <option>No Store</option>
                            <option>Starter</option>
                            <option>Basic</option>
                            <option>Premium</option>
                            <option>Anchor</option>
                            <option>Enterprise</option>
                        </select>
                    </div>

                    <div class="efc-field efc-full"><label>Seller Status</label>
                        <select id="efc-seller-status">
                            <option>Below Standard</option>
                            <option>Above Standard</option>
                            <option>Top Rated Plus</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SECTION 3: Optional Listing Upgrades -->
            <div class="efc-section">
                <h4 class="efc-section-title">Optional Listing Upgrades</h4>
                <div class="efc-grid">
                    <div class="efc-field">
                        <label class="efc-checkbox"><input id="efc-up-bold" type="checkbox" /> Bold Title <span class="efc-note">($2 Auction / $4 Fixed)</span></label>
                    </div>
                    <div class="efc-field">
                        <label class="efc-checkbox"><input id="efc-up-gallery" type="checkbox" /> Gallery Plus <span class="efc-note">($0.35–$1.00)</span></label>
                    </div>
                    <div class="efc-field efc-full">
                        <label class="efc-checkbox"><input id="efc-up-subtitle" type="checkbox" /> Subtitle <span class="efc-note">($1.50–$6.00)</span></label>
                    </div>
                </div>
            </div>

            <!-- SECTION 4: Additional Options -->
            <div class="efc-section">
                <h4 class="efc-section-title">Additional Options</h4>
                <div class="efc-grid">
                    <div class="efc-field"><label>Promoted Listings %</label><input id="efc-promoted" type="number" min="0" step="0.1" placeholder="e.g. 5" /></div>
                    <div class="efc-field"><label>Other Costs</label><input id="efc-other-costs" type="number" min="0" step="0.01" /></div>

                    <div class="efc-field efc-full">
                        <label class="efc-checkbox"><input id="efc-intl" type="checkbox" /> International Sale (+1.65%)</label>
                    </div>

                    <div class="efc-field efc-full">
                        <label class="efc-checkbox"><input id="efc-sales-tax" type="checkbox" /> Include Sales Tax</label>
                    </div>

                    <!-- tax options (hidden until sales-tax is checked) -->
                    <div id="efc-tax-options" style="display:none; width:100%;">
                        <div class="efc-field efc-full">
                            <label><input type="radio" name="efc-tax-type" value="percent" checked /> Percentage</label>
                            <label style="margin-left:1rem;"><input type="radio" name="efc-tax-type" value="fixed" /> Fixed Amount</label>
                        </div>
                        <div class="efc-field efc-full" id="efc-tax-percent-row"><label>Tax Rate (%)</label><input id="efc-tax-percent" type="number" min="0" step="0.01" /></div>
                        <div class="efc-field efc-full" id="efc-tax-fixed-row" style="display:none;"><label>Tax Amount ($)</label><input id="efc-tax-fixed" type="number" min="0" step="0.01" /></div>
                    </div>
                </div>
            </div>

            <!-- RESULTS -->
            <div class="efc-results" id="efc-results">
                <h5>Fee Breakdown</h5>
                <div class="efc-row"><div class="efc-label">Insertion Fee:</div><div class="efc-value" id="efc-res-insertion">-</div></div>
                <div class="efc-row"><div class="efc-label">Final Value Fee:</div><div class="efc-value" id="efc-res-finalvalue">-</div></div>
                <div class="efc-row"><div class="efc-label">Per-Order Fee:</div><div class="efc-value" id="efc-res-perorder">-</div></div>
                <div class="efc-row"><div class="efc-label">Upgrade Fees:</div><div class="efc-value" id="efc-res-upgrades">-</div></div>
                <div class="efc-row"><div class="efc-label">Promoted Listings:</div><div class="efc-value" id="efc-res-promoted">-</div></div>
                <div class="efc-row"><div class="efc-label">International Fee:</div><div class="efc-value" id="efc-res-intl">-</div></div>
                <div class="efc-row"><div class="efc-label">Performance Penalty:</div><div class="efc-value" id="efc-res-perf">-</div></div>
                <div class="efc-row efc-total"><div class="efc-label">Total eBay Fees:</div><div class="efc-value" id="efc-res-totalfees">-</div></div>

                <h5>Cost Summary</h5>
                <div class="efc-row"><div class="efc-label">Item Cost:</div><div class="efc-value" id="efc-res-itemcost">-</div></div>
                <div class="efc-row"><div class="efc-label">Shipping Cost:</div><div class="efc-value" id="efc-res-shipcost">-</div></div>
                <div class="efc-row"><div class="efc-label">Other Costs:</div><div class="efc-value" id="efc-res-othercosts">-</div></div>
                <div class="efc-row efc-total"><div class="efc-label">Total Costs:</div><div class="efc-value" id="efc-res-totalcosts">-</div></div>

                <div class="efc-row efc-total"><div class="efc-label">Total Profit:</div><div class="efc-value" id="efc-res-profit">-</div></div>
                <div class="efc-row"><div class="efc-label">Profit Margin:</div><div class="efc-value" id="efc-res-margin">-</div></div>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('ebay_fee_calculator', 'efc_shortcode');
