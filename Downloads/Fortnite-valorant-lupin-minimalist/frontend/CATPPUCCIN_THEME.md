# 🎨 Catppuccin Theme for LUPIN

## Overview
LUPIN now features the beautiful **Catppuccin** color scheme! We use **Mocha** (dark) and **Latte** (light) flavors with **Lavender** as the primary accent.

## Color Palette

### 🌙 Mocha (Dark Mode - Default)
```
Base Colors:
- Background:  #1e1e2e  (Base - main background)
- Secondary:   #181825  (Mantle - darker panels)
- Tertiary:    #313244  (Surface0 - cards)

Text Colors:
- Primary:     #cdd6f4  (Text - main text)
- Dimmed:      #a6adc8  (Subtext0)

Accent Colors:
- Primary:     #b4befe  (Lavender)
- Hover:       #cba6f7  (Mauve)
- Link:        #89b4fa  (Blue)
- Tertiary:    #f5c2e7  (Pink)

Status Colors:
- Success:     #a6e3a1  (Green)
- Danger:      #f38ba8  (Red)
- Warning:     #f9e2af  (Yellow)
```

### ☀️ Latte (Light Mode)
```
Base Colors:
- Background:  #eff1f5  (Base)
- Secondary:   #e6e9ef  (Mantle)
- Tertiary:    #dce0e8  (Surface0)

Text Colors:
- Primary:     #4c4f69  (Text)
- Dimmed:      #6c6f85  (Subtext0)

Accent Colors:
- Primary:     #8839ef  (Mauve)
- Hover:       #7c3aed  (Mauve darker)
- Link:        #1e66f5  (Blue)
- Tertiary:    #ea76cb  (Pink)

Status Colors:
- Success:     #40a02b  (Green)
- Danger:      #d20f39  (Red)
- Warning:     #df8e1d  (Yellow)
```

## Features

### 🔘 Floating Theme Toggle
- **Position**: Fixed at bottom-right corner
- **Size**: 60x60px circular button
- **Icon**: 🌙 for dark mode, ☀️ for light mode
- **Hover**: Scales to 1.1x and rotates 15°
- **Shadow**: Subtle shadow for depth
- **Z-index**: 1000 (always on top)

### ✨ LUPIN Title Gradient
The title uses a beautiful gradient that works in both themes:
```css
background: linear-gradient(135deg, 
  var(--primary) 0%, 
  var(--accent) 50%, 
  var(--accent-secondary) 100%
);
```
- Mocha: Lavender → Blue → Pink
- Latte: Mauve → Blue → Pink

### 🎨 Component Styling
All components now use Catppuccin colors:
- Input fields with proper focus states
- Buttons with hover animations
- Panels with layered backgrounds
- Messages with readable text colors
- Scrollbars themed to match

## Why Catppuccin?

1. **Eye Comfort**: Soft pastel colors reduce eye strain
2. **Consistency**: Used across many popular apps
3. **Accessibility**: Great contrast ratios
4. **Beauty**: Aesthetically pleasing color harmony
5. **Community**: Large community with ports for many apps

## CSS Variables

The theme uses CSS custom properties for easy theming:

```css
/* Light mode (default) */
:root {
  --bg: #eff1f5;
  --text: #4c4f69;
  --primary: #8839ef;
  /* ... */
}

/* Dark mode override */
[data-theme="dark"] {
  --bg: #1e1e2e;
  --text: #cdd6f4;
  --primary: #b4befe;
  /* ... */
}
```

## Implementation Details

### State Management
- Theme stored in `localStorage` as `'lupin_theme'`
- Default: `'dark'` (Mocha)
- Applied via `data-theme` attribute on `<html>`
- Persists across browser sessions

### Transitions
- Smooth 0.3s transitions for theme changes
- Button hover animations
- Focus state glow effects

### Responsive Design
- Toggle button scales down on mobile (50x50px)
- Maintains accessibility on all screen sizes
- Touch-friendly hit targets

## References
- Official Catppuccin: https://catppuccin.com/
- Mocha Palette: https://catppuccin.com/palette#mocha
- Latte Palette: https://catppuccin.com/palette#latte

## Credits
Theme colors from [Catppuccin](https://github.com/catppuccin/catppuccin) 🐈
Licensed under MIT
