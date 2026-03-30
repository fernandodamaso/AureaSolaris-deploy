# Diario Section Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Diario section by fixing functionality issues, enhancing aesthetics with consistent colors and spacing, implementing responsive design, and creating a complete text editor with advanced formatting options.

**Architecture:** Component-by-component refactor approach working on one component at a time (Sidebar → Tabs → Editor → View) to ensure stability while delivering visible progress. Uses shared CSS variables for consistent theming and mobile-first responsive design.

**Tech Stack:** React, TypeScript, Tiptap (for editor), CSS Variables, Tauri (for data persistence)

---

## File Structure and Responsibilities

### Shared Resources
- **Create:** `src/styles/variables.css` - CSS custom properties for colors, spacing, typography
- **Modify:** `src/index.css` - Import the variables file

### DiarioView Component
- **Modify:** `src/components/DiarioView.tsx` - Main container, layout improvements, header enhancements

### DiarioSidebar Component
- **Modify:** `src/components/diario/DiarioSidebar.tsx` - Remove duplicate button, enhance search, improve folder creation, responsive sidebar

### DiarioTabs Component
- **Modify:** `src/components/diario/DiarioTabs.tsx` - Standardize tab controls, improve active tab indicators, handle overflow

### DiarioEditor Component
- **Modify:** `src/components/diario/DiarioEditor.tsx` - Enhance toolbar with formatting options, add advanced features, improve status bar

### Context (if needed)
- **Modify:** `src/context/DiarioContext.tsx` - Only if issues found during implementation (pass-through otherwise)

## Task Breakdown

### Phase 1: Foundation Work

#### Task 1: Create CSS Variables File
**Files:**
- Create: `src/styles/variables.css`
- Modify: `src/index.css`

- [ ] **Step 1: Create variables.css with color definitions**

```css
:root {
  /* Colors */
  --color-bg-primary: #FCF9F1;
  --color-bg-secondary: #FFFFFF;
  --color-border: #E5E5E5;
  --color-text-primary: #2D2D2D;
  --color-text-secondary: #6B6B6B;
  --color-accent: #D4AF37; /* Gold */
  --color-accent-hover: #B8860B;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  
  /* Typography */
  --font-family-primary: 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

- [ ] **Step 2: Run build to verify CSS is valid**

Run: `npm run build`
Expected: Build succeeds without CSS errors

- [ ] **Step 3: Commit**

```bash
git add src/styles/variables.css src/index.css
git commit -m "feat: add CSS variables for consistent theming"
```

#### Task 2: Import CSS Variables in Main CSS
**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add import statement at top of index.css**

```css
@import './styles/variables.css';
```

- [ ] **Step 2: Verify import works by checking for lint errors**

Run: `npm run lint`
Expected: No new lint errors related to the import

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: import CSS variables in main stylesheet"
```

### Phase 2: Component Refactors

#### Task 3: Fix DiarioSidebar - Remove Duplicate Button
**Files:**
- Modify: `src/components/diario/DiarioSidebar.tsx`

- [ ] **Step 1: Identify and mark the duplicate "Nova Nota" button in sidebar**

Looking at lines ~154-161 in DiarioSidebar.tsx, there's a button with "Nova Pasta" and another with "Nova Nota" that duplicates the header button.

- [ ] **Step 2: Remove the duplicate "Nova Nota" button from sidebar**

Remove the button element around lines 180-186 that says "Nova Nota" (this duplicates the header button).

- [ ] **Step 3: Verify the change doesn't break layout**

Run: `npm run dev` and manually check that sidebar still looks correct

- [ ] **Step 4: Commit**

```bash
git add src/components/diario/DiarioSidebar.tsx
git commit -m "fix: remove duplicate Nova Nota button from sidebar"
```

#### Task 4: Enhance DiarioSidebar - Improve Search and Folder Creation
**Files:**
- Modify: `src/components/diario/DiarioSidebar.tsx`

- [ ] **Step 1: Update search input to use CSS variables**

Replace hardcoded values with CSS variables for spacing, colors, typography

- [ ] **Step 2: Improve folder creation flow with better visual feedback**

Enhance the folder creation input and button styling using CSS variables

- [ ] **Step 3: Add responsive behavior for collapsed sidebar on mobile**

Ensure sidebar collapse/expand works properly on small screens

- [ ] **Step 4: Commit**

```bash
git add src/components/diario/DiarioSidebar.tsx
git commit -m "feat: enhance sidebar search and folder creation with CSS variables"
```

#### Task 5: Refactor DiarioTabs - Standardize Controls
**Files:**
- Modify: `src/components/diario/DiarioTabs.tsx`

- [ ] **Step 1: Standardize tab close button size and positioning**

Make close buttons consistent size and add proper hover states

- [ ] **Step 2: Enhance active tab visual indicator with better color contrast**

Use CSS variables for active tab background and text color

- [ ] **Step 3: Improve new tab button styling consistency**

Match new tab button styling with other buttons in the app

- [ ] **Step 4: Commit**

```bash
git add src/components/diario/DiarioTabs.tsx
git commit -m "feat: standardize tab controls and improve visual indicators"
```

#### Task 6: Enhance DiarioTabs - Handle Overflow
**Files:**
- Modify: `src/components/diario/DiarioTabs.tsx`

- [ ] **Step 1: Implement tab scrolling mechanism for overflow scenarios**

Add left/right scroll buttons when tabs overflow container

- [ ] **Step 2: Ensure smooth animations for tab transitions**

Add CSS transitions for tab changes

- [ ] **Step 3: Commit**

```bash
git add src/components/diario/DiarioTabs.tsx
git commit -m "feat: add tab overflow handling with scroll buttons"
```

### Phase 3: Editor Enhancement

#### Task 7: Audit Current Tiptap Setup
**Files:**
- Modify: `src/components/diario/DiarioEditor.tsx`

- [ ] **Step 1: List current Tiptap extensions being used**

Current extensions: StarterKit, TaskList, TaskItem, Placeholder

- [ ] **Step 2: Identify missing formatting options**

Missing: text alignment, font colors, font size, superscript/subscript, horizontal rule, code block

- [ ] **Step 3: Identify missing advanced features**

Missing: tables, images, links, enhanced blockquote

- [ ] **Step 4: Commit (documentation only)**

```bash
git add src/components/diario/DiarioEditor.tsx
git commit -m "docs: audit current tiptap setup and identify missing features"
```

#### Task 8: Add Missing Formatting Options to Editor
**Files:**
- Modify: `src/components/diario/DiarioEditor.tsx`

- [ ] **Step 1: Add TextAlign extension**

Install and import @tiptap/extension-text-align

- [ ] **Step 2: Add FontColor and FontSize extensions**

Install and import @tiptap/extension-font-color and @tiptap/extension-font-size

- [ ] **Step 3: Add SubSuperscript extension**

Install and import @tiptap/extension-sub-superscript

- [ ] **Step 4: Add HorizontalRule extension**

Install and import @tiptap/extension-horizontal-rule

- [ ] **Step 5: Add CodeBlock extension**

Install and import @tiptap/extension-code-block

- [ ] **Step 6: Update editor extensions array**

Add all new extensions to the extensions array in useEditor hook

- [ ] **Step 7: Commit**

```bash
git add src/components/diario/DiarioEditor.tsx
git commit -m "feat: add missing formatting options (alignment, colors, font size, etc.) to editor"
```

#### Task 9: Add Advanced Features to Editor
**Files:**
- Modify: `src/components/diario/DiarioEditor.tsx`

- [ ] **Step 1: Add Table extension**

Install and import @tiptap/extension-table and @tiptap/extension-table-cell

- [ ] **Step 2: Add Image extension**

Install and import @tiptap/extension-image

- [ ] **Step 3: Add Link extension**

Install and import @tiptap/extension-link

- [ ] **Step 4: Update editor extensions array**

Add table, image, and link extensions to extensions array

- [ ] **Step 5: Commit**

```bash
git add src/components/diario/DiarioEditor.tsx
git commit -m "feat: add advanced features (tables, images, links) to editor"
```

#### Task 10: Enhance Editor Toolbar Organization
**Files:**
- Modify: `src/components/diario/DiarioEditor.tsx`

- [ ] **Step 1: Reorganize toolbar into logical groups**

Group tools: Text Style, Text Structure, Lists, Alignment, Formatting, Insert, Tools

- [ ] **Step 2: Add icons and tooltips for new toolbar buttons**

Ensure all new buttons have proper icons from lucide-react and tooltips

- [ ] **Step 3: Apply consistent button styling using CSS variables**

Use --color-accent, --spacing-sm, etc. for button styling

- [ ] **Step 4: Commit**

```bash
git add src/components/diario/DiarioEditor.tsx
git commit -m "feat: reorganize editor toolbar with logical grouping and consistent styling"
```

#### Task 11: Enhance Editor Status Bar
**Files:**
- Modify: `src/components/diario/DiarioEditor.tsx`

- [ ] **Step 1: Add character count to status bar**

Show character count alongside word count

- [ ] **Step 2: Add last saved timestamp**

Show when document was last saved

- [ ] **Step 3: Improve styling of status bar using CSS variables**

Use --color-text-secondary, --spacing-xs, etc. for status bar styling

- [ ] **Step 4: Commit**

```bash
git add src/components/diario/DiarioEditor.tsx
git commit -m "feat: enhance editor status bar with character count and last saved timestamp"
```

### Phase 4: Main View Improvements

#### Task 12: Improve DiarioView Layout Responsiveness
**Files:**
- Modify: `src/components/DiarioView.tsx`

- [ ] **Step 1: Implement responsive Flexbox/Grid layout**

Use CSS variables for spacing and make layout adapt to screen size

- [ ] **Step 2: Update header with consistent styling and spacing**

Apply CSS variables to header elements for consistent look

- [ ] **Step 3: Commit**

```bash
git add src/components/DiarioView.tsx
git commit -m "feat: improve main view layout responsiveness with CSS variables"
```

#### Task 13: Enhance DiarioView Empty and Loading States
**Files:**
- Modify: `src/components/DiarioView.tsx`

- [ ] **Step 1: Improve empty state with better visual guidance**

Enhance the "Selecione uma nota para começar a escrever" message and button

- [ ] **Step 2: Enhance loading spinner with branded design**

Update the loading spinner to use theme colors and improve appearance

- [ ] **Step 3: Add subtle animations for state transitions**

Add CSS transitions for loading/empty state changes

- [ ] **Step 4: Commit**

```bash
git add src/components/DiarioView.tsx
git commit -m "feat: enhance empty and loading states with better visual design"
```

### Phase 5: Integration and Testing

#### Task 14: Test All Components Together
**Files:**
- Test: Manual verification

- [ ] **Step 1: Start development server and test all functionality**

Run: `npm run dev`
Verify: Sidebar, tabs, editor all work together correctly

- [ ] **Step 2: Test responsiveness across breakpoints**

Check layout at mobile (<640px), tablet (640-1024px), and desktop (>1024px) widths

- [ ] **Step 3: Test all editor features**

Verify formatting options, tables, images, links all work correctly

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "test: verify all components work together and are responsive"
```

#### Task 15: Performance Testing with Large Datasets
**Files:**
- Test: Manual verification

- [ ] **Step 1: Create test data with many entries and folders**

Use development tools to generate test data

- [ ] **Step 2: Test performance with large entry lists**

Verify scrolling and rendering remains smooth with 100+ entries

- [ ] **Step 3: Test editor performance with large documents**

Verify editing remains responsive with large content

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "perf: test performance with large datasets and optimize if needed"
```

#### Task 16: Accessibility Audit
**Files:**
- Test: Manual verification

- [ ] **Step 1: Check color contrast ratios**

Verify text meets WCAG AA contrast requirements

- [ ] **Step 2: Test keyboard navigation**

Ensure all functionality accessible via keyboard

- [ ] **Step 3: Test screen reader compatibility**

Verify ARIA labels and semantic structure

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "a11y: perform accessibility audit and fix any issues"
```

## Success Criteria Verification

### Functionality:
- [ ] No duplicate buttons in UI
- [ ] All existing features work as before
- [ ] New editor features function correctly
- [ ] Responsive behavior works on all target devices
- [ ] No JavaScript errors in console

### Aesthetics:
- [ ] Consistent color usage throughout
- [ ] Proper spacing and typography hierarchy
- [ ] Visual feedback for all interactive states
- [ ] Professional, cohesive appearance

### Responsiveness:
- [ ] Layout adapts correctly to mobile (<640px)
- [ ] Layout adapts correctly to tablet (640px-1024px)
- [ ] Layout adapts correctly to desktop (>1024px)
- [ ] Touch targets minimum 48x48px
- [ ] Text remains readable without zooming

### Editor Completeness:
- [ ] All standard formatting options available
- [ ] Advanced features (tables, images, links) functional
- [ ] Keyboard shortcuts work for common actions
- [ ] Status bar shows relevant information
- [ ] Placeholder text displays correctly when empty