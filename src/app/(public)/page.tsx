import Link from "next/link";

import { Camera, ClipboardList, Plus, ShieldCheck, Wrench } from "lucide-react";
import type { Metadata } from "next";

import { PublicAnnouncementsBanner } from "@/components/announcements/public-announcements-banner";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPublicAnnouncements } from "@/server/announcements";
import { getSession } from "@/server/auth/session";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import { type QueryTicketsResult, queryTickets } from "@/server/tickets/query";

import { HomepageViewLinks } from "./_components/homepage-view-links";
import { MyTicketList } from "./_components/my-ticket-list";
import { PublicTicketList } from "./_components/public-ticket-list";
import { TicketFilters } from "./_components/ticket-filters";

export const metadata: Metadata = {
  title: "校園報修服務平台 - RepairHub",
  description: "公開透明的校園報修單進度查詢、線上通報與修繕管理服務。",
};

interface HomePageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    status?: string;
    building?: string;
    category?: string;
    q?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 15;

const PUBLIC_TICKET_FLOW = [
  { label: "待處理", icon: ClipboardList },
  { label: "維修中", icon: Wrench },
  { label: "已完工", icon: Camera },
  { label: "已結案", icon: ShieldCheck },
] as const;

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "my-tickets" ? "my-tickets" : "all";
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(params.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const activeStatuses: TicketStatus[] = ["pending", "in_progress", "completed"];
  const status = params.status && params.status !== "all" ? (params.status as TicketStatus) : activeStatuses;
  const buildingId = params.building && params.building !== "all" ? params.building : undefined;
  const categoryId = params.category && params.category !== "all" ? params.category : undefined;
  const searchTerm = params.q?.trim() || undefined;

  const session = await getSession();
  const isLoggedIn = Boolean(session?.email);
  const supabase = createAdminClient();

  // Concurrently fetch metadata for filters and public announcements
  const [buildingsRes, categoriesRes, myTicketsSummary, announcements] = await Promise.all([
    supabase.from("buildings").select("id, name, code").order("code"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    isLoggedIn && session?.email
      ? queryTickets(supabase, {
          reporterEmail: session.email,
          page: 1,
          pageSize: 1,
          viewerContext: {
            role: session.role,
            userId: session.userId,
            email: session.email,
          },
        })
      : Promise.resolve(null),
    fetchPublicAnnouncements(3),
  ]);

  const buildings = buildingsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const myTicketsCount = myTicketsSummary?.totalCount;

  // Fetch ticket records according to active tab
  let ticketsResult: QueryTicketsResult = { tickets: [], totalCount: 0 };

  if (activeTab === "my-tickets") {
    if (isLoggedIn && session?.email) {
      ticketsResult = await queryTickets(supabase, {
        reporterEmail: session.email,
        page: currentPage,
        pageSize,
        sort: { field: "created_at", ascending: false },
        viewerContext: {
          role: session.role,
          userId: session.userId,
          email: session.email,
        },
      });
    }
  } else {
    // All tickets (public list with privacy redaction)
    ticketsResult = await queryTickets(supabase, {
      status,
      buildingId,
      categoryId,
      search: searchTerm,
      page: currentPage,
      pageSize,
      sort: { field: "created_at", ascending: false },
      viewerContext: {
        role: session?.role ?? null,
        userId: session?.userId,
        email: session?.email,
      },
    });
  }

  const totalPages = Math.max(1, Math.ceil(ticketsResult.totalCount / pageSize));

  return (
    <div>
      <section className="border-border border-b bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-bold font-heading text-2xl text-foreground sm:text-3xl">從報修到結案，全程看得見</h1>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                免登入即可通報校園設施與設備問題；每筆公開工單都會同步呈現待處理、維修中、已完工與已結案的進度。
              </p>
            </div>

            <Button asChild size="lg" className="h-11 w-full sm:h-9 sm:w-auto">
              <Link href="/report">
                <Plus data-icon="inline-start" />
                <span>我要報修</span>
              </Link>
            </Button>
          </div>

          <ol aria-label="公開報修流程" className="grid grid-cols-4 gap-2 border-border border-t pt-4 sm:gap-4">
            {PUBLIC_TICKET_FLOW.map((step) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.label}
                  className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2"
                >
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="font-medium text-foreground text-xs">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PublicAnnouncementsBanner announcements={announcements} />

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <HomepageViewLinks activeTab={activeTab} isLoggedIn={isLoggedIn} myTicketsCount={myTicketsCount} />
          </div>

          {activeTab === "all" && (
            <div className="space-y-4">
              <TicketFilters buildings={buildings} categories={categories} />
              <PublicTicketList
                tickets={ticketsResult.tickets}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={ticketsResult.totalCount}
                pageSize={pageSize}
              />
            </div>
          )}

          {activeTab === "my-tickets" && (
            <MyTicketList
              tickets={ticketsResult.tickets}
              userEmail={session?.email ?? null}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={ticketsResult.totalCount}
              pageSize={pageSize}
            />
          )}
        </div>
      </div>
    </div>
  );
}
