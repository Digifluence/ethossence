# Shopify Theme: Ethossence by Digifluence

## Architecture Overview

This is a custom Shopify theme based on Dawn 15.4.0, heavily customized with "ethossence" branded components for B2B/authorized access functionality.

### Key Theme Structure

- **Base**: Standard Shopify theme architecture (sections, snippets, templates, assets, config, locales)
- **Custom Namespace**: All custom functionality prefixed with `ethossence-` 
- **Authorization System**: Customer authorization levels via metafields control product/variant visibility
- **Component Architecture**: Modular sections and snippets with JSON template configuration

## Critical Development Patterns

### 1. Authorization Logic Pattern

Every major component implements customer authorization checks using this liquid pattern:
```liquid
# GET CUSTOMER AUTHORIZATION LEVELS FROM METAFIELD
assign customer_authorization_levels = blank
if customer and customer.metafields.ethossence.authorization_show
  assign customer_auth_list = customer.metafields.ethossence.authorization_show.value
  # Process metaobjects to extract authorization levels
endif
```
**Key Files**: `sections/ethossence-main-product.liquid`, `snippets/ethossence-product-variant-picker.liquid`

### 2. Custom Component Naming

- **Sections**: `ethossence-[component-name].liquid` for major page components
- **Snippets**: `ethossence-[feature-name].liquid` for reusable components  
- **Assets**: `ethossence-[feature].css/js` for custom styling and interactions
- **CSS Classes**: `.ethossence-[component]__[element]` following BEM methodology

### 3. Theme Integration Points

**Layout Integration** (`layout/theme.liquid`):
- Custom CSS: `{{ 'ethossence.css' | asset_url | stylesheet_tag }}`
- Conditional scripts based on template (e.g., cart-specific: `ethossence-review.js`)
- Extensive CSS custom properties for theme customization via admin settings

**Template Structure** (`templates/*.json`):
- JSON-based template system with section/block configuration
- Block ordering controls component sequence
- Settings object defines component behavior and styling

## Development Workflows

### Component Development
1. **Sections**: Create in `/sections/` for full-width page components
2. **Snippets**: Create in `/snippets/` for reusable UI components  
3. **Assets**: Add CSS to `ethossence.css` or create feature-specific files
4. **Templates**: Configure in JSON templates for page layout

### Metafield Integration
- **Customer Auth**: `customer.metafields.ethossence.authorization_show`
- **Product Auth**: `product.metafields.ethossence.authorization_show` 
- **Variant Auth**: `variant.metafields.ethossence.authorization_show`
- Always check authorization before displaying products/variants/pricing

### JavaScript Patterns
- Custom elements extending base classes (e.g., `ProductModal extends ModalDialog`)
- Deferred loading for media content and interactive features
- Event-driven architecture for cart, search, and gallery functionality

### Code Style Conventions
- **Comments**: ALL COMMENTS MUST BE UPPERCASE in both Liquid and JavaScript files
- Follow existing patterns: `{%- comment -%}COMMENT TEXT{%- endcomment -%}`
- Inline comments: `<!-- COMMENT TEXT -->`

## Theme Settings & Configuration

**Config Files**:
- `settings_schema.json`: Defines theme customizer options
- `settings_data.json`: Stores current theme configuration
- Based on Dawn's extensive customization system with color schemes, typography, spacing

**Localization**: 
- Standard Shopify locales structure
- Translation keys follow `t:settings_schema.[category].[setting].[property]` pattern

## Integration Dependencies

**External Services**:
- Shopify metafields for authorization system
- Font loading via Shopify CDN with font_face liquid filter
- Standard Shopify APIs for cart, search, localization

**Browser APIs**:
- Custom Elements for interactive components
- Intersection Observer for animations (when enabled)
- Fetch API for cart operations and predictive search

---

*This theme requires understanding of Shopify Liquid, metafield architecture, and the authorization-based product visibility system unique to Ethossence.*