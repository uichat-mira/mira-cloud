import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./button";

type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, className = "", ...rest }: IconButtonProps) {
  return (
    <Button {...rest} aria-label={label} className={"w-11 p-2.5 " + className}>
      {icon}
    </Button>
  );
}
