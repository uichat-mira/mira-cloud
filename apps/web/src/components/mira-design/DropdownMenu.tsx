import type { ReactNode } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";

export interface DropdownMenuItemData {
  id: string;
  label: string;
  title?: string;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingText?: string;
  checked?: boolean;
  selected?: boolean;
  tone?: "default" | "danger";
  children?: DropdownMenuItemData[];
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItemData[];
  onSelect: (item: DropdownMenuItemData) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

const contentClassName =
  "z-[260] min-w-[11rem] overflow-hidden rounded-ui-overlay border border-border bg-surface-elevated p-1 shadow-shadow-lg";

const itemClassName =
  "group relative flex w-full cursor-default items-center justify-between gap-3 rounded-ui-control px-2.5 py-2 text-left text-sm outline-none transition-colors duration-150 data-[disabled]:pointer-events-none data-[disabled]:opacity-45";

const submenuContentClassName =
  "z-[270] min-w-[12rem] overflow-hidden rounded-ui-overlay border border-border bg-surface-elevated p-1 shadow-shadow-lg";

function MenuItem({
  item,
  onSelect,
}: {
  item: DropdownMenuItemData;
  onSelect: (item: DropdownMenuItemData) => void;
}) {
  const itemToneClassName =
    item.tone === "danger"
      ? "text-danger-text data-[highlighted]:bg-primary/10"
      : "text-text-primary data-[highlighted]:bg-surface-secondary";

  const itemSelectedClassName = item.selected ? "bg-surface-secondary" : "";

  if (item.children?.length) {
    return (
      <DropdownMenuPrimitive.Sub>
        <DropdownMenuPrimitive.SubTrigger
          {...(item.disabled ? { disabled: true } : {})}
          className={`${itemClassName} ${itemToneClassName} ${itemSelectedClassName}`}
          title={item.title ?? item.label}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {item.leadingIcon ? (
              <span className="shrink-0 text-icon-secondary">{item.leadingIcon}</span>
            ) : null}
            <span className="truncate">{item.label}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-icon-tertiary" />
        </DropdownMenuPrimitive.SubTrigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.SubContent
            sideOffset={8}
            alignOffset={-4}
            collisionPadding={12}
            className={submenuContentClassName}
          >
            {item.children.map((child) => (
              <MenuItem key={child.id} item={child} onSelect={onSelect} />
            ))}
          </DropdownMenuPrimitive.SubContent>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Sub>
    );
  }

  return (
    <DropdownMenuPrimitive.Item
      {...(item.disabled ? { disabled: true } : {})}
      onSelect={() => onSelect(item)}
      className={`${itemClassName} ${itemToneClassName} ${itemSelectedClassName}`}
      title={item.title ?? item.label}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {item.leadingIcon ? (
          <span className="shrink-0 text-icon-secondary">{item.leadingIcon}</span>
        ) : null}
        <span className="truncate">{item.label}</span>
      </span>

      <span
        className={`ml-3 inline-flex shrink-0 items-center gap-2 text-[11px] ${item.tone === "danger" ? "text-danger-text/80" : "text-text-tertiary"}`}
      >
        {item.trailingText ? <span>{item.trailingText}</span> : null}
        {item.checked ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
      </span>
    </DropdownMenuPrimitive.Item>
  );
}

export default function DropdownMenu({
  trigger,
  items,
  onSelect,
  align = "start",
  side = "bottom",
  sideOffset = 8,
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={12}
          className={contentClassName}
        >
          {items.map((item) => (
            <MenuItem key={item.id} item={item} onSelect={onSelect} />
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
