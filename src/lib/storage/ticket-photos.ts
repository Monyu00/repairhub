import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type TicketPhotoPhase = "report" | "closure";

export interface StoreTicketPhotosOptions {
  ticketId: string;
  phase: TicketPhotoPhase;
  photosBase64: string[];
}

export interface StoreTicketPhotosResult {
  success: boolean;
  uploadedCount: number;
  error?: string;
  storagePaths: string[];
}

/**
 * Parses a base64 DataURL or raw base64 string into a Buffer, MIME type, and file extension.
 */
export function parseBase64Image(dataString: string): { buffer: Buffer; mimeType: string; extension: string } {
  const matches = dataString.match(/^data:(.+);base64,(.+)$/);
  let buffer: Buffer;
  let mimeType = "image/jpeg";

  if (matches) {
    mimeType = matches[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    buffer = Buffer.from(dataString, "base64");
  }

  const ext = mimeType.split("/")[1]?.replace("e-jpeg", "jpg") ?? "jpg";
  return { buffer, mimeType, extension: ext };
}

/**
 * Deep module: Store ticket photos into Supabase Storage and synchronize records in ticket_photos table.
 */
export async function storeTicketPhotos(
  supabase: SupabaseClient<Database>,
  { ticketId, phase, photosBase64 }: StoreTicketPhotosOptions,
): Promise<StoreTicketPhotosResult> {
  if (photosBase64.length === 0) {
    return { success: true, uploadedCount: 0, storagePaths: [] };
  }

  const uploadedPaths: string[] = [];

  for (let i = 0; i < photosBase64.length; i++) {
    const photoData = photosBase64[i];
    if (!photoData) continue;

    try {
      const { buffer, mimeType, extension } = parseBase64Image(photoData);
      const storagePath = `${phase}/${ticketId}/${Date.now()}_${i}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("ticket-photos").upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

      if (uploadError) {
        console.error(`Failed to upload photo #${i + 1} (${phase}) for ticket ${ticketId}:`, uploadError);
        return {
          success: false,
          uploadedCount: uploadedPaths.length,
          storagePaths: uploadedPaths,
          error: `照片 #${i + 1} 上傳失敗`,
        };
      }

      const { error: dbError } = await supabase.from("ticket_photos").insert({
        ticket_id: ticketId,
        storage_path: storagePath,
        phase,
      });

      if (dbError) {
        console.error(`Failed to create ticket_photos record for ${storagePath}:`, dbError);
      }

      uploadedPaths.push(storagePath);
    } catch (err) {
      console.error(`Unexpected error processing photo #${i + 1} for ticket ${ticketId}:`, err);
      return {
        success: false,
        uploadedCount: uploadedPaths.length,
        storagePaths: uploadedPaths,
        error: `照片 #${i + 1} 處理失敗`,
      };
    }
  }

  return {
    success: true,
    uploadedCount: uploadedPaths.length,
    storagePaths: uploadedPaths,
  };
}
