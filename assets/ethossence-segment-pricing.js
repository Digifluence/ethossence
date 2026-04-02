// ETHOSSENCE SEGMENT PRICING — VARIANT CHANGE HANDLER
// ENSURES SEGMENT PRICING DISPLAY STATE IS CORRECT AFTER VARIANT CHANGES.
// MOST LOGIC IS HANDLED SERVER-SIDE BY LIQUID; THIS JS PROVIDES DEFENSIVE CHECKS.

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // SUBSCRIBE TO VARIANT CHANGES USING DAWN'S PUB/SUB SYSTEM
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
        if (!event.data || !event.data.sectionId) return;

        var priceContainer = document.getElementById('price-' + event.data.sectionId);
        if (!priceContainer) return;

        var segmentPricing = priceContainer.querySelector('.ethossence-segment-pricing');
        var dawnPrice = priceContainer.querySelector('.price');

        // IF VARIANT IS NULL (UNAVAILABLE), HIDE SEGMENT PRICING
        if (!event.data.variant) {
          if (segmentPricing) {
            segmentPricing.removeAttribute('data-active');
            segmentPricing.style.display = 'none';
          }
          return;
        }

        // SERVER-SIDE LIQUID HANDLES THE REST — THE PRICE CONTAINER INNERHTML
        // HAS ALREADY BEEN REPLACED WITH SERVER-RENDERED HTML FOR THE NEW VARIANT.
        // THIS SUBSCRIPTION EXISTS FOR FUTURE EXTENSIBILITY AND EDGE CASE HANDLING.
      });
    }
  });
})();
