/**
 * Ethossence Product Solutions
 * Handles variant-aware solution display, variant selection, and add-to-cart functionality
 * Solutions are shown/hidden based on the currently selected variant of the main product
 */

(function () {
  /**
   * Check if the section uses currency codes for price display
   * @param {Element} selectElement - The variant select element
   * @returns {boolean}
   */
  function useCurrencyCode(selectElement) {
    var container = selectElement.closest('.product-solutions');
    return container && container.dataset.currencyCodeEnabled === 'true';
  }

  /**
   * Update variant selection within a solution product item
   * Called via event delegation when user changes the variant dropdown
   * @param {HTMLSelectElement} selectElement
   */
  function updateVariant(selectElement) {
    var selectedOption = selectElement.options[selectElement.selectedIndex];
    var variantId = selectedOption.value;
    var available = selectedOption.dataset.available === 'true';
    var sku = selectedOption.dataset.sku;
    var withCurrency = useCurrencyCode(selectElement);

    var price = withCurrency
      ? selectedOption.dataset.priceWithCurrency
      : selectedOption.dataset.price;
    var comparePrice = withCurrency
      ? selectedOption.dataset.comparePriceWithCurrency
      : selectedOption.dataset.comparePrice;

    // Scope all queries to the parent item row so duplicate product IDs
    // across hidden/visible solution systems don't cause mis-targeting
    var item = selectElement.closest('.product-solutions__item');
    if (!item) return;

    // Update the button's variant ID
    var addBtn = item.querySelector('[data-variant-input]');
    if (addBtn) {
      addBtn.dataset.variantId = variantId;
    }

    // Update price display — a specific variant is selected so never show "from"
    var priceDisplay = item.querySelector('[data-price-display]');
    if (priceDisplay) {
      if (comparePrice && comparePrice !== price) {
        priceDisplay.innerHTML =
          '<span class="product-solutions__price--sale">' + price + '</span>' +
          '<span class="product-solutions__price--compare"><s>' + comparePrice + '</s></span>';
      } else {
        priceDisplay.innerHTML = '<span class="product-solutions__price">' + price + '</span>';
      }
    }

    // Update SKU display
    var skuDisplay = item.querySelector('[data-sku-display]');
    if (skuDisplay) {
      skuDisplay.textContent = sku ? 'SKU: ' + sku : '';
    }

    // Update add to cart button availability
    var btn = item.querySelector('[data-add-btn]');
    if (btn) {
      var addToCartText = btn.dataset.addToCartText || 'Add to cart';
      var soldOutText = btn.dataset.soldOutText || 'Sold out';

      if (available) {
        btn.disabled = false;
        btn.textContent = addToCartText;
      } else {
        btn.disabled = true;
        btn.textContent = soldOutText;
      }
    }
  }

  /**
   * Update the visibility of solution systems based on the selected main product variant
   * @param {string} variantId - The ID of the currently selected variant
   */
  function updateVisibility(variantId) {
    var containers = document.querySelectorAll('.product-solutions');
    containers.forEach(function (container) {
      var systems = container.querySelectorAll('.product-solutions__system');
      var noSolutionsMsg = container.querySelector('.product-solutions__no-solutions');
      var anyVisible = false;

      systems.forEach(function (system) {
        var applicableVariants = system.dataset.applicableVariants || '';
        var variantList = applicableVariants.split(',').map(function (v) { return v.trim(); });

        if (variantList.includes(variantId.toString())) {
          system.style.display = '';
          anyVisible = true;
        } else {
          system.style.display = 'none';
        }
      });

      // Show/hide "no solutions" message
      if (noSolutionsMsg) {
        noSolutionsMsg.style.display = anyVisible ? 'none' : '';
      }

      // Update the stored current variant ID
      container.dataset.currentVariantId = variantId;
    });
  }

  /**
   * Handle add to cart button click
   */
  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();

    var btn = e.currentTarget;
    var variantId = btn.getAttribute('data-variant-id');
    var originalText = btn.textContent.trim();

    // Get translated strings from data attributes
    var addingText = btn.dataset.addingText || 'Adding...';
    var addedText = btn.dataset.addedText || 'Added!';
    var errorText = btn.dataset.errorText || 'Error - Try Again';

    if (!variantId) {
      console.error('Variant ID not found');
      return;
    }

    btn.disabled = true;
    btn.textContent = addingText;

    var cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    var rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
      ? window.Shopify.routes.root
      : '/';

    // Build form data like product-form.js does
    var formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', '1');

    if (cart && typeof cart.getSectionsToRender === 'function') {
      formData.append('sections', cart.getSectionsToRender().map(function (section) { return section.id; }));
      formData.append('sections_url', window.location.pathname);
    }

    fetch(rootUrl + 'cart/add.js', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      return response.json();
    })
    .then(function (response) {
      btn.textContent = addedText;

      // Show the cart notification/drawer using the theme's built-in method
      if (cart && typeof cart.renderContents === 'function') {
        cart.renderContents(response);
      }

      setTimeout(function () {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);

      // Dispatch cart updated event
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { items: response }
      }));
    })
    .catch(function (error) {
      console.error('Error adding to cart:', error);
      btn.textContent = errorText;
      btn.disabled = false;

      setTimeout(function () {
        btn.textContent = originalText;
      }, 3000);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Event delegation for variant select changes (replaces inline onchange)
    document.addEventListener('change', function (e) {
      if (e.target.matches('.product-solutions__variant-select')) {
        updateVariant(e.target);
      }
    });

    // Event delegation for add-to-cart button clicks
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.js-product-solutions-add-to-cart');
      if (btn) {
        handleAddToCart({ preventDefault: function () { e.preventDefault(); }, stopPropagation: function () { e.stopPropagation(); }, currentTarget: btn });
      }
    });

    // Subscribe to variant changes from the main product using Dawn's pub/sub system
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
        if (event.data && event.data.variant && event.data.variant.id) {
          updateVisibility(event.data.variant.id);
        }
      });
    }
  });
})();
