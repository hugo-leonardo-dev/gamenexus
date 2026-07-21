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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-400">
          Bem-vindo{", "}{session.user.name}!
        </p>
      </div>

      {/* Ações */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <CreateGroupForm />
        <JoinGroupForm />
      </div>

      {/* Lista de Grupos */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">
          Seus Grupos
          {groups.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              ({groups.length})
            </span>
          )}
        </h2>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
              <svg
                className="h-7 w-7 text-zinc-600"
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
            <h3 className="text-lg font-medium text-zinc-300">
              Nenhum grupo ainda
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Crie seu primeiro grupo acima ou peça um código de convite para
              seus amigos!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-lg hover:shadow-black/10"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-white">
                    {group.name}
                  </h3>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      group.role === "OWNER"
                        ? "bg-indigo-600/20 text-indigo-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {group.role === "OWNER" ? "Dono" : "Membro"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                      />
                    </svg>
                    {group._count.members} membro
                    {group._count.members !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    {group._count.games} jogo
                    {group._count.games !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
