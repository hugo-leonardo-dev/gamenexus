import { auth } from "@/lib/auth";
import { listUserGroups } from "@/lib/groups";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "./CreateGroupForm";
import { JoinGroupForm } from "./JoinGroupForm";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function getGroupsSafe() {
  try {
    const groups = await listUserGroups();
    return { groups, error: null };
  } catch (error) {
    console.error("[dashboard] Erro ao carregar grupos:", error);
    return { groups: [], error: "Não foi possível carregar seus grupos. Tente recarregar a página." };
  }
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { groups, error: groupsError } = await getGroupsSafe();

  // Estatísticas reais a partir dos dados existentes
  const totalGroups = groups.length;
  const totalGames = groups.reduce((sum, g) => sum + g._count.games, 0);
  const totalMembers = groups.reduce((sum, g) => sum + g._count.members, 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 sm:px-8 lg:px-10 xl:px-12">
      {/* ════════════════════════════════════════════════ */}
      {/* WELCOME */}
      {/* ════════════════════════════════════════════════ */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-pixel text-2xl tracking-wider text-retro-text sm:text-3xl">
            Olá, <span className="text-gradient">{session.user.name?.split(" ")[0]}</span>
          </h1>
          <span className="text-2xl sm:text-3xl">👋</span>
        </div>
        <p className="font-pixel text-[9px] sm:text-[10px] text-retro-text-dim ml-1">
          Continue organizando seus jogos e descubra o próximo que vai jogar.
        </p>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* STATS */}
      {/* ════════════════════════════════════════════════ */}
      <div className="mb-12">
        <div className="mb-5 flex items-center gap-3">
          <span className="font-pixel text-[10px] tracking-wider text-retro-text-dim uppercase">
            Visão Geral
          </span>
          <div className="h-px flex-1 bg-retro-border/50" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Grupos"
            value={totalGroups}
            color="#4a7cff"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            }
            subtitle={`${totalMembers} membro${totalMembers !== 1 ? "s" : ""} no total`}
          />
          <StatCard
            label="Jogos"
            value={totalGames}
            color="#ffd700"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
              </svg>
            }
            subtitle="em todos os seus grupos"
          />
          <StatCard
            label="Membros"
            value={totalMembers}
            color="#40ff80"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            }
            subtitle={`em ${totalGroups} grupo${totalGroups !== 1 ? "s" : ""}`}
          />
          <StatCard
            label="Sua Rede"
            value={`${totalGroups > 1 ? "⚡" : "🌱"}`}
            color="#8b5cf6"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.136-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.5 10.25" />
              </svg>
            }
            subtitle={totalGroups > 1 ? `${totalGroups} grupos conectados` : totalGroups === 1 ? "1 grupo conectado" : "Nenhum grupo ainda"}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* AÇÕES */}
      {/* ════════════════════════════════════════════════ */}
      <div className="mb-12 grid gap-5 sm:grid-cols-2">
        <CreateGroupForm />
        <JoinGroupForm />
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* GRUPOS */}
      {/* ════════════════════════════════════════════════ */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="font-pixel text-[10px] tracking-wider text-retro-text uppercase">
            Seus Grupos
          </h2>
          {groups.length > 0 && !groupsError && (
            <span className="inline-flex items-center justify-center rounded-md bg-retro-primary/15 px-2 py-0.5 font-pixel text-[8px] text-retro-primary">
              {groups.length}
            </span>
          )}
        </div>

        {/* Error banner */}
        {groupsError && (
          <div className="mb-6 rounded-xl border border-retro-red/20 bg-retro-red/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-5 w-5 shrink-0 text-retro-red" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="font-pixel text-[9px] text-retro-red">Erro ao carregar grupos</p>
            </div>
            <p className="mb-4 font-pixel text-[8px] text-retro-text-dim">{groupsError}</p>
            <form action="/dashboard" method="GET">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-retro-border/30 px-4 py-2 font-pixel text-[8px] text-retro-text-dim transition-all hover:bg-retro-surface-hover"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Recarregar
              </button>
            </form>
          </div>
        )}

        {/* Empty state */}
        {groups.length === 0 && !groupsError && (
          <EmptyState
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            }
            title="Nenhum grupo ainda"
            description="Crie seu primeiro grupo acima ou peça um código de convite para seus amigos!"
            actionLabel="Criar Grupo"
            actionHref="/#criar-grupo"
          />
        )}

        {/* Group cards */}
        {groups.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {groups.map((group, index) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="glass-card group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 blur transition-all group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at 50% 0%, rgba(74,124,255,0.08), transparent 60%)" }}
                />

                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="font-pixel text-[10px] tracking-wider text-retro-text transition-colors group-hover:text-retro-primary">
                      {group.name}
                    </h3>
                    <span
                      className={`shrink-0 ml-2 rounded-md px-2 py-0.5 font-pixel text-[7px] ${
                        group.role === "OWNER"
                          ? "bg-retro-primary/15 text-retro-primary"
                          : "bg-retro-surface/50 text-retro-text-dim"
                      }`}
                    >
                      {group.role === "OWNER" ? "Dono" : "Membro"}
                    </span>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-retro-text-dim/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span className="font-pixel text-[8px] text-retro-text-dim">
                        {group._count.members} {group._count.members === 1 ? "membro" : "membros"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-retro-text-dim" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                      <span className="font-pixel text-[8px] text-retro-text-dim">
                        {group._count.games} {group._count.games === 1 ? "jogo" : "jogos"}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
