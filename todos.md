# 📋 Backlog de Jogos — Plano de Desenvolvimento

> **Status dos símbolos:** ✅ Done | 🔄 Doing | ⏳ To Do | 🚫 Blocked | ❌ Removido

---

## Fase 1: 🏗️ Fundação do Projeto

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 1.1 | Inicializar Next.js 16 com App Router, TypeScript e Tailwind | Alta | ✅ Done | v16.2.10, Tailwind v4 |
| 1.2 | Instalar e configurar Prisma ORM (prisma-client-js) | Alta | ✅ Done | v7.8.0 |
| 1.3 | Instalar NextAuth v5 (beta) | Alta | ✅ Done | v5.0.0-beta.31 |
| 1.4 | Configurar variáveis de ambiente (.env) | Alta | ✅ Done | DATABASE_URL, AUTH_SECRET, Discord OAuth, CRON_SECRET |
| 1.5 | Criar singleton do Prisma Client (src/lib/prisma.ts) | Alta | ✅ Done | Com PrismaPg adapter |
| 1.6 | Configurar dotenv para scripts Prisma | Média | ✅ Done | |

---

## Fase 2: 🔐 Autenticação (NextAuth + Discord OAuth)

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 2.1 | Criar schema do model User no Prisma | Alta | ✅ Done | discordId, name, email, avatarUrl, passwordHash, emailVerified |
| 2.2 | Configurar NextAuth route handler (src/app/api/auth/[...nextauth]/route.ts) | Alta | ✅ Done | |
| 2.3 | Configurar auth.ts com Discord Provider + callbacks | Alta | ✅ Done | JWT strategy + Prisma direto nos callbacks |
| 2.4 | Persistir User + Account no banco via Prisma | Alta | ✅ Done | Feito no callback signIn (upsert) |
| 2.5 | Criar página de login com "Entrar com Discord" | Alta | ✅ Done | |
| 2.6 | Extrair e salvar discordId, name, avatarUrl da Discord API | Alta | ✅ Done | Feito via profile do provider |
| 2.7 | Criar Navbar com avatar do usuário logado + botão sair | Média | ✅ Done | |
| 2.8 | Configurar next.config.ts para imagens Discord CDN | Média | ✅ Done | remotePatterns |
| 2.9 | Adicionar suporte fallback Email/Senha | Baixa | ✅ Done | CredentialsProvider + bcrypt + /signup + login funcional |

---

## Fase 3: 🗄️ Schema do Banco de Dados

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 3.1 | Definir model User completo no schema.prisma | Alta | ✅ Done | Inclui Account, Session, VerificationToken |
| 3.2 | Definir model Group (nome, inviteCode único) | Alta | ✅ Done | Já no schema |
| 3.3 | Definir model GroupMember (userId, groupId, role OWNER/MEMBER) | Alta | ✅ Done | Já no schema |
| 3.4 | Definir model Game completo (status, position, categories, preços) | Alta | ✅ Done | Já no schema |
| 3.5 | Rodar `prisma migrate dev` para criar as tabelas | Alta | ✅ Done | Migration `init` aplicada no PostgreSQL |

---

## Fase 4: 👥 Grupos e Convites

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 4.1 | Criar API endpoint POST /api/groups (criar grupo) | Alta | ✅ Done | Gera inviteCode único (JOG-XXXXXX) |
| 4.2 | Criar API endpoint POST /api/groups/join (entrar com código) | Alta | ✅ Done | Valida duplicatas |
| 4.3 | Criar API endpoint GET /api/groups (listar grupos do usuário) | Alta | ✅ Done | Inclui role e contagens |
| 4.4 | Criar página Dashboard (lista de grupos + criar/entrar) | Alta | ✅ Done | CreateGroupForm + JoinGroupForm |
| 4.5 | Criar página de grupo /group/[id] com header | Alta | ✅ Done | Nome, inviteCode, membros, Kanban |
| 4.6 | Botão copiar código de convite | Média | ✅ Done | CopyInviteButton com feedback |

---

## Fase 5: 🎮 Integração Steam (Adicionar Jogos)

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 5.1 | Criar parser de URL da Steam → extrair appId | Alta | ✅ Done | Regex `/app/(\d+)` |
| 5.2 | Criar função de fetch da Steam API (appdetails) | Alta | ✅ Done | cc=br&l=portuguese |
| 5.3 | Mapear genres/categories da Steam para tags amigáveis | Alta | ✅ Done | "Multi-player" → "Multiplayer", etc. |
| 5.4 | Extrair preços (initial, final, discount_percent) | Alta | ✅ Done | Em centavos BRL, trata is_free |
| 5.5 | Extrair release_date (date, isReleased) | Alta | ✅ Done | |
| 5.6 | Criar API POST /api/games (adicionar jogo ao grupo) | Alta | ✅ Done | Com validações de auth + membership + duplicatas |
| 5.7 | Implementar rate limiting no scraping | Média | ✅ Done | Sliding window (10 req/min) + throw com retryAfter |
| 5.8 | Implementar cache de respostas Steam | Baixa | ✅ Done | In-memory com TTL 1h + cleanup automático |

---

## Fase 6: 📋 Listagem de Jogos no Grupo

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 6.1 | Criar consulta Prisma para listar jogos do grupo | Alta | ✅ Done | Feito na página do grupo com addedBy |
| 6.2 | Criar card de jogo (capa, título, tags, preço, adicionado por) | Alta | ✅ Done | GameCard component |
| 6.3 | Criar input para adicionar jogo via link Steam | Alta | ✅ Done | AddGameForm no topo da página |
| 6.4 | Exibir preço com destaque verde se em promoção | Média | ✅ Done | Badge de desconto + preço riscado |

---

## Fase 7: 📊 Kanban Básico (3 Colunas)

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 7.1 | Criar layout de 3 colunas: BACKLOG \| PLAYING \| COMPLETED | Alta | ✅ Done | KanbanBoard component |
| 7.2 | Distribuir cards por status em cada coluna | Alta | ✅ Done | Grid responsivo, cores por coluna |
| 7.3 | Contagem de jogos por coluna | Alta | ✅ Done | Badge no header de cada coluna |
| 7.4 | Estados vazios por coluna | Média | ✅ Done | Mensagens customizadas |

---

## Fase 8: 🔄 Drag & Drop no Kanban

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 8.1 | Instalar @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities | Alta | ✅ Done | |
| 8.2 | Drag entre colunas (altera status) | Alta | ✅ Done | SortableContext + useSortable |
| 8.3 | Reordenação dentro da coluna (altera position) | Alta | ✅ Done | verticalListSortingStrategy |
| 8.4 | Criar API PATCH /api/games/[id]/move | Alta | ✅ Done | Transaction Prisma + recálculo de posições |
| 8.5 | Drop em colunas vazias | Alta | ✅ Done | EmptyColumnDropZone com useDroppable |
| 8.6 | DragOverlay com feedback visual | Média | ✅ Done | Card fantasma girando |

---

## Fase 9: 🏷️ Sistema de Categorias/Tags

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 9.1 | Exibir tags como chips nos cards | Alta | ✅ Done | No GameCard |
| 9.2 | Criar UI para editar tags de um jogo | Alta | ❌ Removido | Usuário não gostou, removeu |
| 9.3 | Criar API PATCH /api/games/[id]/tags | Alta | ❌ Removido | Removido junto com a UI |
| 9.4 | Filtro por categoria/tag no Kanban | Média | ❌ Substituído | Substituído por ordenação alfabética |

---

## Fase 10: ⏰ Cron Job de Preços

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 10.1 | Criar endpoint GET /api/cron/update-prices | Alta | ✅ Done | Protegido com Bearer CRON_SECRET | |
| 10.2 | Implementar lógica de busca em lote (10-15 IDs) | Alta | ✅ Done | BATCH_SIZE = 10, pausa de 500ms entre lotes | |
| 10.3 | Atualizar currentPrice, discountPercent, updatedAt | Alta | ✅ Done | prisma.game.updateMany com distinct steamAppId | prisma.game.updateMany |
| 10.4 | Proteger com header Authorization: Bearer CRON_SECRET | Alta | ✅ Done | Verifica header + CRON_SECRET do .env | |
| 10.5 | Configurar agendamento (Vercel Cron, Railway, etc.) | Média | ✅ Done | vercel.json: 0 8 * * * (05:00 BRT) | |

---

## Fase 11: 🎨 Polimento e Finalização

| # | Tarefa | Prioridade | Status | Observações |
|---|-------|-----------|--------|-------------|
| 11.1 | Responsividade mobile do Kanban | Alta | ✅ Done | TouchSensor + max-height com scroll + flex layout |
| 11.2 | Estados de loading e empty states | Média | ✅ Done | loading.tsx para dashboard e grupo com skeletons | |
| 11.3 | Toast/snackbar para feedback visual | Média | ✅ Done | ToastProvider com context + animação slide-up |
| 11.4 | Confirmação antes de remover jogo | Média | ✅ Done | Botão hover + confirm() + DELETE endpoint | |
| 11.5 | Ordenação alfabética dos jogos | Média | ✅ Done | Substituiu filtro por tag |
| 11.6 | Gerenciamento de membros (OWNER pode remover) | Média | ✅ Done | MemberList + DELETE endpoint + proteção último OWNER | |
 |

---

## 📌 Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ Done | Tarefa concluída |
| 🔄 Doing | Em desenvolvimento |
| ⏳ To Do | Aguardando início |
| 🚫 Blocked | Bloqueado por dependência externa |
| ❌ Removido | Removeu por decisão do usuário |

**Prioridades:**
- 🔴 **Alta:** Essencial para o MVP
- 🟡 **Média:** Importante, mas pode esperar
- 🟢 **Baixa:** Melhoria futura / nice-to-have
