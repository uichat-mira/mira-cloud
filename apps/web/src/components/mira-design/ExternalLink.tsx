import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { message } from "./Message";
import { Modal } from "./Modal";
import type { ConfirmTone } from "./ConfirmDialog";

export interface ExternalLinkConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  loadingText?: string;
}

export interface ExternalLinkMessages {
  copyOnlySuccess: string;
  openFailedCopied: string;
  copyFailed: string;
}

export interface ExternalLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children"
> {
  href: string;
  children: ReactNode;
  copyOnly?: boolean;
  confirmBeforeOpen?: boolean | ExternalLinkConfirmOptions;
  openUrl?: (url: string) => void | Promise<void>;
  copyText?: (text: string) => boolean | Promise<boolean>;
  messages?: Partial<ExternalLinkMessages>;
}

const defaultMessages: ExternalLinkMessages = {
  copyOnlySuccess: "链接已复制",
  openFailedCopied: "无法直接打开，链接已复制",
  copyFailed: "无法打开或复制链接",
};

async function defaultCopyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function defaultOpenUrl(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    throw new Error("Browser blocked external window");
  }
  opened.opener = null;
}

export default function ExternalLink({
  href,
  children,
  copyOnly = false,
  confirmBeforeOpen = false,
  openUrl = defaultOpenUrl,
  copyText = defaultCopyText,
  messages,
  onClick,
  rel,
  target,
  ...anchorProps
}: ExternalLinkProps) {
  const copy = { ...defaultMessages, ...messages };

  const copyFallback = async (url: string, copyOnlyMode: boolean) => {
    const copied = await copyText(url);
    if (copied) {
      message.info(copyOnlyMode ? copy.copyOnlySuccess : copy.openFailedCopied);
      return;
    }
    message.error(copy.copyFailed);
  };

  const openLink = async () => {
    const url = href.trim();
    if (!url) return;

    if (copyOnly) {
      await copyFallback(url, true);
      return;
    }

    try {
      await openUrl(url);
    } catch {
      await copyFallback(url, false);
    }
  };

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();

    if (!confirmBeforeOpen) {
      await openLink();
      return;
    }

    const options = typeof confirmBeforeOpen === "object" ? confirmBeforeOpen : undefined;
    Modal.confirm({
      title: options?.title ?? "打开外部链接？",
      description: options?.description ?? href.trim(),
      confirmText: options?.confirmText ?? "打开",
      cancelText: options?.cancelText ?? "取消",
      tone: options?.tone ?? "warning",
      loadingText: options?.loadingText ?? "正在打开…",
      onConfirm: openLink,
    });
  };

  return (
    <a
      href={href}
      target={target ?? "_blank"}
      rel={rel ?? "noreferrer noopener"}
      onClick={(event) => void handleClick(event)}
      {...anchorProps}
    >
      {children}
    </a>
  );
}
