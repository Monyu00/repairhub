import { createAdminClient } from "@/lib/supabase/admin";
import { getTicketDetail } from "@/server/tickets/detail";

import { TicketNotFound } from "./_components/ticket-not-found";
import { TicketTracker } from "./_components/ticket-tracker";

interface TrackPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { ticketId } = await params;

  // Public tracking uses the admin adapter, then redacts Reporter and author data in the module.
  const supabase = createAdminClient();
  const detail = await getTicketDetail(supabase, ticketId, { role: null });

  if (!detail) return <TicketNotFound ticketId={ticketId} />;

  return <TicketTracker detail={detail} />;
}
