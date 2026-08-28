"use client";

import { Suspense } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { NavChildItem, NavGroup, NavItem, UserRole } from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
  readonly userRole?: UserRole | null;
}

export function NavMain(props: NavMainProps) {
  return (
    <Suspense fallback={null}>
      <NavMainContent {...props} />
    </Suspense>
  );
}

function isSubItemActive(pathname: string, currentTab: string | null, subUrl: string): boolean {
  const [subPath, query] = subUrl.split("?");
  if (pathname !== subPath) return false;
  if (!query) return true;
  const targetTab = query.split("tab=")[1];
  const activeTab = currentTab ?? (subPath.endsWith("settings") ? "categories" : "spaces");
  return activeTab === targetTab;
}

function NavMainContent({ items, userRole }: NavMainProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const isAllowed = (roles?: UserRole[]) => !roles?.length || Boolean(userRole && roles.includes(userRole));

  const filteredGroups = items
    .filter((group) => isAllowed(group.roles))
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => isAllowed(item.roles))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => isAllowed(child.roles)),
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {filteredGroups.map((group) => (
        <SidebarGroup key={group.id} className="py-1.5">
          {group.label && (
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground/80 tracking-wider group-data-[collapsible=icon]:pointer-events-none">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                if (item.children && item.children.length > 0) {
                  const isParentOpen = pathname.startsWith(item.url);
                  const isAnyChildActive = item.children.some((child) =>
                    isSubItemActive(pathname, currentTab, child.url),
                  );

                  return (
                    <Collapsible key={item.id} asChild defaultOpen={isParentOpen} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={pathname.startsWith(item.url)}
                            className="h-10 text-[15px] px-3 gap-3 font-medium [&_svg]:size-5 cursor-pointer"
                          >
                            {item.icon && <item.icon className="shrink-0" />}
                            <span className="flex-1 truncate">{item.title}</span>
                            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mx-3.5 gap-1 border-l border-sidebar-border px-2.5 py-1">
                            {item.children.map((child: NavChildItem) => {
                              const active = isSubItemActive(pathname, currentTab, child.url);
                              return (
                                <SidebarMenuSubItem key={child.id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    size="md"
                                    isActive={active}
                                    className="h-8.5 text-sm px-2.5 font-normal cursor-pointer"
                                  >
                                    <Link href={child.url}>
                                      <span>{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return <NavLinkItem key={item.id} item={item} isActive={pathname === item.url} />;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavLinkItem({ item, isActive }: { readonly item: NavItem; readonly isActive: boolean }) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        className="h-10 text-[15px] px-3 gap-3 font-medium [&_svg]:size-5 cursor-pointer"
      >
        <Link href={item.url}>
          {Icon && <Icon className="shrink-0" />}
          <span className="truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
