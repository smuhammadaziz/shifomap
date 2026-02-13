# Quick Theme Update Template

## Copy-Paste Template for Any Screen

### 1. Add imports (top of file):
```typescript
import { useThemeStore } from '../store/theme-store';  // adjust path as needed
import { getColors } from '../lib/theme';  // adjust path as needed
```

### 2. Add hooks in component:
```typescript
const theme = useThemeStore((s) => s.theme);
const colors = getColors(theme);
```

### 3. Common replacements:

#### Containers & Backgrounds:
```typescript
// Before: style={{ backgroundColor: '#09090b' }}
// After:  style={{ backgroundColor: colors.background }}

// Before: style={{ backgroundColor: '#18181b' }}
// After:  style={{ backgroundColor: colors.backgroundCard }}

// Before: style={{ backgroundColor: '#f8f9fa' }}
// After:  style={{ backgroundColor: colors.backgroundSecondary }}
```

#### Text:
```typescript
// Before: style={{ color: '#ffffff' }}
// After:  style={{ color: colors.text }}

// Before: style={{ color: '#a1a1aa' }}
// After:  style={{ color: colors.textSecondary }}

// Before: style={{ color: '#71717a' }}
// After:  style={{ color: colors.textTertiary }}
```

#### Borders:
```typescript
// Before: style={{ borderColor: '#27272a' }}
// After:  style={{ borderColor: colors.border }}

// Before: style={{ borderColor: '#7c3aed' }} (focused)
// After:  style={{ borderColor: colors.borderFocus }}
```

#### Brand Colors:
```typescript
// Before: color="#8b5cf6" or color="#7c3aed"
// After:  color={colors.primary}

// Before: color="#a78bfa"
// After:  color={colors.primaryLight}

// Before: backgroundColor: 'rgba(139, 92, 246, 0.1)'
// After:  backgroundColor: colors.primaryBg
```

#### Status Colors:
```typescript
// Before: color="#22c55e"
// After:  color={colors.success}

// Before: color="#f59e0b"
// After:  color={colors.warning}

// Before: color="#ef4444"
// After:  color={colors.error}
```

## Complete Example

### Before:
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hello</Text>
        <TouchableOpacity style={styles.button}>
          <Ionicons name="settings" size={24} color="#a78bfa" />
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardText}>Card content</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  buttonText: {
    color: '#a1a1aa',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#18181b',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardText: {
    color: '#ffffff',
  },
});
```

### After:
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';

export default function MyScreen() {
  const theme = useThemeStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Hello</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Ionicons name="settings" size={24} color={colors.primaryLight} />
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <Text style={[styles.cardText, { color: colors.text }]}>Card content</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {
    marginLeft: 8,
  },
  card: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardText: {
    // No static color
  },
});
```

## Search & Replace Patterns (Use with caution!)

These can help speed up updates, but always verify manually:

1. Find `backgroundColor: '#09090b'` → Replace with `backgroundColor: colors.background`
2. Find `backgroundColor: '#18181b'` → Replace with `backgroundColor: colors.backgroundCard`
3. Find `color: '#ffffff'` → Replace with `color: colors.text`
4. Find `color: '#a1a1aa'` → Replace with `color: colors.textSecondary`
5. Find `borderColor: '#27272a'` → Replace with `borderColor: colors.border`
6. Find `color="#ffffff"` → Replace with `color={colors.text}`
7. Find `color="#a78bfa"` → Replace with `color={colors.primaryLight}`

**Note:** After search & replace, you MUST:
1. Add the theme imports
2. Add the theme hooks
3. Wrap the replaced values in curly braces if needed
4. Change the style from static StyleSheet to dynamic inline styles

## Quick Checklist

- [ ] Added theme imports
- [ ] Added theme hooks (theme, colors)
- [ ] Updated all background colors
- [ ] Updated all text colors
- [ ] Updated all border colors
- [ ] Updated all icon colors
- [ ] Updated ActivityIndicator colors
- [ ] Updated LinearGradient colors (if any)
- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] Tested theme switching
