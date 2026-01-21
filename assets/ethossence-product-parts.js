/**
 * Ethossence Product Parts
 * Handles add-to-cart functionality for collection-based product parts display
 */

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
