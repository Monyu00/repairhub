import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-none px-2 py-0.5 text-xs font-normal whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary [a]:hover:bg-primary/20",
        secondary:
          "bg-secondary/50 text-secondary-foreground [a]:hover:bg-secondary/70",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "bg-foreground/5 text-foreground [a]:hover:bg-foreground/10 [a]:hover:text-muted-foreground",
        success:
          "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 [a]:hover:bg-emerald-500/20",
        warning:
          "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 [a]:hover:bg-amber-500/20",
        info:
          "bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 [a]:hover:bg-blue-500/20",
        ghost:
          "bg-transparent hover:bg-foreground/5 hover:text-muted-foreground",
        link: "bg-primary/10 text-primary underline-offset-4 hover:bg-primary/20 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
