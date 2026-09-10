"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/server/auth/session";
import { type CreateTicketFieldKey, createTicket } from "@/server/tickets/lifecycle";

export type FormState = {
  success?: boolean;
  ticketId?: string;
  error?: string;
  fieldErrors?: Partial<Record<CreateTicketFieldKey, string>>;
};

export async function submitReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    let photosBase64: string[] = [];
    try {
      photosBase64 = JSON.parse(formData.get("photos")?.toString() || "[]");
    } catch {
      // ignore malformed photos json
    }

    const session = await getSession();
    const authenticatedUser = session?.userId ? { id: session.userId, displayName: session.displayName } : null;

    const supabase = createAdminClient();

    const result = await createTicket(supabase, {
      categoryId: formData.get("category_id")?.toString() ?? "",
      spaceId: formData.get("space_id")?.toString() ?? "",
      equipmentId: formData.get("equipment_id")?.toString() || null,
      equipmentName: formData.get("equipment_name")?.toString() || null,
      description: formData.get("description")?.toString() ?? "",
      reporterName: formData.get("reporter_name")?.toString() ?? "",
      reporterDepartment: formData.get("reporter_department")?.toString() || null,
      reporterEmail: formData.get("reporter_email")?.toString() ?? "",
      reporterPhone: formData.get("reporter_phone")?.toString() || null,
      photosBase64,
      authenticatedUser,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        fieldErrors: result.fieldErrors,
      };
    }

    return {
      success: true,
      ticketId: result.data.ticketId,
    };
  } catch (error) {
    console.error("Error submitting report:", error);
    return {
      success: false,
      error: "目前無法處理您的請求，請稍後再試",
    };
  }
}
