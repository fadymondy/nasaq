---
"@fadymondy/nasaq": minor
---

Product kit for the Nasaq product family (Matjar, Sanduq, Qaima, Mizan, Mawared, Makhzan):

- `ProductShell`: AppShell with the standard menu order (Dashboard → product groups → Reports → Integrations → Settings), the workspace switcher, ⌘K over every menu item, the Connect pill last in the header and a phone tab bar with More. Pure helpers `productNavGroups`, `activeNavId`, `pickMobileTabs` and `productNavProblems` for conformance tests.
- `ProductOnboarding`: the shared first-run flow (workspace → business → sample data → connect your AI → invite), resumable from server state, with `applyOnboardingAction` and `onboardingOpen` helpers.
- `SetupWizard`: new `onStepSkip` callback.
- `nasaq-lint` bin, so products can run the Nasaq lint rules in CI.
