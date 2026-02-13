(function () {
  'use strict';

  function init() {
    document.querySelectorAll('[data-ask-question-section]').forEach(function (wrapper) {
      var sectionId = wrapper.getAttribute('data-ask-question-section');
      var webhookUrl = wrapper.getAttribute('data-webhook-url');
      var successMessage = wrapper.getAttribute('data-success-message');
      var form = wrapper.querySelector('form');
      var checkbox = wrapper.querySelector('[data-ask-question-callback]');
      var callbackDetails = document.getElementById('AskQuestionCallbackDetails-' + sectionId);

      // Checkbox toggle: show/hide callback detail fields
      if (checkbox && callbackDetails) {
        checkbox.addEventListener('change', function () {
          callbackDetails.hidden = !this.checked;
        });
      }

      // Form submission via Make webhook
      if (form && webhookUrl) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();

          var submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.setAttribute('aria-busy', 'true');
          }

          var formData = new FormData(form);
          var payload = {};

          formData.forEach(function (value, key) {
            // Strip Shopify's contact[] wrapper from field names
            var cleanKey = key.replace(/^contact\[/, '').replace(/\]$/, '');
            // Skip Shopify CSRF tokens and form type fields
            if (cleanKey === 'form_type' || cleanKey === 'utf8' || key === 'authenticity_token') return;
            payload[cleanKey] = value;
          });

          payload.page_url = window.location.href;

          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then(function (response) {
              if (!response.ok) throw new Error('Webhook responded with ' + response.status);

              // Show success
              var existingSuccess = wrapper.querySelector('.ask-question__success');
              if (existingSuccess) {
                existingSuccess.textContent = successMessage;
                existingSuccess.style.display = '';
              } else {
                var msg = document.createElement('p');
                msg.className = 'ask-question__success';
                msg.setAttribute('tabindex', '-1');
                msg.textContent = successMessage;
                form.prepend(msg);
                msg.focus();
              }

              form.reset();
              if (callbackDetails) callbackDetails.hidden = true;
            })
            .catch(function (err) {
              console.error('Ask a Question form error:', err);
              var existingError = wrapper.querySelector('.ask-question__errors');
              if (existingError) {
                existingError.textContent = 'Something went wrong. Please try again.';
                existingError.style.display = '';
              } else {
                var errMsg = document.createElement('div');
                errMsg.className = 'ask-question__errors';
                errMsg.textContent = 'Something went wrong. Please try again.';
                form.prepend(errMsg);
              }
            })
            .finally(function () {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('aria-busy');
              }
            });
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
