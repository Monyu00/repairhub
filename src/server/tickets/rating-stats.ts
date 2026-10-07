import "server-only";

import type { SatisfactionReportData } from "@/app/(main)/dashboard/reports/_components/report-types";

/**
 * Calculates satisfaction report data for a given date range.
 */
export function calculateSatisfactionStats(
  tickets: Array<{
    id: string;
    status: string;
    rating: number | null;
    rated_at: string | null;
    created_at: string;
    assigned_to: string | null;
    technician: { id: string; display_name: string | null } | { id: string; display_name: string | null }[] | null;
  }>,
): SatisfactionReportData {
  let totalClosed = 0;
  let totalRatingSum = 0;
  let totalRated = 0;

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const monthlyMap = new Map<string, { sum: number; count: number }>();
  const techMap = new Map<
    string,
    {
      displayName: string;
      sum: number;
      ratedCount: number;
      completedCount: number;
    }
  >();

  tickets.forEach((t) => {
    const isClosed = t.status === "closed";
    if (isClosed) {
      totalClosed++;
    }

    // Technician stats tracking
    if (t.assigned_to) {
      const techRaw = Array.isArray(t.technician) ? t.technician[0] : t.technician;
      const techName = techRaw?.display_name || `技師 (${t.assigned_to.slice(0, 8)})`;

      const curTech = techMap.get(t.assigned_to) ?? {
        displayName: techName,
        sum: 0,
        ratedCount: 0,
        completedCount: 0,
      };

      if (isClosed || t.status === "completed") {
        curTech.completedCount++;
      }

      if (typeof t.rating === "number" && t.rating >= 1 && t.rating <= 5) {
        curTech.sum += t.rating;
        curTech.ratedCount++;
      }

      techMap.set(t.assigned_to, curTech);
    }

    // Rating stats tracking
    if (typeof t.rating === "number" && t.rating >= 1 && t.rating <= 5) {
      totalRated++;
      totalRatingSum += t.rating;
      starCounts[t.rating] = (starCounts[t.rating] ?? 0) + 1;

      // Month trend by created_at or rated_at
      const dateStr = t.rated_at || t.created_at;
      const d = new Date(dateStr);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const curM = monthlyMap.get(mKey) ?? { sum: 0, count: 0 };
      curM.sum += t.rating;
      curM.count++;
      monthlyMap.set(mKey, curM);
    }
  });

  const avgRating = totalRated > 0 ? Number((totalRatingSum / totalRated).toFixed(1)) : 0;
  const responseRate = totalClosed > 0 ? Number(((totalRated / totalClosed) * 100).toFixed(1)) : 0;

  // Distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = starCounts[star] ?? 0;
    const percentage = totalRated > 0 ? Number(((count / totalRated) * 100).toFixed(1)) : 0;
    return { star, count, percentage };
  });

  // Monthly trends sorted chronologically
  const monthlyTrends = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, val]) => ({
      month,
      avgRating: Number((val.sum / val.count).toFixed(1)),
      count: val.count,
    }));

  // Technician rankings sorted by avgRating descending, then ratedCount descending
  const technicianRankings = Array.from(techMap.entries())
    .map(([technicianId, val]) => ({
      technicianId,
      displayName: val.displayName,
      avgRating: val.ratedCount > 0 ? Number((val.sum / val.ratedCount).toFixed(1)) : 0,
      ratedCount: val.ratedCount,
      completedCount: val.completedCount,
    }))
    .filter((t) => t.completedCount > 0 || t.ratedCount > 0)
    .sort((a, b) => {
      if (b.avgRating !== a.avgRating) {
        return b.avgRating - a.avgRating;
      }
      return b.ratedCount - a.ratedCount;
    });

  return {
    avgRating,
    totalRated,
    totalClosed,
    responseRate,
    distribution,
    monthlyTrends,
    technicianRankings,
  };
}
