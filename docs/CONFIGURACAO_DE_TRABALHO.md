# Configuração de trabalho — Aurea Solaris

Este documento define a configuração recomendada para desenvolver e manter o Aurea Solaris com ChatGPT/Codex, sem confundir a ferramenta de desenvolvimento com o produto final.

## Decisão atual

O Aurea permanece um aplicativo **Windows desktop local-first**. Não usar WSL2 nesta fase: o instalador e o sidecar são nativos do Windows e adicionar outra camada agora aumenta custo e risco sem resolver um requisito do produto.

Não mover a cópia de trabalho enquanto o primeiro instalador não tiver sido concluído e testado. Depois do marco de instalação, organizar assim:

```text
C:\Projetos\
  AureaSolaris\                código-fonte do produto
  Engenharia-Astrologica\      acervo-fonte preservado, somente leitura durante migração
```

Os bancos e anexos das pessoas usuárias não ficam dentro do repositório. Quando o runtime de dados for concluído, usar a pasta de dados do aplicativo por usuário, com backup/exportação explícitos e segredos isolados em cofre local.

## Ferramentas locais

Para o marco atual, manter no Windows:

- Node.js LTS e npm, para a interface e Tauri;
- Python 3.11+, usado para empacotar o motor, nunca exigido da pessoa que instalar o app;
- Rust/Cargo, para a camada desktop;
- Git, para histórico e recuperação;
- VS Code, como editor opcional.

Não instalar extensões aleatórias de “ChatGPT” no VS Code. Se quiser assistência dentro do editor, usar somente a extensão oficial **Codex — OpenAI’s coding agent**, publicada por OpenAI. Ela não dá a um chat externo controle irrestrito do computador; continua sujeita às permissões e revisões da sessão.

## Como usar Chat, Work e Codex

- **Chat:** conversa rápida, ideias, decisões e dúvidas cotidianas.
- **Work:** pesquisa, auditoria, documentos, mapas e planejamento com entregáveis.
- **Codex:** código, testes, build, revisão de arquivos e repositório do Aurea.

Esta separação acompanha a orientação da OpenAI: Codex é a experiência dedicada a código e repositórios; Work atende pesquisas e entregáveis mais amplos. Permissões de arquivos, ferramentas e ações continuam sendo avaliadas na experiência ativa — não existe uma opção segura de “autonomia total” que dispense esses limites.

## Regras de acesso

1. Abrir no Codex apenas a pasta do projeto necessária ao trabalho.
2. Conceder permissões pontuais, nunca acesso amplo por conveniência.
3. Manter `.env`, bancos, anexos de saúde, backups e tokens fora do Git.
4. Antes de qualquer mudança grande, conferir `git status` e preservar uma base recuperável.
5. Browser e automação de computador são auxiliares para testes visuais; não substituem revisão de código, testes nem a autorização humana para ações relevantes.

## Marco seguinte

Concluir o instalador Windows, instalar em ambiente limpo e testar: abertura sem Python, motor astrológico disponível, login local e ausência de terminal visível. Só então migrar a cópia de trabalho para `C:\Projetos` e começar a Fase 2: banco privado/enciclopédico único com importação verificável da Engenharia Astrológica.

## Referências oficiais

- [Usando o Codex com seu plano ChatGPT](https://help.openai.com/pt-br/articles/11369540-using-codex-with-your-chatgpt-plan)
- [ChatGPT Trabalho e Codex](https://help.openai.com/pt-br/articles/20001275-chatgpt-work-and-codex)
