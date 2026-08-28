"use client";

import Link from "next/link";

import { Command } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useUser } from "@/hooks/use-user";
import { reportAction, sidebarItems, type UserRole } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole?: UserRole | null;
}

export function AppSidebar({ userRole: initialUserRole, ...props }: AppSidebarProps) {
  const { profile } = useUser();
  const activeRole = profile?.user_role ?? initialUserRole;

  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader className="gap-3 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-11 px-3">
              <Link prefetch={false} href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-base leading-tight">
                  <span className="font-bold">{APP_CONFIG.name}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-1 group-data-[collapsible=icon]:px-0">
          <Button
            asChild
            size="lg"
            className="w-full justify-start gap-2.5 font-semibold shadow-sm text-base h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-lg group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center cursor-pointer"
          >
            <Link href={reportAction.url}>
              <reportAction.icon className="size-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{reportAction.title}</span>
            </Link>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} userRole={activeRole} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
