# Architecture & UI Preservation Rules

## Rule A: Logic and State Preservation
When refactoring styles (Tailwind CSS, Layout), **NEVER** alter or remove:
- React Hooks (`useState`, `useEffect`, `useRef`, etc.).
- State management logic.
- Safe backend invocation calls (`safeInvoke`).
- Core business logic.
Altering these is strictly forbidden unless specifically requested for functional changes.

## Rule B: Version Control Governance
Perform a Git commit with a clear, descriptive message (in English/Portuguese as appropriate) after **EVERY** successful unit of work or functional change.

## Rule C: Operational Verification
Always verify if the LocalHost (`http://localhost:1420/` or current port) is visible and active for the user to test after UI changes.

## Rule D: Modularization
Prioritize breaking down large files (like `App.tsx`) into:
1. **Custom Hooks**: Extract backend communication and complex state logic.
2. **Atomic Components**: Separate UI into smaller, testable files.
3. **Styles**: Use a consistent theme system.
