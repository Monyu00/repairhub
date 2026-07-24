import { createAdminClient } from "@/lib/supabase/admin";

import { TicketNotFound } from "./_components/ticket-not-found";
import { TicketTracker } from "./_components/ticket-tracker";

interface TrackPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { ticketId } = await params;

  // Use admin client to bypass RLS – this is a public Server Component.
  // We intentionally omit reporter_email and reporter_phone from all queries.
  const supabase = createAdminClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // Fetch ticket core info (no private contact fields)
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, status, description, created_at, equipment_id, category:categories(name), space:spaces(name, building:buildings(name)), equipment:equipment(name)",
    )
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    return <TicketNotFound ticketId={ticketId} />;
  }

  // Flatten Supabase's nested relation arrays
  const categoryObj = Array.isArray(ticket.category) ? ticket.category[0] : ticket.category;
  const spaceObj = Array.isArray(ticket.space) ? ticket.space[0] : ticket.space;
  const buildingObj = Array.isArray(spaceObj?.building) ? spaceObj?.building[0] : spaceObj?.building;
  const equipmentObj = Array.isArray(ticket.equipment) ? ticket.equipment[0] : ticket.equipment;

  // Fetch photos (report and closure)
  const { data: photosData } = await supabase
    .from("ticket_photos")
    .select("id, storage_path, phase")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  // Fetch notes (both 'note' and 'status_change' types)
  const { data: notesData } = await supabase
    .from("ticket_notes")
    .select("id, content, type, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (
    <TicketTracker
      ticketId={ticket.id}
      status={ticket.status}
      createdAt={ticket.created_at}
      category={categoryObj?.name ?? "未知類別"}
      building={buildingObj?.name ?? "未知大樓"}
      space={spaceObj?.name ?? "未知空間"}
      description={ticket.description}
      equipment={equipmentObj?.name ?? null}
      photos={(photosData ?? []) as { id: string; storage_path: string; phase: "report" | "closure" }[]}
      notes={(notesData ?? []) as { id: string; content: string; type: "note" | "status_change"; created_at: string }[]}
      supabaseUrl={supabaseUrl}
    />
  );
}
