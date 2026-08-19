"use server";

import { storeTicketPhotos } from "@/lib/storage/ticket-photos";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = {
  success?: boolean;
  ticketId?: string;
  error?: string;
  fieldErrors?: {
    category_id?: string;
    space_id?: string;
    description?: string;
    reporter_email?: string;
    reporter_phone?: string;
  };
};

export async function submitReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const category_id = formData.get("category_id")?.toString().trim();
    const space_id = formData.get("space_id")?.toString().trim();
    const equipment_id = formData.get("equipment_id")?.toString().trim() || null;
    const description = formData.get("description")?.toString().trim();
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

    if (!reporter_email) {
      fieldErrors.reporter_email = "請輸入電子郵件";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporter_email)) {
      fieldErrors.reporter_email = "請輸入有效的電子郵件格式";
    }

    if (!category_id || !space_id || !description || !reporter_email || Object.keys(fieldErrors).length > 0) {
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
        description,
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
