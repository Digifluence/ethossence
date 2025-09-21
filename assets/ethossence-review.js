document.addEventListener('DOMContentLoaded', function() {
   const saveCartBtn = document.getElementById('save-cart-draft');
   const messageDiv = document.getElementById('save-cart-message');
   const attributeFields = document.querySelectorAll('.cart-attribute');
   
   // DEBUG: LOG HOW MANY ATTRIBUTE FIELDS WERE FOUND
   console.log('Found', attributeFields.length, 'cart attribute fields');
   
   // AUTO-SAVE CART ATTRIBUTES WHEN THEY CHANGE
   attributeFields.forEach(field => {
   if (!field || !field.name) return; // SKIP INVALID FIELDS
   
   field.addEventListener('change', function() {
      updateCartAttributes();
   });
   
   // FOR TEXT INPUTS AND TEXTAREAS, SAVE ON BLUR TO AVOID EXCESSIVE API CALLS
   if (field.type === 'text' || field.tagName.toLowerCase() === 'textarea') {
      field.addEventListener('blur', function() {
         updateCartAttributes();
      });
   }
   });
   
   async function updateCartAttributes() {
   const formData = new FormData();
   
   // RE-QUERY ATTRIBUTE FIELDS IN CASE DOM HAS CHANGED
   const currentAttributeFields = document.querySelectorAll('.cart-attribute');
   
   currentAttributeFields.forEach(field => {
      if (!field || !field.name) return; // SKIP INVALID FIELDS
      
      if (field.type === 'checkbox') {
         formData.append(field.name, field.checked ? field.value : '');
      } else if (field.value && field.value.trim() !== '') {
         formData.append(field.name, field.value);
      }
   });
   
   try {
      const response = await fetch('/cart/update.js', {
         method: 'POST',
         body: formData
      });
      
      if (response.ok) {
         console.log('Cart attributes updated successfully');
      }
   } catch (error) {
      console.error('Error updating cart attributes:', error);
   }
   }
   
   // Save Cart as Draft Order functionality
   if (saveCartBtn) {
   saveCartBtn.addEventListener('click', async function() {
      const button = this;
      const originalText = button.innerHTML;
      
      // Disable button and show loading
      button.disabled = true;
      button.innerHTML = 'Saving...';
      
      try {
         // UPDATE CART ATTRIBUTES FIRST TO ENSURE THEY'RE INCLUDED
         await updateCartAttributes();
         
         // GET CURRENT CART DATA (INCLUDES ATTRIBUTES)
         const cartResponse = await fetch('/cart.js');
         const cartData = await cartResponse.json();
         
         // Prepare data for webhook
         const webhookData = {
         customer_id: button.dataset.customerId,
         customer_email: button.dataset.customerEmail,
         cart: cartData,
         shop_domain: Shopify.shop,
         timestamp: new Date().toISOString(),
         currency: cartData.currency,
         cart_attributes: cartData.attributes || {}
         };
         
         // Send to Make webhook
         const webhookResponse = await fetch('https://hook.us2.make.com/al800p8lmsn9c1rmouswa6ogtsmdrgvc', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(webhookData)
         });
         
         if (webhookResponse.ok) {
         showMessage('Cart saved successfully with all details! 💾', 'success');
         } else {
         throw new Error('Failed to save cart');
         }
         
      } catch (error) {
         console.error('Error saving cart:', error);
         showMessage('Failed to save cart. Please try again.', 'error');
      } finally {
         // Re-enable button
         button.disabled = false;
         button.innerHTML = originalText;
      }
   });
   }
   
   function showMessage(text, type) {
   if (messageDiv) {
      messageDiv.textContent = text;
      messageDiv.className = type === 'success' ? 'color-success' : 'color-error';
      messageDiv.style.display = 'block';
      
      // Hide message after 5 seconds
      setTimeout(() => {
         messageDiv.style.display = 'none';
      }, 5000);
   }
   }
});