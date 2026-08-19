import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_PROCESSED_PHOTO_SIZE_BYTES } from "@/lib/storage/constants";
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

  const subtype = mimeType.split("/")[1]?.toLowerCase() ?? "jpg";
  const ext = subtype === "jpeg" || subtype === "pjpeg" ? "jpg" : subtype;
  return { buffer, mimeType, extension: ext };
}

/**
 * Rollback compensation helper: removes uploaded storage files and cleans up database rows.
 * Fails silently with warnings to preserve the primary error.
 */
async function rollbackPhotos(supabase: SupabaseClient<Database>, paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  try {
    const { error: storageError } = await supabase.storage.from("ticket-photos").remove(paths);
    if (storageError) {
      console.warn("Rollback storage removal warning:", storageError);
    }

    const { error: dbError } = await supabase.from("ticket_photos").delete().in("storage_path", paths);
    if (dbError) {
      console.warn("Rollback database record removal warning:", dbError);
    }
  } catch (cleanupErr) {
    console.warn("Unexpected error during photo rollback cleanup:", cleanupErr);
  }
}

/**
 * Deep module: Store ticket photos into Supabase Storage and synchronize records in ticket_photos table.
 * Includes buffer size verification, fail-fast mechanics, and full rollback compensation.
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

      if (buffer.length > MAX_PROCESSED_PHOTO_SIZE_BYTES) {
        console.error(
          `Photo #${i + 1} (${phase}) for ticket ${ticketId} exceeds max size: ${buffer.length} > ${MAX_PROCESSED_PHOTO_SIZE_BYTES} bytes`,
        );
        await rollbackPhotos(supabase, uploadedPaths);
        return {
          success: false,
          uploadedCount: uploadedPaths.length,
          storagePaths: uploadedPaths,
          error: `照片 #${i + 1} 超過處理大小上限 (2MB)`,
        };
      }

      const storagePath = `${phase}/${ticketId}/${Date.now()}_${i}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("ticket-photos").upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

      if (uploadError) {
        console.error(`Failed to upload photo #${i + 1} (${phase}) for ticket ${ticketId}:`, uploadError);
        await rollbackPhotos(supabase, uploadedPaths);
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
        await rollbackPhotos(supabase, [...uploadedPaths, storagePath]);
        return {
          success: false,
          uploadedCount: uploadedPaths.length,
          storagePaths: uploadedPaths,
          error: `照片 #${i + 1} 資料庫寫入失敗`,
        };
      }

      uploadedPaths.push(storagePath);
    } catch (err) {
      console.error(`Unexpected error processing photo #${i + 1} for ticket ${ticketId}:`, err);
      await rollbackPhotos(supabase, uploadedPaths);
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
