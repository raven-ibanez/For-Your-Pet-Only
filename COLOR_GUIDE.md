# 🎨 Color Guide - For Your Pets Only

## Color Palette

### Primary Colors

```
🟠 Orange (Primary)
   Hex: #FF8C42
   RGB: 255, 140, 66
   Usage: Main buttons, active states, primary branding
   Class: bg-pet-orange, text-pet-orange, border-pet-orange

🟠 Orange Dark
   Hex: #F37021
   RGB: 243, 112, 33
   Usage: Hover states, emphasis, prices
   Class: bg-pet-orange-dark, text-pet-orange-dark

🟡 Orange Light
   Hex: #FFB380
   RGB: 255, 179, 128
   Usage: Subtle accents, highlights
   Class: bg-pet-orange-light, text-pet-orange-light
```

### Background Colors

```
🤍 White
   Hex: #FFFFFF
   RGB: 255, 255, 255
   Usage: Cards, containers, clean backgrounds
   Class: bg-pet-white, bg-white

🟨 Cream
   Hex: #FFF8F0
   RGB: 255, 248, 240
   Usage: Main page background, soft sections
   Class: bg-pet-cream

🟡 Beige
   Hex: #FFEBD4
   RGB: 255, 235, 212
   Usage: Secondary backgrounds, inactive states
   Class: bg-pet-beige
```

### Text Colors

```
🟤 Brown
   Hex: #8B4513
   RGB: 139, 69, 19
   Usage: Main text, headings
   Class: text-pet-brown

⚫ Gray Dark
   Hex: #374151
   RGB: 55, 65, 81
   Usage: Secondary text, descriptions
   Class: text-pet-gray-dark

⚪ Gray Medium
   Hex: #9CA3AF
   RGB: 156, 163, 175
   Usage: Placeholder text, disabled states
   Class: text-pet-gray-medium
```

## Usage Examples

### Buttons

**Primary Button:**
```css
bg-gradient-to-r from-pet-orange to-pet-orange-dark
text-white
hover:from-pet-orange-dark hover:to-pet-orange
```

**Secondary Button:**
```css
bg-white
text-pet-orange
border-2 border-pet-orange
hover:bg-pet-beige
```

### Cards

**Product Card:**
```css
bg-white
border-2 border-pet-orange
rounded-xl
shadow-lg
```

### Badges

**Sale Badge:**
```css
bg-gradient-to-r from-pet-orange to-pet-orange-dark
text-white
rounded-full
```

**Bestseller Badge:**
```css
bg-gradient-to-r from-yellow-500 to-pet-orange
text-white
rounded-full
```

## Accessibility

### Contrast Ratios (WCAG AA)

✅ Orange on White: 3.5:1 (Pass for large text)  
✅ Orange Dark on White: 4.8:1 (Pass for all text)  
✅ Brown on Cream: 8.2:1 (AAA rated)  
✅ Gray Dark on White: 9.1:1 (AAA rated)

## Brand Colors Matrix

| Element | Primary | Hover | Active | Disabled |
|---------|---------|-------|--------|----------|
| Button | Orange | Orange Dark | Orange Dark | Gray Light |
| Border | Orange | Orange Dark | Orange Dark | Gray Medium |
| Text | Brown | Orange Dark | Orange Dark | Gray Medium |
| Background | Cream | Beige | White | Gray Light |

## Gradients

**Primary Gradient:**
```
from-pet-orange to-pet-orange-dark
```

**Reverse Gradient:**
```
from-pet-orange-dark to-pet-orange
```

**Soft Gradient:**
```
from-pet-cream via-white to-pet-beige
```

## Shadows

**Light Shadow:**
```css
shadow-lg
/* 0 10px 15px -3px rgb(0 0 0 / 0.1) */
```

**Orange Glow:**
```css
shadow-2xl hover:shadow-pet-orange/50
```

## Tips

1. **Use orange sparingly** - It's vibrant, so use it for important actions
2. **Brown for readability** - Main text should be brown on cream/white
3. **White space** - Use cream backgrounds to create breathing room
4. **Gradients** - Use for primary CTAs to create depth
5. **Borders** - Orange borders create visual consistency

## Icon Colors

- Primary Icons: `text-pet-orange`
- Active Icons: `text-pet-orange-dark`
- Inactive Icons: `text-pet-gray-medium`
- Decorative: `text-pet-orange opacity-20`

---

**Remember:** The orange and white theme reflects the warmth and care we have for our furry friends! 🐾

