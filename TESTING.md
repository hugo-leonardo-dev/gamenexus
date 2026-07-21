# 🧪 Checklist de Testes Manuais — Backlog de Jogos

> Use este checklist para validar manualmente todas as funcionalidades do sistema antes de um deploy ou após mudanças significativas.

---

## 🔐 1. Autenticação

### 1.1 Discord OAuth

- [ ] A página inicial exibe o botão "Começar Agora" para usuários não logados
- [ ] Clicar em "Começar Agora" → redireciona para `/login`
- [ ] Na página `/login`, clicar em "Entrar com Discord" → redireciona para o Discord
- [ ] Após autorizar o app Discord, o usuário é redirecionado de volta ao `/dashboard`
- [ ] O nome e avatar do Discord aparecem na Navbar
- [ ] Clicar em "Sair" → usuário é deslogado e redirecionado para a home
- [ ] Após sair, a Navbar mostra "Entrar" novamente

### 1.2 Email/Senha

- [ ] Na página `/signup`, criar conta com nome, email e senha
- [ ] Validação de senha mínima 6 caracteres funciona
- [ ] Validação de email inválido funciona
- [ ] Ao enviar, a conta é criada e o usuário é logado automaticamente
- [ ] Tentar criar conta com email já existente → mensagem de erro "Este email já está cadastrado"
- [ ] Na página `/login`, logar com email e senha criados
- [ ] Credenciais inválidas → mensagem "Email ou senha inválidos"

### 1.3 Proteção de Rotas

- [ ] Sem login, acessar `/dashboard` → redireciona para `/login`
- [ ] Sem login, acessar `/group/[id]` → redireciona para `/login`
- [ ] Sem login, chamar `POST /api/groups` → retorna 401
- [ ] Sem login, chamar `POST /api/games` → retorna 401

---

## 👥 2. Grupos

### 2.1 Criar Grupo

- [ ] No Dashboard, preencher nome e clicar "Criar Grupo"
- [ ] Toast de sucesso aparece: `Grupo "NOME" criado com sucesso!`
- [ ] O grupo aparece na lista com role "Dono"
- [ ] Contagem de membros mostra "1 membro" e "0 jogos"
- [ ] Tentar criar grupo sem nome → botão desabilitado
- [ ] Nome com mais de 50 caracteres é bloqueado pelo backend

### 2.2 Entrar em Grupo

- [ ] No segundo card do Dashboard, digitar um código de convite válido
- [ ] Toast de sucesso aparece: `Você entrou em "NOME"!`
- [ ] O grupo aparece na lista com role "Membro"
- [ ] Tentar entrar com código inválido → mensagem de erro
- [ ] Tentar entrar em grupo que já é membro → mensagem de erro
- [ ] Código é convertido para maiúsculas automaticamente

### 2.3 Lista de Grupos

- [ ] Dashboard lista todos os grupos do usuário
- [ ] Cada card mostra: nome, role (Dono/Membro), número de membros e jogos
- [ ] Clicar em um grupo → navega para `/group/[id]`
- [ ] Estado vazio com mensagem "Nenhum grupo ainda" é exibido quando não há grupos

---

## 🎮 3. Kanban e Jogos

### 3.1 Adicionar Jogo

- [ ] Na página do grupo, colar link da Steam no input e clicar "Adicionar"
- [ ] Toast de sucesso: `"Título" adicionado ao backlog!`
- [ ] O jogo aparece na coluna "Quero Jogar"
- [ ] Tentar adicionar o mesmo jogo novamente → mensagem "Este jogo já foi adicionado"
- [ ] Tentar adicionar link inválido (não Steam) → mensagem de erro
- [ ] Tentar adicionar link de app inexistente → mensagem de erro
- [ ] Preços, tags, capa e status de lançamento são exibidos corretamente no card

### 3.2 Drag & Drop no Kanban

- [ ] Arrastar um card da coluna "Quero Jogar" para "Jogando Agora"
- [ ] O card se move para a coluna de destino
- [ ] O badge de status do card muda para "Jogando Agora"
- [ ] Arrastar um card de "Jogando Agora" para "Finalizados"
- [ ] Badge muda para "Finalizado"
- [ ] Arrastar de volta para "Quero Jogar" → funciona
- [ ] Soltar um card em uma coluna vazia → funciona
- [ ] O DragOverlay aparece com o card durante o arrasto
- [ ] Em mobile (touch), o drag funciona com delay de toque

### 3.3 Busca de Jogos

- [ ] Digitar no campo de busca → jogos são filtrados em tempo real
- [ ] O contador mostra "X de Y jogos encontrados"
- [ ] Limpar a busca (botão X) → todos os jogos reaparecem
- [ ] Colunas sem resultado mostram "Nenhum jogo encontrado com ..."
- [ ] Busca não diferencia maiúsculas/minúsculas

### 3.4 Remover Jogo

- [ ] Passar o mouse sobre um card → botão X aparece no canto superior direito
- [ ] Clicar no botão "Remover jogo" na base do card
- [ ] Modal de confirmação aparece com "Cancelar" e "Remover"
- [ ] Clicar "Remover" → jogo é removido com toast de sucesso
- [ ] Clicar "Cancelar" → modal fecha sem remover
- [ ] Clicar no backdrop → modal fecha sem remover

### 3.5 Informações do Card

- [ ] Capa do jogo é exibida
- [ ] Título do jogo é exibido
- [ ] Tags de categoria aparecem (ex: "Multiplayer", "Ação", "Coop")
- [ ] "Adicionado por [nome]" aparece no card
- [ ] Preço é exibido (ou "Grátis" se for gratuito)

---

## 💰 4. Indicador de Promoção

- [ ] Jogo com `discountPercent > 0` tem **banner verde** no topo do card
- [ ] Banner exibe "✨ Promoção! -X%" com ícones de estrela
- [ ] **Borda do card** fica verde (classe `border-emerald-700/60`)
- [ ] **Badge de desconto** no canto da imagem tem classe `animate-pulse`
- [ ] Preço original aparece **riscado** com o preço promocional ao lado
- [ ] Jogo gratuito mostra "Grátis" sem badge de desconto
- [ ] Fundo do card fica sutilmente esverdeado quando em promoção

---

## 👤 5. Gerenciamento de Membros

### 5.1 Lista no Header do Grupo

- [ ] Na página do grupo, membros são listados abaixo do header
- [ ] Cada membro mostra avatar, nome e role (Dono ★)
- [ ] O usuário atual mostra "(você)" ao lado do nome
- [ ] Dono do grupo pode remover membros (hover → botão X aparece)

### 5.2 Página de Membros

- [ ] Clicar em "Gerenciar membros" → navega para `/group/[id]/members`
- [ ] Stats cards exibem Total, Donos e Membros
- [ ] Cada membro mostra avatar, nome, email/Discord e role badge
- [ ] Dono pode clicar "Remover" → botões "Cancelar" / "Confirmar" aparecem
- [ ] Dono **não pode remover a si mesmo**
- [ ] Dono **não pode remover outro dono** (apenas se houver mais de um)
- [ ] Tentar remover o último dono → erro "Não é possível remover o único dono"
- [ ] Membro comum não vê botão de remover
- [ ] Link "Voltar para [grupo]" funciona

---

## 🖥️ 6. UI/UX e Responsividade

### 6.1 Navegação

- [ ] Navbar mostra logo "Backlog" que leva à home
- [ ] Navbar mostra "Dashboard" quando logado
- [ ] Navbar mostra avatar e nome do usuário
- [ ] Navbar mostra botão "Sair"
- [ ] Navbar mostra loading skeleton enquanto sessão carrega
- [ ] Navbar é sticky (fixa no topo)

### 6.2 Loading States

- [ ] `/dashboard` tem loading com skeleton animado
- [ ] `/group/[id]` tem loading com skeleton animado (header, input, kolunas)
- [ ] Botões mostram spinner durante ações (criar grupo, adicionar jogo, etc.)

### 6.3 Responsividade

- [ ] Em mobile (< 640px), layout empilha verticalmente
- [ ] Navbar se adapta (texto "Entrar" some em mobile)
- [ ] Kanban empilha colunas verticalmente em mobile (< 1024px)
- [ ] Input de adicionar jogo empilha em mobile
- [ ] Formulários de criar/entrar grupo empilham em mobile
- [ ] Toasts são legíveis em mobile

### 6.4 Toasts (Feedback Visual)

- [ ] Criar grupo → toast success
- [ ] Entrar em grupo → toast success
- [ ] Adicionar jogo → toast success
- [ ] Remover jogo → toast success
- [ ] Erro ao adicionar jogo → toast error
- [ ] Erro ao mover jogo → toast error
- [ ] Toast some sozinho após ~4 segundos
- [ ] Toast pode ser fechado clicando no X
- [ ] Animação de entrada/saída suave
- [ ] Múltiplos toasts empilham corretamente

---

## ⚠️ 7. Tratamento de Erros

- [ ] Página 404 para grupo inexistente
- [ ] Sem acesso a grupo que não é membro → redireciona para `/dashboard`
- [ ] Erros de API retornam formato `{ error, code? }` consistente
- [ ] Modo produção não expõe detalhes internos do erro
- [ ] Timeout/erro de conexão mostra mensagem amigável

---

## 🔄 8. Cron Job de Preços

- [ ] `GET /api/cron/update-prices` sem token → 401
- [ ] `GET /api/cron/update-prices` com token inválido → 401
- [ ] `GET /api/cron/update-prices` com token válido → 200 com `{ success, totalUpdated, totalErrors }`
- [ ] Preços dos jogos são atualizados no banco após execução
- [ ] Logs mostram progresso no console

---

## 📱 9. Navegação entre Telas

### Fluxo Completo (Happy Path)

- [ ] Usuário não logado → Landing page → "Começar Agora" → Login
- [ ] Login via Discord → Dashboard
- [ ] Criar grupo → Grupo aparece na lista
- [ ] Clicar no grupo → Página do grupo (Kanban vazio)
- [ ] Adicionar jogo via link Steam → Card aparece no Kanban
- [ ] Arrastar card para "Jogando Agora" → Status muda
- [ ] Arrastar card para "Finalizados" → Status muda
- [ ] Buscar jogo pelo nome → Filtra corretamente
- [ ] Remover jogo → Confirmação → Card some
- [ ] Convidar amigo (copiar código) → Amigo entra pelo Dashboard
- [ ] Ver membros do grupo → Página de membros
- [ ] Remover membro (se for dono) → Membro some
- [ ] Sair → Volta para landing page

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

## 📝 Como reportar um bug

Ao encontrar um bug, registre no repositório com:

1. **Passos para reproduzir** (ex: 1. Vá para... 2. Clique em... 3. Veja o erro)
2. **Comportamento esperado**
3. **Comportamento atual**
4. **Screenshots** (se aplicável)
5. **Ambiente:** navegador, SO, mobile/desktop
