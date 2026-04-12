// ============================================================================
// Review-to-Close Section
// Version: 30.0 - Refactored two-step progressive flow with Basic/Detailed toggle
// ============================================================================

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const WEBHOOKS = {
    loadForm: 'https://hook.us2.make.com/qlomn3r4q8lhetra9irfer8o611xppav',
    submitReviewRequest: 'https://hook.us2.make.com/tdx5d1og9v9114hiovsbkpz72ahb7d4t'
  };

  // ============================================================================
  // MAIN CONTROLLER
  // ============================================================================
  class ReviewToCloseController {
    constructor(config) {
      this.displayType = config.displayType || 'slide_down';
      this.expandStatus = config.expandStatus || 'by_default';
      this.contactDefaultMode = config.contactDefaultMode || 'basic';
      this.isCustomer = config.isCustomer || false;

      // Step state
      this.currentStep = 1;
      this.hasProjectFields = false;

      // Detailed fields state
      this.detailedLoaded = false;
      this.detailedVisible = false;

      // Track selected project context
      this.selectedProjectHandle = null;
      this.isNewProject = true;
      this.originalProjectData = null;

      // Track original basic contact field values (for signed-in customers)
      this.originalBasicData = null;

      // Get elements
      this.formContent = document.getElementById('review-form-content');
      this.ctaButton = document.getElementById('review-form-cta');
      this.leadInText = document.querySelector('.request-review__lead-in');

      // Step containers
      this.step1Form = document.getElementById('step-1-form');
      this.step1Summary = document.getElementById('step-1-summary');
      this.step2Form = document.getElementById('step-2-form');
      this.stepIndicator = document.getElementById('step-indicator-text');

      // Detailed containers (split from webhook)
      this.detailedContactContainer = document.getElementById('detailed-contact-container');
      this.projectFieldsContainer = document.getElementById('project-fields-container');

      // Buttons
      this.nextBtn = document.getElementById('btn-next-step');
      this.skipBtn = document.getElementById('btn-skip-submit');
      this.editBtn = document.getElementById('btn-edit-step1');
      this.submitBtn = document.getElementById('save-cart-draft');
      this.step1MessageDiv = document.getElementById('step-1-message');
      this.messageDiv = document.getElementById('save-cart-message');

      // Summary
      this.summaryDetails = document.getElementById('summary-details');

      // Mode radios
      this.modeRadios = document.querySelectorAll('input[name="form_detail_level"]');

      // Animation-specific elements (only for on_button_click expand status)
      if (this.expandStatus === 'on_button_click') {
        if (this.displayType === 'slide_down') {
          this.formContainer = document.getElementById('review-form-dropdown');
          this.closeBtn = document.getElementById('close-form-dropdown');
        } else {
          this.formContainer = document.getElementById('review-form-drawer');
          this.overlay = document.getElementById('review-form-overlay');
          this.closeBtn = document.getElementById('close-form-drawer');
        }
      }

      console.log('ReviewToCloseController initialized', {
        displayType: this.displayType,
        expandStatus: this.expandStatus,
        contactDefaultMode: this.contactDefaultMode,
        isCustomer: this.isCustomer
      });

      this.init();
    }

    init() {
      // Radio toggle handler (basic mode only)
      if (this.contactDefaultMode === 'basic' && this.modeRadios.length > 0) {
        this.modeRadios.forEach(radio => {
          radio.addEventListener('change', (e) => this.handleModeSwitch(e.target.value));
        });
      }

      // CTA button handler (on_button_click expand status only)
      if (this.expandStatus === 'on_button_click' && this.ctaButton) {
        this.ctaButton.addEventListener('click', () => this.openForm());
      }

      // Close button / overlay / Escape (on_button_click expand status only)
      if (this.expandStatus === 'on_button_click') {
        if (this.closeBtn) {
          this.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.overlay) {
          this.overlay.addEventListener('click', () => this.close());
        }
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') this.close();
        });
      }

      // Tooltip
      this.initTooltip();

      // Country "Other" field toggle
      this.setupCountryOtherLogic();

      // Switch account: logout then redirect back with sign-in trigger
      const switchAccountLink = document.getElementById('switch-account-link');
      if (switchAccountLink) {
        switchAccountLink.addEventListener('click', (e) => {
          e.preventDefault();
          const returnUrl = window.location.pathname + '?shop_sign_in=true';
          fetch('/account/logout', { method: 'GET', credentials: 'same-origin' }).finally(() => {
            window.location.href = returnUrl;
          });
        });
      }

      // Step navigation buttons
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.handleNextStep());
      }
      if (this.skipBtn) {
        this.skipBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSkipSubmit();
        });
      }
      if (this.editBtn) {
        this.editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.goToStep1();
        });
      }

      // Submit button (Step 2)
      this.setupSubmitButton();

      // Snapshot basic fields for signed-in customers (change detection at submit)
      if (this.isCustomer) {
        this.snapshotBasicFields();
      }

      // Auto-initialize based on mode and customer status
      this.autoInitialize();
    }

    // ========================================================================
    // SECTION DISPLAY
    // ========================================================================

    openForm() {
      // Hide the entire pre-expand area (heading, text, CTA button)
      if (this.leadInText) {
        this.leadInText.style.display = 'none';
      }

      // Show form content
      if (this.formContent) {
        this.formContent.style.display = '';
      }

      // Open animation
      this.open();

      // Load detailed fields if needed
      if (this.contactDefaultMode === 'detailed' && !this.detailedLoaded) {
        this.loadDynamicContent();
      } else if (this.contactDefaultMode === 'basic') {
        const checkedRadio = document.querySelector('input[name="form_detail_level"]:checked');
        if (checkedRadio && checkedRadio.value === 'detailed' && !this.detailedLoaded) {
          this.loadDynamicContent();
        }
      }
    }

    open() {
      if (this.displayType === 'slide_down') {
        if (this.formContainer) {
          this.formContainer.classList.add('form-dropdown--active');
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
      if (this.displayType === 'slide_down') {
        if (this.formContainer) {
          this.formContainer.classList.remove('form-dropdown--active');
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

      // Restore the pre-expand area
      if (this.ctaButton) {
        this.ctaButton.style.display = '';
      }
      if (this.leadInText) {
        this.leadInText.style.display = '';
      }
    }

    // ========================================================================
    // FORM LOGIC
    // ========================================================================

    autoInitialize() {
      // In on_button_click mode, auto-expand if returning from sign-in
      if (this.expandStatus === 'on_button_click') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('shop_sign_in') === 'true') {
          this.openForm();
        }
        return;
      }

      // detailed mode: always load detailed fields
      if (this.contactDefaultMode === 'detailed') {
        this.loadDynamicContent();
        return;
      }

      // basic mode: signed-in customers default to Detailed
      if (this.contactDefaultMode === 'basic' && this.isCustomer) {
        this.loadDynamicContent();
        return;
      }

      // Anonymous visitors in basic mode: Basic fields already visible, nothing to load
    }

    handleModeSwitch(mode) {
      if (mode === 'detailed') {
        if (!this.detailedLoaded) {
          this.loadDynamicContent();
        } else {
          this.expandDetailedFields();
        }
        this.detailedVisible = true;
      } else {
        // mode === 'basic'
        this.collapseDetailedFields();
        this.detailedVisible = false;
      }
    }

    expandDetailedFields() {
      if (!this.detailedContactContainer) return;

      // Measure the full height
      this.detailedContactContainer.style.height = 'auto';
      this.detailedContactContainer.style.overflow = 'visible';
      const fullHeight = this.detailedContactContainer.scrollHeight + 'px';

      // Set to 0 and force reflow
      this.detailedContactContainer.style.height = '0px';
      this.detailedContactContainer.style.overflow = 'hidden';
      this.detailedContactContainer.offsetHeight; // force reflow

      // Animate to full height
      this.detailedContactContainer.style.height = fullHeight;

      const onTransitionEnd = () => {
        this.detailedContactContainer.style.height = 'auto';
        this.detailedContactContainer.style.overflow = 'visible';
        this.detailedContactContainer.removeEventListener('transitionend', onTransitionEnd);
      };
      this.detailedContactContainer.addEventListener('transitionend', onTransitionEnd);
    }

    collapseDetailedFields() {
      if (!this.detailedContactContainer) return;

      // Set explicit height for transition start
      const currentHeight = this.detailedContactContainer.scrollHeight + 'px';
      this.detailedContactContainer.style.height = currentHeight;
      this.detailedContactContainer.style.overflow = 'hidden';
      this.detailedContactContainer.offsetHeight; // force reflow

      // Animate to 0
      this.detailedContactContainer.style.height = '0px';
    }

    handleNextStep() {
      // Validate Step 1 fields
      const validationResult = this.validateAccountCreationForm(this.step1MessageDiv);
      if (!validationResult.isValid) {
        return;
      }

      // Clear any previous validation messages
      if (this.step1MessageDiv) {
        this.step1MessageDiv.style.display = 'none';
        this.step1MessageDiv.innerHTML = '';
      }

      // If webhook not loaded yet (Basic mode, no detailed fields), load now for project fields
      if (!this.detailedLoaded) {
        // expandContactFields=false: don't animate contact fields open; user is in Basic mode
        this.loadDynamicContent(() => {
          // Callback after load completes
          if (this.hasProjectFields) {
            this.goToStep2();
          } else {
            // No project fields returned — submit directly (single-step form)
            this.handleSingleStepSubmit();
          }
        }, false);
        return;
      }

      // Webhook already loaded
      if (this.hasProjectFields) {
        this.goToStep2();
      } else {
        this.handleSingleStepSubmit();
      }
    }

    handleSkipSubmit() {
      // Validate Step 1 fields
      const validationResult = this.validateAccountCreationForm(this.step1MessageDiv);
      if (!validationResult.isValid) {
        return;
      }

      // Clear any previous messages
      if (this.step1MessageDiv) {
        this.step1MessageDiv.style.display = 'none';
        this.step1MessageDiv.innerHTML = '';
      }

      // Submit with contact data only (skip project details)
      this.submitForm({ skipProjectDetails: true });
    }

    handleSingleStepSubmit() {
      // No project fields available — submit with contact data only
      this.submitForm({ skipProjectDetails: true });
    }

    goToStep2() {
      // Update step indicator
      if (this.stepIndicator) {
        this.stepIndicator.textContent = 'Step 2 of 2';
      }

      // Build and show summary card
      this.buildSummaryCard();

      // Collapse Step 1 form, show summary
      if (this.step1Form) {
        this.step1Form.style.display = 'none';
        this.step1Form.classList.remove('request-review__step--active');
      }
      if (this.step1Summary) {
        this.step1Summary.style.display = '';
      }

      // Show Step 2
      if (this.step2Form) {
        this.step2Form.style.display = '';
        this.step2Form.classList.add('request-review__step--active');
      }

      // Initialize project field handlers if not already done
      this.initializeProjectFieldHandlers();

      this.currentStep = 2;

      // Focus management: move focus to Step 2 heading or first field
      if (this.projectFieldsContainer) {
        const firstField = this.projectFieldsContainer.querySelector('input, select, textarea');
        if (firstField) {
          firstField.focus();
        }
      }
    }

    goToStep1() {
      // Update step indicator
      if (this.stepIndicator) {
        this.stepIndicator.textContent = 'Step 1 of 2';
      }

      // Hide summary, show Step 1 form
      if (this.step1Summary) {
        this.step1Summary.style.display = 'none';
      }
      if (this.step1Form) {
        this.step1Form.style.display = '';
        this.step1Form.classList.add('request-review__step--active');
      }

      // Hide Step 2
      if (this.step2Form) {
        this.step2Form.style.display = 'none';
        this.step2Form.classList.remove('request-review__step--active');
      }

      this.currentStep = 1;

      // Focus management: move focus to first field in Step 1
      const firstField = document.getElementById('firstName');
      if (firstField) {
        firstField.focus();
      }
    }

    buildSummaryCard() {
      if (!this.summaryDetails) return;

      const firstName = (document.getElementById('firstName')?.value || '').trim();
      const lastName = (document.getElementById('lastName')?.value || '').trim();
      const email = (document.getElementById('email')?.value || '').trim();
      const company = (document.getElementById('company')?.value || '').trim();

      const parts = [];
      if (firstName || lastName) parts.push(`${firstName} ${lastName}`.trim());
      if (email) parts.push(email);
      if (company) parts.push(company);

      this.summaryDetails.textContent = parts.join('  |  ');
    }

    getCustomerData() {
      if (!this.formContent) return {};

      const isCustomer = this.formContent.dataset.isCustomer === 'true';

      return {
        isCustomer: isCustomer,
        customerId: isCustomer ? this.formContent.dataset.customerId : null,
        customerEmail: isCustomer ? this.formContent.dataset.customerEmail : null,
        metaobjectType: isCustomer ? 'customer_projects' : 'company_profile'
      };
    }

    async loadDynamicContent(callback, expandContactFields = true) {
      // If already loaded, expand contact fields (if requested) and invoke callback
      if (this.detailedLoaded) {
        if (expandContactFields) {
          this.expandDetailedFields();
          this.detailedVisible = true;
        }
        if (callback) callback();
        return;
      }

      if (!this.detailedContactContainer) {
        console.error('Detailed contact container not found');
        return;
      }

      // Show spinner in contact container
      const contactSpinner = this.detailedContactContainer.querySelector('.loading-spinner');
      if (contactSpinner) contactSpinner.style.display = 'block';

      // Temporarily show container for spinner visibility
      this.detailedContactContainer.style.height = 'auto';
      this.detailedContactContainer.style.overflow = 'visible';

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
          // Customer information
          isCustomer: customerData.isCustomer === true,
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

        // Get HTML content and split into contact + project sections
        const htmlContent = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Extract contact fields and project fields by ID
        const webhookContactFields = tempDiv.querySelector('#webhook-contact-fields');
        const webhookProjectFields = tempDiv.querySelector('#webhook-project-fields');

        // Inject contact fields into Step 1 detailed container
        if (webhookContactFields) {
          this.detailedContactContainer.innerHTML = webhookContactFields.innerHTML;
          this.reExecuteScripts(this.detailedContactContainer);
        } else {
          // Fallback: if webhook doesn't use the new format, inject everything into contact container
          this.detailedContactContainer.innerHTML = htmlContent;
          this.reExecuteScripts(this.detailedContactContainer);
        }

        // Inject project fields into Step 2 container
        if (webhookProjectFields) {
          this.projectFieldsContainer.innerHTML = webhookProjectFields.innerHTML;
          this.reExecuteScripts(this.projectFieldsContainer);
          this.hasProjectFields = true;

          // Rename the Enter New Project legend to Project Details
          const projectNewLegend = this.projectFieldsContainer.querySelector('#project-new legend');
          if (projectNewLegend) projectNewLegend.textContent = 'Project Details';

          // For non-customers the webhook HTML hides containers via inline display:none
          // (the customer dropdown logic normally reveals them — that logic doesn't run here).
          // Unhide all direct-child containers so fields are visible in Step 2.
          if (!this.isCustomer) {
            Array.from(this.projectFieldsContainer.children).forEach(child => {
              if (child.style.display === 'none') {
                child.style.removeProperty('display');
              }
            });
          }
        } else {
          this.hasProjectFields = false;
          // Hide Next button and step indicator if no project fields
          this.updateUIForSingleStep();
        }

        // Execute any root-level scripts in the webhook response that sit outside
        // #webhook-contact-fields and #webhook-project-fields (e.g. window.customerProjects)
        Array.from(tempDiv.children).forEach(child => {
          if (child.tagName && child.tagName.toLowerCase() === 'script') {
            const newScript = document.createElement('script');
            newScript.textContent = child.textContent;
            Array.from(child.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            document.head.appendChild(newScript);
            console.log('Executed root-level webhook script');
          }
        });

        // Verify window.customerProjects was created
        if (window.customerProjects) {
          console.log('window.customerProjects created with', Object.keys(window.customerProjects).length, 'projects');
        } else {
          console.warn('window.customerProjects still undefined after script execution');
        }

        this.detailedLoaded = true;

        if (expandContactFields) {
          this.detailedVisible = true;

          // Animate expand: reset to 0 then expand
          this.detailedContactContainer.style.height = '0px';
          this.detailedContactContainer.style.overflow = 'hidden';
          this.detailedContactContainer.offsetHeight; // force reflow
          this.expandDetailedFields();
        }
        // If not expanding (e.g. Next-step trigger in Basic mode), leave container collapsed

        // Initialize contact field form handlers
        this.initializeContactFieldHandlers();

        // Pre-populate detailed contact fields from window.customerDetailed
        this.populateDetailedContactFields();

        if (callback) callback();

      } catch (error) {
        console.error('Error loading dynamic content:', error);
        this.detailedContactContainer.innerHTML = '<div class="error-message">Failed to load content. Please try again later.</div>';
        // Reset container to visible so error is shown
        this.detailedContactContainer.style.height = 'auto';
        this.detailedContactContainer.style.overflow = 'visible';
      }
    }

    updateUIForSingleStep() {
      // No project fields — hide step indicator, convert Next to Submit, hide skip link
      if (this.stepIndicator) {
        this.stepIndicator.parentElement.style.display = 'none';
      }

      // Change Next button to Submit
      if (this.nextBtn) {
        this.nextBtn.textContent = this.isCustomer ? 'Submit Review Request' : 'Create Account & Submit';
        this.nextBtn.removeEventListener('click', this._nextHandler);
        this.nextBtn.addEventListener('click', () => {
          const validationResult = this.validateAccountCreationForm(this.step1MessageDiv);
          if (validationResult.isValid) {
            this.submitForm({ skipProjectDetails: true });
          }
        });
      }
    }

    initializeContactFieldHandlers() {
      const attributeFields = this.detailedContactContainer.querySelectorAll('.cart-attribute');

      console.log('Found', attributeFields.length, 'cart attribute fields in contact section');

      // Setup conditional field display
      this.setupConditionalFields();

      // Setup "Other" field conditional logic (for webhook fields)
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
    }

    populateDetailedContactFields() {
      if (!window.customerDetailed) {
        console.log('window.customerDetailed not present — skipping pre-population');
        return;
      }

      // Only one entry exists; get its data regardless of the key
      const customerData = Object.values(window.customerDetailed)[0];
      if (!customerData) return;

      console.log('Pre-populating detailed contact fields from window.customerDetailed');

      const container = this.detailedContactContainer;

      for (const [fieldKey, fieldValue] of Object.entries(customerData)) {
        // Skip empty values — don't overwrite placeholder/blank state
        if (fieldValue === '' || fieldValue === null || fieldValue === undefined) continue;

        const field = container.querySelector(`[data-metafield-key="${fieldKey}"]`)
                   || container.querySelector(`[name="properties[${fieldKey}]"]`)
                   || container.querySelector(`[name="${fieldKey}"]`)
                   || container.querySelector(`#${fieldKey}`);

        if (!field) {
          console.warn(`populateDetailedContactFields: no field found for key "${fieldKey}"`);
          continue;
        }

        if (field.type === 'checkbox') {
          field.checked = fieldValue === 'true' || fieldValue === true;
        } else if (field.type === 'radio') {
          container.querySelectorAll(
            `[data-metafield-key="${fieldKey}"], [name="properties[${fieldKey}]"], [name="${fieldKey}"]`
          ).forEach(radio => {
            if (radio.value === fieldValue) radio.checked = true;
          });
        } else if (field.tagName.toLowerCase() === 'select') {
          field.value = fieldValue;
          // Trigger change so dependent "Other" fields respond
          field.dispatchEvent(new Event('change'));
        } else {
          field.value = fieldValue;
        }
      }

      // Re-run conditional logic now that values are set
      this.setupConditionalFields();
      this.setupOtherFieldLogic();
      this.setupResellerFieldLogic();

      // Snapshot custom fields for change detection at submit
      if (this.isCustomer) {
        this.snapshotCustomFields();
      }
    }

    initializeProjectFieldHandlers() {
      if (this._projectHandlersInitialized) return;
      this._projectHandlersInitialized = true;

      const attributeFields = this.projectFieldsContainer.querySelectorAll('.cart-attribute');

      console.log('Found', attributeFields.length, 'cart attribute fields in project section');

      if (this.isCustomer) {
        // Customers: setup dropdown to select/create a project
        this.setupCustomerProjectsLogic();
      } else {
        // Non-customers: ensure all project field containers are visible
        // (inline display:none is set by the webhook for dropdown-driven customer flow)
        Array.from(this.projectFieldsContainer.children).forEach(child => {
          if (child.style.display === 'none') {
            child.style.removeProperty('display');
          }
        });
      }

      // Auto-save cart attributes when they change
      attributeFields.forEach(field => {
        if (!field || !field.name) return;

        field.addEventListener('change', () => {
          this.updateCartAttributes();
        });

        if (field.type === 'text' || field.tagName.toLowerCase() === 'textarea') {
          field.addEventListener('blur', () => {
            this.updateCartAttributes();
          });
        }
      });
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

          const toggleOtherField = () => {
            const selectedValue = selectField.value;

            if (selectedValue && selectedValue.toLowerCase() === 'other') {
              if (otherFieldContainer) {
                otherFieldContainer.style.display = 'block';
              }
            } else {
              if (otherFieldContainer) {
                otherFieldContainer.style.display = 'none';
              }
              if (otherField) {
                otherField.value = '';
                this.updateCartAttributes();
              }
            }
          };

          selectField.addEventListener('change', toggleOtherField);
          toggleOtherField();
        }
      });
    }

    setupResellerFieldLogic() {
      const businessTypeField = document.querySelector('[data-metafield-key="business_type"]');
      if (!businessTypeField) return;

      const resellerFields = document.querySelectorAll('[data-metafield-key^="business_type_reseller_"]');
      if (resellerFields.length === 0) return;

      const toggleResellerFields = () => {
        const selectedValue = businessTypeField.value;
        const isResellerSelected = selectedValue && selectedValue.toLowerCase().includes('reseller');

        resellerFields.forEach(field => {
          const fieldContainer = field.closest('.field');

          if (isResellerSelected) {
            if (fieldContainer) {
              fieldContainer.style.display = 'block';
            }
          } else {
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
      };

      businessTypeField.addEventListener('change', toggleResellerFields);
      toggleResellerFields();
    }

    setupCustomerProjectsLogic() {
      const projectsSelect = document.getElementById('customer_projects');
      if (!projectsSelect) return;

      const projectNewContainer = document.getElementById('project-new');
      if (!projectNewContainer) return;

      if (window.customerProjects) {
        console.log('Found customer projects data:', Object.keys(window.customerProjects).length, 'projects');
      }

      const populateProjectFields = (projectData) => {
        if (!projectData) return;

        console.log('Populating project fields with keys:', Object.keys(projectData));

        for (const [fieldKey, fieldValue] of Object.entries(projectData)) {
          // Try data-metafield-key first, then Shopify cart attribute name format, then plain name/id
          const field = projectNewContainer.querySelector(`[data-metafield-key="${fieldKey}"]`)
                     || projectNewContainer.querySelector(`[name="properties[${fieldKey}]"]`)
                     || projectNewContainer.querySelector(`[name="${fieldKey}"]`)
                     || projectNewContainer.querySelector(`#${fieldKey}`);

          if (!field) {
            console.warn(`populateProjectFields: no field found for key "${fieldKey}"`);
            continue;
          }

          if (field.type === 'checkbox') {
            field.checked = fieldValue === 'true' || fieldValue === true;
          } else if (field.type === 'radio') {
            const radioGroup = projectNewContainer.querySelectorAll(
              `[data-metafield-key="${fieldKey}"], [name="properties[${fieldKey}]"], [name="${fieldKey}"]`
            );
            radioGroup.forEach(radio => {
              if (radio.value === fieldValue) radio.checked = true;
            });
          } else if (field.tagName.toLowerCase() === 'select') {
            field.value = fieldValue;
          } else {
            field.value = fieldValue;
          }
        }

        // Trigger conditional logic after population
        this.setupConditionalFields();
        this.setupOtherFieldLogic();
        this.setupResellerFieldLogic();
        this.updateCartAttributes();
      };

      const clearProjectFields = () => {
        const projectFields = document.querySelectorAll('#project-new .cart-attribute');
        projectFields.forEach(field => {
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = false;
          } else {
            field.value = '';
          }
        });
      };

      const handleProjectSelection = () => {
        const selectedValue = projectsSelect.value;

        if (!selectedValue) {
          projectNewContainer.style.display = 'none';
          if (this.submitBtn) this.submitBtn.style.display = 'none';
          clearProjectFields();
          this.isNewProject = true;
          this.selectedProjectHandle = null;
          this.originalProjectData = null;
          return;
        }

        if (selectedValue === '*new*') {
          projectNewContainer.style.display = 'block';
          if (this.submitBtn) this.submitBtn.style.display = '';
          clearProjectFields();
          this.isNewProject = true;
          this.selectedProjectHandle = null;
          this.originalProjectData = null;
        } else {
          projectNewContainer.style.display = 'block';
          if (this.submitBtn) this.submitBtn.style.display = '';

          console.log('Project selected:', selectedValue, '| window.customerProjects keys:', window.customerProjects ? Object.keys(window.customerProjects) : 'undefined');

          if (window.customerProjects && window.customerProjects[selectedValue]) {
            const projectData = window.customerProjects[selectedValue];

            this.isNewProject = false;
            this.selectedProjectHandle = selectedValue;
            this.originalProjectData = JSON.parse(JSON.stringify(projectData));

            populateProjectFields(projectData);
          } else {
            clearProjectFields();
            this.isNewProject = true;
            this.selectedProjectHandle = null;
            this.originalProjectData = null;
          }
        }
      };

      projectsSelect.addEventListener('change', handleProjectSelection);
      handleProjectSelection();
    }

    setupSubmitButton() {
      if (!this.submitBtn) return;

      this.submitBtn.addEventListener('click', async () => {
        this.submitForm({ skipProjectDetails: false });
      });
    }

    async submitForm({ skipProjectDetails }) {
      // Determine which button and message div to use based on current step
      const button = skipProjectDetails ? (this.nextBtn || this.submitBtn) : this.submitBtn;
      const messageDiv = skipProjectDetails ? this.step1MessageDiv : this.messageDiv;
      const originalText = button ? button.innerHTML : '';
      const customerData = this.getCustomerData();

      // Clear any existing messages
      if (messageDiv) {
        messageDiv.style.display = 'none';
        messageDiv.innerHTML = '';
      }

      // Disable button and show loading
      if (button) {
        button.disabled = true;
        button.innerHTML = 'Saving...';
      }

      try {
        // Update cart attributes first (if customer)
        if (customerData.isCustomer) {
          await this.updateCartAttributes();
        }

        // Get current cart data
        const cartResponse = await fetch('/cart.js');
        const cartData = await cartResponse.json();

        const { attributes, ...cartWithoutAttributes } = cartData;

        // Prepare base webhook data
        const webhookData = {
          shopDomain: Shopify.shop,
          timestamp: new Date().toISOString(),
          actionPerform: 'submitReviewRequest',
          currency: cartData.currency,
          isCustomer: customerData.isCustomer === true,
          customerId: customerData.customerId,
          customerEmail: customerData.customerEmail
        };

        // Customer basic fields — always included
        webhookData.customerBasicFields = this.collectAccountCreationFields();

        // Customer basic fields modified — populated for customers, empty for visitors
        webhookData.customerBasicFieldsModified = customerData.isCustomer
          ? this.buildModifiedBasicFields()
          : [];

        // Customer custom fields — always included
        webhookData.customerCustomFields = this.collectFieldData(this.detailedContactContainer);

        // Customer custom fields modified — populated for customers, empty for visitors
        webhookData.customerCustomFieldsModified = customerData.isCustomer
          ? this.buildModifiedCustomFields()
          : [];

        // Project context — populated for customers, defaults for visitors
        const projectContext = customerData.isCustomer
          ? this.buildProjectContext()
          : { isNewProject: true, selectedProjectHandle: null, modifiedFields: [] };

        webhookData.projectSkip = skipProjectDetails;
        webhookData.projectIsNew = projectContext.isNewProject;
        webhookData.projectSelectedHandle = projectContext.selectedProjectHandle;

        // Project fields — null values when skipped, empty array if not loaded
        if (!skipProjectDetails && this.hasProjectFields) {
          webhookData.projectFields = this.collectFieldData(this.projectFieldsContainer);
        } else if (this.hasProjectFields) {
          webhookData.projectFields = this.collectFieldData(this.projectFieldsContainer).map(field => ({
            ...field,
            value: null
          }));
        } else {
          webhookData.projectFields = [];
        }

        // Project fields modified — populated for customers, empty for visitors
        webhookData.projectFieldsModified = projectContext.modifiedFields;

        // Pre-rendered HTML tables for email templates.
        // NOT passed through makePayloadSafe() — JSON.stringify() on the fetch
        // body already handles quote/backslash escaping. Pre-escaping here
        // would produce double-escaped \" in the final email HTML.
        webhookData.companyProfileTableHtml = this.buildCompanyProfileTableHtml(
          webhookData.customerBasicFields,
          webhookData.customerCustomFields,
          webhookData.customerBasicFieldsModified,
          webhookData.customerCustomFieldsModified
        );
        webhookData.projectFieldsTableHtml = this.buildProjectFieldsTableHtml(
          skipProjectDetails,
          webhookData.projectFields,
          webhookData.projectFieldsModified
        );

        // Cart — always last
        webhookData.cart = cartWithoutAttributes;

        const submitWebhook = WEBHOOKS.submitReviewRequest;

        console.log('Submitting review request:', {
          webhook: 'submitReviewRequest',
          skipProjectDetails: skipProjectDetails,
          detailedVisible: this.detailedVisible
        });

        // Send to appropriate Make webhook
        const webhookResponse = await fetch(submitWebhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        });

        if (webhookResponse.ok) {
          let responseData;

          try {
            const responseText = await webhookResponse.text();

            if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
              responseData = JSON.parse(responseText);
            } else {
              responseData = responseText;
            }
          } catch (parseError) {
            console.warn('Failed to parse response as JSON:', parseError);
            responseData = await webhookResponse.text();
          }

          console.log('Webhook response:', responseData);

          // Check for error in response
          let hasError = false;
          let errorMessage = '';

          if (typeof responseData === 'object') {
            if (responseData.success === false ||
                responseData.error ||
                responseData.errors ||
                responseData.userErrors ||
                (responseData.data && responseData.data.userErrors && responseData.data.userErrors.length > 0)) {
              hasError = true;

              if (responseData.message) {
                errorMessage = responseData.message;
              } else if (responseData.error) {
                errorMessage = typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
              } else if (responseData.errors) {
                errorMessage = Array.isArray(responseData.errors) ? responseData.errors.join(', ') : JSON.stringify(responseData.errors);
              } else if (responseData.userErrors) {
                errorMessage = Array.isArray(responseData.userErrors)
                  ? responseData.userErrors.map(e => e.message || JSON.stringify(e)).join(', ')
                  : JSON.stringify(responseData.userErrors);
              } else if (responseData.data && responseData.data.userErrors) {
                errorMessage = responseData.data.userErrors.map(e => e.message || JSON.stringify(e)).join(', ');
              } else {
                errorMessage = 'An error occurred while processing your request.';
              }
            }
          } else if (typeof responseData === 'string') {
            const lowerResponse = responseData.toLowerCase();
            if (lowerResponse.includes('error') ||
                lowerResponse.includes('failed') ||
                lowerResponse.includes('invalid')) {
              hasError = true;
              errorMessage = responseData;
            }
          }

          if (hasError) {
            this.showMessage(messageDiv, errorMessage, 'error', true);
          } else {
            // Hide skip link, close button, and edit link on any successful submission
            if (this.skipBtn) this.skipBtn.closest('.request-review__skip-link').style.display = 'none';
            if (this.closeBtn) this.closeBtn.style.display = 'none';
            if (this.editBtn) this.editBtn.style.display = 'none';
            if (this.submitBtn) this.submitBtn.style.display = 'none';

            // Show the section-configured success message
            const successContainer = document.getElementById('review-success-message');
            if (successContainer) {
              successContainer.style.display = '';
            }

            // Hide everything below the success message
            const formHeader = document.querySelector('.request-review__form-header');
            if (formHeader) formHeader.style.display = 'none';

            const stepIndicator = document.getElementById('step-indicator');
            if (stepIndicator) stepIndicator.style.display = 'none';

            if (this.step1Form) this.step1Form.style.display = 'none';
            if (this.step1Summary) this.step1Summary.style.display = 'none';
            if (this.step2Form) this.step2Form.style.display = 'none';

            // Scroll to top of form content
            if (this.formContent) {
              this.formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        } else {
          const errorData = await webhookResponse.text();
          this.handleSubmissionError(messageDiv, errorData, customerData.isCustomer);
        }

      } catch (error) {
        console.error('Error submitting form:', error);
        this.showMessage(messageDiv, 'An unexpected error occurred. Please try again.', 'error');
      } finally {
        if (button && button.style.display !== 'none') {
          button.disabled = false;
          button.innerHTML = originalText;
        }
      }
    }

    handleSubmissionError(messageDiv, errorText, isCustomer) {
      let errorMessage = '';

      const lowerError = errorText.toLowerCase();

      if (lowerError.includes('name, phone number, or email') ||
          lowerError.includes('must be present') ||
          (lowerError.includes('name') && lowerError.includes('email') && lowerError.includes('phone'))) {
        errorMessage = 'Please fill in all required fields (name, email, phone number) and try again.';
      }
      else if (lowerError.includes('email') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This email address is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use a different email address.';
      }
      else if (lowerError.includes('phone') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This phone number is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use a different phone number.';
      }
      else if (lowerError.includes('email') && lowerError.includes('phone') && (lowerError.includes('taken') || lowerError.includes('exists') || lowerError.includes('already'))) {
        errorMessage = 'This email address and/or phone number is already registered. <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">Please log in</a> or use different contact information.';
      }
      else if (lowerError.includes('invalid email') || lowerError.includes('email format')) {
        errorMessage = 'Please enter a valid email address.';
      }
      else if ((lowerError.includes('phone') && lowerError.includes('invalid')) || lowerError.includes('phone format')) {
        errorMessage = 'Phone number format is incorrect. Please enter a valid phone number with country code (e.g. +15551234567) and try again.';
      }
      else if (isCustomer) {
        errorMessage = 'Failed to submit review request. Please try again or contact support if the issue persists.';
      } else {
        if (errorText.includes('Error(s):')) {
          errorMessage = 'Failed to create account. ' + errorText.replace(/\n/g, '<br>') + '<br><br>If you already have an account, <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">please log in</a>.';
        } else {
          errorMessage = 'Failed to create account. Please check your information and try again. If you already have an account, <a href="' + window.Shopify.routes.root + 'account/login" class="error-link">please log in</a>.';
        }
      }

      this.showMessage(messageDiv, errorMessage, 'error', true);
    }

    buildProjectContext() {
      const projectContext = {
        isNewProject: this.isNewProject,
        selectedProjectHandle: this.selectedProjectHandle,
        modifiedFields: []
      };

      if (!this.isNewProject && this.originalProjectData) {
        const currentFormData = this.getCurrentFormValues();

        for (const [key, originalValue] of Object.entries(this.originalProjectData)) {
          const currentValue = currentFormData[key];

          const normalizedOriginal = this.normalizeValue(originalValue);
          const normalizedCurrent = this.normalizeValue(currentValue);

          if (normalizedOriginal !== normalizedCurrent) {
            projectContext.modifiedFields.push({
              metaobject_key: key,
              originalValue: this.makePayloadSafe(originalValue),
              newValue: this.makePayloadSafe(currentValue || '')
            });
          }
        }

        for (const [key, currentValue] of Object.entries(currentFormData)) {
          if (!(key in this.originalProjectData)) {
            const normalizedCurrent = this.normalizeValue(currentValue);

            if (normalizedCurrent !== '') {
              projectContext.modifiedFields.push({
                metaobject_key: key,
                originalValue: '',
                newValue: this.makePayloadSafe(currentValue)
              });
            }
          }
        }
      }

      return projectContext;
    }

    snapshotBasicFields() {
      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country', 'countryOther'];
      this.originalBasicData = {};
      fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) this.originalBasicData[id] = el.value.trim();
      });
    }

    buildModifiedBasicFields() {
      if (!this.originalBasicData) return [];

      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country', 'countryOther'];
      const modified = [];

      fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const current = el.value.trim();
        const original = this.originalBasicData[id] || '';
        if (current !== original) {
          modified.push({
            field: id,
            originalValue: this.makePayloadSafe(original),
            newValue: this.makePayloadSafe(current)
          });
        }
      });

      return modified;
    }

    snapshotCustomFields() {
      const basicFieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];
      this.originalCustomData = {};
      const fields = this.detailedContactContainer.querySelectorAll('.cart-attribute[data-metafield-key]');
      fields.forEach(field => {
        if (basicFieldIds.includes(field.id)) return;
        const key = field.dataset.metafieldKey;
        if (field.type === 'checkbox') {
          this.originalCustomData[key] = field.checked ? field.value : '';
        } else if (field.type === 'radio') {
          if (field.checked) this.originalCustomData[key] = field.value;
          else if (!(key in this.originalCustomData)) this.originalCustomData[key] = '';
        } else {
          this.originalCustomData[key] = field.value.trim();
        }
      });
    }

    buildModifiedCustomFields() {
      if (!this.originalCustomData) return [];
      const basicFieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];
      const modified = [];
      const seen = new Set();

      const fields = this.detailedContactContainer.querySelectorAll('.cart-attribute[data-metafield-key]');
      fields.forEach(field => {
        if (basicFieldIds.includes(field.id)) return;
        const key = field.dataset.metafieldKey;
        if (seen.has(key)) return;
        let current = '';
        if (field.type === 'checkbox') {
          current = field.checked ? field.value : '';
        } else if (field.type === 'radio') {
          if (field.checked) current = field.value;
          else return; // skip unchecked radios
        } else {
          current = field.value.trim();
        }
        seen.add(key);
        const original = this.originalCustomData[key] || '';
        if (this.normalizeValue(current) !== this.normalizeValue(original)) {
          modified.push({
            metaobject_key: key,
            originalValue: this.makePayloadSafe(original),
            newValue: this.makePayloadSafe(current)
          });
        }
      });

      // Check for fields in snapshot that no longer exist in DOM
      for (const [key, original] of Object.entries(this.originalCustomData)) {
        if (!seen.has(key) && this.normalizeValue(original) !== '') {
          modified.push({
            metaobject_key: key,
            originalValue: this.makePayloadSafe(original),
            newValue: ''
          });
        }
      }

      return modified;
    }

    // ========================================================================
    // HTML TABLE BUILDERS
    // ========================================================================

    getFieldLabel(fieldId, container) {
      // 1. Try <label for="fieldId">
      const label = container
        ? container.querySelector(`label[for="${fieldId}"]`)
        : document.querySelector(`label[for="${fieldId}"]`);
      if (label) return label.textContent.replace(/\s*\*\s*$/, '').trim();

      // 2. Try aria-label on the field itself
      const field = document.getElementById(fieldId);
      if (field) {
        const ariaLabel = field.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
      }

      // 3. Fallback: humanize the id or metaobject_key
      return fieldId
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase());
    }

    displayValue(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Unwrap list-type metafield JSON (e.g. "[\"Aerospace\"]" → "Aerospace")
      if (str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str.replace(/\\"/g, '"'));
          if (Array.isArray(parsed)) return parsed.join(', ');
        } catch (e) {
          // Not valid JSON, return as-is
        }
      }
      return str;
    }

    renderTableRows(items) {
      // items: array of { label, data }
      return items.map((item, i) => {
        const isLast = i === items.length - 1;
        const labelClass = isLast ? 'data-label' : 'data-label data-row-border';
        const valueClass = isLast ? 'data-value' : 'data-value data-row-border';
        const borderStyle = isLast ? '' : ' border-bottom:1px solid #e8dfd1;';
        const labelStyle = `font-family:'Open Sans',Tahoma,Helvetica,Arial,sans-serif; font-size:13px; line-height:18px; color:#888888; padding:8px 16px 8px 0; width:110px; vertical-align:top;${borderStyle}`;
        const valueStyle = `font-family:'Open Sans',Tahoma,Helvetica,Arial,sans-serif; font-size:13px; line-height:18px; color:#2d2d2d; padding:8px 0; vertical-align:top;${borderStyle}`;
        return `<tr><td class="${labelClass}" style="${labelStyle}">${item.label}</td><td class="${valueClass}" style="${valueStyle}">${item.data}</td></tr>`;
      }).join('');
    }

    wrapTableHtml(rowsHtml) {
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:0;">${rowsHtml}</table>`;
    }

    buildCompanyProfileTableHtml(basicFields, customFields, basicModified, customModified) {
      const items = [];

      // Basic contact fields
      const basicFieldOrder = [
        { key: 'firstName', label: 'First name' },
        { key: 'lastName', label: 'Last name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'company', label: 'Company' },
        { key: 'country', label: 'Country' },
        { key: 'countryOther', label: 'Other country' }
      ];

      const modifiedBasicKeys = new Set(basicModified.map(m => m.field));

      basicFieldOrder.forEach(({ key, label }) => {
        const value = basicFields[key];
        if (value === undefined || value === null || value === '') return;
        const asterisk = modifiedBasicKeys.has(key) ? ' *' : '';
        items.push({ label, data: `${value}${asterisk}` });
      });

      // Custom contact fields
      const modifiedCustomKeys = new Set(customModified.map(m => m.metaobject_key));

      customFields.forEach(field => {
        const label = this.getFieldLabel(field.id || field.metaobject_key, this.detailedContactContainer);
        const value = this.displayValue(field.value);
        if (value === '') return;
        const asterisk = field.metaobject_key && modifiedCustomKeys.has(field.metaobject_key) ? ' *' : '';
        items.push({ label, data: `${value}${asterisk}` });
      });

      if (items.length === 0) return '';
      return this.wrapTableHtml(this.renderTableRows(items));
    }

    buildProjectFieldsTableHtml(skipProject, projectFields, projectModified) {
      if (skipProject || !projectFields || projectFields.length === 0) return '';

      const modifiedKeys = new Set(projectModified.map(m => m.metaobject_key));
      const items = [];

      projectFields.forEach(field => {
        const label = this.getFieldLabel(field.id || field.metaobject_key, this.projectFieldsContainer);
        const value = this.displayValue(field.value);
        if (value === '') return;
        const asterisk = field.metaobject_key && modifiedKeys.has(field.metaobject_key) ? ' *' : '';
        items.push({ label, data: `${value}${asterisk}` });
      });

      if (items.length === 0) return '';
      return this.wrapTableHtml(this.renderTableRows(items));
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    makePayloadSafe(value) {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'string') return String(value);

      // Escape characters that break JSON/GraphQL when interpolated between "..." delimiters
      return value
        .replace(/\\/g, '\\\\')     // backslash first (before other escapes add more backslashes)
        .replace(/"/g, '\\"')       // double quotes
        .replace(/\n/g, '\\n')      // newlines
        .replace(/\r/g, '\\r')      // carriage returns
        .replace(/\t/g, '\\t');     // tabs
    }

    initTooltip() {
      const tooltipTrigger = document.querySelector('.request-review__tooltip-trigger');
      if (!tooltipTrigger) return;

      const tooltip = tooltipTrigger.closest('.request-review__mode-option')
                        ?.querySelector('.request-review__tooltip');
      if (!tooltip) return;

      const show = () => {
        tooltip.classList.add('request-review__tooltip--visible');
        tooltip.setAttribute('aria-hidden', 'false');
      };
      const hide = () => {
        tooltip.classList.remove('request-review__tooltip--visible');
        tooltip.setAttribute('aria-hidden', 'true');
      };

      // Desktop: hover
      tooltipTrigger.addEventListener('mouseenter', show);
      tooltipTrigger.addEventListener('mouseleave', hide);

      // Keyboard: focus/blur
      tooltipTrigger.addEventListener('focus', show);
      tooltipTrigger.addEventListener('blur', hide);

      // Mobile: tap toggle
      tooltipTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tooltip.classList.contains('request-review__tooltip--visible')) {
          hide();
        } else {
          show();
        }
      });

      // Dismiss tooltip on tap outside (mobile)
      document.addEventListener('click', (e) => {
        if (!tooltipTrigger.contains(e.target) && !tooltip.contains(e.target)) {
          hide();
        }
      });
    }

    setupCountryOtherLogic() {
      const countrySelect = document.getElementById('country');
      const countryOtherField = document.getElementById('country-other-field');

      if (!countrySelect || !countryOtherField) return;

      const toggle = () => {
        if (countrySelect.value === 'Other') {
          countryOtherField.style.display = 'block';
        } else {
          countryOtherField.style.display = 'none';
          const otherInput = document.getElementById('countryOther');
          if (otherInput) otherInput.value = '';
        }
      };

      countrySelect.addEventListener('change', toggle);
      toggle(); // set initial state
    }

    formatPhoneE164(value) {
      // Strip everything except digits and leading +
      let digits = value.replace(/[^\d+]/g, '');

      // If it starts with +, keep it; otherwise prepend +
      if (!digits.startsWith('+')) {
        digits = '+' + digits.replace(/\+/g, '');
      }

      return digits;
    }

    reExecuteScripts(container) {
      const scripts = container.querySelectorAll('script');
      console.log(`Found ${scripts.length} script tags to re-execute`);

      scripts.forEach((oldScript, index) => {
        const newScript = document.createElement('script');

        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.async = false;
        } else {
          newScript.textContent = oldScript.textContent;
        }

        // Copy any attributes
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Append to document.head — more reliable than replaceChild inside a div
        document.head.appendChild(newScript);
        console.log(`Executed script ${index + 1}`);
      });
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

    clearAccountForm() {
      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country', 'countryOther'];

      fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = '';
        }
      });

      // Hide country other field
      const countryOtherField = document.getElementById('country-other-field');
      if (countryOtherField) countryOtherField.style.display = 'none';

      // Clear any additional dynamic fields
      const dynamicFields = document.querySelectorAll('#detailed-contact-container .cart-attribute, #project-fields-container .cart-attribute');
      dynamicFields.forEach(field => {
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = false;
        } else {
          field.value = '';
        }
      });
    }

    collectAccountCreationFields() {
      const accountFields = {};

      const fieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country', 'countryOther'];

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

      const firstName = document.getElementById('firstName');
      const lastName = document.getElementById('lastName');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      const company = document.getElementById('company');

      if (!firstName || !firstName.value.trim()) {
        result.isValid = false;
        result.errors.push('First name is required');
        if (firstName) this.highlightField(firstName, true);
      } else {
        if (firstName) this.highlightField(firstName, false);
      }

      if (!lastName || !lastName.value.trim()) {
        result.isValid = false;
        result.errors.push('Last name is required');
        if (lastName) this.highlightField(lastName, true);
      } else {
        if (lastName) this.highlightField(lastName, false);
      }

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

      if (phone && phone.value.trim()) {
        // Auto-format to E.164 before validating
        const formatted = this.formatPhoneE164(phone.value.trim());
        phone.value = formatted;

        const digitsOnly = formatted.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          result.isValid = false;
          result.errors.push('Phone number must include country code (e.g. +15551234567)');
          this.highlightField(phone, true);
        } else {
          this.highlightField(phone, false);
        }
      }

      if (!company || !company.value.trim()) {
        result.isValid = false;
        result.errors.push('Company name is required');
        if (company) this.highlightField(company, true);
      } else {
        if (company) this.highlightField(company, false);
      }

      if (!result.isValid) {
        const errorMessage = '<strong>Please correct the following:</strong><br>' +
                           result.errors.map(err => '&bull; ' + err).join('<br>');
        this.showMessage(messageDiv, errorMessage, 'error', true);
      }

      return result;
    }

    isValidEmail(email) {
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

    collectFieldData(scopeContainer) {
      const fieldData = [];
      let selector;

      if (scopeContainer) {
        // Scoped collection — only fields within the given container
        selector = scopeContainer.querySelectorAll('.cart-attribute');
      } else {
        // Full collection — all cart-attribute fields
        selector = document.querySelectorAll('#detailed-contact-container .cart-attribute, #project-fields-container .cart-attribute');
      }

      const accountFieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];

      selector.forEach(field => {
        if (!field || !field.name) return;

        if (accountFieldIds.includes(field.id)) {
          return;
        }

        let value = null;
        let shouldInclude = false;

        if (field.type === 'checkbox') {
          value = field.checked ? field.value : null;
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

          if (field.dataset.metafieldKey) {
            fieldInfo.metaobject_key = field.dataset.metafieldKey;

            const metafieldType = field.dataset.metafieldType;
            if (metafieldType && metafieldType.startsWith('list.')) {
              fieldInfo.value = this.makePayloadSafe(JSON.stringify([value]));
              fieldInfo.metafield_type = metafieldType;
            } else {
              fieldInfo.value = this.makePayloadSafe(value);
            }
          } else {
            fieldInfo.value = this.makePayloadSafe(value);
          }

          fieldData.push(fieldInfo);
        }
      });

      return fieldData;
    }

    getCurrentFormValues() {
      const formValues = {};
      const reviewRequestFields = document.querySelectorAll('#detailed-contact-container .cart-attribute, #project-fields-container .cart-attribute');

      const accountFieldIds = ['firstName', 'lastName', 'email', 'phone', 'company', 'country'];

      reviewRequestFields.forEach(field => {
        if (!field || !field.dataset.metafieldKey) return;

        if (accountFieldIds.includes(field.id)) {
          return;
        }

        const metafieldKey = field.dataset.metafieldKey;
        let value = '';

        if (field.type === 'checkbox') {
          value = field.checked ? field.value : '';
        } else if (field.type === 'radio') {
          if (field.checked) {
            value = field.value;
          } else {
            return;
          }
        } else {
          value = field.value || '';
        }

        formValues[metafieldKey] = value;
      });

      return formValues;
    }

    normalizeValue(value) {
      if (value === null || value === undefined || value === '') {
        return '';
      }

      return String(value).trim();
    }

    showMessage(messageDiv, text, type, allowHTML = false, persist = false) {
      if (messageDiv) {
        if (allowHTML) {
          messageDiv.innerHTML = text;
        } else {
          messageDiv.textContent = text;
        }
        messageDiv.className = type === 'success' ? 'color-success' : 'color-error';
        messageDiv.style.display = 'block';

        if (type === 'error') {
          const dismissBtn = document.createElement('button');
          dismissBtn.textContent = '\u2715 Dismiss';
          dismissBtn.className = 'button button--small button--secondary error-dismiss-btn';
          dismissBtn.style.cssText = 'margin-top: 1rem; cursor: pointer;';
          dismissBtn.onclick = () => {
            messageDiv.style.display = 'none';
            messageDiv.innerHTML = '';
          };

          if (!messageDiv.querySelector('.error-dismiss-btn')) {
            messageDiv.appendChild(dismissBtn);
          }
        } else if (!persist) {
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
  window.initReviewToClose = function(config) {
    new ReviewToCloseController(config);
  };

})();
