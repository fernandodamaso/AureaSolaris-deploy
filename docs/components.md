# Aurea Solaris - Componentes de UI

Abaixo estão os componentes reutilizáveis disponíveis em `src/components/common/` que devem ser usados em todos os módulos para manter a coesão visual.

## 📁 Componentes em `src/components/common/`

| Arquivo | Descrição |
|---------|-----------|
| `UIComponents.tsx` | Botões (`Button`), `NavItem` e elementos de interface básicos |
| `BaseComponents.tsx` | Componentes base para layouts e containers genéricos |
| `BirthForm.tsx` | Formulário de dados de nascimento (nome, data, hora, local) |
| `Mandala.tsx` | Componente de mandala zodiacal reutilizável (versão base) |
| `OllamaGuide.tsx` | Guia e configuração do modelo Ollama local |
| `PdfViewer.tsx` | Visualizador de arquivos PDF integrado |

## 🔘 Botões (`Button`)

- **Primary**: Cor `--color-primary`, bordas `md`.
- **Secondary**: Cor `--color-secondary`, bordas `md`.
- **Ghost**: Apenas texto com hover de fundo `--color-bg`.
- **Estados**:
  - `Hover`: Sombra leve e transição de cor suave.
  - `Disabled`: Opacidade reduzida e cursor bloqueado.
  - `Loading`: Spinner ou ícone de progresso discreto.

## 📝 Entradas (`Input` e `Select`)

- **Input**: Borda de `1px` `--color-text-muted`, focada com `--color-primary` (2px).
- **Label**: Texto pequeno e legível acima da entrada.
- **Mensagem de Erro**: Texto em `--color-danger` abaixo da entrada.

## 🖼️ Cartões e Painéis (`Card` e `Panel`)

- **Cartão (Card)**: Fundo `--color-surface`, borda `lg`, sombra suave.
- **Painel lateral (Panel)**: Fundo `--color-bg`, fixo, agrupador de controles.
- **Divisor**: Cor `--color-text-muted` (Opacidade 0.1).

## 👤 Avatares e Chips (`Avatar` e `Chip`)

- **Avatar**: Circular (32px-48px), borda de 2px com a cor do agente.
- **Chip**: Borda arredondada (full), fundo suave com a cor do módulo (ex: Chip verde para Finanças).

## 🧭 Navegação

- **Menu Lateral**: Ícones alinhados verticalmente, indicação ativa com a cor primária e barra lateral discreta.
- **Breadcrumbs**: Caminho da aplicação (`Home > Module > View`).

## 🔮 Diálogo e Modais (`Modal`)

- **Overlay**: Fundo preto com 50% de opacidade.
- **Modal**: Centrado, animação de entrada ("Fade & Scale"), largura máxima de 600px.
