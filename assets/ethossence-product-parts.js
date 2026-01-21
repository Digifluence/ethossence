/**
 * Ethossence Product Parts
 * Handles variant selection and add-to-cart functionality for collection-based product parts display
 */

/**
 * Update variant selection within a product item
 * Called when user changes the variant dropdown for a product
 */
function productPartsUpdateVariant(selectElement) {
  const productId = selectElement.dataset.productId;
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const variantId = selectedOption.value;
  const price = selectedOption.dataset.price;
  const comparePrice = selectedOption.dataset.comparePrice;
  const available = selectedOption.dataset.available === 'true';
  const sku = selectedOption.dataset.sku;

  // Update the button's variant ID
  const addBtn = document.querySelector(`.product-parts [data-variant-input="${productId}"]`);
  if (addBtn) {
    addBtn.dataset.variantId = variantId;
  }

  // Update price display (remove "From" prefix when variant is selected)
  const priceDisplay = document.querySelector(`.product-parts [data-price-display="${productId}"]`);
  if (priceDisplay) {
    if (comparePrice && comparePrice !== price) {
      priceDisplay.innerHTML = `
        <span class="product-parts__price--sale">${price}</span>
        <span class="product-parts__price--compare"><s>${comparePrice}</s></span>
      `;
    } else {
      priceDisplay.innerHTML = `<span class="product-parts__price">${price}</span>`;
    }
  }

  // Update SKU display
  const skuDisplay = document.querySelector(`.product-parts [data-sku-display="${productId}"]`);
  if (skuDisplay) {
    skuDisplay.textContent = sku ? `SKU: ${sku}` : '';
  }

  // Update add to cart button availability
  const btn = document.querySelector(`.product-parts [data-add-btn="${productId}"]`);
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

document.addEventListener('DOMContentLoaded', function() {
  // Set up add-to-cart button handlers
  const buttons = document.querySelectorAll('.js-product-parts-add-to-cart');

  buttons.forEach(button => {
    button.addEventListener('click', handleProductPartsAddToCart);
  });

  /**
   * Handle add to cart button click
   */
  function handleProductPartsAddToCart(e) {
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
