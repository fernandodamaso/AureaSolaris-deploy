# Aurea Solaris - Design System

Este documento define os fundamentos visuais e os tokens de design para o projeto Aurea Solaris, garantindo consistência entre todos os módulos.

## 🎨 Paleta de Cores (Cores Principais)

| Token | Nome | Hex | Descrição |
|-------|------|-----|-----------|
| `--color-primary` | Primary Deep Blue | `#2563EB` | Ações principais e botões primários. |
| `--color-secondary` | Secondary Teal | `#14B8A6` | Cores de suporte e acentos de sistema. |
| `--color-success` | Success Green | `#10B981` | Sucesso e confirmação (Módulo Finanças). |
| `--color-warning` | Warning Orange | `#F59E0B` | Alertas e avisos. |
| `--color-danger` | Danger Red | `#EF4444` | Erros e ações críticas (Reset). |
| `--color-surface` | Surface White | `#FFFFFF` | Fundos de cards e elementos de UI. |
| `--color-bg` | Background Gray | `#F7F7FB` | Fundo principal da aplicação. |
| `--color-text` | Primary Text | `#1F2937` | Texto principal e de alta legibilidade. |
| `--color-text-muted`| Muted Text | `#4B5563` | Texto secundário e legendas. |

## 🖋️ Tipografia

- **Font SANS**: `"Inter", system-ui, -apple-system, sans-serif`
  - Uso: Corpos de texto, botões, inputs, tabelas.
- **Font HEADING**: `"Montserrat", "Poppins", sans-serif`
  - Uso: Títulos de módulos, H1, H2, H3.

### Escalas
- **Font-size-sm**: 0.875rem (14px)
- **Font-size-base**: 1rem (16px)
- **Font-size-lg**: 1.25rem (20px)
- **Font-size-xl**: 1.5rem (24px)
- **Font-size-2xl**: 2rem (32px)

## 📏 Espaçamento e Bordas

- **Espaçamento Base**: 8px (Grid de 4/8/16/24/32/48/64)
- **Border Radius**:
  - `sm`: 6px
  - `md`: 8px (Padrão para botões e inputs)
  - `lg`: 12px (Padrão para cards e painéis)

## 🔘 Iconografia

- Use ícones de linhas finas e modernas (ex: `Lucide React`).
- Tamanho padrão para botões: 18px-20px.
- Tamanho para painéis laterais: 24px.

## 🛠️ Implementação em Tailwind v4

O projeto usa **Tailwind CSS v4** com o plugin `@tailwindcss/vite`. A configuração é feita diretamente no CSS, não em um arquivo `tailwind.config.ts`.

```css
/* src/styles.css */
@import "tailwindcss";

@theme {
  --color-primary: #2563EB;
  --color-secondary: #14B8A6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-surface: #FFFFFF;
  --color-background: #F7F7FB;
  --color-text: #1F2937;
  --color-text-muted: #4B5563;
  --color-gold: #B8860B;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-heading: "Montserrat", "Poppins", sans-serif;
}
```

**Nota:** O projeto utiliza também cores customizadas inline como `.text-gold` e `.bg-gold` (hex `#B8860B`) para o tema dourado característico do Aurea Solaris.
