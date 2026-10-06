# Google Play monetization guardrail

Current state: disabled

DoodleGame is currently a free, ad-free game. The shipped runtime has no advertising SDK, Google Play Billing SDK, premium currency, in-app purchase flow, external digital-goods payment flow, or monetization-specific account/entitlement service.

The current reviewed Android permission baseline also does not include `com.google.android.gms.permission.AD_ID` or `com.android.vending.BILLING`.

This document and `docs/play/monetization-baseline.json` are enforced by CI. The purpose is to keep the current release ad-free while making future monetization an explicit policy change instead of an accidental dependency change.

## CI guardrail

Run:

```bash
npm run ci:verify-monetization
```

The verifier inventories runtime npm dependencies, monetization-related source/Gradle signals, and Android permissions when manifests are available. It writes evidence to:

```text
artifacts/monetization-guardrail/
```

With `state: "disabled"`, any detected Ads, Billing, or external-payment integration fails CI.

## Activation procedure

If Ads, IAP, premium currency, or digital goods are intentionally added, do not bypass the verifier. Update the implementation and policy evidence together:

1. Keep or reactivate GitHub Issue #25 for the monetization review.
2. Change `state` to `reviewed-enabled` in `docs/play/monetization-baseline.json`.
3. Set only the enabled monetization surfaces to true.
4. Complete privacy review and update `docs/play/privacy-baseline.json`, `docs/play/data-safety.md`, the public/in-app Privacy Policy, and Play Console Data Safety where behavior changes.
5. Complete the target-audience review in Issue #22 and add `docs/play/audience.md` before enabling monetization.
6. Review each Ads SDK against current Google Play SDK/policy requirements before merge.
7. Add `AD_ID` only when the selected Ads implementation genuinely needs it.
8. For Ads, document consent/region handling and verify that ad UI does not obscure or imitate gameplay controls.
9. For digital goods/features, use Google Play Billing and test acknowledgement, restore, cancellation, unavailable-network, and error paths. Billing failure must not block the core game.
10. Do not add an external payment flow for digital goods without an explicit Google Play policy review.
11. Add automated monetization tests and list their paths in `testFiles` in the baseline.
12. Test purchases on an appropriate Google Play test track before release.

## Families conditional

If the target audience includes children, monetization must also follow the Families requirements tracked by Issue #22. Ads configuration/SDKs must be appropriate for that audience, personalized ads must not be used for children or unknown-age users, and any mixed-audience age handling must be reviewed before release.

## Current release invariant

Until the activation procedure above is completed, the expected state is:

- Ads: disabled
- Billing/IAP: disabled
- external digital-goods payment: disabled
- `AD_ID`: absent
- monetization test files: none required because no monetization code ships

References are tracked in Issue #25.
