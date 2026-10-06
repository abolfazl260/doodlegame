# Google Play target audience / Families profile

Status: reviewed for the current free/ad-free build.

## Target audience decision

The intended Google Play target age groups for DoodleGame are:

- Ages 13–15
- Ages 16–17
- Ages 18 and over

The game is **not designed for users under 13** and the Play Console selection should not include the under-13 age groups.

This decision is based on the actual product: DoodleGame is a fast arcade duel with visible fighting, melee weapons, guns, bows, bombs, missiles and explosions. The presentation is monochrome/stick-figure and does not currently contain blood or gore, but the combat focus makes a child-directed positioning inappropriate.

Ages 13–15 and 16–17 can still be treated as children/minors under some local laws. This repository decision therefore does not waive legal obligations for minors in countries where the app is distributed. The release owner must keep country-specific requirements in mind when configuring Play Console distribution.

## Google Play Families scope

For the current declared profile:

- no under-13 target age group is selected
- the app is not marketed as a kids/children/family app
- Ads are disabled
- IAP/Billing is disabled
- there is no neutral age screen because there is no age-gated Ads/IAP feature that requires one

If a future product decision adds under-13 age groups, child-directed marketing, Ads, IAP, social/chat features, personal-data collection, or age-dependent functionality, Issue #22 must be reopened/reviewed before release and the Families requirements must be reassessed.

## Content Rating / IARC assumptions

The Play Console Content Rating questionnaire must describe the shipped gameplay, not a desired rating. Current gameplay assumptions are:

- stylized/fantasy stick-figure combat: yes
- weapons: yes — blade, hammer, firearm-like blaster/UZI, bow, bomb and missile
- explosions/projectiles: yes
- blood: no
- gore/dismemberment: no
- sexual content/nudity: no
- gambling/simulated gambling: no
- drugs/alcohol/tobacco: no
- user-generated content: no
- user-to-user chat/communication: no
- ads: no
- in-app purchases: no

This document does **not** predict the final IARC rating. The final questionnaire and rating are external Play Console steps and must remain consistent with the current gameplay at submission time.

## Current SDK / permission position

The reviewed runtime dependency set is defined in `docs/play/privacy-baseline.json`. The current build has no advertising/analytics SDK and no account or remote-data service.

The audience CI gate blocks the following from appearing silently:

- `com.google.android.gms.permission.AD_ID`
- fine/coarse/background location permissions
- `READ_PHONE_STATE`
- common device-identifier APIs such as Advertising ID, Android ID, serial/IMEI/IMSI/SIM identifiers, and Wi-Fi MAC/BSSID/SSID access
- child-directed marketing phrases in the current user-facing game copy
- runtime dependency changes that have not first passed the privacy baseline review

The Android pipeline runs the same gate after building the app so merged-manifest permissions contributed by dependencies are checked too.

## Store listing rule

Store listing, screenshots and promotional copy must match this audience decision. Do not describe DoodleGame as "for kids", "for children", "family game", "toddler", or similar child-directed language unless Issue #22 is deliberately reopened and the target audience decision is changed.

The current art style may look simple or cartoon-like, so screenshots and listing copy should emphasize the arcade duel/combat mechanics rather than presenting the app as children's content.

## Review triggers

Review Issue #22 again before release if any of these change:

1. target age groups
2. store listing or onboarding becomes child-directed
3. Ads or monetization is added
4. analytics, attribution, crash reporting, accounts or cloud services are added
5. location, advertising identifiers, phone/device identifiers or other personal data are accessed
6. chat, multiplayer communication or user-generated content is added
7. the violence/content profile changes materially

Related trackers: #20 privacy/data safety and #25 monetization.

Official policy references are linked from Issue #22.
