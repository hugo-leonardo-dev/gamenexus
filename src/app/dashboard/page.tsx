import { auth } from "@/lib/auth";
import { listUserGroups } from "@/lib/groups";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "./CreateGroupForm";
import { JoinGroupForm } from "./JoinGroupForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const groups = await listUserGroups();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 animate-float-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-6 w-1 bg-retro-primary" />
          <h1 className="font-pixel text-lg tracking-wider text-retro-text">
            DASHBOARD
          </h1>
        </div>
        <p className="font-pixel text-[8px] text-retro-text-dim ml-4">
          ★ BEM-VINDO AO GAMENEXUS, {session.user.name?.toUpperCase()}!
        </p>
      </div>

      {/* Ações */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 animate-float-up" style={{animationDelay: '0.1s'}}>
        <CreateGroupForm />
        <JoinGroupForm />
      </div>

      {/* Lista de Grupos */}
      <section className="animate-float-up" style={{animationDelay: '0.2s'}}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-pixel text-[10px] text-retro-text uppercase tracking-wider">
            Seus Grupos
          </h2>
          {groups.length > 0 && (
            <span className="pixel-badge bg-retro-surface text-retro-text-dim pixel-border-sm">
              {groups.length}
            </span>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="pixel-card p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center pixel-border-sm" style={{background: 'linear-gradient(135deg, #1a1a30, #0d0d1a)'}}>
              <svg
                className="h-7 w-7 text-retro-text-dim"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </div>
            <h3 className="font-pixel text-[10px] text-retro-text mb-2">
              Nenhum grupo ainda
            </h3>
            <p className="font-pixel text-[8px] text-retro-text-dim max-w-sm mx-auto leading-relaxed">
              Crie seu primeiro grupo acima ou peça um código de convite para seus amigos!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, index) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="pixel-card p-4 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(74,124,255,0.15)] group"
                style={{animationDelay: `${0.1 * index}s`}}
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-pixel text-[9px] text-retro-text group-hover:text-retro-primary transition-colors uppercase tracking-wider">
                    {group.name}
                  </h3>
                  <span className={`pixel-badge ${
                    group.role === "OWNER"
                      ? "bg-retro-primary/20 text-retro-primary pixel-border-sm"
                      : "bg-retro-surface text-retro-text-dim pixel-border-sm"
                  }`}>
                    {group.role === "OWNER" ? "★ DONO" : "MEMBRO"}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-pixel text-[7px] text-retro-text-dim">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 text-retro-text-dim shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    {group._count.members} membro{group._count.members !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 text-retro-text-dim shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {group._count.games} jogo{group._count.games !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer decoration */}
      <div className="mt-12 border-t-2 border-retro-border pt-4 text-center">
        <span className="font-pixel text-[6px] text-retro-text-dim">
          ▸ {groups.length} GRUPO{groups.length !== 1 ? "S" : ""} CADASTRADO{groups.length !== 1 ? "S" : ""} ◂
        </span>
      </div>
    </div>
  );
}
