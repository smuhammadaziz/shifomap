# Dark/Light Mode Implementation Guide

## ✅ Completed Implementation

### Core Infrastructure
1. **Theme Store** (`store/theme-store.ts`) - Created
   - Manages theme state (light/dark)
   - Persists theme preference to AsyncStorage
   - Defaults to light mode on first launch

2. **Theme Colors** (`lib/theme.ts`) - Created
   - Complete color palette for light mode
   - Complete color palette for dark mode
   - Helper function `getColors(theme)` to get active theme colors

3. **Translations** (`lib/content.json`) - Updated
   - Added theme-related translations:
     - `theme`: Theme label
     - `themeLight`: Light mode label
     - `themeDark`: Dark mode label

### Updated Screens (Full Theme Support)

#### ✅ Core Screens
- **_layout.tsx** - Root layout with theme hydration and StatusBar
- **settings.tsx** - Settings screen with dark/light mode switcher UI
- **profile.tsx** - Profile dashboard screen
- **SplashScreen.tsx** - Splash screen with theme support

#### ✅ Tab Screens
- **(tabs)/index.tsx** - Home screen
- **(tabs)/appointments.tsx** - Appointments tab
- **(tabs)/pill-reminder.tsx** - Pill reminder tab

#### ✅ Auth Screens
- **(auth)/login.tsx** - Login screen

### How the Theme System Works

1. **Import Required Dependencies:**
```typescript
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';
```

2. **Get Theme and Colors:**
```typescript
const theme = useThemeStore((s) => s.theme);
const colors = getColors(theme);
```

3. **Apply Dynamic Colors:**
```typescript
// Instead of hardcoded colors:
<View style={{ backgroundColor: '#09090b' }} />

// Use theme colors:
<View style={{ backgroundColor: colors.background }} />
```

4. **Available Color Variables:**
- `colors.background` - Main background
- `colors.backgroundSecondary` - Secondary background
- `colors.backgroundCard` - Card background
- `colors.backgroundInput` - Input background
- `colors.text` - Primary text
- `colors.textSecondary` - Secondary text
- `colors.textTertiary` - Tertiary/muted text
- `colors.textPlaceholder` - Placeholder text
- `colors.border` - Border color
- `colors.borderFocus` - Focused border color
- `colors.primary` - Primary brand color
- `colors.primaryLight` - Light primary color
- `colors.primaryBg` - Primary background (transparent)
- `colors.success`, `colors.warning`, `colors.error`, `colors.info`
- And many more (see `lib/theme.ts`)

## 📋 Remaining Screens to Update

### Auth Screens
- [ ] `(auth)/password.tsx`
- [ ] `(auth)/complete-profile.tsx`
- [ ] `(auth)/language.tsx`

### Main Screens
- [ ] `clinics.tsx`
- [ ] `clinic/[id].tsx`
- [ ] `doctor/[id].tsx`
- [ ] `branch/[id].tsx`
- [ ] `service/[id].tsx`
- [ ] `clinic-services/[id].tsx`
- [ ] `book.tsx`
- [ ] `services-results.tsx`
- [ ] `appointments.tsx` (main appointments screen, not tab)
- [ ] `appointment/[id].tsx`
- [ ] `index.tsx` (root index)

### Components
- [ ] `components/Skeleton.tsx`
- [ ] `components/FeaturedClinics.tsx`
- [ ] `components/Specialties.tsx`
- [ ] `components/CustomTabBar.tsx`
- [ ] `components/ServiceFiltersModal.tsx`
- [ ] `components/SaveServiceStar.tsx`

## 🔧 Step-by-Step Guide to Update a Screen

### 1. Import Theme Dependencies
Add these imports at the top of your file:
```typescript
import { useThemeStore } from '../store/theme-store'; // or '../../store/theme-store'
import { getColors } from '../lib/theme'; // or '../../lib/theme'
```

### 2. Add Theme Hooks in Component
```typescript
const theme = useThemeStore((s) => s.theme);
const colors = getColors(theme);
```

### 3. Update Inline Styles
Replace all hardcoded colors with `colors.*` values:

**Before:**
```typescript
<View style={{ backgroundColor: '#09090b' }}>
  <Text style={{ color: '#ffffff' }}>Hello</Text>
</View>
```

**After:**
```typescript
<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Hello</Text>
</View>
```

### 4. Update StyleSheet Definitions
Remove hardcoded colors from StyleSheet definitions and apply them inline:

**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#09090b',
  },
  text: {
    color: '#ffffff',
  },
});

// Usage:
<View style={styles.container}>
  <Text style={styles.text}>Hello</Text>
</View>
```

**After:**
```typescript
const styles = StyleSheet.create({
  container: {
    // Remove backgroundColor
  },
  text: {
    // Remove color
  },
});

// Usage:
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <Text style={[styles.text, { color: colors.text }]}>Hello</Text>
</View>
```

### 5. Common Color Mappings

| Old Dark Color | Theme Variable |
|----------------|----------------|
| `#09090b` | `colors.background` |
| `#18181b` | `colors.backgroundCard` |
| `#ffffff` | `colors.text` |
| `#a1a1aa` | `colors.textSecondary` |
| `#71717a` | `colors.textTertiary` |
| `#27272a` | `colors.border` |
| `#7c3aed` / `#8b5cf6` | `colors.primary` |
| `#a78bfa` | `colors.primaryLight` |
| `#22c55e` | `colors.success` |
| `#f59e0b` | `colors.warning` |
| `#ef4444` | `colors.error` |

### 6. Special Cases

#### Linear Gradients
```typescript
const gradientColors = theme === 'light' 
  ? [colors.background, colors.backgroundSecondary, colors.backgroundSecondary]
  : ['#0a0a0f', '#12121a', '#1a1a24'];

<LinearGradient colors={gradientColors} style={styles.container}>
  {/* content */}
</LinearGradient>
```

#### Icons
```typescript
// Before:
<Ionicons name="star" size={20} color="#ffffff" />

// After:
<Ionicons name="star" size={20} color={colors.text} />
```

#### ActivityIndicator
```typescript
// Before:
<ActivityIndicator size="large" color="#8b5cf6" />

// After:
<ActivityIndicator size="large" color={colors.primary} />
```

## 🎨 Theme Switcher UI

The theme switcher has been added to the Settings screen. It follows the same pattern as the language switcher:

```typescript
<View style={styles.languageSwitcher}>
  <TouchableOpacity
    style={[
      styles.langOption,
      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
      theme === 'light' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
    ]}
    onPress={() => selectTheme('light')}
  >
    <Text style={[
      styles.langOptionText,
      { color: colors.textSecondary },
      theme === 'light' && { color: colors.primaryLight, fontWeight: '600' }
    ]}>
      {t.themeLight}
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[
      styles.langOption,
      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
      theme === 'dark' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
    ]}
    onPress={() => selectTheme('dark')}
  >
    <Text style={[
      styles.langOptionText,
      { color: colors.textSecondary },
      theme === 'dark' && { color: colors.primaryLight, fontWeight: '600' }
    ]}>
      {t.themeDark}
    </Text>
  </TouchableOpacity>
</View>
```

## 🚀 Testing

1. **Test Light Mode (Default):**
   - Clear app data
   - Relaunch app
   - Should load in light mode by default

2. **Test Theme Switching:**
   - Navigate to Settings
   - Toggle between Light and Dark modes
   - Verify all colors update correctly

3. **Test Persistence:**
   - Change theme
   - Close and reopen app
   - Theme should persist

## 📝 Notes

- **Default Theme:** Light mode is the default when users first launch the app
- **Persistence:** Theme preference is saved to AsyncStorage and persists across app restarts
- **StatusBar:** The StatusBar style automatically adapts (dark for light theme, light for dark theme)
- **Gradients:** Some screens use LinearGradient - these need special handling for light mode
- **Component Props:** When passing colors to child components, ensure you pass the `colors` object as a prop

## 🎯 Priority Order for Remaining Updates

1. **High Priority:** Frequently visited screens
   - `clinic/[id].tsx`
   - `service/[id].tsx`
   - `appointment/[id].tsx`
   - `book.tsx`

2. **Medium Priority:** Occasionally visited screens
   - `clinics.tsx`
   - `doctor/[id].tsx`
   - `branch/[id].tsx`
   - `(auth)/password.tsx`
   - `(auth)/complete-profile.tsx`

3. **Low Priority:** Components and rarely visited screens
   - All components
   - `(auth)/language.tsx`
   - `services-results.tsx`

## 🐛 Common Issues and Solutions

### Issue: Colors not updating when theme changes
**Solution:** Make sure you're using `colors.*` instead of hardcoded values everywhere, including inline styles.

### Issue: White flash when switching themes
**Solution:** This is normal due to React Native re-rendering. Consider adding a fade transition if needed.

### Issue: StatusBar not changing
**Solution:** Make sure `_layout.tsx` has `<StatusBar style={theme === 'light' ? 'dark' : 'light'} />`

### Issue: Some parts of screen still dark in light mode
**Solution:** Check if you missed updating any hardcoded colors. Search for `#` in the file to find them.

## 🎉 Success Criteria

A screen is fully theme-compatible when:
- ✅ No hardcoded color values remain (search for `#` in code)
- ✅ All backgrounds, text, borders, and icons use theme colors
- ✅ The screen looks good in both light and dark modes
- ✅ Theme persists when navigating away and back
- ✅ No console warnings about missing colors
