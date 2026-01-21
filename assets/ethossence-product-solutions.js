/**
 * Ethossence Product Solutions
 * Handles variant-aware solution display, variant selection, and add-to-cart functionality
 * Solutions are shown/hidden based on the currently selected variant of the main product
 */

/**
 * Update variant selection within a solution product item
 * Called when user changes the variant dropdown for a recommended product
 */
function productSolutionsUpdateVariant(selectElement) {
  const productId = selectElement.dataset.productId;
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const variantId = selectedOption.value;
  const price = selectedOption.dataset.price;
  const comparePrice = selectedOption.dataset.comparePrice;
  const available = selectedOption.dataset.available === 'true';
  const sku = selectedOption.dataset.sku;

  // Update the button's variant ID
  const addBtn = document.querySelector(`.product-solutions [data-variant-input="${productId}"]`);
  if (addBtn) {
    addBtn.dataset.variantId = variantId;
  }

  // Update price display
  const priceDisplay = document.querySelector(`.product-solutions [data-price-display="${productId}"]`);
  if (priceDisplay) {
    if (comparePrice && comparePrice !== price) {
      priceDisplay.innerHTML = `
        <span class="product-solutions__price--sale">${price}</span>
        <span class="product-solutions__price--compare"><s>${comparePrice}</s></span>
      `;
    } else {
      priceDisplay.innerHTML = `<span class="product-solutions__price">${price}</span>`;
    }
  }

  // Update SKU display
  const skuDisplay = document.querySelector(`.product-solutions [data-sku-display="${productId}"]`);
  if (skuDisplay) {
    skuDisplay.textContent = sku ? `SKU: ${sku}` : '';
  }

  // Update add to cart button availability
  const btn = document.querySelector(`.product-solutions [data-add-btn="${productId}"]`);
  if (btn) {
    const addToCartText = btn.dataset.addToCartText || 'Add to cart';
    const soldOutText = btn.dataset.soldOutText || 'Sold out';

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
function updateProductSolutionsVisibility(variantId) {
  const container = document.querySelector('.product-solutions');
  if (!container) return;

  const systems = container.querySelectorAll('.product-solutions__system');
  const noSolutionsMsg = container.querySelector('.product-solutions__no-solutions');
  let anyVisible = false;

  systems.forEach(system => {
    const applicableVariants = system.dataset.applicableVariants || '';
    const variantList = applicableVariants.split(',').map(v => v.trim());

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
}

document.addEventListener('DOMContentLoaded', function() {
  // Set up add-to-cart button handlers
  const buttons = document.querySelectorAll('.js-product-solutions-add-to-cart');

  buttons.forEach(button => {
    button.addEventListener('click', handleProductSolutionsAddToCart);
  });

  // Subscribe to variant changes from the main product using Dawn's pub/sub system
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
      if (event.data && event.data.variant && event.data.variant.id) {
        updateProductSolutionsVisibility(event.data.variant.id);
      }
    });
  }

  /**
   * Handle add to cart button click
   */
  function handleProductSolutionsAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const variantId = btn.getAttribute('data-variant-id');
    const originalText = btn.textContent.trim();

    // Get translated strings from data attributes
    const addingText = btn.dataset.addingText || 'Adding...';
    const addedText = btn.dataset.addedText || 'Added!';
    const errorText = btn.dataset.errorText || 'Error - Try Again';

    if (!variantId) {
      console.error('Variant ID not found');
      return;
    }

    btn.disabled = true;
    btn.textContent = addingText;

    const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    const rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
      ? window.Shopify.routes.root
      : '/';

    // Build form data like product-form.js does
    const formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', '1');

    if (cart && typeof cart.getSectionsToRender === 'function') {
      formData.append('sections', cart.getSectionsToRender().map((section) => section.id));
      formData.append('sections_url', window.location.pathname);
    }

    fetch(rootUrl + 'cart/add.js', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(response => {
      btn.textContent = addedText;

      // Show the cart notification/drawer using the theme's built-in method
      if (cart && typeof cart.renderContents === 'function') {
        cart.renderContents(response);
      }

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);

      // Dispatch cart updated event
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { items: response }
      }));
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      btn.textContent = errorText;
      btn.disabled = false;

      setTimeout(() => {
        btn.textContent = originalText;
      }, 3000);
    });
  }
});
