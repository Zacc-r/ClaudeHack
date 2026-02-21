---
name: ux-design-laws
description: Universal UX/UI design laws and psychological principles. Use when designing any interface, layout, component, interaction, navigation, onboarding, or user flow. Covers Fitts, Hick, Jakob, Miller, Gestalt, visual hierarchy, cognitive load, motion design, and accessibility. Always apply these laws — they are not optional.
version: 1.0.0
metadata:
  openclaw:
    emoji: "🧠"
---

# UX Design Laws & Principles

These are non-negotiable laws of human perception, cognition, and interaction. They apply to every interface you build — mobile, web, desktop, watch, AR. They are not suggestions. They are how human brains work.

When building any UI, scan this list and verify compliance before shipping.

---

## INTERACTION LAWS

### Fitts's Law
**The time to reach a target is a function of its size and distance.**

What this means for you:
- Primary actions (CTA buttons, submit, confirm) must be large and close to where the user's attention already is
- On mobile: bottom of screen is the easiest reach zone (thumb arc). Put primary actions there.
- On desktop: corners and edges are fastest to hit (infinite edge effect). Put important controls near edges.
- Small, distant targets = frustrated users. If a button matters, make it big.
- Minimum tap target: 44x44pt (Apple), 48x48dp (Google). This is not a suggestion.
- Space between adjacent tap targets: minimum 8pt to prevent mis-taps

**Implementation rules:**
- Primary CTA: minimum 48pt height, full width or prominent placement
- Secondary actions: smaller but still ≥44pt tap target
- Destructive actions (delete, cancel): smaller AND farther from primary action
- Navigation targets in thumb zone on mobile (bottom 40% of screen)
- Never put critical actions in the top corners of a phone screen

### Hick's Law
**Decision time increases logarithmically with the number of choices.**

What this means for you:
- Fewer options = faster decisions = happier users
- If you must present many options, chunk them into categories first
- Progressive disclosure: show what's needed now, reveal more on demand
- Highlight a recommended/default option to reduce decision paralysis
- Onboarding should never present more than one choice per screen

**Implementation rules:**
- Navigation: maximum 5 primary items (±2)
- Settings screens: group into categories, don't show all options flat
- Forms: break into steps rather than one long page
- Card selections: 3-5 options is ideal, 7+ causes decision fatigue
- When showing swipe cards: one card at a time is perfect Hick's Law compliance
- Always provide a default or recommended option when presenting choices

### Doherty Threshold
**Productivity soars when system response time is under 400ms.**

What this means for you:
- Any interaction must feel instant (<100ms) or show progress (<400ms)
- If an operation takes >400ms, show a loading indicator immediately
- If >2 seconds, show a progress bar or skeleton screen
- If >10 seconds, show progress percentage and allow background operation
- Optimistic UI: show the result immediately, sync in background

**Implementation rules:**
- Button press → visual response in <100ms (color change, press state)
- Page transitions: <300ms animation duration
- API calls: show skeleton/shimmer immediately, don't wait for data
- Use streaming for AI responses — show tokens as they arrive
- Haptic feedback on interaction confirms the system heard the user

---

## COGNITIVE LAWS

### Miller's Law
**Working memory holds 7 ± 2 items.**

What this means for you:
- Never show more than 7 items without grouping or chunking
- Phone numbers are chunked (555-867-5309) for a reason — do this with all data
- Navigation items: 5-7 max in a single level
- Form fields visible at once: 5-7 max before scrolling
- Steps in a process: show 3-5 at a time

**Implementation rules:**
- Lists longer than 7 items: add section headers or categories
- Dashboard metrics: maximum 5-6 KPIs visible at once
- Tab bars: 3-5 tabs (iOS convention: 5 max)
- Progress indicators: 3-5 steps visible, collapse if more
- Settings: group into 4-6 categories maximum

### Jakob's Law
**Users spend most of their time on OTHER apps. They expect yours to work the same way.**

What this means for you:
- Follow platform conventions. iOS users expect iOS patterns. Android users expect Android patterns.
- Navigation at the bottom on mobile. Pull-to-refresh. Swipe to delete. Back button top-left.
- Don't innovate on navigation, forms, or standard interactions — innovate on content and features
- If every other app puts the search bar at the top, so should yours
- Familiar patterns reduce cognitive load to near zero

**Implementation rules:**
- Use platform-native components whenever possible (UIKit/SwiftUI defaults, Material Design)
- Tab bar at bottom on iOS, navigation drawer or bottom nav on Android
- Standard gestures: swipe right to go back, pull down to refresh, long press for context menu
- Settings gear icon, share icon, search magnifying glass — use standard iconography
- Login/signup flows should follow Apple/Google sign-in conventions
- Don't rename standard actions ("yeet" instead of "delete" is not clever, it's confusing)

### Tesler's Law (Law of Conservation of Complexity)
**Every system has inherent complexity that cannot be removed — only moved.**

What this means for you:
- You can't eliminate complexity. You can only decide: does the USER handle it, or does the SYSTEM handle it?
- Good design absorbs complexity so the user doesn't have to
- Smart defaults, auto-detection, and inference reduce user burden
- Example: auto-detecting location instead of asking the user to type their city
- Example: AI generating a schedule instead of making the user manually time-block

**Implementation rules:**
- Always provide smart defaults (pre-fill forms, suggest options)
- Auto-detect what you can (location, timezone, language, device capabilities)
- Use progressive disclosure: simple mode by default, advanced settings on demand
- The swipe interaction absorbs the complexity of form-filling into a simple binary choice
- If the system can reasonably guess, guess — and let the user correct

### Zeigarnik Effect
**People remember incomplete tasks better than completed ones.**

What this means for you:
- Progress indicators keep users engaged — they want to complete what they started
- Show "3 of 15 cards remaining" to create pull-through
- Incomplete profiles, half-finished onboarding — these nag the brain
- Use this ethically: motivate completion, don't manipulate

**Implementation rules:**
- Always show progress in multi-step flows (progress bar, step counter, card counter)
- Onboarding: show how many steps remain
- Swipe cards: "5 of 15" counter creates satisfying completion drive
- Checklists with visible completion percentage
- Don't abuse this — dark patterns that manufacture fake incompleteness are hostile

### Goal-Gradient Effect
**People accelerate behavior as they approach a goal.**

What this means for you:
- Users swipe faster through the last few cards than the first few
- Progress bars that show nearness to completion increase engagement
- Give users a head start (pre-fill 1-2 items) to trigger the effect
- Celebration at completion (confetti, haptic burst) rewards the acceleration

**Implementation rules:**
- Progress indicators should show both current position and total
- Consider starting progress at 10-15% (the "head start" technique)
- Final steps of any flow should feel fastest and most rewarding
- Completion moment: celebrate with animation, haptic, or sound
- In card stacks: the last 3-4 cards should feel like a sprint

---

## VISUAL PERCEPTION LAWS (GESTALT)

### Law of Proximity
**Elements close together are perceived as a group.**

What this means for you:
- Spacing IS your primary grouping tool. Not borders. Not backgrounds. Spacing.
- Related items: 8-12pt apart. Unrelated groups: 24-32pt apart.
- The ratio matters more than absolute values — inter-group spacing should be 2-3x intra-group spacing
- Labels must be closer to their field than to the previous field

**Implementation rules:**
- Form label to field: 4-6pt. Field to next label: 16-24pt.
- Card internal padding: 16-20pt. Space between cards: 12-16pt.
- Section spacing: 32-48pt. Within-section spacing: 8-16pt.
- If two things look like they belong together, make their spacing tight
- If two things are unrelated, create visible breathing room

### Law of Similarity
**Elements that look similar are perceived as related.**

What this means for you:
- Consistent styling = perceived relationship
- All tappable elements should share visual traits (color, shape, weight)
- All status indicators should use the same visual language
- Break similarity intentionally to draw attention (Von Restorff Effect)

**Implementation rules:**
- Buttons of the same type: same height, corner radius, font weight
- Category cards: same size and layout, differentiated by color/icon only
- Interactive elements share one accent color; static elements are neutral
- If everything looks the same, nothing stands out. Use similarity as the baseline, then break it for emphasis.

### Law of Common Region
**Elements within a shared boundary are perceived as grouped.**

What this means for you:
- Cards, containers, and bordered regions create instant grouping
- Background color changes between sections signal different content areas
- Use this to separate distinct functional zones on a screen

**Implementation rules:**
- Cards with rounded corners create clear content boundaries
- Alternating subtle background tints separate content sections
- Modal sheets and bottom sheets define temporary interaction regions
- Don't overuse — too many borders and containers create visual noise

### Law of Prägnanz (Simplicity)
**People perceive complex shapes in their simplest form.**

What this means for you:
- Clean, simple shapes are processed faster than complex ones
- Rounded rectangles are simpler than irregular polygons — use them
- Reduce visual noise: fewer borders, fewer shadows, fewer gradients
- When in doubt, simplify

**Implementation rules:**
- Use basic geometric shapes: circles, rounded rectangles, lines
- Minimize decorative elements — every visual element should serve a purpose
- Icon design: use the simplest recognizable form (SF Symbols do this well)
- Reduce competing visual elements on any single screen

### Law of Continuity
**The eye follows smooth paths and lines.**

What this means for you:
- Alignment creates invisible lines that guide the eye
- Left-align text for readability (in LTR languages)
- Vertical scrolling follows natural eye flow — top to bottom
- Timeline connectors (vertical lines between events) leverage continuity

**Implementation rules:**
- Maintain consistent left margin across all content
- Timeline layouts: use a vertical connector line between entries
- Card stacks: align leading edges perfectly
- Progress indicators: horizontal bars leverage left-to-right continuity
- Don't break alignment without a reason

---

## VISUAL HIERARCHY LAWS

### Von Restorff Effect (Isolation Effect)
**The item that differs from the rest is most memorable.**

What this means for you:
- The ONE thing you want the user to notice should be visually distinct
- Primary CTA: different color than everything else on screen
- Priority items: badge, star, different background, size difference
- Don't make everything stand out — if everything is special, nothing is

**Implementation rules:**
- One accent color for primary actions, neutral for everything else
- Priority swipe (up) should look and feel different from regular swipes
- High-priority schedule blocks: star badge + slightly larger + bolder color
- Error states: red stands out because everything else isn't red
- Maximum ONE visually dominant element per screen

### Serial Position Effect
**People remember the first and last items in a series best.**

What this means for you:
- Put the most important items first and last in any list
- In navigation: key items at the start and end of the tab bar
- In onboarding: first impression and final step matter most
- Middle items get forgotten — don't put critical info there

**Implementation rules:**
- Tab bar: most important tab first (leftmost), second most important last (rightmost)
- Card stack ordering: put high-impact categories first and last
- Lists: lead with the most important item, end with a CTA or summary
- Schedule display: make the first and last time blocks visually memorable

### Aesthetic-Usability Effect
**Users perceive attractive designs as more usable, even when they're not.**

What this means for you:
- Beauty creates trust. Polish creates perceived quality.
- Users forgive usability issues in beautiful interfaces
- Invest in visual polish: consistent spacing, smooth animations, quality icons
- First impressions are disproportionately important (this IS the Halo Effect)

**Implementation rules:**
- Animations should be smooth and spring-based, never janky
- Consistent corner radii, spacing, and color usage throughout
- Use SF Symbols (they're professionally designed) over custom icons when possible
- Loading states should look good (skeleton screens, shimmers) — not just spinners
- Card shadows, material backgrounds, and subtle depth cues add perceived quality

---

## MOTION & FEEDBACK LAWS

### Principle of Direct Manipulation
**Users should feel like they're directly interacting with objects, not issuing commands.**

What this means for you:
- Swipe a card = move a card. Not "tap a button that triggers a card transition."
- Drag gestures should move the element in real-time, not after release
- The object should follow the finger/cursor with no perceptible lag
- Spring physics make objects feel physical and real

**Implementation rules:**
- Drag gestures: update position on .onChanged, not just .onEnded
- Rotation and scale should track with finger position during drag
- Release should trigger physics-based animation (spring, ease) not instant jump
- Haptic feedback at threshold crossings reinforces physicality
- Undo = reverse the physical action (card slides back)

### Feedback Immediacy Principle
**Every user action must produce an immediate, visible response.**

What this means for you:
- No action should feel ignored
- Button presses: immediate visual change (opacity, scale, color)
- Swipe: card moves in real-time with finger
- Form submission: loading state appears instantly
- Errors: appear at the point of error, not in a distant alert

**Implementation rules:**
- Touch down: visual response in <50ms
- Swipe direction indicators: fade in proportionally to drag distance
- Loading states: appear within 100ms of action
- Success/error: show at the source (inline), not as a modal alert
- Sound and haptics reinforce visual feedback for critical actions

---

## ACCESSIBILITY LAWS

### WCAG Contrast Requirements
- Normal text: minimum 4.5:1 contrast ratio against background
- Large text (18pt+ or 14pt+ bold): minimum 3:1 contrast ratio
- Interactive elements and icons: minimum 3:1 contrast ratio
- Never rely on color alone to convey meaning (add icons, labels, patterns)

### Touch Target Minimums
- Apple HIG: 44x44pt minimum
- Google Material: 48x48dp minimum  
- Spacing between targets: 8pt minimum to prevent mis-taps
- Elderly/accessibility users: consider 56pt+ targets

### Motion Sensitivity
- Always check `prefers-reduced-motion` / `accessibilityReduceMotion`
- Provide equivalent non-animated alternatives
- Never use flashing content (>3 flashes per second)
- Auto-playing animations should be pausable

### Dynamic Type / Font Scaling
- Never hardcode font sizes in absolute points for body text
- Use the platform's semantic font system (Dynamic Type on iOS)
- Test at largest and smallest text sizes
- Ensure layouts don't break at 200% text scale

---

## DECISION FRAMEWORK

When designing any screen, run through this checklist:

### Before You Start
1. **What is the ONE action the user should take?** (Von Restorff — make it stand out)
2. **How many choices are visible?** (Hick — reduce to minimum, max 5-7)
3. **Does this look like other apps the user knows?** (Jakob — follow conventions)

### During Layout
4. **Are related elements close together?** (Proximity)
5. **Do similar elements look similar?** (Similarity)
6. **Is there clear visual hierarchy?** (Size, weight, color = importance)
7. **Can the user reach the primary action easily?** (Fitts — big, close, thumb zone)
8. **Is the content chunked into ≤7 groups?** (Miller)

### During Interaction Design
9. **Does every action get immediate feedback?** (Doherty — <100ms response)
10. **Do gestures feel direct and physical?** (Direct Manipulation)
11. **Is progress visible in multi-step flows?** (Zeigarnik — show completion)
12. **Is the complexity handled by the system, not the user?** (Tesler)

### Before Shipping
13. **Do tap targets meet minimum size?** (44pt iOS / 48dp Android)
14. **Does it work in dark mode?** (System colors, not hardcoded)
15. **Does it respect reduced motion?** (Accessibility)
16. **Does it look good?** (Aesthetic-Usability — polish matters)

---

## QUICK REFERENCE CARD

| Law | One-Line Rule | Number to Remember |
|-----|--------------|-------------------|
| Fitts | Big + close = easy to hit | 44pt minimum tap target |
| Hick | Fewer choices = faster decisions | 5 ± 2 options max |
| Miller | Chunk information | 7 ± 2 items in memory |
| Jakob | Follow platform conventions | Users know 0 about YOUR app |
| Doherty | Feel instant or show progress | <400ms response time |
| Tesler | System absorbs complexity | Smart defaults everywhere |
| Proximity | Spacing = grouping | 2-3x ratio between groups |
| Similarity | Same look = same meaning | 1 accent color for actions |
| Von Restorff | Different = memorable | 1 standout per screen |
| Zeigarnik | Incomplete tasks persist | Always show progress |
| Aesthetic | Beautiful = trustworthy | Polish > features |
