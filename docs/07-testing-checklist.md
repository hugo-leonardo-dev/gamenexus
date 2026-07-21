# 🧪 Checklist de Testes Manuais — GameNexus

> **Documento:** `docs/07-testing-checklist.md`
> Use este checklist para validar manualmente todas as funcionalidades antes de um deploy ou após mudanças significativas.

---

## Sumário

- [1. Autenticação](#1-autenticação)
- [2. Grupos](#2-grupos)
- [3. Kanban e Jogos](#3-kanban-e-jogos)
- [4. Promoções](#4-promoções)
- [5. Gerenciamento de Membros](#5-gerenciamento-de-membros)
- [6. UI/UX e Responsividade](#6-uiux-e-responsividade)
- [7. Tratamento de Erros](#7-tratamento-de-erros)
- [8. Cron Job de Preços](#8-cron-job-de-preços)
- [9. Fluxo Completo](#9-fluxo-completo)
- [10. Docker e Deploy](#10-docker-e-deploy)

---

## 1. Autenticação

### 1.1 Discord OAuth

- [ ] Landing page exibe botão "Começar Agora" para não logados
- [ ] Clicar "Começar Agora" → redireciona para `/login`
- [ ] Em `/login`, clicar "Entrar com Discord" → redireciona para Discord
- [ ] Após autorizar, redireciona para `/dashboard`
- [ ] Nome e avatar do Discord aparecem na Navbar
- [ ] Clicar "Sair" → desloga e redireciona para home
- [ ] Após sair, Navbar mostra "Entrar" novamente

### 1.2 Email/Senha

- [ ] Em `/signup`, criar conta com nome, email e senha
- [ ] Senha mínima 6 caracteres é validada
- [ ] Email inválido é rejeitado
- [ ] Conta criada loga automaticamente
- [ ] Email duplicado → erro "Este email já está cadastrado"
- [ ] Login com credenciais válidas funciona
- [ ] Credenciais inválidas → erro "Email ou senha inválidos"

### 1.3 Proteção de Rotas

- [ ] `/dashboard` sem login → redireciona para `/login`
- [ ] `/group/[id]` sem login → redireciona para `/login`
- [ ] `POST /api/groups` sem sessão → 401
- [ ] `POST /api/games` sem sessão → 401

---

## 2. Grupos

### 2.1 Criar Grupo

- [ ] Preencher nome e clicar "Criar Grupo"
- [ ] Toast de sucesso: `Grupo "NOME" criado com sucesso!`
- [ ] Grupo aparece na lista com role "Dono"
- [ ] Contagem mostra "1 membro" e "0 jogos"
- [ ] Nome vazio → botão desabilitado
- [ ] Nome > 50 caracteres → bloqueado

### 2.2 Entrar em Grupo

- [ ] Digitar código de convite válido
- [ ] Toast: `Você entrou em "NOME"!`
- [ ] Grupo aparece com role "Membro"
- [ ] Código inválido → mensagem de erro
- [ ] Já membro → mensagem de erro
- [ ] Código convertido para maiúsculas

### 2.3 Lista de Grupos

- [ ] Dashboard lista todos os grupos
- [ ] Cada card: nome, role, membros, jogos
- [ ] Clicar → navega para `/group/[id]`
- [ ] Estado vazio: "Nenhum grupo ainda"

---

## 3. Kanban e Jogos

### 3.1 Adicionar Jogo (Link Steam)

- [ ] Colar link Steam e submeter
- [ ] Toast: `"Título" adicionado ao GameNexus!`
- [ ] Jogo aparece na coluna "Quero Jogar"
- [ ] Jogo duplicado → erro "Este jogo já foi adicionado"
- [ ] Link inválido → mensagem de erro
- [ ] App inexistente → mensagem de erro

### 3.2 Busca de Jogos

- [ ] Digitar no campo → filtra em tempo real
- [ ] Contador "X de Y jogos encontrados"
- [ ] Limpar busca → todos reaparecem
- [ ] Colunas sem resultado: "Nenhum jogo encontrado"

### 3.3 Drag & Drop

- [ ] Arrastar "Quero Jogar" → "Jogando Agora"
- [ ] Card se move para coluna de destino
- [ ] Status badge muda
- [ ] Arrastar "Jogando Agora" → "Finalizados"
- [ ] Arrastar de volta → funciona
- [ ] Coluna vazia aceita drop
- [ ] DragOverlay aparece durante arrasto
- [ ] Touch delay funciona em mobile

### 3.4 Remover Jogo

- [ ] Botão "Remover jogo" aparece na base do card
- [ ] Modal de confirmação com "Cancelar" / "Remover"
- [ ] "Remover" → jogo removido + toast
- [ ] "Cancelar" → modal fecha sem remover
- [ ] Backdrop → modal fecha

### 3.5 Informações do Card

- [ ] Capa do jogo exibida
- [ ] Título exibido
- [ ] "Adicionado por [nome]" aparece
- [ ] Preço exibido (ou "Grátis")
- [ ] Review score: "88% positivas (Muito Positivo)"
- [ ] Jogadores: "12.4k jogando agora"

---

## 4. Promoções

- [ ] Jogo com `discountPercent > 0` tem **banner verde** no topo
- [ ] Banner: "✨ Promoção! -X%"
- [ ] **Borda do card** verde (`border-emerald-700/60`)
- [ ] **Badge de desconto** pulsante no canto da capa
- [ ] Preço original **riscado** + preço promocional
- [ ] Jogo gratuito: "Grátis" sem badge
- [ ] Fundo levemente esverdeado quando em promoção

---

## 5. Gerenciamento de Membros

### 5.1 Header do Grupo

- [ ] Membros listados abaixo do header
- [ ] Avatar, nome e role (Dono ★)
- [ ] Usuário atual mostra "(você)"
- [ ] Dono pode remover membros (hover → X)
- [ ] Membro não vê botão de remover

### 5.2 Página de Membros

- [ ] "Gerenciar membros" → `/group/[id]/members`
- [ ] Stats: Total, Donos, Membros
- [ ] Cada membro: avatar, nome, email/Discord, role
- [ ] Dono pode clicar "Remover" → "Cancelar" / "Confirmar"
- [ ] Dono **não pode remover a si mesmo**
- [ ] Dono **não pode remover outro dono** (apenas se houver mais de um)
- [ ] Último dono → erro "Não é possível remover o único dono"
- [ ] Membro não vê botão de remover
- [ ] "Voltar para [grupo]" funciona

---

## 6. UI/UX e Responsividade

### 6.1 Navegação

- [ ] Navbar: logo "GameNexus" → home
- [ ] Navbar: "Dashboard" quando logado
- [ ] Navbar: avatar + nome do usuário
- [ ] Navbar: botão "Sair"
- [ ] Navbar: loading skeleton
- [ ] Navbar sticky (fixa no topo)

### 6.2 Loading States

- [ ] Dashboard tem skeleton animado
- [ ] Grupo tem skeleton (header, input, colunas)
- [ ] Botões com spinner durante ações

### 6.3 Responsividade

- [ ] Mobile (< 640px) empilha verticalmente
- [ ] Navbar adaptada (texto "Entrar" some)
- [ ] Kanban empilha colunas (< 1024px)
- [ ] Input de jogo empilha em mobile
- [ ] Formulários empilham em mobile
- [ ] Toasts legíveis em mobile

### 6.4 Toasts

- [ ] Criar grupo → toast success
- [ ] Entrar grupo → toast success
- [ ] Adicionar jogo → toast success
- [ ] Remover jogo → toast success
- [ ] Erro → toast error
- [ ] Erro ao mover → toast error
- [ ] Toast some após ~4s
- [ ] Toast pode ser fechado (X)
- [ ] Animação suave
- [ ] Múltiplos toasts empilham

---

## 7. Tratamento de Erros

- [ ] Grupo inexistente → 404
- [ ] Sem acesso a grupo → redireciona para `/dashboard`
- [ ] Erros de API: `{ error, code? }` consistente
- [ ] Produção não expõe detalhes internos
- [ ] Erro de conexão → mensagem amigável

---

## 8. Cron Job de Preços

- [ ] Sem token → 401
- [ ] Token inválido → 401
- [ ] Token válido → 200 `{ success, totalUpdated, totalErrors }`
- [ ] Preços atualizados no banco
- [ ] Logs mostram progresso

---

## 9. Fluxo Completo (Happy Path)

- [ ] Não logado → Landing → "Começar Agora" → Login
- [ ] Login Discord → Dashboard
- [ ] Criar grupo → Lista
- [ ] Clicar grupo → Kanban vazio
- [ ] Adicionar jogo → Card aparece
- [ ] Arrastar para "Jogando Agora" → Status muda
- [ ] Arrastar para "Finalizados" → Status muda
- [ ] Buscar jogo → Filtra
- [ ] Remover jogo → Confirma → Some
- [ ] Convidar amigo → Código → Amigo entra
- [ ] Ver membros → Página de membros
- [ ] Remover membro (dono) → Membro some
- [ ] Sair → Landing page

---

## 10. Docker e Deploy

- [ ] `docker compose build` completa sem erros
- [ ] `docker compose up -d` inicia todos os containers
- [ ] `docker compose ps` mostra todos saudáveis
- [ ] Aplicação acessível em `http://localhost:3000`
- [ ] Healthcheck endpoint: `curl /api/health` → 200
- [ ] PostgreSQL healthcheck: `pg_isready` → OK
- [ ] Redis healthcheck: `redis-cli ping` → PONG
- [ ] `docker compose logs` sem erros críticos

---

## 🏷️ Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Testado e funcionando |
| ❌ | Falhou — reportar bug |
| ⏳ | Pendente de teste |
| 🔄 | Corrigindo |
| 🚫 | Não aplicável |

---

## 📝 Como Reportar um Bug

1. **Passos para reproduzir** (ex: 1. Vá para... 2. Clique em...)
2. **Comportamento esperado**
3. **Comportamento atual**
4. **Screenshots** (se aplicável)
5. **Ambiente:** navegador, SO, mobile/desktop

---

*Checklist gerado em Julho de 2026.*
