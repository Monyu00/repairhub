import Link from "next/link";

import { Camera, ClipboardList, Plus, ShieldCheck, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

const PUBLIC_TICKET_FLOW = [
  { label: "待處理", icon: ClipboardList },
  { label: "維修中", icon: Wrench },
  { label: "已完工", icon: Camera },
  { label: "已結案", icon: ShieldCheck },
] as const;

export function PublicHomeHero() {
  return (
    <section className="border-border border-b bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-extrabold font-heading text-2xl text-foreground sm:text-3xl">
              從報修到結案，全程看得見
            </h1>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              免登入即可通報校園設施與設備問題；每筆公開報修單都會同步呈現待處理、維修中、已完工與已結案的進度。
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
  );
}
