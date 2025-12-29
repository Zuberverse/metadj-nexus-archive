# Accessibility Validation with axe-core

**Last Modified**: 2025-12-29 12:01 EST

## Overview

MetaDJ Nexus integrates **axe-core** for automatic accessibility validation during development. This provides real-time feedback on WCAG 2.1 AA compliance issues directly in the browser console.

## Installation

```bash
npm install --save-dev @axe-core/react
```

## How It Works

The axe-core integration:
- **Only runs in development** (`NODE_ENV === 'development'`)
- **Automatically checks** the DOM for accessibility violations
- **Logs issues** to the browser console with detailed information
- **1-second delay** after React mounting for better performance
- **Zero production impact** (code is not included in production builds)

## Setup

The integration is already configured in:
- `src/lib/axe.ts` - Axe initialization logic
- `src/app/layout.tsx` - Automatic initialization in development

No additional setup required once the package is installed.

## Using Axe-core

### Viewing Accessibility Issues

1. **Run the development server**:
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Look for axe-core violations**:
   - Violations appear as console warnings/errors
   - Each violation includes:
     - Rule name and description
     - Affected DOM elements
     - Severity level
     - Remediation guidance
     - Links to documentation

### Violation Categories

**Critical Issues**:
- Missing form labels
- Insufficient color contrast
- Missing alt text on images
- Invalid ARIA attributes

**Moderate Issues**:
- Non-semantic HTML usage
- Missing landmark regions
- Redundant ARIA attributes

**Minor Issues**:
- Missing page title
- Missing language attribute
- Non-descriptive link text

### Example Output

```
axe-core: Accessibility violation found
Rule: color-contrast
Description: Ensures the contrast between foreground and background colors meets WCAG AA standards
Severity: serious
Element: <button class="text-gray-400 bg-gray-800">Click me</button>
Help: https://dequeuniversity.com/rules/axe/4.4/color-contrast
```

## Testing Coverage

### Manual Testing with axe-core

The integration validates:
- ✅ WCAG 2.1 Level A compliance
- ✅ WCAG 2.1 Level AA compliance
- ✅ Color contrast (4.5:1 for normal text, 3:1 for large text)
- ✅ Form labels and ARIA attributes
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Semantic HTML structure

### Automated Testing

MetaDJ Nexus also has:
- **25 dedicated accessibility tests** (`tests/accessibility.test.tsx`)
- **Form label validation**
- **ARIA attribute verification**
- **Keyboard navigation tests**
- **Touch target size validation**

See `3-projects/5-software/metadj-nexus/docs/TESTING.md` for complete test suite documentation.

## Disabling Axe-core

If you need to temporarily disable axe-core:

```typescript
// src/app/layout.tsx
// Comment out these lines:
// if (process.env.NODE_ENV === 'development') {
//   initAxe();
// }
```

## Rules Configuration

Current enabled rules (in `src/lib/axe.ts`):

```typescript
rules: [
  { id: 'color-contrast', enabled: true },
  { id: 'label', enabled: true },
  { id: 'button-name', enabled: true },
  { id: 'link-name', enabled: true },
  { id: 'image-alt', enabled: true },
  { id: 'input-button-name', enabled: true },
  { id: 'form-field-multiple-labels', enabled: true },
]
```

To customize rules, edit the `initAxe()` function in `src/lib/axe.ts`.

## Common Issues and Solutions

### Issue: "Module not found: @axe-core/react"

**Solution**: Install the package
```bash
npm install --save-dev @axe-core/react
```

### Issue: Axe-core not logging violations

**Solutions**:
1. Verify you're in development mode (`NODE_ENV === 'development'`)
2. Check browser console settings (warnings/errors enabled)
3. Ensure axe-core initialized (look for green success message)

### Issue: Too many warnings

**Solution**: Focus on critical/serious violations first
- Use browser console filtering
- Fix high-severity issues before minor ones

## Resources

- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [axe-core Rules Documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Deque University](https://dequeuniversity.com/) - Accessibility training

## Best Practices

1. **Check console regularly** during development
2. **Fix violations as you build** rather than accumulating debt
3. **Test with keyboard navigation** in addition to axe-core
4. **Use screen readers** for real-world validation (VoiceOver, NVDA, JAWS)
5. **Run manual audits** with Lighthouse or WAVE browser extension
6. **Review automated test coverage** for comprehensive validation

---

**Status**: ✅ Configured and ready to use
**Next Step**: Install @axe-core/react and start development
