# @fadymondy/nasaq

## 0.3.0

### Minor Changes

- f159f1b: `PhoneInput` now looks and works like a real phone field: SVG flags, every country with its calling code, names in English and Arabic from `Intl.DisplayNames`, numbers grouped as written in each country, a real example number as the placeholder, Arabic-Indic and Persian digits, and shared codes (`+1`, `+7`, `+44`) placed by number range. New helpers `isValidE164`, `formatNational`, `phoneExample`, `phoneCountryName` and `parsePhone`. New `CountryFlag` component (the flag set loads lazily, once). Adds `libphonenumber-js` and `country-flag-icons` as dependencies.
  
  Also new: `PricingTable`, `UpgradePrompt` and `SignInFlow`. The profile page and profile form are redesigned (owner view with apps and account details), `Table` gains `density`, `frame`, `bordered`, `striped` and `hover`, the app shell sidebar can show icons on mobile only, and the active-item accent border is gone. Component categories are reorganised.

## 0.2.0

### Minor Changes

- 5f3fb40: New components: `PageHeader` (layout), `ViewToggle` (actions), `ProviderSwitcher` (developer tools) and `CopilotDock` (AI). Adds the ToGO brand theme (`brand="togo"`) and its mark. `IconByName` now accepts kebab-case and prefixed icon names and image URLs, and shows a fallback for unknown names.
