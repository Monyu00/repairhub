import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import { getTicketDetail } from "@/server/tickets/detail";

import { TicketDetailView } from "./_components/ticket-detail-view";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const shortId = id.slice(0, 8);
  return {
    title: `報修單 #${shortId} 詳情 - RepairHub`,
    description: `檢視與管理報修單據 #${id} 之詳細內容、維修進度與狀態時間軸`,
  };
}

export default async function Page({ params }: PageProps) {
  const { id: ticketId } = await params;

  if (!ticketId || typeof ticketId !== "string") {
    notFound();
  }

  const session = await getSession();
  const supabase = session?.supabase ?? (await createClient());
  const detail = await getTicketDetail(supabase, ticketId, {
    role: session?.role ?? null,
    email: session?.email ?? null,
    userId: session?.userId ?? null,
  });

  if (!detail) {
    notFound();
  }

  return <TicketDetailView detail={detail} userId={session?.userId ?? null} userRole={session?.role ?? null} />;
}
