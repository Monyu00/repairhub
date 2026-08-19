/**
 * Shared storage and photo pipeline constants.
 * Pure values with zero external/runtime dependencies to allow safe import across client and server.
 */

export const MAX_RAW_PHOTO_SIZE_MB = 5;
export const MAX_RAW_PHOTO_SIZE_BYTES = MAX_RAW_PHOTO_SIZE_MB * 1024 * 1024; // 5MB

export const MAX_PROCESSED_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB (server-side compressed buffer limit)

export const DEFAULT_MAX_PHOTOS = 3;
