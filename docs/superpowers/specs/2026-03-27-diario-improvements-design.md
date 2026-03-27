# Diario Section Improvements Design Specification

**Date:** 2026-03-27  
**Component:** Diario Section (DiarioView, DiarioSidebar, DiarioTabs, DiarioEditor)  
**Related Files:** 
- src/components/DiarioView.tsx
- src/components/diario/DiarioSidebar.tsx
- src/components/diario/DiarioTabs.tsx
- src/components/diario/DiarioEditor.tsx
- src/context/DiarioContext.tsx

## 1. Executive Summary

This document outlines the plan to improve the Diario section addressing functionality, aesthetics, and responsiveness issues. The approach follows a component-by-component refactor strategy to ensure stability while delivering visible progress.

## 2. Current State Analysis

### Issues Identified:
- **Functionality:** Duplicate buttons (Create Entry appears in both header and sidebar), inconsistent states
- **Aesthetics:** Color scheme inconsistencies, poor spacing, visual hierarchy issues
- **Responsiveness:** Layout misalignment on different screen sizes, sidebar behavior on mobile
- **Editor Completeness:** Missing formatting options (text alignment, font colors, etc.), lack of advanced features (tables, images, links)

## 3. Design Goals

1. Fix all functionality issues including duplicate buttons
2. Improve visual design with consistent colors and spacing
3. Implement responsive layout for mobile, tablet, and desktop
4. Enhance editor with complete formatting options and advanced features
5. Maintain all existing functionality and data persistence

## 4. Component-by-Component Improvements

### 4.1 DiarioSidebar Component

**Issues to Fix:**
- Duplicate "Nova Nota" button (also in header)
- Search input styling and placement
- Folder creation flow usability
- Visual feedback for selected states
- Responsive behavior (collapsed/expanded states)

**Improvements:**
- Remove duplicate "Nova Nota" button from sidebar (keep only in header)
- Enhance search input with better visual design and placeholder
- Improve folder creation flow with better visual feedback
- Update color usage to use consistent theme variables
- Improve spacing and typography for better readability
- Ensure collapsed state works properly on mobile devices
- Add hover/focus states for all interactive elements

### 4.2 DiarioTabs Component

**Issues to Fix:**
- Tab close button alignment and hit area
- Visual indication of active tab
- Responsive behavior for tab overflow
- New tab button styling and placement

**Improvements:**
- Standardize tab close button size and positioning
- Enhance active tab visual indicator with better color contrast
- Implement tab scrolling mechanism for overflow scenarios
- Improve new tab button styling consistency
- Ensure proper touch target sizes for mobile interaction
- Add smooth animations for tab transitions

### 4.3 DiarioEditor Component

**Issues to Fix:**
- Limited formatting options in toolbar
- Missing advanced features (tables, images, links, etc.)
- Inconsistent toolbar styling
- Status bar information completeness

**Improvements:**
- Add missing formatting options:
  * Text alignment (left, center, right, justify)
  * Text and background color options
  * Font size selection
  * Superscript/subscript
  * Horizontal rule
  * Code block
- Add advanced features:
  * Table insertion and manipulation
  * Image upload and embedding
  * Link creation/editing
  * Blockquote styling
  * Heading levels 1-3
- Improve toolbar organization with logical grouping
- Enhance status bar with more detailed information (character count, etc.)
- Ensure consistent styling with rest of application
- Add keyboard shortcuts for common formatting actions

### 4.4 DiarioView Component

**Issues to Fix:**
- Overall layout responsiveness
- Header styling consistency
- Empty state presentation
- Loading state visual design

**Improvements:**
- Implement responsive Flexbox/Grid layout
- Update header with consistent styling and spacing
- Improve empty state with better visual guidance
- Enhance loading spinner with branded design
- Ensure proper z-index and overlay handling
- Add subtle animations for state transitions
- Optimize performance for large entry lists

## 5. Shared Styling and Theme

### 5.1 CSS Variables
Create shared CSS variables in a common location (e.g., src/styles/variables.css or CSS-in-JS):

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

### 5.2 Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 6. Editor Enhancement Details

### 6.1 Additional Tiptap Extensions to Add:
- TextAlign
- CharacterCount
- FontColor
- FontSize
- SubSuperscript
- HorizontalRule
- CodeBlock
- Table
- TableOfContents
- Image
- Link
- Placeholder (already implemented but can be enhanced)

### 6.2 Toolbar Organization:
Group tools logically:
1. **Text Style:** Bold, Italic, Strikethrough, Underline
2. **Text Structure:** Headings, Blockquote, Code block, Horizontal rule
3. **Lists:** Bullet, Numbered, Task list
4. **Alignment:** Left, Center, Right, Justify
5. **Formatting:** Font size, Text color, Background color
6. **Insert:** Table, Image, Link
7. **Tools:** Undo/Redo, Word count

## 7. Implementation Approach

### Phase 1: Foundation
1. Create shared CSS variables/theme
2. Fix duplicate button issue (remove from sidebar)
3. Basic responsiveness improvements

### Phase 2: Component Refactors (Order: Sidebar → Tabs → Editor → View)
For each component:
1. Audit current implementation
2. Apply shared styling variables
3. Fix functionality issues
4. Improve aesthetics (spacing, colors, typography)
5. Implement responsive behaviors
6. Test thoroughly

### Phase 3: Editor Enhancement
1. Audit current Tiptap setup
2. Add missing extensions systematically
3. Reorganize toolbar logically
4. Enhance status bar
5. Test all formatting features

### Phase 4: Integration and Testing
1. Test all components together
2. Verify responsiveness across breakpoints
3. Validate all functionality works correctly
4. Performance testing with large datasets
5. Accessibility audit (color contrast, keyboard navigation)

## 8. Success Criteria

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

## 9. Risks and Mitigations

### Risk 1: Breaking existing functionality during refactor
**Mitigation:** Comprehensive testing after each component change, maintain backward compatibility where possible

### Risk 2: Inconsistent design across components
**Mitigation:** Shared CSS variables and design tokens, regular design reviews during implementation

### Risk 3: Performance degradation with enhanced editor
**Mitigation:** Lazy load heavy extensions, optimize re-renders, test with large documents

### Risk 4: Responsiveness issues on specific devices
**Mitigation:** Test on multiple device sizes, use responsive design principles, validate with browser dev tools

## 10. Open Questions

1. Should we maintain the current color scheme or update it entirely?
2. Are there specific branding guidelines we should follow for colors and typography?
3. What level of image support is needed (upload, resize, alt text, etc.)?
4. Should table functionality include advanced features like merging cells or sorting?
5. Are there any specific accessibility requirements we need to meet?

## 11. Next Steps

Upon approval of this design:
1. Create implementation plan using writing-plans skill
2. Begin Phase 1 implementation (foundation work)
3. Proceed with component-by-component refactors
4. Implement editor enhancements
5. Conduct integration testing and validation
6. Prepare for user acceptance testing

---
*This design document follows the brainstorming skill guidelines and has been reviewed for technical accuracy and completeness.*