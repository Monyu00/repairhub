import type { Metadata } from "next";

import { getSession } from "@/server/auth/session";
import { queryTickets } from "@/server/tickets/query";

import { MyTicketsContent } from "./_components/my-tickets-content";

export const metadata: Metadata = {
  title: "我的報修紀錄 - RepairHub",
  description: "查看您提交過的所有報修案件紀錄與處理進度。",
};

export default async function Page() {
  const session = await getSession();

  if (!session?.email) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">無法取得使用者資訊，請重新登入。</p>
      </div>
    );
  }

  const { tickets } = await queryTickets(session.supabase, {
    reporterEmail: session.email,
    viewerContext: {
      role: session.role,
      userId: session.userId,
      email: session.email,
    },
  });

  return <MyTicketsContent tickets={tickets} />;
}
