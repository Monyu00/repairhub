import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { normalizeTicketRow, type TicketRecord, type ViewerContext } from "./query";

export interface TicketPhoto {
  id: string;
  url: string;
  phase: Database["public"]["Enums"]["ticket_photo_phase"];
}

export interface TicketNote {
  id: string;
  content: string;
  type: Database["public"]["Enums"]["ticket_note_type"];
  createdAt: string;
  authorRole: Database["public"]["Enums"]["user_role"] | null;
  authorName: string | null;
}

export interface TicketDetail {
  ticket: TicketRecord;
  photos: TicketPhoto[];
  notes: TicketNote[];
}

interface RawTicketNote {
  id: string;
  content: string;
  type: Database["public"]["Enums"]["ticket_note_type"];
  created_at: string;
  author:
    | {
        id: string;
        user_role: Database["public"]["Enums"]["user_role"] | null;
        display_name: string | null;
      }
    | {
        id: string;
        user_role: Database["public"]["Enums"]["user_role"] | null;
        display_name: string | null;
      }[]
    | null;
}

export async function getTicketDetail(
  supabase: SupabaseClient<Database>,
  ticketId: string,
  viewer: ViewerContext,
): Promise<TicketDetail | null> {
  const [ticketRes, photosRes, notesRes] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        `
        id,
        status,
        category_id,
        space_id,
        description,
        equipment_id,
        equipment_name,
        reporter_name,
        reporter_department,
        reporter_email,
        reporter_phone,
        assigned_to,
        rating,
        rated_at,
        created_at,
        updated_at,
        category:categories(id, name),
        space:spaces(
          id,
          name,
          floor,
          building_id,
          building:buildings(id, name, code)
        ),
        assigned_technician:profiles!tickets_assigned_to_fkey(
          id,
          display_name
        )
      `,
      )
      .eq("id", ticketId)
      .maybeSingle(),
    supabase
      .from("ticket_photos")
      .select("id, storage_path, phase")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_notes")
      .select(
        `
        id,
        content,
        type,
        created_at,
        author:profiles!ticket_notes_author_id_fkey(
          id,
          user_role,
          display_name
        )
      `,
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketRes.error) {
    throw new Error(ticketRes.error.message);
  }

  if (!ticketRes.data) {
    return null;
  }

  if (photosRes.error) {
    throw new Error(photosRes.error.message);
  }

  if (notesRes.error) {
    throw new Error(notesRes.error.message);
  }

  const ticket = normalizeTicketRow(ticketRes.data, viewer);
  const photos = (photosRes.data ?? []).map((photo) => {
    const { data } = supabase.storage.from("ticket-photos").getPublicUrl(photo.storage_path);

    return {
      id: photo.id,
      url: data.publicUrl,
      phase: photo.phase,
    };
  });
  const canViewAuthor = viewer.role === "admin" || viewer.role === "technician";
  const notes = ((notesRes.data ?? []) as unknown as RawTicketNote[]).map((note) => {
    const author = Array.isArray(note.author) ? note.author[0] : note.author;

    return {
      id: note.id,
      content: note.content,
      type: note.type,
      createdAt: note.created_at,
      authorRole: canViewAuthor ? (author?.user_role ?? null) : null,
      authorName: canViewAuthor ? (author?.display_name ?? null) : null,
    };
  });

  return {
    ticket,
    photos,
    notes,
  };
}
