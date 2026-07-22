"use server";

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
      for (let i = 0; i < photos.length; i++) {
        const photoBase64 = photos[i];
        // base64 data format e.g. "data:image/jpeg;base64,/9j/4AAQSk..."
        const matches = photoBase64.match(/^data:(.+);base64,(.+)$/);

        let buffer: Buffer;
        let mimeType = "image/jpeg";

        if (matches) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(photoBase64, "base64");
        }

        const ext = mimeType.split("/")[1] || "jpg";
        const storagePath = `report/${ticket.id}/${Date.now()}_${i}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("ticket-photos").upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (uploadError) {
          console.error("Failed to upload photo:", uploadError);
          continue;
        }

        // Insert into ticket_photos
        await supabase.from("ticket_photos").insert({
          ticket_id: ticket.id,
          storage_path: storagePath,
          phase: "report",
        });
      }
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
