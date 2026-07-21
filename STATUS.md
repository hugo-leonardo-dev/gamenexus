# GameNexus — Status do Projeto

> **Atualizado em:** 21/07/2026
> **Versão:** 0.1.0
> **Repositório:** `hugo-leonardo-dev/gamenexus`

---

## 1. Objetivo do Projeto

Aplicação web colaborativa para grupos de amigos gerenciarem seus backlogs de jogos. Permite criar grupos, adicionar jogos via Steam, organizar em colunas Kanban, ver preços e avaliações.

---

## 2. Tecnologias

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.2.10 | Framework web (App Router, SSR, API Routes) |
| React | 19.2.4 | UI |
| TypeScript | ^5 | Tipagem |
| Prisma | 7.8.0 | ORM + migrations |
| @prisma/adapter-pg | 7.8.0 | Driver adapter PostgreSQL |
| pg | 8.22.0 | Pool de conexões PostgreSQL |
| Supabase | - | PostgreSQL hospedado |
| Auth.js (NextAuth) | 5.0.0-beta.31 | Autenticação (Discord OAuth) |
| Tailwind CSS | ^4 | Estilização |
| @dnd-kit | ^6.3.1 | Drag & drop (Kanban) |
| Vercel | - | Hospedagem (produção) |
| bcryptjs | ^3.0.3 | Hash de senhas |

---

## 3. Funcionalidades Implementadas

### Autenticação
- [x] Login com Discord OAuth
- [x] Login com Email/Senha (credentials)
- [x] Cadastro de novos usuários
- [x] Sessão JWT (sem banco de sessões)
- [x] Proteção de rotas (redirect para /login)

### Grupos
- [x] Criar grupo (torna-se OWNER)
- [x] Entrar em grupo via código de convite
- [x] Listar grupos do usuário no Dashboard
- [x] Copiar código de convite
- [x] Remover membros (apenas OWNER)
- [x] Página de membros do grupo

### Gestão de Jogos
- [x] Adicionar jogo via link da Steam
- [x] Busca de jogos por nome com autocomplete (debounce 300ms)
- [x] Scraping de dados da Steam API (título, capa, preço, reviews)
- [x] Busca de jogadores simultâneos (Steam API)
- [x] Preços em reais (BRL) com desconto destacado

### Kanban
- [x] 4 colunas: Quero Jogar / Jogando / Finalizados / Dropados
- [x] Drag & drop entre colunas
- [x] Reordenação dentro da coluna
- [x] Ordenação por: posição, nota, nome, preço
- [x] Status visual nos cards

### Interface
- [x] Tema retro/pixel (fonte Press Start 2P)
- [x] Efeitos CRT, scanlines, vinheta
- [x] Responsivo (mobile-friendly)
- [x] Loading states (skeleton)
- [x] Toasts de sucesso/erro
- [x] Banner de erro com botão recarregar

### Infraestrutura
- [x] Dockerfile multi-stage
- [x] docker-compose.yml (nginx, app, postgres, redis)
- [x] Nginx config (proxy reverso + SSL)
- [x] Scripts de deploy/backup/restore/update
- [x] GitHub Actions (deploy SSH)
- [x] Healthcheck endpoint (/api/health)
- [x] Rate limiting (Steam API)
- [x] Cache em memória (Steam API)
- [x] Cron job para atualização de preços

---

## 4. Funcionalidades Pendentes

- [ ] **Deploy funcional no Vercel** — Bloqueante. A aplicação compila, mas não conecta ao banco.
- [ ] Configurar Vercel Cron Jobs (plano Pro)
- [ ] Notificações de promoção de jogos
- [ ] Filtros por categoria/tag no Kanban
- [ ] Página de perfil do usuário
- [ ] Testes automatizados (unitários + integração)
- [ ] Modo escuro (já tem tema escuro, mas poderia ter toggle)
- [ ] Upload de avatar personalizado

---

## 5. Problemas Atuais

### 🔴 Crítico: Deploy no Vercel — Banco não conecta

**Sintoma:** O endpoint `/api/health` retorna `{"database": "disconnected"}`. O log da Vercel mostra:

```
PrismaClientKnownRequestError: Can't reach database server at db.hnnpgkzpoqndmeukopwp.supabase.co
DriverAdapterError: DatabaseNotReachable
```

**O que já foi testado e funcionou localmente:**

| Teste | Local | Vercel |
|-------|-------|--------|
| `pg.Pool` direto (porta 5432) | ✅ Falha SSL | ❌ |
| `pg.Pool` direto (porta 5432, ssl) | ❌ Self-signed cert | ❌ |
| `pg.Pool` pooler (porta 6543, ssl) | ✅ 781ms | ❌ |
| `PrismaPg` adapter (porta 6543) | ✅ Build + SELECT 1 | ❌ |
| `PrismaClient` sem adapter | ❌ Prisma 7 exige adapter | ❌ |

**Causa suspeita:** A conexão TCP do Vercel para o Supabase está sendo rejeitada. Possibilidades:
1. Supabase bloqueando IPs da Vercel
2. Resolução de DNS diferente no ambiente serverless
3. Configuração de firewall no Supabase (Database Restrictions)
4. Problema de IPv4/IPv6

**Solução em investigação:**
- Verificar se há alguma restrição de IP no Supabase (Project Settings → Database)
- Testar com conexão usando IP direto em vez de hostname
- Verificar compatibilidade de TLS/SSL entre Vercel e Supabase

### 🟡 Médio: Dependências não utilizadas

`@auth/prisma-adapter` está instalado mas não é usado (auth.ts faz gestão manual de usuários).

### 🟡 Médio: Debug habilitado no Auth.js

`debug: true` no auth.ts loga informações sensíveis em produção.

---

## 6. Últimas Mudanças

| Data | Commit | Descrição |
|------|--------|-----------|
| 21/07 | `ebc4448` | Correção Prisma 7: adapter + Pool + SSL |
| 21/07 | `06960ac` | Simplificação do PrismaClient (sem adapter) |
| 21/07 | `e11fb2a` | JWT callback: recupera de falhas temporárias |
| 21/07 | `37d21d5` | Dashboard: getGroupsSafe + banner de erro |
| 21/07 | `db6b865` | SSL no Pool do Prisma |

### Arquivos modificados recentemente:

- `src/lib/prisma.ts` — Adapter (PrismaPg) + Pool (pg) + SSL → **Arquitetura final**
- `prisma/schema.prisma` — Removido `url` do datasource (Prisma 7 não suporta)
- `prisma.config.ts` — Fonte única de URL
- `src/lib/auth.ts` — JWT callback com retry, debug condicional
- `src/app/dashboard/page.tsx` — Proteção contra crash + banner de erro
- `.env` — DATABASE_URL com porta 6543 (pooler) + pgbouncer=true

---

## 7. Arquitetura Prisma Final

```
Prisma 7.8.0
    ↓
@prisma/adapter-pg 7.8.0
    ↓
pg.Pool 8.22.0
    ↓
DATABASE_URL → Supabase Transaction Pooler (porta 6543, ?pgbouncer=true)
    ↓
SSL: { rejectUnauthorized: false }
```

### Arquivos de configuração:

| Arquivo | Função |
|---------|--------|
| `prisma/schema.prisma` | Modelos de dados (sem url — Prisma 7 não aceita) |
| `prisma.config.ts` | URL e migrations config |
| `src/lib/prisma.ts` | Cliente Prisma singleton com adapter |
| `.env` | DATABASE_URL (runtime) + DIRECT_URL (migrations) |

---

## 8. Próximos Passos

### Imediatos
1. **Resolver conexão Vercel → Supabase** (bloqueante)
   - Verificar Database Restrictions no Supabase
   - Testar conexão com IP em vez de hostname
   - Verificar logs de rede no Supabase

2. **Atualizar env vars na Vercel**
   - `DATABASE_URL` com porta 6543 + `?pgbouncer=true`
   - `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`
   - `NEXTAUTH_URL` com URL do deploy
   - `CRON_SECRET`

### Curto prazo
3. Testar login com Discord no Vercel
4. Criar grupo e adicionar jogos
5. Configurar Vercel Cron Job (plano Pro)

### Médio prazo
6. Adicionar testes automatizados
7. Documentação de API
8. Modo escuro / toggle de tema

---

## 9. Variáveis de Ambiente

### Obrigatórias

| Variável | Local | Vercel |
|----------|-------|--------|
| `DATABASE_URL` | Porta 6543 + `?pgbouncer=true` | Porta 6543 + `?pgbouncer=true` |
| `AUTH_SECRET` | `openssl rand -hex 32` | Mesmo valor |
| `AUTH_DISCORD_ID` | Discord Developer Portal | Mesmo valor |
| `AUTH_DISCORD_SECRET` | Discord Developer Portal | Mesmo valor |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://gamenexus-blush.vercel.app` |
| `CRON_SECRET` | `openssl rand -hex 32` | Mesmo valor |

### Opcionais

| Variável | Descrição |
|----------|-----------|
| `DIRECT_URL` | Usada para migrations (porta 5432, sem pooler) |
| `NODE_ENV` | `development` ou `production` |
| `DOCKER_BUILD` | `true` para build Docker standalone |

---

## 10. Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor local
npm run typecheck        # TypeScript check
npm run lint             # ESLint

# Build
npm run build            # Build de produção
npm run start            # Servir build local

# Prisma
npx prisma generate      # Gerar Prisma Client
npx prisma validate      # Validar schema
npx prisma migrate dev   # Criar migration
npx prisma migrate deploy # Aplicar migration no banco
npx prisma studio        # Abrir interface do banco

# Supabase
# Conectar via psql:
psql "postgresql://postgres:senha@db.project.supabase.co:5432/postgres"
```
