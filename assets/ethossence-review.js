document.addEventListener('DOMContentLoaded', function() {
   const saveCartBtn = document.getElementById('save-cart-draft');
   const messageDiv = document.getElementById('save-cart-message');
   const attributeFields = document.querySelectorAll('.cart-attribute');
   
   // DEBUG: LOG HOW MANY ATTRIBUTE FIELDS WERE FOUND
   console.log('Found', attributeFields.length, 'cart attribute fields');
   
   // SETUP CONDITIONAL FIELD DISPLAY
   setupConditionalFields();
   
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
      } else if (field.type === 'radio') {
         // FOR RADIO BUTTONS, ONLY APPEND IF CHECKED
         if (field.checked) {
            formData.append(field.name, field.value);
         }
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

   // NEW FUNCTION TO COLLECT DETAILED FIELD DATA FOR WEBHOOK
   function collectFieldData() {
      const fieldData = [];
      const reviewRequestFields = document.querySelectorAll('#review-request-fields .cart-attribute');
      
      reviewRequestFields.forEach(field => {
         if (!field || !field.name) return; // SKIP INVALID FIELDS
         
         let value = '';
         let shouldInclude = false;
         
         if (field.type === 'checkbox') {
            value = field.checked ? field.value : '';
            shouldInclude = true; // INCLUDE ALL CHECKBOX FIELDS
         } else if (field.type === 'radio') {
            if (field.checked) {
               value = field.value;
               shouldInclude = true;
            }
         } else if (field.value && field.value.trim() !== '') {
            value = field.value;
            shouldInclude = true;
         }
         
         if (shouldInclude) {
            fieldData.push({
               id: field.id || '',
               name: field.name || '',
               value: value,
               type: field.type || field.tagName.toLowerCase()
            });
         }
      });
      
      return fieldData;
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
         ethossence_review_inputs: collectFieldData() // STRUCTURED FORM DATA
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
         showMessage('Review request submitted successfully!', 'success');
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

   // SETUP CONDITIONAL FIELD DISPLAY LOGIC
   function setupConditionalFields() {
      const preheatedYes = document.getElementById('preheated-yes');
      const preheatedNo = document.getElementById('preheated-no');
      const tempField = document.getElementById('preheated-temp-field');

      if (preheatedYes && preheatedNo && tempField) {
         // HANDLE PREHEATED YES/NO RADIO BUTTONS
         preheatedYes.addEventListener('change', function() {
            if (this.checked) {
               tempField.style.display = 'block';
            }
         });

         preheatedNo.addEventListener('change', function() {
            if (this.checked) {
               tempField.style.display = 'none';
               // CLEAR THE TEMPERATURE VALUE WHEN HIDING
               const tempInput = document.getElementById('wc_material_preheated_temp');
               if (tempInput) {
                  tempInput.value = '';
                  updateCartAttributes(); // UPDATE CART TO CLEAR THE VALUE
               }
            }
         });
      }
   }
});