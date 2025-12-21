# Wynter Code - New Layout Implementation Plan

## Overview

A major UI restructuring focused on a better prompt experience and dual-output layout for Claude responses.

---

## 1. Enhanced Prompt Input Box

### 1.1 Larger Prompt Box with Focus Overlay
- [ ] Increase default height of prompt textarea
- [ ] Add "lights off" overlay (dark semi-transparent backdrop) when focused
- [ ] Increase text size when focused
- [ ] Add smooth transition animations for focus state
- [ ] Overlay should have high z-index but allow ESC to close

### 1.2 Image Paste Support
- [ ] Add paste event listener for images
- [ ] Display pasted images as thumbnails in prompt area
- [ ] Store images temporarily for sending to Claude
- [ ] Add remove button on image thumbnails
- [ ] Support drag-and-drop images as well

### 1.3 File @ Tagging
- [ ] Add @ trigger detection in prompt input
- [ ] Create file picker dropdown that appears after @
- [ ] Fuzzy search files from current project directory
- [ ] Insert selected file as styled badge/chip
- [ ] Badge shows truncated path with "..." in middle (e.g., `src/.../Component.tsx`)
- [ ] Max width constraint on path badges
- [ ] Store file references for sending to Claude

### 1.4 Send to Claude
- [ ] Update Claude service to accept image attachments
- [ ] Update Claude service to expand file path references
- [ ] Format message with attachments before sending

---

## 2. Dual Output Box Layout

### 2.1 Top Output Box - Response Display
- [ ] Create `ResponseCarousel` component
- [ ] Display one Claude response at a time
- [ ] Add horizontal snap-scroll between responses
- [ ] Card-on-card effect with user message layered behind
- [ ] User message is semi-hidden, reveals on hover
- [ ] Add response navigation indicators (dots or arrows)
- [ ] Response takes up majority of vertical space

### 2.2 Bottom Output Box - Tool Calls & Activity
- [ ] Create `ActivityFeed` component for bottom panel
- [ ] Show all tool calls with their status
- [ ] Display approvals/questions prominently
- [ ] Add approval buttons (Approve/Reject) for pending actions
- [ ] Scrollable feed with newest at bottom
- [ ] Visual separation between tool calls
- [ ] Fixed height (resizable via drag handle)

### 2.3 Fixed Status Toolbar
- [ ] Create `StreamingToolbar` component
- [ ] Position fixed at bottom of output area
- [ ] Always visible during streaming
- [ ] Shows "Thinking..." with animated dots
- [ ] Shows "(esc to stop)" hint
- [ ] Shows elapsed time and token count
- [ ] Shows current tool being executed

---

## 3. Component Structure

```
MainContent/
├── PromptArea/
│   ├── FocusOverlay (dark backdrop)
│   ├── EnhancedPromptInput
│   │   ├── ImageThumbnails
│   │   ├── FileTagBadges
│   │   └── TextArea
│   └── PromptActions (send button, etc.)
│
├── OutputArea/
│   ├── ResponseCarousel
│   │   ├── UserMessageCard (background)
│   │   └── ClaudeResponseCard (foreground)
│   │
│   ├── ResizeHandle
│   │
│   ├── ActivityFeed
│   │   ├── ToolCallItem
│   │   ├── ApprovalItem
│   │   └── QuestionItem
│   │
│   └── StreamingToolbar (fixed bottom)
│       ├── StatusIndicator
│       ├── TimeElapsed
│       ├── TokenCount
│       └── EscHint
```

---

## 4. Implementation Tasks

### Phase 1: Core Components
1. [ ] Create `FocusOverlay` component
2. [ ] Create `EnhancedPromptInput` component with larger size
3. [ ] Create `ImageThumbnail` component
4. [ ] Create `FileTagBadge` component with truncated path
5. [ ] Create `FilePickerDropdown` component

### Phase 2: Output Layout
6. [ ] Create `ResponseCarousel` component
7. [ ] Create `UserMessageCard` component (background layer)
8. [ ] Create `ClaudeResponseCard` component (foreground)
9. [ ] Add snap-scroll behavior

### Phase 3: Activity Feed
10. [ ] Create `ActivityFeed` component
11. [ ] Create `ToolCallItem` component
12. [ ] Create `ApprovalItem` component with action buttons
13. [ ] Create `QuestionItem` component
14. [ ] Add resize handle between output areas

### Phase 4: Status Toolbar
15. [ ] Create `StreamingToolbar` component
16. [ ] Integrate with streaming state
17. [ ] Position as fixed footer

### Phase 5: Integration
18. [ ] Update `MainContent` layout
19. [ ] Wire up image paste handling
20. [ ] Wire up file @ tagging
21. [ ] Update Claude service for attachments
22. [ ] Update session store for new message format

---

## 5. State Management Updates

### Session Store Additions
```typescript
interface EnhancedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: {
    images: ImageAttachment[];
    files: FileReference[];
  };
  createdAt: Date;
}

interface ImageAttachment {
  id: string;
  data: string; // base64
  mimeType: string;
  thumbnail: string;
}

interface FileReference {
  path: string;
  displayPath: string; // truncated for display
}
```

---

## 6. CSS/Styling Requirements

- Focus overlay: `bg-black/80` with blur
- Prompt box focused: larger size, centered in viewport
- Response cards: subtle shadow, rounded corners
- Card layering: CSS transforms for stack effect
- Activity feed: distinct styling per item type
- Streaming toolbar: glass morphism effect

---

## 7. File Changes Summary

### New Files
- `src/components/prompt/FocusOverlay.tsx`
- `src/components/prompt/EnhancedPromptInput.tsx`
- `src/components/prompt/ImageThumbnail.tsx`
- `src/components/prompt/FileTagBadge.tsx`
- `src/components/prompt/FilePickerDropdown.tsx`
- `src/components/output/ResponseCarousel.tsx`
- `src/components/output/UserMessageCard.tsx`
- `src/components/output/ClaudeResponseCard.tsx`
- `src/components/output/ActivityFeed.tsx`
- `src/components/output/ApprovalItem.tsx`
- `src/components/output/StreamingToolbar.tsx`

### Modified Files
- `src/components/layout/MainContent.tsx`
- `src/stores/sessionStore.ts`
- `src/services/claude.ts`
- `src/types/session.ts`
