// ============================================================================
// ETHOSSENCE Request Review Feature
// Version: 11.0
// ============================================================================

// Prepare data for webhook
          const webhookData = {
            shopDomain: Shopify.shop,
            timestamp: new Date().toISOString(),
            shopifyGraphQLVersion: SHOPIFY_GRAPHQL_VERSION,
            currency: cartData.currency,
            
            // Customer information
            isCustomer: customerData.isCustomer,
            customerId: customerData.customerId,
            customerEmail: customerData.customerEmail,
            metaobjectType: customerData.metaobjectType,
            
            // Cart data
            cart: cartWithoutAttributes,
            
            // Structured form data
            ethossence_review_inputs: this.collectFieldData()
          };
          
          console.log('Submitting review request for:', customerData.metaobjectType);
          
          // Determine which webhook to use based on customer status
          const submitWebhook = customerData.isCustomer 
            ? WEBHOOKS.submitCartReview 
            : WEBHOOKS.submitAccountCreation;
          
          console.log('Using webhook:', customerData.isCustomer ? 'submitCartReview' : 'submitAccountCreation');
          
          // Send to appropriate Make webhook
          const webhookResponse = await fetch(submitWebhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });
          
          if (webhookResponse.ok) {
            const successMessage = customerData.isCustomer 
              ? 'Review request submitted successfully!' 
              : 'Account created successfully! Check your email for login instructions.';
            this.showMessage(messageDiv, successMessage, 'success');
            
            // Optionally clear form on success
            if (!customerData.isCustomer) {
              // Clear account creation form fields
              this.clearAccountForm();
            }
          } else {
            // Handle error response
            const errorData = await webhookResponse.text();
            this.handleSubmissionError(messageDiv, errorData, customerData.isCustomer);
          }
          
        } catch (error) {
          console.error('Error submitting form:', error);
          this.showMessage(messageDiv, 'An unexpected error occurred. Please try again.', 'error');
        } finally {
          // Re-enable button
          button.disabled = false;
          button.innerHTML = originalText;
        }
      });
    }
    
    handleSubmissionError(messageDiv, errorText, isCustomer) {
      let errorMessage = '';
      
      // Try to parse error text to identify specific issues
      const lowerError = errorText.toLowerCase();
      
      // Check for required field errors
      if (lowerError.includes('name, phone number, or email') || 
          lowerError.includes('must be present') ||
          (lowerError.includes('name') && lowerError.includes('email') && lowerError.includes('phone'))) {
        errorMessage = 'Please fill in all required fields (name, email, phone number) and try again.';
      }
      // Check for email already exists
      else if (lowerError.includes('email') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This email address is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use a different email address.';
      }
      // Check for phone already exists
      else if (lowerError.includes('phone') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This phone number is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use a different phone number.';
      }
      // Check for both email and phone exist
      else if (lowerError.includes('email') && lowerError.includes('phone') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This email address and/or phone number is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use different contact information.';
      }
      // Check for invalid email format
      else if (lowerError.includes('invalid email') || lowerError.includes('email format')) {
        errorMessage = 'Please enter a valid email address.';
      }
      // Check for invalid phone format
      else if (lowerError.includes('invalid phone') || lowerError.includes('phone format')) {
        errorMessage = 'Please enter a valid phone number with country code (11 digits).';
      }
      // Generic errors based on context
      else if (isCustomer) {
        errorMessage = 'Failed to submit review request. Please try again or contact support if the issue persists.';
      } else {
        // Extract any error details from the response
        if (errorText.includes('Error(s):')) {
          // Parse and clean up the error message
          errorMessage = 'Failed to create account. ' + errorText.replace(/\n/g, '<br>') + '<br><br>If you already have an account, <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">please log in</a>.';
        } else {
          errorMessage = 'Failed to create account. Please check your information and try again. If you already have an account, <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">please log in</a>.';
        }
      }
      
      this.showMessage(messageDiv, errorMessage, 'error', true);
    }
    
    clearAccountForm() {
      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];
      
      fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = '';
        }
      });
      
      // Clear any additional dynamic fields
      const dynamicFields = document.querySelectorAll('#dynamic-content-container .cart-attribute');
      dynamicFields.forEach(field => {
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = false;
        } else {
          field.value = '';
        }
      });
    }
    
    collectFieldData() {
      const fieldData = [];
      const reviewRequestFields = document.querySelectorAll('#review-request-fields .cart-attribute, #dynamic-content-container .cart-attribute');
      
      reviewRequestFields.forEach(field => {
        if (!field || !field.name) return;
        
        let value = '';
        let shouldInclude = false;
        
        if (field.type === 'checkbox') {
          value = field.checked ? field.value : '';
          shouldInclude = true;
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
          const fieldInfo = {
            id: field.id || '',
            name: field.name || '',
            value: value,
            type: field.type || field.tagName.toLowerCase()
          };
          
          // Add metaobject key if present
          if (field.dataset.metaobjectKey) {
            fieldInfo.metaobject_key = field.dataset.metaobjectKey;
            
            // Check if this is a list-type metafield that needs JSON formatting
            const metafieldType = field.dataset.metafieldType;
            if (metafieldType && metafieldType.startsWith('list.')) {
              // Wrap value in JSON array format for Shopify
              fieldInfo.value = JSON.stringify([value]);
              fieldInfo.metafield_type = metafieldType;
            }
          }
          
          fieldData.push(fieldInfo);
        }
      });
      
      return fieldData;
    }
    
    showMessage(messageDiv, text, type, allowHTML = false) {
      if (messageDiv) {
        if (allowHTML) {
          messageDiv.innerHTML = text;
        } else {
          messageDiv.textContent = text;
        }
        messageDiv.className = type === 'success' ? 'color-success' : 'color-error';
        messageDiv.style.display = 'block';
        
        // Add dismiss button for errors
        if (type === 'error') {
          const dismissBtn = document.createElement('button');
          dismissBtn.textContent = '✕ Dismiss';
          dismissBtn.className = 'button button--small button--secondary error-dismiss-btn';
          dismissBtn.style.cssText = 'margin-top: 1rem; cursor: pointer;';
          dismissBtn.onclick = () => {
            messageDiv.style.display = 'none';
            messageDiv.innerHTML = ''; // Clear content including dismiss button
          };
          
          // Only add dismiss button if not already present
          if (!messageDiv.querySelector('.error-dismiss-btn')) {
            messageDiv.appendChild(dismissBtn);
          }
        } else {
          // Success messages auto-hide after 5 seconds
          setTimeout(() => {
            messageDiv.style.display = 'none';
            messageDiv.innerHTML = '';
          }, 5000);
        }
      }
    }
  }

  // ============================================================================
  // INITIALIZE FUNCTION - CALLED FROM SECTION WITH CONFIGURATION
  // ============================================================================
  window.initEthossenceReviewForms = function(config) {
    new EthossenceReviewController(config);
  };

})();