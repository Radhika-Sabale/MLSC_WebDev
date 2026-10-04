# One-Thumb Ergonomics & Thumb Zone Design

This document details how **Canteen Crowd** was engineered to satisfy the "One Thumb" assignment constraint: complete one-handed mobile operability on mobile devices with zero essential controls in the upper screen corners.

---

## 1. Code-Derived Layout Decisions

### A. Bottom-Anchored Reporting Bar (`ReportBar.tsx`)
- **Fixed Position & Clearance:** The primary reporting interface is fixed to the bottom of the viewport (`position: fixed; bottom: 0`).
- **Touch Target Sizing:** All three crowd reporting buttons (`Under 5 min`, `5 to 15 min`, `15+ min`) enforce a minimum height of `56px` (`min-height: 56px`), exceeding the Apple Human Interface Guidelines (`44px`) and WCAG 2.2 Target Size AAA criteria (`44px` / `48px`).
- **Safe-Area Insets:** Uses `padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px))` so modern device home indicators (such as the iPhone home bar) do not collide with or intercept touches.
- **Scroll Buffer:** The parent page shell applies `padding-bottom: calc(240px + env(safe-area-inset-bottom, 0px))` so underlying content and back navigation can be scrolled fully above the fixed bar without visual clipping.

### B. Bottom-Weighted Directory on Tall Displays (`Home.tsx` & `app.css`)
- **Natural Thumb Resting Zone:** On tall modern smartphones, the top 40% of the screen is an ergonomic "stretch" or "impossible" zone for single-handed use.
- **Flexbox Auto-Margins:** The home directory cards are enclosed in `.home-thumb-container` with `margin-top: auto`. On tall viewports, this pushes the canteen cards into the lower 35% to 45% of the screen directly beneath the thumb.
- **Graceful Reflow on Short Screens:** On smaller displays (e.g. 320px width or rotated viewports), the container allows natural top-aligned vertical scrolling without trapping content.

### C. Full-Width Bottom Navigation (`BackButton.tsx`)
- **No Top-Left Back Chevrons:** Traditional mobile navigation places back arrows in the top-left corner (the hardest spot to reach with a right thumb).
- **Bottom Placement:** The back button is located at the bottom of the scrollable content area, styled as a full-width block (`width: 100%`) with `min-height: 56px`.

### D. Collapsible Achievements Shelf (`BadgeShelf.tsx`)
- **Compact Disclosure:** Badges are housed in a native `<details>/<summary>` element with a `56px` tap target summary.
- **Thumb Zone Preservation:** Kept collapsed by default directly below the canteen cards so secondary gamification details never displace core canteen cards outside the thumb reach zone.

### E. Touch Gestures & Interactivity
- **No Complex Gestures:** Pure single-tap interaction. No pinch-to-zoom, horizontal carousels, swipe actions, or long-press dependencies.
- **Floating Toast Stacking:** Toasts appear above the reporting bar (`--toast-bottom-offset`) and feature full 56px dismissal targets.

---

## 2. Phone Screenshots with Thumb-Reach Overlay

> Place your physical phone screenshots in `docs/screenshots/` and link them below. 
> To generate an overlay, use an ergonomic thumb-zone mapping tool or draw the Green (Natural), Yellow (Stretch), and Red (Hard to reach) arc zones over the screen.

```
[WRITE THIS: Insert screenshot showing Home page with thumb-zone overlay]
Example: ![Home Screen Thumb Zone](./screenshots/home-thumb-zone.png)
```

```
[WRITE THIS: Insert screenshot showing Canteen Reporting page with thumb-zone overlay]
Example: ![Canteen Page Thumb Zone](./screenshots/canteen-thumb-zone.png)
```

### Personal Ergonomic Observations
- **Test Device:** [WRITE THIS: e.g. iPhone 14 Pro, Samsung Galaxy S23, Google Pixel 7]
- **Handedness Tested:** [WRITE THIS: Right-hand one-thumb grip / Left-hand grip]
- **Observations:** [WRITE THIS: Notes on whether your thumb reached all buttons without shifting your hand grip or risking dropping the phone]

---

## 3. What I Tried That Did Not Work

[WRITE THIS: Describe 1-2 layout or interaction ideas you experimented with during development that failed the one-thumb test, and why you replaced them with the final solution.]

- *Attempt 1:* [WRITE THIS: e.g. Initially tried placing a back button in the top header bar, but found it required hand readjustment on tall screens. Moved it to a full-width bottom bar.]
- *Attempt 2:* [WRITE THIS: e.g. Experimented with swipe-to-report gestures, but found single-tap buttons were faster, less prone to accidental triggers, and fully accessible for keyboard/screen-reader users.]
