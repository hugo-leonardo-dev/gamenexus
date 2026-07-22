````md
# 🤖 Agents & System Design (agents.md)

Este documento define a arquitetura, os padrões de desenvolvimento, as responsabilidades dos agentes e o fluxo obrigatório de implementação do **GameNexus**.

Nenhuma funcionalidade deve ser implementada ignorando este documento.

---

# 1. Escopo do Produto

GameNexus é uma aplicação web colaborativa para gerenciamento de backlogs de jogos.

O sistema possui dois conceitos principais:

- Backlogs compartilhados por grupos
- Backlog pessoal do usuário

O backlog pessoal será futuramente reutilizado como Backlog Público, portanto toda implementação deve considerar essa evolução.

---

# 2. Funcionalidades

## Autenticação

- Discord OAuth (principal)
- Email/Senha (secundário)

---

## Grupos

- Criar grupo
- Entrar por convite
- Renomear grupo
- Excluir grupo
- Gerenciar membros

---

## Backlog de Grupo

Cada grupo possui seu próprio Kanban.

Categorias:

- 📚 Backlog
- 🎮 Jogando
- ⏸️ Pausados
- ✅ Finalizados
- ❌ Dropados

Todos os membros podem:

- adicionar jogos
- mover jogos
- remover jogos
- editar jogos

---

## Backlog Pessoal

Cada usuário possui um backlog próprio.

Esse backlog será utilizado futuramente para:

- Perfil Público
- Estatísticas
- Recomendações
- Feed
- Compartilhamento
- Favoritos

Toda implementação deve reutilizar ao máximo os componentes do backlog de grupo.

Nunca duplicar regras de negócio.

---

# 3. Arquitetura

Sempre priorizar reutilização.

Evitar criar componentes específicos quando eles puderem ser compartilhados.

Exemplo:

```
BacklogBoard

BacklogColumn

GameCard

SteamSearch

GameFilters

MoveGameMenu

Kanban

Dialog

Modal

Dropdown

ContextMenu
```

O objetivo é possuir apenas um sistema de Kanban capaz de funcionar para:

- grupos
- usuário
- perfil público (futuro)

---

# 4. Banco de Dados

Sempre que alterar o Prisma:

- pensar na escalabilidade
- evitar duplicação
- manter relacionamentos consistentes
- manter índices
- documentar alterações

Nunca criar tabelas pensando apenas na necessidade imediata.

Toda modelagem deve considerar futuras funcionalidades.

---

# 5. Agentes

---

## Architect

Responsável por:

- arquitetura
- modelagem
- organização
- escalabilidade
- separação de responsabilidades

Antes de implementar qualquer funcionalidade deve verificar se existe uma solução mais reutilizável.

---

## Backend Agent

Responsável por:

- APIs
- Prisma
- Banco
- Segurança
- Performance
- Cache

Sempre validar:

- autenticação
- autorização
- validação
- tratamento de erros

---

## Frontend Agent

Responsável por:

- UX
- UI
- Responsividade
- Performance
- Acessibilidade

Sempre reutilizar componentes existentes.

Nunca duplicar interfaces.

---

## Steam Agent

Responsável por:

- parser Steam
- scraping
- atualização de preços
- cache
- rate limiting

---

## Cron Agent

Responsável por:

- sincronização diária
- logs
- retries
- monitoramento

---

## Code Reviewer

Responsável por:

- qualidade do código
- padrões
- simplificação
- legibilidade
- arquitetura

Deve procurar:

- código duplicado
- componentes duplicados
- funções repetidas
- lógica repetida

---

## QA Agent

O QA Agent é obrigatório.

Após qualquer implementação ele assume o projeto.

Seu objetivo NÃO é implementar funcionalidades.

Seu objetivo é quebrar o sistema.

Ele deve procurar:

- bugs
- regressões
- edge cases
- race conditions
- estados inválidos
- problemas de UX
- problemas de performance
- memory leaks
- loops
- loading infinito
- inconsistências
- falhas de permissões
- problemas mobile

Nenhuma feature deve ser considerada pronta antes da aprovação do QA.

---

# 6. Processo Obrigatório de Desenvolvimento

Toda implementação deve seguir obrigatoriamente este fluxo.

```
Planejamento

↓

Arquitetura

↓

Implementação

↓

Code Review

↓

Testes

↓

Correções

↓

Validação Final
```

Nunca pular etapas.

---

# 7. Regras Gerais

Sempre:

- reutilizar componentes
- reutilizar APIs
- reutilizar hooks
- reutilizar serviços

Evitar:

- duplicação
- gambiarra
- código morto
- lógica repetida

Sempre explicar decisões arquiteturais importantes.

---

# 8. Tratamento de Erros

Nunca utilizar mensagens genéricas.

Exemplo ruim:

```
Erro interno.
```

Exemplo bom:

```
[Steam Search]

Request:
GET /api/steam/search

Status:
429

Motivo:
Steam retornou Too Many Requests.

Query:
elden ring

Tempo:
431ms

Tentativas:
3

Resposta Steam:
Too Many Requests

Sugestão:
Aguardar alguns segundos antes de tentar novamente.
```

Todos os erros devem registrar:

- timestamp
- endpoint
- usuário
- groupId
- payload
- status HTTP
- stack trace
- erro original
- causa
- contexto

Logs devem facilitar o debug.

Nunca esconder exceções.

---

# 9. APIs

Toda API criada deve possuir testes para:

200

201

400

401

403

404

409

422

429

500

Validar:

- autenticação
- autorização
- payload inválido
- parâmetros inválidos
- usuário inexistente
- grupo inexistente
- permissões

---

# 10. Banco

Sempre validar:

- migrations
- generate
- validate
- índices
- constraints
- cascades
- duplicidade
- rollback

---

# 11. Front-end

Toda interface deve possuir:

Loading

Empty State

Error State

Success State

Skeleton

Responsividade

Dark Mode

Nunca assumir que sempre existirão dados.

---

# 12. Mobile

Toda funcionalidade nova deve funcionar em:

Desktop

Tablet

Mobile

Especial atenção para:

- scroll
- drag and drop
- long press
- dropdowns
- menus
- modais
- teclado virtual

Nunca bloquear o scroll.

---

# 13. Drag & Drop

Toda alteração envolvendo Kanban deve validar:

- mover entre colunas
- mover dentro da mesma coluna
- desktop
- touch
- mobile
- long press
- scroll horizontal
- scroll vertical
- cancelamento
- múltiplos movimentos
- listas grandes

---

# 14. Performance

Sempre analisar:

- consultas N+1
- queries duplicadas
- re-renderizações
- componentes pesados
- imagens
- cache
- debounce
- lazy loading
- paginação

Evitar chamadas desnecessárias.

---

# 15. Qualidade do Código

Antes de finalizar qualquer tarefa executar obrigatoriamente:

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npx prisma validate
```

```bash
npx prisma generate
```

```bash
npm run build
```

Caso qualquer comando falhe:

- corrigir
- repetir todos os testes

Nunca considerar uma tarefa concluída apenas porque compilou.

---

# 16. Testes Obrigatórios

Após implementar qualquer funcionalidade:

Executar o projeto.

Testar manualmente a funcionalidade criada.

Validar os fluxos completos.

Simular um usuário real.

Exemplos:

- criar grupo
- entrar em grupo
- excluir grupo
- adicionar jogo
- mover jogo
- remover jogo
- pesquisar Steam
- editar perfil
- logout
- login novamente
- atualizar página
- múltiplos cliques
- conexão lenta
- erro da API
- usuário sem permissão

Sempre tentar quebrar a funcionalidade.

---

# 17. Entrega

Nenhuma tarefa será considerada concluída sem apresentar:

## Arquitetura

- decisões tomadas
- justificativas

## Banco

- alterações
- migrations

## Componentes

- criados
- reutilizados
- removidos

## APIs

- criadas
- alteradas

## Performance

- melhorias realizadas

## Possíveis melhorias futuras

Sempre documentar os impactos da implementação.

---

# 18. Filosofia do Projeto

As implementações devem priorizar:

1. Escalabilidade
2. Reutilização
3. Simplicidade
4. Performance
5. Legibilidade
6. Experiência do usuário

Sempre pensar no projeto daqui a um ano.

Evitar soluções que funcionem apenas para a tarefa atual.

Toda implementação deve preparar o sistema para futuras funcionalidades, minimizando refatorações e dívida técnica.
````
