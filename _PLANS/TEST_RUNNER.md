# Test Runner Popup - Implementation Plan

## Overview
Add a Test Runner popup tool with an icon next to the rocket icon in the toolbar. It detects test frameworks (Jest, Vitest, Mocha, Playwright, Cypress), shows a nicely designed live output when running tests, and displays a message if no tests are available.

## Files to Create

### 1. `/src/components/tools/test-runner/TestRunnerPopup.tsx`
Main popup component:
- Props: `isOpen`, `onClose`
- States: `detecting` | `no-tests` | `idle` | `running` | `passed` | `failed`
- Framework detection on open
- Terminal integration for live output
- Summary bar for pass/fail counts

### 2. `/src/components/tools/test-runner/FrameworkSelector.tsx`
Component showing detected frameworks as selectable cards/buttons with icons.

### 3. `/src/components/tools/test-runner/TestOutput.tsx`
Wrapper around Terminal component with test-specific styling and optional result overlay.

### 4. `/src/components/tools/test-runner/index.ts`
Barrel export file.

## Files to Modify

### 1. `/src/components/layout/ProjectTabBar.tsx`
- **Line ~225**: Add state `const [showTestRunner, setShowTestRunner] = useState(false);`
- **Line ~301**: Add command palette case `case "openTestRunner": setShowTestRunner(true); break;`
- **After line 514** (after Rocket icon): Add icon button:
```tsx
{/* Test Runner */}
<div className="border-l border-border px-2 h-full flex items-center">
  <Tooltip content="Test Runner">
    <IconButton size="sm" onClick={() => setShowTestRunner(true)}>
      <FlaskConical className="w-4 h-4" />
    </IconButton>
  </Tooltip>
</div>
```
- **After popup renders**: Add `<TestRunnerPopup isOpen={showTestRunner} onClose={() => setShowTestRunner(false)} />`

### 2. `/src/components/tools/index.ts`
Add: `export { TestRunnerPopup } from "./test-runner";`

### 3. `/src/components/tools/ToolsDropdown.tsx`
Add to `TOOL_DEFINITIONS` for command palette:
```tsx
{
  id: "test-runner",
  name: "Test Runner",
  description: "Run and view test results",
  icon: FlaskConical,
  actionKey: "openTestRunner",
}
```

## Framework Detection Logic

Check `package.json` for:
| Framework | Packages | Config Files |
|-----------|----------|--------------|
| Vitest | `vitest`, `@vitest/ui` | `vitest.config.{ts,js,mjs}` |
| Jest | `jest`, `@jest/core` | `jest.config.{js,ts,mjs,json}` |
| Playwright | `@playwright/test` | `playwright.config.{ts,js}` |
| Cypress | `cypress` | `cypress.config.{ts,js,mjs}` |
| Mocha | `mocha` | `.mocharc.{json,js,yaml}` |

Fallback: Check if `scripts.test` exists and isn't the default "no test specified" message.

## UI States

1. **Detecting**: Spinner + "Detecting test frameworks..."
2. **No Tests**: Empty state with suggestions to install frameworks
3. **Idle**: Show detected frameworks, "Run" button
4. **Running**: Live terminal output + summary bar
5. **Passed/Failed**: Terminal output + colored result overlay

## Icon
Use `FlaskConical` from lucide-react (represents testing, not already used in toolbar).

## Implementation Steps

1. Create `/src/components/tools/test-runner/` directory
2. Create `TestRunnerPopup.tsx` with Modal wrapper and state management
3. Implement framework detection using `read_file_content` Tauri command
4. Create `FrameworkSelector.tsx` for framework cards
5. Create `TestOutput.tsx` wrapping Terminal component
6. Create `index.ts` barrel export
7. Add state and icon button to `ProjectTabBar.tsx` (after Rocket icon)
8. Add popup render to `ProjectTabBar.tsx`
9. Export from `/src/components/tools/index.ts`
10. Add to `TOOL_DEFINITIONS` in `ToolsDropdown.tsx`

## Reference Files
- `/src/components/tools/ProjectTemplatesPopup.tsx` - Pattern for popup with terminal
- `/src/components/terminal/Terminal.tsx` - PTY integration
- `/src/components/layout/ProjectTabBar.tsx:507-514` - Icon button pattern
