(function ($) {
    'use strict';

    let currentOrderType = '';
    let basePrice = 0;
    let topperPrice = 0;
    let colorPrice = 0;
    let fillingPrice = 0;
    let decorativeAccentsPrice = 0;
    let currentStep = 1;
    let cupcakeQuantity = 1;
    let bakedCupcakeQuantity = 1;

    // Performance optimization: Debounce function for input events
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Performance optimization: Request Animation Frame throttle
    function throttleRAF(func) {
        let running = false;
        return function (...args) {
            if (running) return;
            running = true;
            requestAnimationFrame(() => {
                func.apply(this, args);
                running = false;
            });
        };
    }

    $(document).ready(function () {
        // Add passive event listeners for better scroll performance
        if ('passive' in $.event.special) {
            $.event.special.touchstart = { setup: function () { this.addEventListener('touchstart', $.noop, { passive: true }); } };
            $.event.special.touchmove = { setup: function () { this.addEventListener('touchmove', $.noop, { passive: true }); } };
        }

        initFormHandlers();
        initDatePicker();
        initAccordion();
        initCharacterCounters();
        initQuantitySelector();
        initPhotoUpload();
        // initMobileNavigation(); // Removed - user requested no mobile nav buttons
    });

    function initCharacterCounters() {
        // Debounced preview update for better performance
        const debouncedPreviewUpdate = debounce(updateVisualPreview, 150);

        // Topper dropdown change handler
        $('#topper_message').on('change', function () {
            // Update preview when topper selection changes
            debouncedPreviewUpdate();
        });
    }

    function initQuantitySelector() {
        $('.ucbo-qty-btn').on('click', function () {
            const btn = $(this);
            const item = btn.data('item');
            let input, min, max, value;
            
            if (item === 'baked-cupcakes') {
                input = $('#baked_cupcake_quantity');
            } else {
                input = $('#cupcake_quantity');
            }
            
            value = parseInt(input.val());
            min = parseInt(input.attr('min'));
            max = parseInt(input.attr('max'));

            if (btn.hasClass('ucbo-qty-minus')) {
                value = Math.max(min, value - 1);
                btn.addClass('ucbo-btn-pressed');
            } else {
                value = Math.min(max, value + 1);
                btn.addClass('ucbo-btn-pressed');
            }

            setTimeout(() => btn.removeClass('ucbo-btn-pressed'), 200);

            input.val(value);
            
            if (item === 'baked-cupcakes') {
                bakedCupcakeQuantity = value;
                // Update filling price if filling is selected
                if ($('#baked_cupcake_filling_checkbox').is(':checked')) {
                    fillingPrice = 10 * bakedCupcakeQuantity;
                }
            } else {
                cupcakeQuantity = value;
            }
            
            updatePriceDisplay();
            updateVisualPreview();
        });
    }

    function initMobileNavigation() {
        // Create mobile navigation if it doesn't exist
        if ($('.ucbo-mobile-step-nav').length === 0) {
            const mobileNav = $('<div class="ucbo-mobile-step-nav">' +
                '<button type="button" class="ucbo-mobile-prev" disabled>← Previous</button>' +
                '<button type="button" class="ucbo-mobile-next primary">Next →</button>' +
                '</div>');

            $('.ucbo-form-container').append(mobileNav);
        }

        // Mobile navigation handlers
        $('.ucbo-mobile-prev').on('click', function () {
            if (currentStep > 1) {
                navigateToStep(currentStep - 1);
            }
        });

        $('.ucbo-mobile-next').on('click', function () {
            if (currentStep < 4) {
                navigateToStep(currentStep + 1);
            }
        });

        updateMobileNav();
    }

    function navigateToStep(stepNum) {
        const $currentHeader = $('.ucbo-accordion-step[data-step="' + currentStep + '"] .ucbo-accordion-header');
        const $nextHeader = $('.ucbo-accordion-step[data-step="' + stepNum + '"] .ucbo-accordion-header');

        // Close current
        $currentHeader.removeClass('active');
        $currentHeader.siblings('.ucbo-accordion-content').removeClass('active');

        // Open next
        $nextHeader.addClass('active');
        $nextHeader.siblings('.ucbo-accordion-content').addClass('active');

        currentStep = stepNum;
        updateMobileNav();

        // Scroll to step
        $('html, body').animate({
            scrollTop: $nextHeader.offset().top - 20
        }, 300);
    }

    function updateMobileNav() {
        $('.ucbo-mobile-prev').prop('disabled', currentStep === 1);
        $('.ucbo-mobile-next').prop('disabled', currentStep === 4);

        if (currentStep === 4) {
            $('.ucbo-mobile-next').text('Complete →');
        } else {
            $('.ucbo-mobile-next').text('Next →');
        }
    }

    function initAccordion() {
        // Accordion click handlers
        $('.ucbo-accordion-header').on('click', function () {
            const $header = $(this);
            const $step = $header.parent('.ucbo-accordion-step');
            const stepNumber = parseInt($step.data('step'));

            // Don't allow clicking on disabled steps
            if ($header.hasClass('disabled')) {
                return;
            }

            // Toggle the clicked accordion
            if ($header.hasClass('active')) {
                // Collapse if already active
                $header.removeClass('active');
                $step.find('.ucbo-accordion-content').removeClass('active');
            } else {
                // Expand the clicked step
                $header.addClass('active');
                $step.find('.ucbo-accordion-content').addClass('active');

                // If opening Step 3, check if order type is selected
                if (stepNumber === 3) {
                    checkStep3OrderType();
                }
            }
        });

        // Validate each step when fields change
        validateStep1OnChange();
        validateStep2OnChange();
        validateStep3OnChange();
    }

    function checkStep3OrderType() {
        const orderType = $('input[name="order_type"]:checked').val();
        if (!orderType) {
            $('#no-order-type-message').show();
            $('.ucbo-order-options').hide();
            $('#addons-section').hide();
        }
    }

    function validateStep1OnChange() {
        const step1Fields = ['#customer_name', '#customer_phone', '#customer_email', '#pickup_date', '#pickup_time'];

        step1Fields.forEach(function (field) {
            $(field).on('blur change', function () {
                checkStep1Completion();
            });
        });
    }

    function checkStep1Completion() {
        const isComplete =
            $('#customer_name').val().trim() !== '' &&
            $('#customer_phone').val().trim() !== '' &&
            $('#customer_email').val().trim() !== '' &&
            $('#pickup_date').val() !== '' &&
            $('#pickup_time').val() !== '';

        const $step1 = $('.ucbo-accordion-step[data-step="1"]');
        const $step1Header = $step1.find('.ucbo-accordion-header');
        const $step2Header = $('.ucbo-accordion-step[data-step="2"] .ucbo-accordion-header');

        if (isComplete) {
            $step1Header.addClass('completed');
            $step1.addClass('completed');
            $step2Header.removeClass('disabled');

            // Auto-progression removed per user request
        } else {
            $step1Header.removeClass('completed');
            $step1.removeClass('completed');
            $step2Header.addClass('disabled');
        }
    }

    function validateStep2OnChange() {
        $('input[name="order_type"]').on('change', function () {
            checkStep2Completion();
        });
    }

    function checkStep2Completion() {
        const isComplete = $('input[name="order_type"]:checked').length > 0;

        const $step2 = $('.ucbo-accordion-step[data-step="2"]');
        const $step2Header = $step2.find('.ucbo-accordion-header');
        const $step3Header = $('.ucbo-accordion-step[data-step="3"] .ucbo-accordion-header');

        if (isComplete) {
            $step2Header.addClass('completed');
            $step2.addClass('completed');
            $step3Header.removeClass('disabled');

            // Auto-progression removed per user request
        } else {
            $step2Header.removeClass('completed');
            $step2.removeClass('completed');
            $step3Header.addClass('disabled');
        }
    }

    function validateStep3OnChange() {
        $('input[name="pre_stacked_flavor"], input[name="ice_cream_flavor"], input[name="cupcake_flavor"], input[name="cake_flavor"], input[name="frosting_type"], input[name="filling"], input[name="baked_cake_flavor"], input[name="baked_frosting_flavor"], input[name="baked_cake_size"], input[name="baked_cupcake_flavor"], input[name="baked_cupcake_frosting"]').on('change', function () {
            checkStep3Completion();
            updateVisualPreview();
        });
    }

    function checkStep3Completion() {
        let isComplete = false;

        const orderType = $('input[name="order_type"]:checked').val();

        if (orderType === 'Pre-Stacked Ice Cream Cake') {
            isComplete = $('input[name="pre_stacked_flavor"]:checked').length > 0;
        } else if (orderType === 'Custom Ice Cream Cake') {
            isComplete =
                $('input[name="cake_flavor"]:checked').length > 0 &&
                $('input[name="ice_cream_flavor"]:checked').length > 0 &&
                $('input[name="frosting_type"]:checked').length > 0;
        } else if (orderType === 'Cupcakes by the Dozen') {
            isComplete = $('input[name="cupcake_flavor"]:checked').length > 0;
        } else if (orderType === 'Custom Cake') {
            isComplete =
                $('input[name="baked_cake_size"]:checked').length > 0 &&
                $('input[name="baked_cake_flavor"]:checked').length > 0 &&
                $('input[name="baked_frosting_flavor"]:checked').length > 0;
        } else if (orderType === 'Custom Cupcakes') {
            isComplete =
                $('input[name="baked_cupcake_flavor"]:checked').length > 0 &&
                $('input[name="baked_cupcake_frosting"]:checked').length > 0;
        }

        const $step3 = $('.ucbo-accordion-step[data-step="3"]');
        const $step3Header = $step3.find('.ucbo-accordion-header');
        const $step4Header = $('.ucbo-accordion-step[data-step="4"] .ucbo-accordion-header');

        if (isComplete) {
            $step3Header.addClass('completed');
            $step3.addClass('completed');
            $step4Header.removeClass('disabled');

            // Confetti micro-interaction removed from step completion
            // Only trigger on final form success

            // Auto-progression removed per user request
        } else {
            $step3Header.removeClass('completed');
            $step3.removeClass('completed');
            $step4Header.addClass('disabled');
        }
    }

    function initFormHandlers() {
        $('input[name="order_type"]').on('change', handleOrderTypeChange);

        // Flavor card handlers
        $('input[name="pre_stacked_flavor"], input[name="cake_flavor"], input[name="ice_cream_flavor"], input[name="cupcake_flavor"], input[name="filling"], input[name="baked_cake_flavor"], input[name="baked_frosting_flavor"], input[name="baked_filling_flavor"], input[name="baked_cupcake_flavor"], input[name="baked_cupcake_frosting"], input[name="baked_cupcake_filling_flavor"], input[name="baked_cake_size"], input[name="baked_cake_topper"]').on('change', function () {
            updateVisualPreview();
            checkStep3Completion();
            updatePriceDisplay();

            // Micro-interaction: pulse effect
            $(this).siblings('.ucbo-flavor-card-content, .ucbo-size-card-content').addClass('ucbo-pulse');
            setTimeout(() => {
                $(this).siblings('.ucbo-flavor-card-content, .ucbo-size-card-content').removeClass('ucbo-pulse');
            }, 400);
        });

        $('#topper_checkbox').on('change', handleTopperChange);
        $('#color_accents_checkbox').on('change', handleColorAccentsChange);
        $('#cupcake_frosting_checkbox').on('change', updateVisualPreview);
        
        // Baked cake filling checkbox
        $('#baked_cake_filling_checkbox').on('change', handleBakedCakeFillingChange);
        // Baked cupcake filling checkbox
        $('#baked_cupcake_filling_checkbox').on('change', handleBakedCupcakeFillingChange);
        // Decorative accents checkbox
        $('#decorative_accents_checkbox').on('change', handleDecorativeAccentsChange);

        $('input[name="frosting_type"], input[name="pre_stacked_frosting_type"]').on('change', updateVisualPreview);
        // Coverage toggles should re-render immediately
        $(document).on('change', 'input[name="frosting_coverage"], input[name="pre_stacked_frosting_coverage"]', updateVisualPreview);

        // Candle toggle (if present in DOM e.g., demo page)
        if ($('#candles_toggle').length) {
            $('#candles_toggle').on('change', updateVisualPreview);
        }

        // Form submission - only attach if not in demo mode
        if (typeof ucboData !== 'undefined' && ucboData.ajaxUrl && ucboData.ajaxUrl !== 'demo-handler.php') {
            $('#ucbo-order-form').on('submit', handleFormSubmit);
        }
    }

    function initDatePicker() {
        const dateInput = $('#pickup_date');
        const leadTimeHours = ucboData.leadTimeHours || 96;
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + Math.ceil(leadTimeHours / 24));
        minDate.setHours(0, 0, 0, 0); // Reset to start of day

        const minDateString = minDate.toISOString().split('T')[0];
        dateInput.attr('min', minDateString);
        
        // Set default value to the minimum date so picker opens to correct month
        if (!dateInput.val()) {
            dateInput.val(minDateString);
        }
    }

    function handleOrderTypeChange() {
        const selectedType = $('input[name="order_type"]:checked').val();
        currentOrderType = selectedType;

        $('.ucbo-order-options').hide();
        $('#addons-section').hide();
        $('#no-order-type-message').hide();

        // Remove 'required' from all flavor fields first
        $('input[name="pre_stacked_flavor"]').removeAttr('required');
        $('input[name="cake_flavor"]').removeAttr('required');
        $('input[name="ice_cream_flavor"]').removeAttr('required');
        $('input[name="frosting_type"]').removeAttr('required');
        $('input[name="cupcake_flavor"]').removeAttr('required');
        $('input[name="baked_cake_size"]').removeAttr('required');
        $('input[name="baked_cake_flavor"]').removeAttr('required');
        $('input[name="baked_frosting_flavor"]').removeAttr('required');
        $('input[name="baked_cupcake_flavor"]').removeAttr('required');
        $('input[name="baked_cupcake_frosting"]').removeAttr('required');
        
        // Reset add-on prices
        fillingPrice = 0;
        decorativeAccentsPrice = 0;

        if (selectedType === 'Pre-Stacked Ice Cream Cake') {
            basePrice = 65;
            $('#pre-stacked-options').slideDown(400);
            $('#addons-section').slideDown(400);

            // Add required to pre-stacked flavor options
            $('input[name="pre_stacked_flavor"]').attr('required', true);

            // Restore addon prices based on checkbox states
            topperPrice = $('#topper_checkbox').is(':checked') ? 8.50 : 0;
            colorPrice = $('#color_accents_checkbox').is(':checked') ? 10 : 0;
        } else if (selectedType === 'Custom Ice Cream Cake') {
            basePrice = 75;
            $('#custom-cake-options').slideDown(400);
            $('#addons-section').slideDown(400);

            // Add required to custom cake flavor options
            $('input[name="cake_flavor"]').attr('required', true);
            $('input[name="ice_cream_flavor"]').attr('required', true);
            $('input[name="frosting_type"]').attr('required', true);

            // Restore addon prices based on checkbox states
            topperPrice = $('#topper_checkbox').is(':checked') ? 8.50 : 0;
            colorPrice = $('#color_accents_checkbox').is(':checked') ? 10 : 0;
        } else if (selectedType === 'Cupcakes by the Dozen') {
            basePrice = 36;
            $('#cupcakes-options').slideDown(400);

            // Add required to cupcake flavor options
            $('input[name="cupcake_flavor"]').attr('required', true);

            // Cupcakes don't have topper or color options - reset prices
            topperPrice = 0;
            colorPrice = 0;
        } else if (selectedType === 'Custom Cake') {
            // Get size-based price or default to smallest
            const selectedSize = $('input[name="baked_cake_size"]:checked').val();
            basePrice = getBakedCakePrice(selectedSize);
            $('#custom-baked-cake-options').slideDown(400);

            // Add required to custom baked cake options
            $('input[name="baked_cake_size"]').attr('required', true);
            $('input[name="baked_cake_flavor"]').attr('required', true);
            $('input[name="baked_frosting_flavor"]').attr('required', true);

            // Check filling checkbox state
            fillingPrice = $('#baked_cake_filling_checkbox').is(':checked') ? 15 : 0;
            
            // Reset ice cream cake add-ons
            topperPrice = 0;
            colorPrice = 0;
        } else if (selectedType === 'Custom Cupcakes') {
            basePrice = 36;
            $('#custom-baked-cupcakes-options').slideDown(400);

            // Add required to custom cupcakes options
            $('input[name="baked_cupcake_flavor"]').attr('required', true);
            $('input[name="baked_cupcake_frosting"]').attr('required', true);

            // Check filling checkbox state (per dozen)
            fillingPrice = $('#baked_cupcake_filling_checkbox').is(':checked') ? 10 * bakedCupcakeQuantity : 0;
            
            // Reset ice cream cake add-ons
            topperPrice = 0;
            colorPrice = 0;
        }

        updatePriceDisplay();
        updateVisualPreview();
    }
    
    function getBakedCakePrice(size) {
        switch (size) {
            case '6-inch': return 75;
            case '7-inch': return 100;
            case '8-inch': return 125;
            default: return 75; // Default to smallest
        }
    }
    
    function handleBakedCakeFillingChange() {
        const isChecked = $(this).is(':checked');
        fillingPrice = isChecked ? 15 : 0;

        if (isChecked) {
            $('#baked_cake_filling_container').slideDown(300);
        } else {
            $('#baked_cake_filling_container').slideUp(300);
            $('input[name="baked_filling_flavor"]').prop('checked', false);
        }

        updatePriceDisplay();
        updateVisualPreview();
    }
    
    function handleBakedCupcakeFillingChange() {
        const isChecked = $(this).is(':checked');
        fillingPrice = isChecked ? 10 * bakedCupcakeQuantity : 0;

        if (isChecked) {
            $('#baked_cupcake_filling_container').slideDown(300);
        } else {
            $('#baked_cupcake_filling_container').slideUp(300);
            $('input[name="baked_cupcake_filling_flavor"]').prop('checked', false);
        }

        updatePriceDisplay();
        updateVisualPreview();
    }
    
    function handleDecorativeAccentsChange() {
        const isChecked = $(this).is(':checked');
        // Note: Decorative accents price is variable ($12-$20), so we show 0 for now
        // The final price will be confirmed by the bakery
        decorativeAccentsPrice = 0;
        updatePriceDisplay();
    }

    function handleTopperChange() {
        const isChecked = $(this).is(':checked');
        topperPrice = isChecked ? 8.50 : 0;

        if (isChecked) {
            $('#topper_select_container').slideDown(300);
            $('#topper_message').attr('required', true);
        } else {
            $('#topper_select_container').slideUp(300);
            $('#topper_message').attr('required', false);
            $('#topper_message').val('');
        }

        updatePriceDisplay();
        updateVisualPreview();
    }

    function handleColorAccentsChange() {
        const isChecked = $(this).is(':checked');
        colorPrice = isChecked ? 10 : 0;

        if (isChecked) {
            $('#color_request_container').slideDown(300);
            // Initialize color selection handler
            initColorSelection();
        } else {
            $('#color_request_container').slideUp(300);
            // Uncheck all colors
            $('input[name="frosting_color"]').prop('checked', false);
        }

        updatePriceDisplay();
        updateVisualPreview(); // Update preview when color accents change
    }

    function initColorSelection() {
        // Handle color radio button changes (single selection only)
        $('input[name="frosting_color"]').off('change').on('change', function () {
            updateVisualPreview();
        });
    }

    function updatePriceDisplay() {
        let itemPrice = basePrice;
        let quantityDisplay = '';

        // For cupcakes, multiply by quantity
        if (currentOrderType === 'Cupcakes by the Dozen') {
            itemPrice = basePrice * cupcakeQuantity;
            $('#ucbo-quantity-price').show();
            $('#ucbo-quantity-display').text(cupcakeQuantity + 'x $' + basePrice.toFixed(2));
        } else if (currentOrderType === 'Custom Cupcakes') {
            itemPrice = basePrice * bakedCupcakeQuantity;
            $('#ucbo-quantity-price').show();
            $('#ucbo-quantity-display').text(bakedCupcakeQuantity + 'x $' + basePrice.toFixed(2));
        } else if (currentOrderType === 'Custom Cake') {
            // Update base price based on selected size
            const selectedSize = $('input[name="baked_cake_size"]:checked').val();
            basePrice = getBakedCakePrice(selectedSize);
            itemPrice = basePrice;
            $('#ucbo-quantity-price').hide();
        } else {
            $('#ucbo-quantity-price').hide();
        }

        const totalPrice = itemPrice + topperPrice + colorPrice + fillingPrice + decorativeAccentsPrice;

        $('#ucbo-base-price').text('$' + basePrice.toFixed(2));
        $('#ucbo-total-price').text('$' + totalPrice.toFixed(2));

        // Animate price change
        $('#ucbo-total-price').addClass('ucbo-price-pulse');
        setTimeout(() => {
            $('#ucbo-total-price').removeClass('ucbo-price-pulse');
        }, 500);

        if (topperPrice > 0) {
            $('#ucbo-topper-price').slideDown(200);
        } else {
            $('#ucbo-topper-price').slideUp(200);
        }

        if (colorPrice > 0) {
            $('#ucbo-color-price').slideDown(200);
        } else {
            $('#ucbo-color-price').slideUp(200);
        }
        
        // Show filling price line
        if (fillingPrice > 0) {
            if ($('#ucbo-filling-price').length === 0) {
                // Create filling price line if it doesn't exist
                $('<div id="ucbo-filling-price" class="ucbo-price-line"><span>Filling:</span><span>+$' + fillingPrice.toFixed(2) + '</span></div>').insertAfter('#ucbo-color-price');
            } else {
                $('#ucbo-filling-price span:last').text('+$' + fillingPrice.toFixed(2));
            }
            $('#ucbo-filling-price').slideDown(200);
        } else {
            $('#ucbo-filling-price').slideUp(200);
        }
    }

    function updateVisualPreview() {
        const preview = $('#ucbo-cake-preview');

        if (!currentOrderType) {
            return;
        }

        if (currentOrderType === 'Cupcakes by the Dozen') {
            renderCupcakePreview(preview, 'ice-cream');
        } else if (currentOrderType === 'Custom Cupcakes') {
            renderCupcakePreview(preview, 'baked');
        } else if (currentOrderType === 'Custom Cake') {
            renderBakedCakePreview(preview);
        } else {
            renderCakePreview(preview);
        }
    }

    function renderCakePreview(preview) {
        const hasTopper = $('#topper_checkbox').is(':checked');
        const topperMessage = $('#topper_message').val() || '';
        const hasColorAccents = $('#color_accents_checkbox').is(':checked');

        // Get selected frosting color (single selection with radio buttons)
        const selectedColorInput = $('input[name="frosting_color"]:checked');
        const selectedColor = selectedColorInput.length > 0 ? selectedColorInput.data('color') : '';

        // Get flavor selections
        let cakeFlavor = '';
        let iceCreamFlavor = '';
        let frostingType = '';
        let filling = '';
        let frostingCoverage = 'top';

        if (currentOrderType === 'Pre-Stacked Ice Cream Cake') {
            iceCreamFlavor = $('input[name="pre_stacked_flavor"]:checked').val() || '';
            cakeFlavor = iceCreamFlavor;
            frostingType = $('input[name="pre_stacked_frosting_type"]:checked').val() || '';
            // Coverage selection for pre-stacked
            const covPS = $('input[name="pre_stacked_frosting_coverage"]:checked').val() || 'Top only';
            frostingCoverage = /all/i.test(covPS) ? 'all' : 'top';
        } else if (currentOrderType === 'Custom Ice Cream Cake') {
            cakeFlavor = $('input[name="cake_flavor"]:checked').val() || '';
            iceCreamFlavor = $('input[name="ice_cream_flavor"]:checked').val() || '';
            frostingType = $('input[name="frosting_type"]:checked').val() || '';
            filling = $('input[name="filling"]:checked').val() || '';
            // Coverage selection for custom
            const cov = $('input[name="frosting_coverage"]:checked').val() || 'Top only';
            frostingCoverage = /all/i.test(cov) ? 'all' : 'top';
        }

        // Determine frosting color (ensure buttercream shows as buttercream by default)
        let frostingColor = '#FFF8E1';
        if (frostingType === 'Whipped Topping') {
            frostingColor = '#FFFFFF';
        }
        if (hasColorAccents && selectedColor) {
            frostingColor = selectedColor;
        }

        const hasFrosting = frostingType ? (frostingType.toLowerCase() !== 'none') : true;

        // Check for sprinkles (if there's a sprinkles checkbox, use it; otherwise default to false)
        const hasSprinkles = $('#sprinkles_checkbox').length > 0 ? $('#sprinkles_checkbox').is(':checked') : false;

        // Use the new SVG cake renderer
        if (typeof CakeRenderer !== 'undefined') {
            CakeRenderer.renderCake(preview, {
                cakeFlavor: cakeFlavor || 'vanilla',
                iceCreamFlavor: iceCreamFlavor || 'vanilla',
                frostingType: frostingType || 'buttercream',
                frostingColor: hasFrosting ? frostingColor : 'transparent',
                frostingCoverage,
                fillingType: normalizeFlavor(filling),
                hasTopper: hasTopper,
                topperText: topperMessage || 'Happy Birthday',
                hasSprinkles: hasSprinkles,
                // Drips follow the reference styling whenever frosting is present
                hasDrips: hasFrosting,
                hasCandles: $('#candles_toggle').length ? $('#candles_toggle').is(':checked') : true
            });
            bindLayerPeekInteraction(preview);
        }
    }

    function bindLayerPeekInteraction(preview) {
        const $svg = preview.find('.ucbo-cake-svg');
        if (!$svg.length) return;
        // Prevent duplicate bindings
        $svg.off('.ucboPeek');
        // Hover (desktop)
        $svg.on('mouseenter.ucboPeek', function () {
            $(this).addClass('expanded');
        });
        $svg.on('mouseleave.ucboPeek', function () {
            $(this).removeClass('expanded');
        });
        // Touch (mobile): toggle briefly
        $svg.on('touchstart.ucboPeek', function () {
            const $el = $(this);
            $el.addClass('expanded');
            // Auto-collapse after 1.5s for peek effect
            setTimeout(() => $el.removeClass('expanded'), 1500);
        });
    }

    function renderCupcakePreview(preview, type) {
        let cupcakeFlavor, hasFrosting, quantity;
        
        if (type === 'baked') {
            cupcakeFlavor = $('input[name=\"baked_cupcake_flavor\"]:checked').val() || 'vanilla';
            hasFrosting = true; // Baked cupcakes always have frosting
            quantity = bakedCupcakeQuantity * 12;
        } else {
            cupcakeFlavor = $('input[name=\"cupcake_flavor\"]:checked').val() || 'vanilla';
            hasFrosting = $('#cupcake_frosting_checkbox').is(':checked');
            quantity = cupcakeQuantity * 12;
        }

        // Use the new SVG cupcake renderer
        const grid = $('<div class=\"ucbo-cupcake-grid\"></div>');
        const flavorClass = normalizeFlavor(cupcakeFlavor) || 'vanilla';
        for (let i = 0; i < 12; i++) {
            const $cupcake = $('<div class=\"cupcake\"></div>').addClass(flavorClass);
            if (type === 'baked') {
                $cupcake.addClass('baked');
            }
            const $frosting = $('<div class=\"frosting\"></div>');
            if (hasFrosting) {
                $frosting.append('<span class=\"top\"></span><span class=\"middle\"></span><span class=\"bottom\"></span>');
            }
            const $cake = $('<div class=\"cake\"></div>');
            const $cup = $('<div class=\"cup\"><span></span><span></span><span></span><span></span></div>');
            $cupcake.append($frosting, $cake, $cup);
            grid.append($cupcake);
        }
        preview.html(grid);

        // Add quantity label if more than 1 dozen
        const displayQty = type === 'baked' ? bakedCupcakeQuantity : cupcakeQuantity;
        if (displayQty > 1) {
            const quantityLabel = $('<p style=\"text-align: center; margin-top: 15px; font-weight: 600; color: var(--bakery-pink);\">× ' + displayQty + ' dozen = ' + quantity + ' total cupcakes</p>');
            preview.append(quantityLabel);
        }
        
        // Add type label
        const typeLabel = type === 'baked' ? 'Custom Cupcakes' : 'Ice Cream Cupcakes';
        preview.prepend('<p style=\"text-align: center; margin-bottom: 10px; font-size: 0.9em; color: #666;\">' + typeLabel + '</p>');
    }
    
    function renderBakedCakePreview(preview) {
        const cakeFlavor = $('input[name=\"baked_cake_flavor\"]:checked').val() || 'vanilla';
        const frostingFlavor = $('input[name=\"baked_frosting_flavor\"]:checked').val() || 'vanilla';
        const cakeSize = $('input[name=\"baked_cake_size\"]:checked').val() || '6-inch';
        const hasTopper = $('input[name=\"baked_cake_topper\"]:checked').val() || '';
        const hasFilling = $('#baked_cake_filling_checkbox').is(':checked');
        const fillingFlavor = $('input[name=\"baked_filling_flavor\"]:checked').val() || '';

        // Use the SVG cake renderer with baked cake options
        if (typeof CakeRenderer !== 'undefined') {
            CakeRenderer.renderBakedCake(preview, {
                cakeFlavor: cakeFlavor,
                frostingFlavor: frostingFlavor,
                cakeSize: cakeSize,
                hasTopper: !!hasTopper,
                topperText: hasTopper,
                hasFilling: hasFilling,
                fillingType: normalizeFlavor(fillingFlavor),
                layers: 3 // 3-layer baked cake
            });
            bindLayerPeekInteraction(preview);
        } else {
            // Fallback if renderer not available
            preview.html('<div class=\"ucbo-placeholder-icon\">🎂</div><p class=\"ucbo-placeholder-text\">Custom ' + cakeSize + ' Cake<br>' + cakeFlavor + ' with ' + frostingFlavor + ' Frosting</p>');
        }
    }

    function normalizeFlavor(flavor) {
        if (!flavor) return '';

        // Convert flavor names to CSS class names
        const flavorMap = {
            'vanilla': 'vanilla',
            'chocolate': 'chocolate',
            'double chocolate': 'chocolate',
            'red velvet': 'red-velvet',
            'funfetti': 'funfetti',
            'cookies \'n cream': 'cookies-cream',
            'cookies n cream': 'cookies-cream',
            'cookies & cream': 'cookies-cream',
            'peanut butter cup': 'peanut-butter',
            'peanut butter': 'peanut-butter',
            'strawberries & cream': 'strawberry',
            'strawberries \'n cream': 'strawberry',
            'strawberries n cream': 'strawberry',
            'strawberry': 'strawberry',
            'mint chocolate chip': 'mint-chip',
            'pumpkin (seasonal)': 'pumpkin',
            'pumpkin spice': 'pumpkin-spice',
            'pumpkin': 'pumpkin',
            'buttercream': 'buttercream',
            'whipped topping': 'whipped-topping',
            'raspberry jam': 'raspberry',
            'raspberry': 'raspberry',
            'chocolate ganache': 'chocolate-ganache',
            'chocolate fudge': 'chocolate-fudge',
            'cherry filling': 'cherry',
            'cherry': 'cherry',
            'salted caramel': 'caramel',
            // New baked cake flavors
            's\'mores': 'smores',
            'smores': 'smores',
            'carrot cake': 'carrot',
            'carrot': 'carrot',
            'marble': 'marble',
            'almond': 'almond',
            'cream cheese': 'cream-cheese',
            'marshmallow': 'marshmallow'
        };

        const normalized = flavor.toLowerCase().trim();
        return flavorMap[normalized] || '';
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    function getSelectedIcingColors() {
        const selectedColor = $('input[name="frosting_color"]:checked');
        return selectedColor.length > 0 ? selectedColor.val() : '';
    }


    function handleFormSubmit(e) {
        e.preventDefault();

        const submitBtn = $('.ucbo-submit-btn');
        submitBtn.prop('disabled', true);
        $('.ucbo-btn-text').hide();
        $('.ucbo-btn-loading').show();

        // Use FormData to support file uploads
        const formData = new FormData();
        formData.append('action', 'ucbo_submit_order');
        formData.append('nonce', ucboData.nonce);
        formData.append('customer_name', $('#customer_name').val());
        formData.append('customer_phone', $('#customer_phone').val());
        formData.append('customer_email', $('#customer_email').val());
        formData.append('pickup_date', $('#pickup_date').val());
        formData.append('pickup_time', $('#pickup_time').val());
        formData.append('referral', $('#referral').val());
        
        const orderType = $('input[name="order_type"]:checked').val();
        formData.append('order_type', orderType);
        formData.append('topper', $('#topper_checkbox').is(':checked') ? 'yes' : 'no');
        formData.append('topper_message', $('#topper_message').val() || '');
        formData.append('color_accents', $('#color_accents_checkbox').is(':checked') ? 'yes' : 'no');
        formData.append('frosting_color', getSelectedIcingColors());
        formData.append('special_requests', $('#special_requests').val() || '');

        // Add inspiration photo if selected
        const photoInput = document.getElementById('inspiration_photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            formData.append('inspiration_photo', photoInput.files[0]);
        }
        
        // Also check baked goods photo input
        const bakedPhotoInput = document.getElementById('baked_inspiration_photo');
        if (bakedPhotoInput && bakedPhotoInput.files && bakedPhotoInput.files[0]) {
            formData.append('inspiration_photo', bakedPhotoInput.files[0]);
        }

        if (orderType === 'Pre-Stacked Ice Cream Cake') {
            formData.append('flavor', $('input[name="pre_stacked_flavor"]:checked').val() || '');
        } else if (orderType === 'Custom Ice Cream Cake') {
            formData.append('cake_flavor', $('input[name="cake_flavor"]:checked').val() || '');
            formData.append('ice_cream_flavor', $('input[name="ice_cream_flavor"]:checked').val() || '');
            formData.append('frosting_type', $('input[name="frosting_type"]:checked').val() || '');
            formData.append('filling', $('input[name="filling"]:checked').val() || '');
        } else if (orderType === 'Cupcakes by the Dozen') {
            formData.append('flavor', $('input[name="cupcake_flavor"]:checked').val() || '');
            formData.append('quantity', cupcakeQuantity);
        } else if (orderType === 'Custom Cake') {
            formData.append('baked_cake_size', $('input[name="baked_cake_size"]:checked').val() || '');
            formData.append('baked_cake_flavor', $('input[name="baked_cake_flavor"]:checked').val() || '');
            formData.append('baked_frosting_flavor', $('input[name="baked_frosting_flavor"]:checked').val() || '');
            formData.append('baked_cake_filling', $('#baked_cake_filling_checkbox').is(':checked') ? 'yes' : 'no');
            formData.append('baked_filling_flavor', $('input[name="baked_filling_flavor"]:checked').val() || '');
            formData.append('baked_cake_topper', $('input[name="baked_cake_topper"]:checked').val() || '');
        } else if (orderType === 'Custom Cupcakes') {
            formData.append('baked_cupcake_flavor', $('input[name="baked_cupcake_flavor"]:checked').val() || '');
            formData.append('baked_cupcake_frosting', $('input[name="baked_cupcake_frosting"]:checked').val() || '');
            formData.append('baked_cupcake_quantity', bakedCupcakeQuantity);
            formData.append('baked_cupcake_filling', $('#baked_cupcake_filling_checkbox').is(':checked') ? 'yes' : 'no');
            formData.append('baked_cupcake_filling_flavor', $('input[name="baked_cupcake_filling_flavor"]:checked').val() || '');
            formData.append('decorative_accents', $('#decorative_accents_checkbox').is(':checked') ? 'yes' : 'no');
        }

        $.ajax({
            url: ucboData.ajaxUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    $('#ucbo-order-form').fadeOut(400, function () {
                        $('#ucbo-success-message').fadeIn(400, function () {
                            // Trigger confetti after success message is fully visible
                            createConfetti();
                        });
                    });

                    $('html, body').animate({
                        scrollTop: $('.ucbo-form-container').offset().top - 20
                    }, 500);
                } else {
                    alert(response.data.message || 'An error occurred. Please try again.');
                    submitBtn.prop('disabled', false);
                    $('.ucbo-btn-text').show();
                    $('.ucbo-btn-loading').hide();
                }
            },
            error: function () {
                alert('An error occurred. Please try again.');
                submitBtn.prop('disabled', false);
                $('.ucbo-btn-text').show();
                $('.ucbo-btn-loading').hide();
            }
        });
    }

    function createConfetti() {
        const colors = ['#E91E63', '#2196F3', '#FFC107', '#4CAF50', '#9C27B0', '#FF5722', '#00BCD4', '#8BC34A'];
        const particleCount = 150; // More particles for dramatic effect
        const originX = window.innerWidth / 2; // Center of screen
        const originY = window.innerHeight / 2; // Middle of viewport

        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                const color = colors[Math.floor(Math.random() * colors.length)];
                const size = 8 + Math.random() * 6; // 8-14px

                confetti.className = 'ucbo-confetti';
                confetti.style.width = size + 'px';
                confetti.style.height = size + 'px';
                confetti.style.backgroundColor = color;
                confetti.style.position = 'fixed';
                confetti.style.left = originX + 'px';
                confetti.style.top = originY + 'px';
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '99999';
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';

                // Calculate random trajectory
                const angle = Math.random() * Math.PI * 2; // Full 360 degrees
                const velocity = 200 + Math.random() * 400; // Speed variance
                const velocityX = Math.cos(angle) * velocity;
                const velocityY = Math.sin(angle) * velocity - 200; // Initial upward bias

                // Physics properties
                const gravity = 500; // Pixels per second squared
                const drag = 0.98; // Air resistance
                const duration = 3000 + Math.random() * 2000; // 3-5 seconds
                const rotationSpeed = (Math.random() - 0.5) * 720; // Random rotation

                let startTime = Date.now();
                let currentX = originX;
                let currentY = originY;
                let currentVelX = velocityX;
                let currentVelY = velocityY;
                let rotation = 0;

                function animate() {
                    const now = Date.now();
                    const elapsed = (now - startTime) / 1000; // Convert to seconds
                    const deltaTime = 0.016; // ~60fps

                    if (elapsed >= duration / 1000) {
                        confetti.remove();
                        return;
                    }

                    // Apply gravity and drag
                    currentVelY += gravity * deltaTime;
                    currentVelX *= drag;
                    currentVelY *= drag;

                    // Update position
                    currentX += currentVelX * deltaTime;
                    currentY += currentVelY * deltaTime;
                    rotation += rotationSpeed * deltaTime;

                    // Calculate opacity (fade out in last second)
                    const timeLeft = (duration / 1000) - elapsed;
                    const opacity = timeLeft < 1 ? timeLeft : 1;

                    // Apply transforms
                    confetti.style.transform = 'translate(' + (currentX - originX) + 'px, ' + (currentY - originY) + 'px) rotate(' + rotation + 'deg)';
                    confetti.style.opacity = opacity;

                    requestAnimationFrame(animate);
                }

                document.body.appendChild(confetti);
                requestAnimationFrame(animate);

            }, i * 3); // Quick burst (150 particles in 450ms)
        }
    }

    function initPhotoUpload() {
        // Ice cream cake inspiration photo
        $('#inspiration_photo').on('change', function (e) {
            handlePhotoUpload(e, '#photo_preview_img', '#photo_preview', '#inspiration_photo');
        });

        $('#remove_photo').on('click', function () {
            $('#inspiration_photo').val('');
            $('#photo_preview').fadeOut(300);
            $('#photo_preview_img').attr('src', '');
        });
        
        // Baked cake inspiration photo
        $('#baked_inspiration_photo').on('change', function (e) {
            handlePhotoUpload(e, '#baked_photo_preview_img', '#baked_photo_preview', '#baked_inspiration_photo');
        });

        $('#baked_remove_photo').on('click', function () {
            $('#baked_inspiration_photo').val('');
            $('#baked_photo_preview').fadeOut(300);
            $('#baked_photo_preview_img').attr('src', '');
        });
    }
    
    function handlePhotoUpload(e, previewImgSelector, previewContainerSelector, inputSelector) {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                $(inputSelector).val('');
                return;
            }

            // Validate file type
            if (!file.type.match('image/(jpeg|jpg|png)')) {
                alert('Only JPG and PNG images are allowed');
                $(inputSelector).val('');
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = function (e) {
                $(previewImgSelector).attr('src', e.target.result);
                $(previewContainerSelector).fadeIn(300);
            };
            reader.readAsDataURL(file);
        }
    }

    // Expose confetti function globally for demo page
    window.createConfetti = createConfetti;

})(jQuery);

