# Aurea Solaris - Acessibilidade (AC)

Este documento estabelece os padrões de acessibilidade para garantir que a aplicação seja inclusiva e utilizável por todos.

## 🌈 Contraste

- **Texto Principal**: Proporção de contraste mínima de `4.5:1` em relação ao fundo.
- **Iconografia**: Ícones interativos devem ter contraste de `3:1`.
- **Estados Focus**: Outline visível com pelo menos `2px` de largura e cor `--color-primary`.

## ⌨️ Navegação por Teclado

- Todos os elementos interativos devem ser acessíveis via `Tab`.
- Use `tabindex="0"` para elementos não padrão que precisam de foco.
- Atalhos de teclado comuns:
  - `Enter` ou `Space`: Ativação do botão/link.
  - `Esc`: Fecha modais e menus suspensos.
  - `Arrow Keys`: Navegação em listas e rádios.

## 🗣️ Leitores de Tela (ARIA)

- **Labels**: Use `aria-label` em botões que contém apenas ícones.
- **Papéis (Roles)**: Use semantic HTML (`<nav>`, `<main>`, `<header>`, `<button>`).
- **Estados**:
  - `aria-expanded="true/false"` para menus/dropdowns.
  - `aria-live="polite"` para notificações e mensagens de erro dinâmicas.

## 🖱️ Alvos de Toque e Clique

- Tamanho mínimo de `44px x 44px` para todos os elementos clicáveis (Botões, ícones de menu).
- Espaçamento de pelo menos `8px` entre elementos clicáveis adjacentes para evitar cliques acidentais.

## 📝 Linguagem e Erros

- Use linguagem clara e direta.
- Mensagens de erro devem ser descritivas e oferecer uma solução (ex: "CPF inválido, por favor revise os números").
- Evite depender apenas da cor para transmitir informação (ex: Use um ícone de erro além da cor vermelha).
