---
"@fadymondy/nasaq": patch
---

Currency defaults are now US dollars, or Saudi riyals in Arabic, across every component. The delivery kit (cash collect, courier card, dispatch offer, route stops, native cash collect) no longer defaults to shekels. Store, checkout, cart, payments, loyalty, rates and payroll components take `currency` as optional with the same default. New helpers: `defaultCurrency(locale)`, `useCurrency(currency?)` and `deliveryCurrency(locale)`.
