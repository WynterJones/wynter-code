# Accessibility Audit

> WCAG 2.1 Level AA compliance tracking

**Last Updated:** 2025-12-26
**Score:** 6.5/10
**Status:** Needs Improvement

---

## How to get 10/10

1. All interactive elements have accessible names (aria-label or visible text)
2. Keyboard navigation works throughout the entire application
3. Focus indicators are visible on all focusable elements
4. Color contrast meets WCAG AA requirements (4.5:1 for text, 3:1 for UI)
5. All images have meaningful alt text
6. Forms have properly associated labels
7. Modal dialogs trap focus and are announced to screen readers
8. Dynamic content changes are announced via ARIA live regions
9. Skip links for main content navigation
10. Reduced motion preferences are respected

---

## Current Strengths

| Area | Implementation | Notes |
|------|----------------|-------|
| Focus Indicators | Good | `focus-visible:ring-2` used consistently on Button, IconButton, Input, Checkbox |
| Keyboard Navigation | Good | Most dialogs/modals handle Escape key (81 occurrences), CommandPalette has full arrow key support |
| Image Alt Text | Good | Most images have alt attributes (26 `<img>` tags, 26 with alt) |
| Form Labels | Partial | Checkbox component properly uses `htmlFor`, but only 5 total `htmlFor` usages found |
| Semantic Roles | Limited | Only CommandPalette uses proper ARIA roles (`role="dialog"`, `role="listbox"`, `role="option"`) |
| Screen Reader Text | Minimal | Only 1 instance of `sr-only` class found (in Checkbox) |

---

## Critical Issues

### CRITICAL: IconButton Missing Accessible Names

**Location:** Throughout codebase (300+ usages)
**WCAG Criterion:** 4.1.2 Name, Role, Value

The `IconButton` component renders icon-only buttons without requiring accessible names:

```tsx
// src/components/ui/IconButton.tsx - No aria-label requirement
<IconButton size="sm" onClick={onClose}>
  <X className="w-4 h-4" />
</IconButton>
```

**Impact:** Screen readers cannot announce the purpose of these buttons.

**Recommendation:**
- Add required `aria-label` prop to IconButton
- Or wrap with Tooltip and use `aria-describedby`

**Affected Files (sample):**
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/ui/Modal.tsx` (close button)
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/prompt/PromptInput.tsx` (send/stop buttons)
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/files/FileTreeToolbar.tsx`
- All popup/modal headers

---

### HIGH: Tooltip Not Accessible to Screen Readers

**Location:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/ui/Tooltip.tsx`
**WCAG Criterion:** 1.3.1 Info and Relationships

The Tooltip component only shows on hover, not on focus:

```tsx
onMouseEnter={() => setIsVisible(true)}
onMouseLeave={() => setIsVisible(false)}
// Missing: onFocus, onBlur handlers
```

**Impact:** Keyboard-only users cannot access tooltip content.

**Recommendation:** Add `onFocus` and `onBlur` handlers, set `aria-describedby` on trigger element.

---

### HIGH: FileTree/FileBrowser Missing Keyboard Navigation

**Location:**
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/files/FileTree.tsx`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/files/FileTreeNode.tsx`

**WCAG Criterion:** 2.1.1 Keyboard

File tree nodes have click handlers but no keyboard support for:
- Arrow key navigation between items
- Enter/Space to open files or toggle folders
- No `role="tree"` or `role="treeitem"` semantics

**Impact:** Keyboard users cannot navigate the file tree.

---

### HIGH: Interactive Divs Without Proper Semantics

**Location:** Throughout codebase
**WCAG Criterion:** 4.1.2 Name, Role, Value

Found 7 instances of `<div onClick=...>` which are not keyboard accessible:

- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/tools/bookmarks/AddCollectionModal.tsx`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/tools/auto-build/AutoBuildNewIssuePopup.tsx`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/files/FileTree.tsx`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/files/FileBrowserList.tsx`

**Impact:** Interactive elements are not focusable or operable via keyboard.

**Recommendation:** Use `<button>` elements or add `role="button"`, `tabIndex={0}`, and keyboard handlers.

---

## Medium Issues

### MEDIUM: Modal Missing ARIA Attributes

**Location:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src/components/ui/Modal.tsx`
**WCAG Criterion:** 4.1.2 Name, Role, Value

The Modal component lacks:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` for title

**Current Implementation:**
```tsx
<div className="bg-bg-secondary rounded-lg...">
  {title && <h2>{title}</h2>}
</div>
```

---

### MEDIUM: Missing Form Labels

**Location:** Various input fields throughout the application
**WCAG Criterion:** 1.3.1 Info and Relationships

Only 5 instances of `htmlFor` found across 69 files with `<label>` elements. Many labels exist but are not properly associated with inputs.

**Example (SettingsPopup.tsx):** Labels without `htmlFor` connection.

---

### MEDIUM: Color Contrast Concerns

**Location:** Global styles and Tailwind config
**WCAG Criterion:** 1.4.3 Contrast (Minimum)

Color palette analysis:
- `text-secondary (#a6adc8)` on `bg-primary (#141420)` = ~6.5:1 (PASSES)
- `text-secondary (#a6adc8)` on `bg-hover (#252535)` = ~5.1:1 (PASSES)
- `accent (#cba6f7)` on `bg-primary (#141420)` = ~7.5:1 (PASSES)

**Potential Issues:**
- Disabled states use `opacity-50` which may reduce contrast below thresholds
- Some small text (10px) used in the application may need higher contrast

---

### MEDIUM: No Skip Links

**Location:** Application root
**WCAG Criterion:** 2.4.1 Bypass Blocks

No skip navigation links exist to bypass repetitive content.

---

## Low Issues

### LOW: No ARIA Live Regions for Dynamic Content

**WCAG Criterion:** 4.1.3 Status Messages

Streaming responses, loading states, and error messages are not announced to screen readers.

**Recommendation:** Add `aria-live="polite"` regions for:
- Claude streaming responses
- Toast/notification messages
- Loading states

---

### LOW: Reduced Motion Not Consistently Respected

**WCAG Criterion:** 2.3.3 Animation from Interactions

Animations exist (e.g., `animate-spin`, modal transitions) without `prefers-reduced-motion` media query checks.

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| Tauri Desktop App | Not a web browser context | Standard web accessibility tools may not fully apply |
| Monaco Editor | Third-party component | Limited control over editor accessibility |
| Terminal (xterm.js) | Third-party component | Terminal accessibility is inherently challenging |

---

## Recommended Priority Actions

1. **CRITICAL:** Add `aria-label` prop to IconButton and enforce usage
2. **HIGH:** Add keyboard navigation to FileTree component
3. **HIGH:** Make Tooltip accessible on focus
4. **MEDIUM:** Add proper ARIA attributes to Modal component
5. **MEDIUM:** Associate all form labels with inputs using `htmlFor`/`id`

---

## Files Requiring Updates

| File | Issue | Severity |
|------|-------|----------|
| `src/components/ui/IconButton.tsx` | Add aria-label support | CRITICAL |
| `src/components/ui/Tooltip.tsx` | Add focus handlers | HIGH |
| `src/components/ui/Modal.tsx` | Add ARIA dialog attributes | MEDIUM |
| `src/components/files/FileTree.tsx` | Add keyboard navigation | HIGH |
| `src/components/files/FileTreeNode.tsx` | Add role="treeitem" | HIGH |

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-26 | Comprehensive WCAG 2.1 audit - identified 5 critical/high issues, 4 medium issues |
| 2025-12-22 | Initial accessibility audit setup via Farmwork CLI |
