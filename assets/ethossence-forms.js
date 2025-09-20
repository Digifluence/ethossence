(function() {
  'use strict';
  
  // Registration Form Controller - Handles UI animations
  class RegistrationFormController {
    constructor(animationType) {
      this.animationType = animationType;
      this.trigger = document.getElementById('register-trigger');
      this.signinlink = document.getElementById('sign-in-link');
      this.drawer = document.getElementById('registration-drawer');
      this.dropdown = document.getElementById('registration-dropdown');
      this.overlay = document.getElementById('registration-overlay');
      
      this.init();
    }
    
    init() {
      // Open trigger
      if (this.trigger) {
        this.trigger.addEventListener('click', () => this.open());
      }
      
      // Close handlers
      if (this.animationType === 'slide_down') {
        const closeBtn = document.getElementById('close-dropdown');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => this.close());
        }
      } else {
        const closeBtn = document.getElementById('close-registration');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => this.close());
        }
        if (this.overlay) {
          this.overlay.addEventListener('click', () => this.close());
        }
      }
      
      // Escape key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }
    
    open() {
      if (this.animationType === 'slide_down') {
        if (this.dropdown) {
          this.dropdown.classList.add('form-dropdown--active');
          if (this.trigger) {
            this.trigger.classList.add('hidden');
          }
          if (this.signinlink) {
            this.signinlink.classList.add('hidden');
          }          
        }
      } else {
        if (this.drawer) {
          this.drawer.classList.add('drawer--active');
        }
        if (this.overlay) {
          this.overlay.classList.add('drawer__overlay--active');
        }
        document.body.classList.add('drawer-open');
      }
    }
    
    close() {
      if (this.animationType === 'slide_down') {
        if (this.dropdown) {
          this.dropdown.classList.remove('form-dropdown--active');
        }
        if (this.trigger) {
          this.trigger.classList.remove('hidden');
        }
        if (this.signinlink) {
          this.signinlink.classList.remove('hidden');
        }        
      } else {
        if (this.drawer) {
          this.drawer.classList.remove('drawer--active');
        }
        if (this.overlay) {
          this.overlay.classList.remove('drawer__overlay--active');
        }
        document.body.classList.remove('drawer-open');
      }
    }
  }
  
  // Customer Registration Form Handler - Handles validation and submission
  class CustomerRegistrationForm {
    constructor(webhookUrl) {
      this.webhookUrl = webhookUrl;
      this.form = document.getElementById('customerRegistrationForm');
      if (!this.form) return;
      
      this.submitButton = document.getElementById('submitButton');
      this.loadingSpinner = document.getElementById('loadingSpinner');
      this.buttonText = document.getElementById('buttonText');
      this.successMessage = document.getElementById('successMessage');
      this.errorBanner = document.getElementById('errorBanner');
      
      this.lastSubmission = 0;
      this.minSubmissionInterval = 5000;
      
      this.init();
    }
    
    init() {
      this.form.addEventListener('submit', this.handleSubmit.bind(this));
      this.addRealTimeValidation();
      this.addPhoneFormatting();
    }
    
    addRealTimeValidation() {
      // Email validation
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
      }
      
      // Phone validation
      const phoneInput = document.getElementById('phone');
      if (phoneInput) {
        phoneInput.addEventListener('blur', () => this.validatePhone(phoneInput.value));
      }
      
      // Required fields
      ['firstName', 'lastName', 'email'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.addEventListener('blur', () => this.validateRequired(field));
        }
      });
      
      // Business Type validation
      const businessCheckboxes = document.querySelectorAll('input[name="businessType"]');
      businessCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => this.validateBusinessType());
      });
      
      // Privacy consent
      const privacyConsent = document.getElementById('privacy-consent');
      if (privacyConsent) {
        privacyConsent.addEventListener('change', () => this.validatePrivacyConsent());
      }
    }
    
    addPhoneFormatting() {
      const phoneInput = document.getElementById('phone');
      if (!phoneInput) return;
      
      phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length >= 11) {
          value = value.substring(0, 11);
          value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 $2 $3 $4');
        } else if (value.length >= 7) {
          value = value.replace(/(\d{1})(\d{3})(\d{3})/, '+$1 $2 $3');
        } else if (value.length >= 4) {
          value = value.replace(/(\d{1})(\d{3})/, '+$1 $2');
        } else if (value.length >= 1) {
          value = '+' + value;
        }
        
        e.target.value = value;
      });
    }
    
    sanitizeInput(value) {
      if (typeof value !== 'string') return value;
      return value.trim().replace(/[<>]/g, '');
    }
    
    validateRequired(field) {
      const errorDiv = document.getElementById(field.id + 'Error');
      if (!field.value.trim()) {
        field.classList.add('error');
        if (errorDiv) errorDiv.textContent = 'This field is required.';
        return false;
      }
      field.classList.remove('error');
      if (errorDiv) errorDiv.textContent = '';
      return true;
    }
    
    validateEmail(email) {
      const emailField = document.getElementById('email');
      const errorDiv = document.getElementById('emailError');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!email.trim()) {
        emailField.classList.add('error');
        if (errorDiv) errorDiv.textContent = 'Email is required.';
        return false;
      }
      if (!emailRegex.test(email)) {
        emailField.classList.add('error');
        if (errorDiv) errorDiv.textContent = 'Please enter a valid email address.';
        return false;
      }
      emailField.classList.remove('error');
      if (errorDiv) errorDiv.textContent = '';
      return true;
    }
    
    validatePhone(phone) {
      const phoneField = document.getElementById('phone');
      const errorDiv = document.getElementById('phoneError');
      
      if (phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length !== 11) {
          phoneField.classList.add('error');
          if (errorDiv) errorDiv.textContent = 'Phone number must be 11 digits including country code.';
          return false;
        }
      }
      phoneField.classList.remove('error');
      if (errorDiv) errorDiv.textContent = '';
      return true;
    }
    
    validateBusinessType() {
      const checkboxes = document.querySelectorAll('input[name="businessType"]:checked');
      const errorDiv = document.getElementById('businessTypeError');
      
      if (checkboxes.length === 0) {
        if (errorDiv) errorDiv.textContent = 'Please select at least one business type.';
        return false;
      }
      if (errorDiv) errorDiv.textContent = '';
      return true;
    }
    
    validatePrivacyConsent() {
      const privacyField = document.getElementById('privacy-consent');
      const errorDiv = document.getElementById('privacyConsentError');
      
      if (!privacyField.checked) {
        if (errorDiv) errorDiv.textContent = 'You must agree to the Privacy Policy and Terms of Service.';
        return false;
      }
      if (errorDiv) errorDiv.textContent = '';
      return true;
    }
    
    validateForm() {
      let isValid = true;
      
      ['firstName', 'lastName', 'email'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !this.validateRequired(field)) {
          isValid = false;
        }
      });
      
      const emailField = document.getElementById('email');
      if (emailField && !this.validateEmail(emailField.value)) {
        isValid = false;
      }
      
      const phoneField = document.getElementById('phone');
      if (phoneField && !this.validatePhone(phoneField.value)) {
        isValid = false;
      }
      
      if (!this.validateBusinessType()) {
        isValid = false;
      }
      
      if (!this.validatePrivacyConsent()) {
        isValid = false;
      }
      
      return isValid;
    }
    
    collectFormData() {
      const formData = new FormData(this.form);
      
      const customerData = {
        firstName: this.sanitizeInput(formData.get('firstName')),
        lastName: this.sanitizeInput(formData.get('lastName')),
        email: this.sanitizeInput(formData.get('email')),
        phone: this.sanitizeInput(formData.get('phone')),
        country: this.sanitizeInput(formData.get('country')),
        company: this.sanitizeInput(formData.get('company')),
        privacyConsent: formData.get('privacyConsent') === 'on'
      };
      
      // Business types
      const businessCheckboxes = document.querySelectorAll('input[name="businessType"]:checked');
      const businessTypes = Array.from(businessCheckboxes).map(cb => cb.value);
      const businessTypesFormatted = businessTypes.length > 0 ?
        '[' + businessTypes.map(item => '"' + item.replace(/"/g, '\\"') + '"').join(', ') + ']' : '[]';
      
      // Process interests
      const processCheckboxes = document.querySelectorAll('input[name="processInterest"]:checked');
      const processInterests = Array.from(processCheckboxes).map(cb => cb.value);
      const processInterestsFormatted = processInterests.length > 0 ?
        '[' + processInterests.map(item => '"' + item.replace(/"/g, '\\"') + '"').join(', ') + ']' : '[]';
      
      return {
        input: {
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          addresses: [{
            company: customerData.company,
            country: customerData.country
          }],
          metafields: [
            {
              namespace: "ethossence",
              key: "business_type",
              type: "list.single_line_text_field",
              value: businessTypesFormatted
            },
            {
              namespace: "melttools",
              key: "process_interest",
              type: "list.single_line_text_field",
              value: processInterestsFormatted
            }
          ]
        },
        version: this.generateVersion(),
        timestamp: new Date().toISOString(),
        source: 'customer_registration_form'
      };
    }
    
    generateVersion() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}${month}${day}-v11`;
    }
    
    async handleSubmit(event) {
      event.preventDefault();
      
      // Rate limiting
      const now = Date.now();
      if (now - this.lastSubmission < this.minSubmissionInterval) {
        this.showError('Please wait before submitting again.');
        return;
      }
      this.lastSubmission = now;
      
      // Hide previous messages
      if (this.successMessage) this.successMessage.style.display = 'none';
      if (this.errorBanner) this.errorBanner.style.display = 'none';
      
      // Validate
      if (!this.validateForm()) return;
      
      // Submit
      this.setLoadingState(true);
      
      try {
        const payload = this.collectFormData();
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          this.showSuccess();
          this.form.reset();
        } else {
          const errorText = await response.text();
          this.showError(errorText || 'There was an error creating your account. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        this.showError('There was an error creating your account. Please try again.');
      } finally {
        this.setLoadingState(false);
      }
    }
    
    setLoadingState(isLoading) {
      if (!this.submitButton || !this.loadingSpinner || !this.buttonText) return;
      
      if (isLoading) {
        this.submitButton.disabled = true;
        this.submitButton.setAttribute('aria-label', 'Creating account, please wait');
        this.loadingSpinner.style.display = 'inline-block';
        this.buttonText.textContent = 'Creating Account...';
      } else {
        this.submitButton.disabled = false;
        this.submitButton.removeAttribute('aria-label');
        this.loadingSpinner.style.display = 'none';
        this.buttonText.textContent = 'Create Account';
      }
    }
    
    showSuccess() {
      if (this.successMessage) {
        this.successMessage.style.display = 'block';
        this.successMessage.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    showError(message) {
      if (!this.errorBanner) return;
      
      let formattedMessage = message.replace(/\n/g, '<br>');
      
      if (message.toLowerCase().includes('email') || message.toLowerCase().includes('phone')) {
        formattedMessage += '<br><br><a href="https://melttools.com/account/login" class="error-login-link">Login or access login help</a>';
      }
      
      this.errorBanner.innerHTML = formattedMessage;
      this.errorBanner.style.display = 'block';
      this.errorBanner.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Initialize function - called from the section with configuration
  window.initCustomerRegistration = function(config) {
    const animationType = config.animationType || 'slide_out';
    const webhookUrl = config.webhookUrl || '';
    
    // Initialize controllers
    new RegistrationFormController(animationType);
    
    if (webhookUrl) {
      new CustomerRegistrationForm(webhookUrl);
    }
  };
  
})();