# DRAKO UI Design Spec
### Visual design direction for Figma MCP + Cursor

---

## Design Direction
**Aesthetic**: Dark, modern, slightly futuristic — think a premium scheduling app meets AI assistant
**Vibe**: Clean and focused, not cluttered. The avatar is the star, schedule is the substance.
**NOT**: Generic SaaS, corporate blue, or overly playful

## Color Palette
```
--bg-primary:     #0A0A0F      (near-black)
--bg-secondary:   #14141F      (dark card background)
--bg-tertiary:    #1E1E2E      (elevated surface)
--accent-primary: #6C5CE7      (purple — DRAKO's color)
--accent-glow:    #A855F7      (lighter purple for glows)
--accent-success: #10B981      (green — confirmed events)
--accent-warning: #F59E0B      (amber — conflicts)
--accent-danger:  #EF4444      (red — errors)
--text-primary:   #F8FAFC      (white text)
--text-secondary: #94A3B8      (muted text)
--text-muted:     #475569      (timestamps, labels)
--border:         #1E293B      (subtle borders)
```

## Typography
- **Headings**: Space Grotesk or similar geometric sans
- **Body**: Inter or system font stack
- **Monospace**: JetBrains Mono (for times/data)
- **Scale**: 14px base, 1.5 line height

## Layout (Desktop)
```
┌──────────────────────────────────────────────┐
│  DRAKO 🐉  Voice Schedule Builder    [●]     │  ← Header bar
├──────────────────────┬───────────────────────┤
│                      │                       │
│    TAVUS VIDEO       │    SCHEDULE VIEW      │
│    (avatar face)     │                       │
│                      │    ┌─────────────┐    │
│    ┌──────────┐      │    │ 9:00 Standup│    │
│    │          │      │    └─────────────┘    │
│    │  🐉      │      │    ┌─────────────┐    │
│    │          │      │    │12:00 Lunch  │    │
│    └──────────┘      │    └─────────────┘    │
│                      │    ┌─────────────┐    │
│    [Voice active]    │    │14:00 Focus  │    │
│                      │    └─────────────┘    │
│                      │                       │
├──────────────────────┴───────────────────────┤
│  💬 CopilotKit Chat (collapsed by default)   │  ← Text fallback
└──────────────────────────────────────────────┘
```

## Layout (Mobile — iPhone)
```
┌────────────────────┐
│  DRAKO 🐉          │
├────────────────────┤
│                    │
│   TAVUS VIDEO      │  ← Top half
│   (avatar face)    │
│                    │
├────────────────────┤
│   SCHEDULE VIEW    │  ← Bottom half (scrollable)
│   ┌──────────────┐ │
│   │ 9:00 Standup │ │
│   └──────────────┘ │
│   ┌──────────────┐ │
│   │12:00 Lunch   │ │
│   └──────────────┘ │
│                    │
│  [💬 Chat toggle]  │
└────────────────────┘
```

## Component Specs

### Schedule Card
- Rounded corners (12px)
- Left color bar (4px) indicating category/status
- Time in monospace font, left-aligned
- Title in medium weight, right of time
- Subtle hover glow (accent-primary at 10% opacity)
- Slide-in animation when added
- Slide-out animation when removed

### Video Container
- 16:9 or 1:1 aspect ratio
- Rounded corners (16px)
- Subtle purple glow border when voice is active
- Pulse animation on avatar border when DRAKO is speaking

### Voice Activity Indicator
- Small waveform animation below video
- Purple when DRAKO speaks, green when user speaks
- Flatline when idle

## Animations
- Schedule cards: `ease-out 300ms` slide-in from right
- Conflicts: shake animation + amber border flash
- Confirmations: brief green pulse on the card
- Page load: stagger cards in with 50ms delay between each

## Responsive Breakpoints
- Desktop: 1024px+ (side-by-side layout)
- Tablet: 768-1023px (stacked, video smaller)
- Mobile: <768px (fully stacked, video top)
