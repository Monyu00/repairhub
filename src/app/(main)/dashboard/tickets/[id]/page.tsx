import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import type { TimelineNote } from "./_components/status-timeline";
import { TicketDetailView } from "./_components/ticket-detail-view";
import type { ProgressNote } from "./_components/ticket-notes-section";
import type { PhotoItem } from "./_components/ticket-photos-section";

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

  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // 1. Parallel fetch user, ticket, photos, and notes
  const [userRes, ticketRes, photosRes, notesRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("tickets")
      .select(`
        id,
        status,
        description,
        reporter_email,
        reporter_phone,
        assigned_to,
        created_at,
        updated_at,
        category:categories(id, name),
        space:spaces(
          id,
          name,
          floor,
          building:buildings(id, name, code)
        ),
        equipment:equipment(id, name)
      `)
      .eq("id", ticketId)
      .maybeSingle(),
    supabase
      .from("ticket_photos")
      .select("id, storage_path, phase, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_notes")
      .select(`
        id,
        content,
        type,
        created_at,
        author_id,
        author:profiles!ticket_notes_author_id_fkey(
          id,
          user_role
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  const ticket = ticketRes.data;
  if (!ticket) {
    notFound();
  }

  const user = userRes.data.user;

  // 2. Fetch current user profile if logged in
  let userRole: "admin" | "technician" | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", user.id).maybeSingle();

    userRole = profile?.user_role ?? null;
  }

  // 3. Process relations
  const spaceRaw = Array.isArray(ticket.space) ? ticket.space[0] : ticket.space;
  const spaceData = spaceRaw ?? { id: "", name: "未知空間", floor: 0, building: null };

  let buildingData = { id: "", name: "未知大樓", code: "" };
  if (spaceData.building) {
    const bRaw = Array.isArray(spaceData.building) ? spaceData.building[0] : spaceData.building;
    if (bRaw && typeof bRaw === "object") {
      buildingData = bRaw as { id: string; name: string; code: string };
    }
  }

  const catRaw = Array.isArray(ticket.category) ? ticket.category[0] : ticket.category;
  const categoryData = (catRaw ?? { id: "", name: "未分類" }) as { id: string; name: string };

  const eqRaw = Array.isArray(ticket.equipment) ? ticket.equipment[0] : ticket.equipment;
  const equipmentData = eqRaw ? (eqRaw as { id: string; name: string }) : null;

  // 4. Format ticket info
  const ticketInfo = {
    id: ticket.id,
    status: ticket.status,
    categoryName: categoryData.name,
    buildingName: buildingData.name,
    buildingCode: buildingData.code,
    spaceName: spaceData.name,
    floor: spaceData.floor,
    equipmentName: equipmentData?.name ?? null,
    description: ticket.description,
    reporterEmail: ticket.reporter_email,
    reporterPhone: ticket.reporter_phone,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  };

  // 5. Format photos
  const photos: PhotoItem[] = (photosRes.data ?? []).map((p) => ({
    id: p.id,
    storagePath: p.storage_path,
    phase: p.phase,
  }));

  // 6. Format notes
  type RawNote = {
    id: string;
    content: string;
    type: "note" | "status_change";
    created_at: string;
    author_id: string | null;
    author:
      | { id: string; user_role: "admin" | "technician" | null }
      | { id: string; user_role: "admin" | "technician" | null }[]
      | null;
  };

  const rawNotes = (notesRes.data ?? []) as unknown as RawNote[];

  const formattedNotes: ProgressNote[] = rawNotes.map((n) => {
    const authorRaw = Array.isArray(n.author) ? n.author[0] : n.author;
    return {
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.created_at,
      authorId: n.author_id,
      authorRole: authorRaw?.user_role ?? null,
    };
  });

  const timelineNotes: TimelineNote[] = rawNotes.map((n) => {
    const authorRaw = Array.isArray(n.author) ? n.author[0] : n.author;
    return {
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.created_at,
      authorRole: authorRaw?.user_role ?? null,
    };
  });

  return (
    <TicketDetailView
      ticket={ticketInfo}
      photos={photos}
      notes={formattedNotes}
      timelineNotes={timelineNotes}
      userId={user?.id ?? null}
      userRole={userRole}
      assignedTo={ticket.assigned_to}
      supabaseUrl={supabaseUrl}
    />
  );
}
