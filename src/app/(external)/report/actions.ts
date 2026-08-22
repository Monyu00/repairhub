"use server";

import { storeTicketPhotos } from "@/lib/storage/ticket-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/server/auth/session";

export type FormState = {
  success?: boolean;
  ticketId?: string;
  error?: string;
  fieldErrors?: {
    category_id?: string;
    space_id?: string;
    description?: string;
    reporter_name?: string;
    reporter_email?: string;
    reporter_phone?: string;
  };
};

export async function submitReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const category_id = formData.get("category_id")?.toString().trim();
    const space_id = formData.get("space_id")?.toString().trim();
    const equipment_id = formData.get("equipment_id")?.toString().trim() || null;
    const equipment_name = formData.get("equipment_name")?.toString().trim() || null;
    const description = formData.get("description")?.toString().trim();
    const reporter_name = formData.get("reporter_name")?.toString().trim();
    const reporter_department = formData.get("reporter_department")?.toString().trim() || null;
    const reporter_email = formData.get("reporter_email")?.toString().trim();
    const reporter_phone = formData.get("reporter_phone")?.toString().trim() || null;
    const photosJson = formData.get("photos")?.toString();

    // 1. Validation
    const fieldErrors: FormState["fieldErrors"] = {};

    if (!category_id) {
      fieldErrors.category_id = "請選擇報修類別";
    }

    if (!space_id) {
      fieldErrors.space_id = "請選擇故障地點（空間）";
    }

    if (!description) {
      fieldErrors.description = "請輸入故障狀況描述";
    }

    if (!reporter_name) {
      fieldErrors.reporter_name = "請輸入通報人姓名";
    }

    if (!reporter_email) {
      fieldErrors.reporter_email = "請輸入電子郵件";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporter_email)) {
      fieldErrors.reporter_email = "請輸入有效的電子郵件格式";
    }

    if (
      !category_id ||
      !space_id ||
      !description ||
      !reporter_name ||
      !reporter_email ||
      Object.keys(fieldErrors).length > 0
    ) {
      return { success: false, fieldErrors };
    }

    const supabase = createAdminClient();

    // 2. Insert Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        category_id,
        space_id,
        equipment_id,
        equipment_name,
        description,
        reporter_name,
        reporter_department,
        reporter_email,
        reporter_phone,
        status: "pending",
      })
      .select("id")
      .single();

    if (ticketError || !ticket) {
      console.error("Failed to create ticket:", ticketError);
      return {
        success: false,
        error: "目前無法處理您的請求，請稍後再試",
      };
    }

    // 3. Upload photos if any
    let photos: string[] = [];
    if (photosJson) {
      try {
        photos = JSON.parse(photosJson);
      } catch (e) {
        console.error("Failed to parse photos json:", e);
      }
    }

    if (photos.length > 0) {
      await storeTicketPhotos(supabase, {
        ticketId: ticket.id,
        phase: "report",
        photosBase64: photos,
      });
    }

    // 4. Sync profile info if user is authenticated
    try {
      const session = await getSession();
      if (session?.userId) {
        const updatePayload: { department?: string | null; phone?: string | null; display_name?: string } = {};
        if (reporter_department !== null) {
          updatePayload.department = reporter_department;
        }
        if (reporter_phone !== null) {
          updatePayload.phone = reporter_phone;
        }
        if (reporter_name && !session.displayName) {
          updatePayload.display_name = reporter_name;
        }

        if (Object.keys(updatePayload).length > 0) {
          await supabase.from("profiles").update(updatePayload).eq("id", session.userId);
        }
      }
    } catch (syncError) {
      console.error("Failed to sync profile info:", syncError);
    }

    return {
      success: true,
      ticketId: ticket.id,
    };
  } catch (error) {
    console.error("Error submitting report:", error);
    return {
      success: false,
      error: "目前無法處理您的請求，請稍後再試",
    };
  }
}
