import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";
import { FinanceClient } from "./finance-client";

export default async function FinanzasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: semester } = await supabase
    .from("semesters")
    .select()
    .eq("is_current", true)
    .maybeSingle();
  if (!semester) redirect("/onboarding");

  const { data: transactions } = await supabase
    .from("transactions")
    .select()
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            {semester.label ?? semester.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Finanzas
          </h1>
        </header>

        <FinanceClient
          userId={user.id}
          semesterId={semester.id}
          initialTransactions={(transactions ?? []) as Transaction[]}
        />
      </main>
  );
}
