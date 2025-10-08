// ============================================================================
// ETHOSSENCE Request Review Feature
// Version: 18.0
// ============================================================================

(function() {
  'use strict';
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const WEBHOOKS = {
    loadForm: 'https://hook.us2.make.com/qlomn3r4q8lhetra9irfer8o611xppav',
    submitAccountCreation: 'https://hook.us2.make.com/weeau8ogy96lpvkl4d8wlnfm5warbaer',
    submitCartReview: 'https://hook.us2.make.com/al800p8lmsn9c1rmouswa6ogtsmdrgvc'
  };

  const SHOPIFY_GRAPHQL_VERSION = '2025-07';

  // ============================================================================
  // MAIN CONTROLLER - HANDLES BOTH GUEST AND CUSTOMER FORMS
  // ============================================================================
  class EthossenceReviewController {
    constructor(config) {
      this.animationType = config.animationType || 'slide_down';
      this.isCustomer = config.isCustomer || false;
      
      // Get elements
      this.trigger = document.getElementById('review-form-trigger');
      this.signinLink = document.getElementById('sign-in-link');
      this.container = document.getElementById('dynamic-content-container');
      
      // Animation-specific elements
      if (this.animationType === 'slide_down') {
        this.formContainer = document.getElementById('review-form-dropdown');
        this.closeBtn = document.getElementById('close-form-dropdown');
      } else {
        this.formContainer = document.getElementById('review-form-drawer');
        this.overlay = document.getElementById('review-form-overlay');
        this.closeBtn = document.getElementById('close-form-drawer');
      }
      
      this.formLoaded = false;
      
      console.log('EthossenceReviewController initialized', {
        animationType: this.animationType,
        isCustomer: this.isCustomer
      });
      
      this.init();
    }
    
    init() {
      // Trigger button opens form and loads content
      if (this.trigger) {
        this.trigger.addEventListener('click', () => this.openAndLoadForm());
      }
      
      // Close button
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }
      
      // Overlay click (drawer only)
      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
      }
      
      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }
    
    getCustomerData() {
      if (!this.container) return {};
      
      const isCustomer = this.container.dataset.isCustomer === 'true';
      
      return {
        isCustomer: isCustomer,
        customerId: isCustomer ? this.container.dataset.customerId : null,
        customerEmail: isCustomer ? this.container.dataset.customerEmail : null,
        metaobjectType: isCustomer ? 'customer_projects' : 'company_profile'
      };
    }
    
    async openAndLoadForm() {
      // Open the UI
      this.open();
      
      // Load form content if not already loaded
      if (!this.formLoaded) {
        await this.loadDynamicContent();
      }
    }
    
    open() {
      if (this.animationType === 'slide_down') {
        if (this.formContainer) {
          this.formContainer.classList.add('form-dropdown--active');
        }
        if (this.trigger) {
          this.trigger.classList.add('hidden');
        }
        if (this.signinLink) {
          this.signinLink.classList.add('hidden');
        }
      } else {
        if (this.formContainer) {
          this.formContainer.classList.add('drawer--active');
        }
        if (this.overlay) {
          this.overlay.classList.add('drawer__overlay--active');
        }
        document.body.classList.add('drawer-open');
      }
    }
    
    close() {
      if (this.animationType === 'slide_down') {
        if (this.formContainer) {
          this.formContainer.classList.remove('form-dropdown--active');
        }
        if (this.trigger) {
          this.trigger.classList.remove('hidden');
        }
        if (this.signinLink) {
          this.signinLink.classList.remove('hidden');
        }
      } else {
        if (this.formContainer) {
          this.formContainer.classList.remove('drawer--active');
        }
        if (this.overlay) {
          this.overlay.classList.remove('drawer__overlay--active');
        }
        document.body.classList.remove('drawer-open');
      }
    }
    
    async loadDynamicContent() {
      if (!this.container) {
        console.error('Dynamic content container not found');
        return;
      }
      
      const customerData = this.getCustomerData();
      
      try {
        // Get cart data using Shopify Ajax API
        const cartResponse = await fetch('/cart.js');
        const cartData = await cartResponse.json();
        
        // Transform cart attributes into array of objects
        const formattedAttributes = [];
        
        if (cartData.attributes) {
          for (const [name, value] of Object.entries(cartData.attributes)) {
            formattedAttributes.push({
              name: name,
              value: value
            });
          }
        }
        
        // Prepare request data for Make webhook
        const requestData = {
          pageUrl: window.location.href,
          shopDomain: Shopify.shop || '',
          timestamp: new Date().toISOString(),
          shopifyGraphQLVersion: SHOPIFY_GRAPHQL_VERSION,
          
          // Customer information
          isCustomer: customerData.isCustomer,
          customerId: customerData.customerId,
          customerEmail: customerData.customerEmail,
          metaobjectType: customerData.metaobjectType,
          
          // Cart data
          cart: {
            attributes: cartData.attributes || {},
            formattedAttributes: formattedAttributes,
            itemCount: cartData.item_count,
            totalPrice: cartData.total_price,
            currency: cartData.currency
          }
        };
        
        console.log('Loading dynamic form for:', customerData.metaobjectType);
        
        // Fetch HTML from Make webhook
        const response = await fetch(WEBHOOKS.loadForm, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get HTML content and insert into container
        const htmlContent = await response.text();
        this.container.innerHTML = htmlContent;
        
        this.formLoaded = true;
        
        // After loading dynamic content, initialize form handlers
        this.initializeFormHandlers();
        
      } catch (error) {
        console.error('Error loading dynamic content:', error);
        this.container.innerHTML = '<div class="error-message">Failed to load content. Please try again later.</div>';
      }
    }
    
    initializeFormHandlers() {
      const attributeFields = document.querySelectorAll('.cart-attribute');
      
      console.log('Found', attributeFields.length, 'cart attribute fields');
      
      // Setup conditional field display
      this.setupConditionalFields();
      
      // Setup "Other" field conditional logic
      this.setupOtherFieldLogic();
      
      // Setup "Reseller" field conditional logic
      this.setupResellerFieldLogic();
      
      // Auto-save cart attributes when they change
      attributeFields.forEach(field => {
        if (!field || !field.name) return;
        
        field.addEventListener('change', () => {
          this.updateCartAttributes();
        });
        
        // For text inputs and textareas, save on blur
        if (field.type === 'text' || field.tagName.toLowerCase() === 'textarea') {
          field.addEventListener('blur', () => {
            this.updateCartAttributes();
          });
        }
      });
      
      // Setup submit button handler
      this.setupSubmitButton();
    }
    
    async updateCartAttributes() {
      const formData = new FormData();
      
      // Re-query attribute fields in case DOM has changed
      const currentAttributeFields = document.querySelectorAll('.cart-attribute');
      
      currentAttributeFields.forEach(field => {
        if (!field || !field.name) return;
        
        if (field.type === 'checkbox') {
          formData.append(field.name, field.checked ? field.value : '');
        } else if (field.type === 'radio') {
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
    
    setupConditionalFields() {
      const preheatedYes = document.getElementById('wc_material_preheated-true');
      const preheatedNo = document.getElementById('wc_material_preheated-false');
      const tempField = document.getElementById('wc_material_preheated_temp');

      if (preheatedYes && preheatedNo && tempField) {
        const tempFieldContainer = tempField.closest('.field');
        
        preheatedYes.addEventListener('change', () => {
          if (preheatedYes.checked && tempFieldContainer) {
            tempFieldContainer.style.display = 'block';
          }
        });

        preheatedNo.addEventListener('change', () => {
          if (preheatedNo.checked && tempFieldContainer) {
            tempFieldContainer.style.display = 'none';
            if (tempField) {
              tempField.value = '';
              this.updateCartAttributes();
            }
          }
        });
        
        // Set initial state
        if (preheatedNo.checked && tempFieldContainer) {
          tempFieldContainer.style.display = 'none';
        }
      }
    }
    
    setupOtherFieldLogic() {
      // Find all select fields that might have "Other" option
      const selectFields = document.querySelectorAll('select.cart-attribute[data-metafield-key]');
      
      selectFields.forEach(selectField => {
        const metafieldKey = selectField.dataset.metafieldKey;
        if (!metafieldKey) return;
        
        // Look for corresponding "_other" field
        const otherFieldKey = metafieldKey + '_other';
        const otherField = document.querySelector(`[data-metafield-key="${otherFieldKey}"]`);
        
        if (otherField) {
          const otherFieldContainer = otherField.closest('.field');
          
          // Function to show/hide other field based on selection
          const toggleOtherField = () => {
            const selectedValue = selectField.value;
            
            if (selectedValue && selectedValue.toLowerCase() === 'other') {
              // Show the other field
              if (otherFieldContainer) {
                otherFieldContainer.style.display = 'block';
              }
            } else {
              // Hide the other field and clear its value
              if (otherFieldContainer) {
                otherFieldContainer.style.display = 'none';
              }
              if (otherField) {
                otherField.value = '';
                this.updateCartAttributes();
              }
            }
          };
          
          // Set up event listener
          selectField.addEventListener('change', toggleOtherField);
          
          // Set initial state on page load
          toggleOtherField();
          
          console.log(`Set up "Other" field logic for ${metafieldKey} -> ${otherFieldKey}`);
        }
      });
    }
    
    setupResellerFieldLogic() {
      // Find the business_type field
      const businessTypeField = document.querySelector('[data-metafield-key="business_type"]');
      
      if (!businessTypeField) {
        console.log('Business type field not found');
        return;
      }
      
      // Find all reseller-related fields (keys starting with business_type_reseller_)
      const resellerFields = document.querySelectorAll('[data-metafield-key^="business_type_reseller_"]');
      
      if (resellerFields.length === 0) {
        console.log('No reseller fields found');
        return;
      }
      
      // Function to show/hide reseller fields based on selection
      const toggleResellerFields = () => {
        const selectedValue = businessTypeField.value;
        const isResellerSelected = selectedValue && selectedValue.toLowerCase().includes('reseller');
        
        resellerFields.forEach(field => {
          const fieldContainer = field.closest('.field');
          
          if (isResellerSelected) {
            // Show reseller field
            if (fieldContainer) {
              fieldContainer.style.display = 'block';
            }
          } else {
            // Hide reseller field and clear its value
            if (fieldContainer) {
              fieldContainer.style.display = 'none';
            }
            if (field) {
              if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = false;
              } else {
                field.value = '';
              }
              this.updateCartAttributes();
            }
          }
        });
        
        console.log(`Reseller fields ${isResellerSelected ? 'shown' : 'hidden'} based on selection: ${selectedValue}`);
      };
      
      // Set up event listener
      businessTypeField.addEventListener('change', toggleResellerFields);
      
      // Set initial state on page load
      toggleResellerFields();
      
      console.log(`Set up reseller field logic for business_type (found ${resellerFields.length} reseller fields)`);
    }
    
    setupSubmitButton() {
      const saveCartBtn = document.getElementById('save-cart-draft');
      const messageDiv = document.getElementById('save-cart-message');
      
      if (!saveCartBtn) {
        console.log('Submit button not found in dynamic content');
        return;
      }
      
      saveCartBtn.addEventListener('click', async () => {
        const button = saveCartBtn;
        const originalText = button.innerHTML;
        const customerData = this.getCustomerData();
        
        // Clear any existing error messages
        if (messageDiv) {
          messageDiv.style.display = 'none';
          messageDiv.innerHTML = '';
        }
        
        // Validate form before submission
        if (!customerData.isCustomer) {
          // For guests, validate required account creation fields
          const validationResult = this.validateAccountCreationForm(messageDiv);
          if (!validationResult.isValid) {
            return; // Stop submission if validation fails
          }
        }
        
        // Disable button and show loading
        button.disabled = true;
        button.innerHTML = 'Saving...';
        
        try {
          // Update cart attributes first (if customer)
          if (customerData.isCustomer) {
            await this.updateCartAttributes();
          }
          
          // Get current cart data
          const cartResponse = await fetch('/cart.js');
          const cartData = await cartResponse.json();
          
          // Remove attributes from cart data to avoid duplication
          const { attributes, ...cartWithoutAttributes } = cartData;
          
          // Prepare base webhook data
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
            cart: cartWithoutAttributes
          };
          
          // Add appropriate form data based on customer status
          if (customerData.isCustomer) {
            // For customers: include cart review form data
            webhookData.ethossence_review_inputs = this.collectFieldData();
          } else {
            // For guests: include account creation fields AND metaobject fields
            webhookData.account_fields = this.collectAccountCreationFields();
            webhookData.metaobject_fields = this.collectFieldData();
          }
          
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
    
    collectAccountCreationFields() {
      // Collect required fields for account creation (non-cart-attribute fields)
      const accountFields = {};
      
      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];
      
      fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          accountFields[fieldId] = field.value.trim();
        }
      });
      
      return accountFields;
    }
    
    validateAccountCreationForm(messageDiv) {
      const result = {
        isValid: true,
        errors: []
      };
      
      // Get all required fields
      const firstName = document.getElementById('firstName');
      const lastName = document.getElementById('lastName');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      const company = document.getElementById('company');
      
      // Validate firstName
      if (!firstName || !firstName.value.trim()) {
        result.isValid = false;
        result.errors.push('First name is required');
        if (firstName) this.highlightField(firstName, true);
      } else {
        if (firstName) this.highlightField(firstName, false);
      }
      
      // Validate lastName
      if (!lastName || !lastName.value.trim()) {
        result.isValid = false;
        result.errors.push('Last name is required');
        if (lastName) this.highlightField(lastName, true);
      } else {
        if (lastName) this.highlightField(lastName, false);
      }
      
      // Validate email
      if (!email || !email.value.trim()) {
        result.isValid = false;
        result.errors.push('Email is required');
        if (email) this.highlightField(email, true);
      } else if (!this.isValidEmail(email.value.trim())) {
        result.isValid = false;
        result.errors.push('Please enter a valid email address');
        if (email) this.highlightField(email, true);
      } else {
        if (email) this.highlightField(email, false);
      }
      
      // Validate phone (optional but if provided must be valid)
      if (phone && phone.value.trim()) {
        const phoneDigits = phone.value.replace(/\D/g, '');
        if (phoneDigits.length !== 11) {
          result.isValid = false;
          result.errors.push('Phone number must include country code (11 digits total)');
          this.highlightField(phone, true);
        } else {
          this.highlightField(phone, false);
        }
      }
      
      // Validate company
      if (!company || !company.value.trim()) {
        result.isValid = false;
        result.errors.push('Company name is required');
        if (company) this.highlightField(company, true);
      } else {
        if (company) this.highlightField(company, false);
      }
      
      // Country is now optional - no validation needed
      
      // Display errors if validation failed
      if (!result.isValid) {
        const errorMessage = '<strong>Please correct the following:</strong><br>' + 
                           result.errors.map(err => '• ' + err).join('<br>');
        this.showMessage(messageDiv, errorMessage, 'error', true);
      }
      
      return result;
    }
    
    isValidEmail(email) {
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
    
    highlightField(field, hasError) {
      if (hasError) {
        field.classList.add('field--error');
        field.setAttribute('aria-invalid', 'true');
      } else {
        field.classList.remove('field--error');
        field.removeAttribute('aria-invalid');
      }
    }
    
    collectFieldData() {
      const fieldData = [];
      const reviewRequestFields = document.querySelectorAll('#review-request-fields .cart-attribute, #dynamic-content-container .cart-attribute');
      
      // Account creation field IDs that should be excluded from metaobject fields
      const accountFieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];
      
      reviewRequestFields.forEach(field => {
        if (!field || !field.name) return;
        
        // Skip account creation fields - they go in account_fields instead
        if (accountFieldIds.includes(field.id)) {
          return;
        }
        
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
          
          // Add metafield key if present
          if (field.dataset.metafieldKey) {
            fieldInfo.metaobject_key = field.dataset.metafieldKey;
            
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