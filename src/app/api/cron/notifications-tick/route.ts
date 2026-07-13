import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret) return unauthorized();

  const supabase = createServiceClient();

  const { data: newCount, error: rpcErr } = await supabase.rpc(
    "generate_reminders"
  );
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  let dispatched = 0;
  let gone = 0;

  if (isPushConfigured()) {
    const { data: pending, error: pendingErr } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, url")
      .is("push_sent_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (pendingErr) {
      return NextResponse.json({ error: pendingErr.message }, { status: 500 });
    }

    const byUser = new Map<string, typeof pending>();
    for (const n of pending ?? []) {
      const list = byUser.get(n.user_id) ?? [];
      list.push(n);
      byUser.set(n.user_id, list);
    }

    for (const [userId, notifs] of byUser) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (!subs || subs.length === 0) continue;

      for (const n of notifs ?? []) {
        const res = await sendPushToUser(subs, {
          title: n.title,
          body: n.body ?? undefined,
          url: n.url ?? undefined,
        });
        if (res.ok.length > 0) {
          await supabase
            .from("notifications")
            .update({ push_sent_at: new Date().toISOString() })
            .eq("id", n.id);
          dispatched++;
        }
        if (res.gone.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", res.gone);
          gone += res.gone.length;
        }
      }
    }
  }

  return NextResponse.json({
    generated: newCount ?? 0,
    dispatched,
    gone,
    push_configured: isPushConfigured(),
  });
}
