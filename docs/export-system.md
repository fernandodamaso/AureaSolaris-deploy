# Export System

> Unified export utilities in `src/utils/exportUtils.ts`.
> **Ownership:** This is the ONLY source for export details.

## Functions

| Function | Format | Used By |
|----------|--------|---------|
| `downloadText` | Text file | Diary, Mesa |
| `downloadAsPDF` | PDF | All views |
| `sendEmail` | Email client | All views |
| `saveToGoogleDrive` | Clipboard | All views |
| `exportAsJSON` | JSON | Diary, Mesa |
| `exportAsMarkdown` | Markdown | Diary |

## File Formats

- **Markdown:** `# Title\n\ncontent\n\n---\n*Exported from Aurea Solaris on [date]*`
- **JSON:** `{ title, content, date, exportedAt }`
- **SVG/PNG:** Vector/raster mandala image

## Views with Export

- **DiarioView.tsx** — Markdown, JSON, Email, Drive
- **MandalaPage.tsx** — SVG, PNG, Email, Drive
- **MesaCriacao.tsx** — JSON, SVG, Email, Drive

## Related Documentation

- [project-structure.md](project-structure.md) (PT) — Component details
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure