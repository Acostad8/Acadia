"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={signOut}
      className="rounded-xl px-4 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
    >
      Salir
    </button>
  );
}
