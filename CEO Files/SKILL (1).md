---
name: swiftui-ux-craft
description: Build production-quality SwiftUI iOS interfaces with polished UX. Use when creating iOS views, SwiftUI components, card UIs, swipe gestures, animations, timelines, color systems, SF Symbols, haptics, or any iPhone app UI/UX work.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - xcrun
    os:
      - darwin
    emoji: "📱"
---

# SwiftUI UX Craft

Expert-level SwiftUI development skill focused on shipping polished, production-quality iOS interfaces. This skill ensures every view, component, and interaction feels native, intentional, and delightful.

## When to Use

Activate this skill when:
- Creating any SwiftUI view or component
- Building gesture-driven interfaces (swipe, drag, tap)
- Designing color systems, typography, or visual hierarchy
- Implementing animations and transitions
- Working with SF Symbols, haptics, or accessibility
- Building card-based UIs, timelines, lists, or dashboards
- Reviewing or refactoring existing SwiftUI code for quality

## Core Design Philosophy

### 1. Native First
Never fight the platform. SwiftUI has strong opinions — work with them:
- Use `NavigationStack`, not custom navigation hacks
- Use `.sheet()`, `.fullScreenCover()`, `.alert()` for modal presentation
- Respect safe areas unless you have a specific reason not to
- Use `@Environment(\.colorScheme)` for dark mode, never hardcode colors
- Prefer system materials (`.ultraThinMaterial`, `.regularMaterial`) over custom blurs

### 2. Motion with Purpose
Every animation must have a reason — guide attention, confirm action, or create continuity:
- **Confirms action**: Card flies off screen after swipe commit
- **Guides attention**: Next card scales up to become active
- **Creates continuity**: Shared element transitions between views
- Never animate just because you can. Static is fine when static is clear.

### 3. Hierarchy Through Space, Not Decoration
- Use spacing and padding to create grouping, not borders or dividers
- Larger text = more important. Period.
- One primary action per screen. One accent color for CTAs.
- When in doubt, add more whitespace.

## SwiftUI Component Patterns

### Card Component Template
```swift
struct ContentCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let accentColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(accentColor)
                    .frame(width: 44, height: 44)
                    .background(accentColor.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
```

**Rules for cards:**
- Corner radius: 16-24pt for cards, 10-14pt for inner elements
- Padding: 16-20pt internal, never less than 12
- Icon containers: 40-48pt, use `.opacity(0.12)` of accent color as background
- Never use hard borders on cards. Use shadow or material instead.

### Swipe Gesture Template
```swift
struct SwipeableCard: View {
    @State private var offset: CGSize = .zero
    @State private var rotation: Double = 0
    
    let swipeThreshold: CGFloat = 100
    let maxRotation: Double = 12
    
    var body: some View {
        CardContent()
            .offset(offset)
            .rotationEffect(.degrees(rotation))
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation
                        rotation = Double(value.translation.width / 20)
                            .clamped(to: -maxRotation...maxRotation)
                    }
                    .onEnded { value in
                        if abs(value.translation.width) > swipeThreshold {
                            commitSwipe(direction: value.translation.width > 0 ? .right : .left)
                        } else if value.translation.height < -150 {
                            commitSwipe(direction: .up)
                        } else {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.6)) {
                                offset = .zero
                                rotation = 0
                            }
                        }
                    }
            )
    }
    
    private func commitSwipe(direction: SwipeDirection) {
        let haptic = UIImpactFeedbackGenerator(
            style: direction == .up ? .medium : .light
        )
        haptic.impactOccurred()
        
        withAnimation(.easeIn(duration: 0.25)) {
            switch direction {
            case .right: offset.width = 500
            case .left: offset.width = -500
            case .up: offset.height = -800
            }
        }
    }
}
```

**Rules for gestures:**
- Always provide haptic feedback on commit (UIImpactFeedbackGenerator)
- Spring back must feel snappy: `response: 0.3-0.4`, `dampingFraction: 0.5-0.7`
- Fly-off must be fast: `.easeIn(duration: 0.2-0.3)`
- Show visual indicators during drag (color overlays, icons fading in)
- Threshold for commit: 80-120pt horizontal, 120-160pt vertical
- Rotation proportional to drag: `translation.width / 15-25`

### Timeline / Schedule Layout Template
```swift
struct TimelineView: View {
    let blocks: [TimeBlock]
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(blocks.enumerated()), id: \.element.id) { index, block in
                    HStack(alignment: .top, spacing: 16) {
                        // Time column
                        VStack(spacing: 4) {
                            Text(block.startTime)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)
                                .frame(width: 65, alignment: .trailing)
                        }
                        
                        // Connector line + dot
                        VStack(spacing: 0) {
                            Circle()
                                .fill(block.color)
                                .frame(width: 10, height: 10)
                            if index < blocks.count - 1 {
                                Rectangle()
                                    .fill(Color(.systemGray4))
                                    .frame(width: 2)
                                    .frame(maxHeight: .infinity)
                            }
                        }
                        
                        // Content
                        VStack(alignment: .leading, spacing: 6) {
                            Text(block.title)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text(block.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(block.color.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.bottom, 8)
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }
}
```

**Rules for timelines:**
- Time column: fixed width (60-70pt), right-aligned, `.caption` weight
- Connector dots: 8-12pt, filled with block color
- Connector lines: 1-2pt width, `.systemGray4` color
- Content blocks: subtle background tint of category color at 0.06-0.12 opacity
- Spacing between blocks: 4-12pt (tight creates rhythm)

### Color System Template
```swift
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .init(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        self.init(
            red: Double((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: Double((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: Double((rgbValue & 0x0000FF)) / 255.0
        )
    }
}

enum AppColors {
    // Define semantic colors, not just values
    static let primary = Color(hex: "2A9D8F")
    static let background = Color(.systemBackground)
    static let cardBackground = Color(.secondarySystemBackground)
    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
}
```

**Rules for color:**
- Always use semantic system colors for backgrounds and text (`.label`, `.systemBackground`)
- Custom colors only for accents, categories, and branding
- Dark mode: never hardcode white or black. Use `.label` and `.systemBackground`
- Category colors should work at both full opacity (icons) and low opacity (backgrounds at 0.08-0.15)
- Test all colors on both light and dark backgrounds
- Maximum 5-6 accent colors in any single app

### Button / CTA Template
```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppColors.primary)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .padding(.horizontal, 20)
    }
}
```

**Rules for buttons:**
- Primary CTA: full width, 48-56pt height, bold text, filled background
- Secondary: outlined or ghost style, never competes visually with primary
- One primary button per screen maximum
- Minimum tap target: 44x44pt (Apple HIG requirement)
- Use `.sensoryFeedback(.impact, trigger: ...)` on iOS 17+ for button taps

## Animation Reference

### Spring Presets
```swift
enum Springs {
    static let snappy = Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let gentle = Animation.spring(response: 0.5, dampingFraction: 0.8)
    static let bouncy = Animation.spring(response: 0.4, dampingFraction: 0.5)
}
```

### Entrance Animations (Staggered)
```swift
ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
    ItemRow(item: item)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(
            .spring(response: 0.4, dampingFraction: 0.8)
            .delay(Double(index) * 0.05),
            value: appeared
        )
}
```

**Rules for animation:**
- Stagger delay: 0.03-0.08s per item (faster = more fluid, slower = more dramatic)
- Never exceed 0.4s total animation duration for UI interactions
- Entrance animations: fade + translate (10-20pt), never scale
- Exit animations: faster than entrance (0.6-0.8x duration)
- Use `.spring()` for interactive elements, `.easeInOut` for non-interactive transitions
- matchedGeometryEffect for shared element transitions between views

## Typography Scale

```swift
// Use system dynamic type — never hardcode point sizes
.font(.largeTitle)      // Screen titles, hero numbers
.font(.title)           // Section headers
.font(.title2)          // Card titles
.font(.title3)          // Prominent labels
.font(.headline)        // Button text, emphasis
.font(.body)            // Default reading text
.font(.subheadline)     // Secondary info, descriptions
.font(.caption)         // Timestamps, metadata
.font(.caption2)        // Badges, very small labels
```

**Rules for type:**
- Use `.fontWeight()` for emphasis within a size, not a larger font
- Maximum 3 font sizes per screen (e.g., title + body + caption)
- Line spacing: default is fine for most cases; only adjust for long-form text
- Truncate with `.lineLimit()` rather than shrinking text

## SF Symbols Usage

```swift
// Preferred: filled variants for selected/active states
Image(systemName: "heart.fill")       // Active
Image(systemName: "heart")            // Inactive

// Size with font, not frame
Image(systemName: "star.fill")
    .font(.title2)                     // Preferred
    .foregroundStyle(.yellow)

// Symbol rendering modes
Image(systemName: "chart.bar.fill")
    .symbolRenderingMode(.hierarchical) // Subtle depth
    .foregroundStyle(.blue)
```

**Rules for symbols:**
- Use `.fill` variants for active/selected states, outline for inactive
- Size symbols with `.font()`, not `.frame()` — they scale with Dynamic Type
- Use `.symbolRenderingMode(.hierarchical)` for depth in single-color icons
- Match symbol weight to nearby text weight

## Accessibility Checklist

Every view must:
- [ ] Support Dynamic Type (no hardcoded font sizes)
- [ ] Work in both light and dark mode
- [ ] Have sufficient color contrast (4.5:1 for text)
- [ ] Include `.accessibilityLabel()` on icon-only buttons
- [ ] Respect `.accessibilityReduceMotion` for animations
- [ ] Have minimum 44x44pt tap targets

```swift
// Reduce motion check
@Environment(\.accessibilityReduceMotion) var reduceMotion

withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.7)) {
    // animated change
}
```

## Anti-Patterns — Never Do These

1. **Never use `.frame(width: UIScreen.main.bounds.width)`** — Use `.frame(maxWidth: .infinity)` or GeometryReader
2. **Never nest ScrollViews** without explicit frame heights on inner scrolls
3. **Never use Color.white or Color.black for backgrounds** — Use `.systemBackground`
4. **Never hardcode padding values below 8pt** — Things will look cramped
5. **Never use `.onAppear` for one-time setup when `.task` is available** (iOS 15+)
6. **Never put business logic in Views** — Use ViewModels with `@Observable` or `ObservableObject`
7. **Never use NavigationView** — Use `NavigationStack` (iOS 16+)
8. **Never create custom tab bars** unless requirements genuinely cannot be met by `TabView`
9. **Never animate layout changes with `.animation(.default)`** — Always be explicit about timing
10. **Never use ZStack for overlays when `.overlay()` modifier works**

## Code Quality Standards

### File Organization
```
// MARK: - Properties (State, Bindings, Constants)
// MARK: - Body
// MARK: - Subviews (extracted as computed properties or private methods)
// MARK: - Actions (button handlers, gesture callbacks)
```

### Naming
- Views: `NounView` (e.g., `SwipeCardView`, `ScheduleView`)
- View Models: `NounViewModel` (e.g., `ScheduleViewModel`)
- Subviews: descriptive, no "View" suffix when private (e.g., `headerSection`, `cardContent`)
- Actions: verb-first (e.g., `handleSwipe()`, `generateSchedule()`, `dismissCard()`)

### Preview Strategy
Every view must have a preview with realistic data:
```swift
#Preview {
    SwipeCardView(category: .preview)
}

// In the model:
extension Category {
    static let preview = Category(
        name: "Exercise",
        icon: "figure.run",
        description: "Daily training session",
        color: "#E63946",
        defaultDuration: 60,
        timePreference: .morning
    )
}
```

## Quick Decision Guide

| Question | Answer |
|----------|--------|
| List or ScrollView? | ScrollView + LazyVStack for custom layouts, List for standard rows with swipe actions |
| Sheet or NavigationLink? | Sheet for independent tasks, NavigationLink for drill-down |
| @State or @Observable? | @State for view-local, @Observable ViewModel for shared/complex state |
| GeometryReader? | Only when you truly need parent dimensions. Try other approaches first. |
| Custom shape or cornerRadius? | `.clipShape(RoundedRectangle(cornerRadius:))` — skip custom shapes unless irregular |
| Gradient or solid? | Solid for functional UI, gradient only for hero elements or branding |
