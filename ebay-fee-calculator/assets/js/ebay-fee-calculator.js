(function(){
    function qs(sel, el){ return (el || document).querySelector(sel); }
    function qsa(sel, el){ return (el || document).querySelectorAll(sel); }

    var cfg = window.EFCConfig || {};
    var currency = cfg.currency || '$';

    document.addEventListener('DOMContentLoaded', function(){
        var root = qs('.efc-calc');
        if(!root) return;

        // Inputs
        var soldPrice = qs('#efc-sold-price', root);
        var shippingCharge = qs('#efc-shipping-charge', root);
        var itemCost = qs('#efc-item-cost', root);
        var shippingCost = qs('#efc-shipping-cost', root);
        var quantity = qs('#efc-quantity', root);
        var listingType = qs('#efc-listing-type', root);

        var category = qs('#efc-category', root);
        var store = qs('#efc-store', root);
        var sellerStatus = qs('#efc-seller-status', root);

        var upBold = qs('#efc-up-bold', root);
        var upGallery = qs('#efc-up-gallery', root);
        var upSubtitle = qs('#efc-up-subtitle', root);

        var promoted = qs('#efc-promoted', root);
        var otherCosts = qs('#efc-other-costs', root);
        var intl = qs('#efc-intl', root);
        var salesTax = qs('#efc-sales-tax', root);

        var taxOptions = qs('#efc-tax-options', root);
        var taxTypeRadios = qsa('input[name="efc-tax-type"]', root);
        var taxPercentRow = qs('#efc-tax-percent-row', root);
        var taxFixedRow = qs('#efc-tax-fixed-row', root);
        var taxPercent = qs('#efc-tax-percent', root);
        var taxFixed = qs('#efc-tax-fixed', root);

        // Results elements
        var resInsertion = qs('#efc-res-insertion', root);
        var resFinal = qs('#efc-res-finalvalue', root);
        var resPerOrder = qs('#efc-res-perorder', root);
        var resUp = qs('#efc-res-upgrades', root);
        var resPromoted = qs('#efc-res-promoted', root);
        var resIntl = qs('#efc-res-intl', root);
        var resPerf = qs('#efc-res-perf', root);
        var resTotalFees = qs('#efc-res-totalfees', root);

        var resItemCost = qs('#efc-res-itemcost', root);
        var resShipCost = qs('#efc-res-shipcost', root);
        var resOtherCost = qs('#efc-res-othercosts', root);
        var resTotalCosts = qs('#efc-res-totalcosts', root);
        var resProfit = qs('#efc-res-profit', root);
        var resMargin = qs('#efc-res-margin', root);

        // helper
        function formatCurrency(val){
            if(isNaN(val)) return '-';
            return currency + Number(val).toFixed(2);
        }

        // show/hide tax options
        salesTax.addEventListener('change', function(){
            if(salesTax.checked) taxOptions.style.display = 'block';
            else taxOptions.style.display = 'none';
            calculate();
        });

        taxTypeRadios.forEach(function(r){
            r.addEventListener('change', function(){
                if(r.value === 'percent' && r.checked){
                    taxPercentRow.style.display = '';
                    taxFixedRow.style.display = 'none';
                } else if(r.value === 'fixed' && r.checked){
                    taxPercentRow.style.display = 'none';
                    taxFixedRow.style.display = '';
                }
                calculate();
            });
        });

        // Fire calculate on input changes
        var watch = [
            soldPrice, shippingCharge, itemCost, shippingCost, quantity, listingType,
            category, store, sellerStatus, upBold, upGallery, upSubtitle,
            promoted, otherCosts, intl, salesTax, taxPercent, taxFixed
        ];
        watch.forEach(function(el){
            if(!el) return;
            ['input','change'].forEach(function(evt){
                el.addEventListener(evt, calculate);
            });
        });

        // core calculate function — implements rules inferred from your cases
        function calculate(){
            var sale = parseFloat(soldPrice.value) || 0;
            var shipCharge = parseFloat(shippingCharge.value) || 0;
            var itCost = parseFloat(itemCost.value) || 0;
            var shipCost = parseFloat(shippingCost.value) || 0;
            var qty = parseInt(quantity.value) || 1;
            var listType = (listingType.value || 'Buy It Now').toLowerCase();
            var cat = (category.value || 'Most Categories');
            var storeLevel = (store.value || 'No Store');
            var seller = (sellerStatus.value || 'Below Standard');

            // base config
            var insertionFee = Number(cfg.insertion_fee || 0.35);
            // store levels: if store != 'No Store' then insertion fee waived
            if(storeLevel !== 'No Store') insertionFee = 0;

            // final value rate depends on category
            var fvRate = Number(cfg.final_value_rates && cfg.final_value_rates.most ? cfg.final_value_rates.most : 0.14);

            // categories that use 15% (books, jewelry, movies, music)
            var specialCats = (cfg.categories_variant_15pct || ['Books & Magazines','Jewelry & Watches','Movies & TV','Music']);
            if(specialCats.indexOf(cat) !== -1) fvRate = Number(cfg.final_value_rates && cfg.final_value_rates.books_jewelry_movie_music ? cfg.final_value_rates.books_jewelry_movie_music : 0.15);

            // store discount reduces final value by store_discount (e.g. -0.01)
            if(storeLevel !== 'No Store'){
                fvRate = Math.max(0, fvRate - (cfg.final_value_rates.store_discount || 0.01));
            }

            // final value fee typically applied on (sale * quantity) + shipping charge
            var baseForFvf = (sale * qty) + (shipCharge * qty);

            var finalValueFee = Number((baseForFvf * fvRate).toFixed(2));

            // per-order fee depends on listing type (inferred from examples)
            var perOrderFee = (listType.indexOf('auction') !== -1) ? (cfg.per_order_fee && cfg.per_order_fee.auction ? cfg.per_order_fee.auction : 0.30) : (cfg.per_order_fee && cfg.per_order_fee.buy_it_now ? cfg.per_order_fee.buy_it_now : 0.40);
            // apply per-order per quantity
            var perOrderTotal = Number((perOrderFee * Math.max(1, qty)).toFixed(2));

            // upgrade fees rules:
            // Bold: auction = $2, buy it now = $4
            var boldFee = (upBold.checked) ? (listType.indexOf('auction') !== -1 ? 2.00 : 4.00) : 0;
            // Gallery: auction = 0.35, buy it now = 1.00
            var galleryFee = (upGallery.checked) ? (listType.indexOf('auction') !== -1 ? 0.35 : 1.00) : 0;
            // Subtitle: auction = 1.50, buy it now = 2.00
            var subtitleFee = (upSubtitle.checked) ? (listType.indexOf('auction') !== -1 ? 1.50 : 2.00) : 0;
            var upgradeTotal = Number((boldFee + galleryFee + subtitleFee).toFixed(2));

            // promoted listings fee = (sale + shippingCharge) * promoted%
            var promotedPct = parseFloat(promoted.value) || 0;
            var promotedTotal = Number((( (sale * qty) + (shipCharge * qty) ) * (promotedPct/100)).toFixed(2));

            // international fee = base * international_rate if checked
            var intlTotal = 0;
            if(intl.checked){
                var ir = Number(cfg.international_rate || 0.0165);
                intlTotal = Number((( (sale * qty) + (shipCharge * qty) ) * ir).toFixed(2));
            }

            // performance penalty — only for Below Standard seller (rate defined in config)
            var perfTotal = 0;
            if(seller.toLowerCase().indexOf('below') !== -1){
                var pr = Number(cfg.performance_penalty_rate || 0.0134);
                perfTotal = Number(((sale * qty) * pr).toFixed(2));
            } else {
                perfTotal = 0;
            }

            // insertion fee: typically per-listing; if quantity >1, keep insertion for first listing only (match typical behaviour)
            var insertionTotal = Number(insertionFee.toFixed(2));

            // total fees sum
            var totalFees = Number((insertionTotal + finalValueFee + perOrderTotal + upgradeTotal + promotedTotal + intlTotal + perfTotal).toFixed(2));

            // costs
            var other = parseFloat(otherCosts.value) || 0;
            var totalCosts = Number((totalFees + (itCost * qty) + (shipCost * qty) + other).toFixed(2));

            // Profit = revenue - totalCosts ; revenue includes sale*qty + shippingCharge*qty
            var revenue = Number(((sale * qty) + (shipCharge * qty)).toFixed(2));
            var profit = Number((revenue - totalCosts).toFixed(2));

            var margin = 0;
            if(revenue !== 0) margin = Number(((profit / revenue) * 100).toFixed(2));

            // populate results
            resInsertion.textContent = formatCurrency(insertionTotal);
            resFinal.textContent = formatCurrency(finalValueFee);
            resPerOrder.textContent = formatCurrency(perOrderTotal);
            resUp.textContent = formatCurrency(upgradeTotal);
            resPromoted.textContent = formatCurrency(promotedTotal);
            resIntl.textContent = formatCurrency(intlTotal);
            resPerf.textContent = formatCurrency(perfTotal);
            resTotalFees.textContent = formatCurrency(totalFees);

            resItemCost.textContent = formatCurrency(itCost * qty);
            resShipCost.textContent = formatCurrency(shipCost * qty);
            resOtherCost.textContent = formatCurrency(other);
            resTotalCosts.textContent = formatCurrency(totalCosts);

            resProfit.textContent = formatCurrency(profit);
            resMargin.textContent = (isNaN(margin) ? '-' : (margin + '%'));

            // color classes for profit (positive/negative)
            [resProfit].forEach(function(el){
                el.classList.remove('positive','negative');
                var v = parseFloat((el.textContent || '').replace(/[^0-9.-]+/g,''));
                if(!isNaN(v)){
                    if(v >= 0) el.classList.add('positive');
                    else el.classList.add('negative');
                }
            });
        }

        // initial run
        calculate();
    });
})();
