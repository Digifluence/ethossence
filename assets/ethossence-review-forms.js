(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const WEBHOOKS = {
    loadForm: 'https://hook.us2.make.com/qlomn3r4q8lhetra9irfer8o611xppav',
    submitForm: 'https://hook.us2.make.com/al800p8lmsn9c1rmouswa6ogtsmdrgvc'
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
        
        // Disable button and show loading
        button.disabled = true;
        button.innerHTML = 'Saving...';
        
        try {
          // Update cart attributes first
          await this.updateCartAttributes();
          
          // Get current cart data
          const cartResponse = await fetch('/cart.js');
          const cartData = await cartResponse.json();
          
          // Remove attributes from cart data to avoid duplication
          const { attributes, ...cartWithoutAttributes } = cartData;
          
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
          
          // Send to Make webhook
          const webhookResponse = await fetch(WEBHOOKS.submitForm, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });
          
          if (webhookResponse.ok) {
            this.showMessage(messageDiv, 'Review request submitted successfully!', 'success');
          } else {
            throw new Error('Failed to save cart');
          }
          
        } catch (error) {
          console.error('Error saving cart:', error);
          this.showMessage(messageDiv, 'Failed to save cart. Please try again.', 'error');
        } finally {
          // Re-enable button
          button.disabled = false;
          button.innerHTML = originalText;
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
    
    showMessage(messageDiv, text, type) {
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
  }

  // ============================================================================
  // INITIALIZE FUNCTION - CALLED FROM SECTION WITH CONFIGURATION
  // ============================================================================
  window.initEthossenceReviewForms = function(config) {
    new EthossenceReviewController(config);
  };

})();