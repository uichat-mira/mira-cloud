// @vitest-environment jsdom
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollapsiblePanel,
  ConfirmDialog,
  Drawer,
  DropdownMenu,
  ExpandableSection,
  ImagePreviewOverlay,
  message,
  MessageProvider,
  Tooltip,
  useMessage,
} from "../../src/components/mira-design/index.ts";

describe("CollapsiblePanel", () => {
  it("starts collapsed, toggles state and exposes aria-controls", async () => {
    render(
      <CollapsiblePanel title="Title" meta="Meta">
        <span data-testid="content">Content</span>
      </CollapsiblePanel>,
    );

    const button = screen.getByRole("button", { name: /Title/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls");
    expect(screen.getByText("Meta")).toBeInTheDocument();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("content")).toBeVisible();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    const collapsedContent = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(collapsedContent).toHaveAttribute("inert");
  });
});

describe("ExpandableSection", () => {
  it("toggles labels and associates content through aria-controls", async () => {
    render(
      <ExpandableSection collapsedLabel="Show more" expandedLabel="Show less">
        <span data-testid="content">Details</span>
      </ExpandableSection>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Show more");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(button);
    expect(button).toHaveTextContent("Show less");
    expect(button).toHaveAttribute("aria-expanded", "true");

    const contentId = button.getAttribute("aria-controls");
    expect(document.getElementById(contentId ?? "")).toContainElement(
      screen.getByTestId("content"),
    );
  });
});

describe("Drawer", () => {
  it("renders nothing while closed and renders body regions while open", () => {
    const { container, rerender } = render(
      <Drawer open={false} onClose={() => {}}>
        Body
      </Drawer>,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <Drawer
        open
        onClose={() => {}}
        header={<span data-testid="header" />}
        footer={<span data-testid="footer" />}
      >
        <span data-testid="content">Drawer body</span>
      </Drawer>,
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("closes through the mask, close button and configured width", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open onClose={onClose} width={400}>
        Content
      </Drawer>,
    );

    expect(screen.getByRole("complementary")).toHaveStyle({ width: "400px" });
    await userEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Drawer open onClose={onClose} closeLabel="Close" width={400}>
        Content
      </Drawer>,
    );
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await userEvent.click(closeButtons[closeButtons.length - 1] as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps right as the default side and supports an explicit left panel", () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}}>
        Right
      </Drawer>,
    );

    const rightPanel = screen.getByRole("complementary");
    expect(rightPanel).toHaveAttribute("data-side", "right");
    expect(rightPanel).toHaveClass("right-0", "border-l");
    expect(rightPanel).not.toHaveClass("left-0", "border-r");

    rerender(
      <Drawer open side="left" onClose={() => {}}>
        Left
      </Drawer>,
    );

    const leftPanel = screen.getByRole("complementary");
    expect(leftPanel).toHaveAttribute("data-side", "left");
    expect(leftPanel).toHaveClass("left-0", "border-r");
    expect(leftPanel).not.toHaveClass("right-0", "border-l");
  });

  it("closes on Escape and restores focus to the opening control", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open drawer
          </button>
          <Drawer open={open} onClose={() => setOpen(false)}>
            Drawer body
          </Drawer>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open drawer" });
    await userEvent.click(trigger);

    const panel = await screen.findByRole("complementary");
    await waitFor(() => expect(panel).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("does not steal focus back when a newer overlay already owns it", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open drawer
          </button>
          <button type="button">New overlay action</button>
          <Drawer open={open} onClose={() => setOpen(false)}>
            Drawer body
          </Drawer>
        </>
      );
    }

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    await screen.findByRole("complementary");

    const closeButtons = screen.getAllByRole("button", { name: "Close drawer" });
    await userEvent.click(closeButtons[closeButtons.length - 1] as HTMLElement);
    const newerOverlayAction = screen.getByRole("button", { name: "New overlay action" });
    newerOverlayAction.focus();

    await waitFor(() => expect(screen.queryByRole("complementary")).not.toBeInTheDocument());
    expect(newerOverlayAction).toHaveFocus();
  });
});

describe("DropdownMenu", () => {
  const items = [
    { id: "copy", label: "Copy" },
    { id: "paste", label: "Paste", disabled: true },
    { id: "share", label: "Share", children: [{ id: "email", label: "Email" }] },
  ];

  it("opens a menu, exposes disabled state and selects an item", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={items}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveAttribute("data-disabled");

    await userEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "copy" }));
  });

  it("renders trailing text and checked state", async () => {
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ id: "dark", label: "Dark mode", trailingText: "Cmd+D", checked: true }]}
        onSelect={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Cmd+D")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Dark mode/ })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("renders the confirmation contract and loading state", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        title="Delete?"
        description="This cannot be undone."
        confirmText="Yes"
        cancelText="No"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        title="Delete?"
        description="Confirm"
        loading
        loadingText="Deleting..."
        errorMessage="Something went wrong"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
  });
});

function TestMessage({
  method = "open",
  duration = 0,
}: {
  method?: keyof ReturnType<typeof useMessage>;
  duration?: number;
}) {
  const api = useMessage();
  return (
    <button
      type="button"
      onClick={() => {
        if (method === "open") {
          api.open({ content: "Hello", duration });
        } else if (method === "destroy") {
          api.destroy();
        } else {
          (api[method] as (content: string, duration?: number) => void)("Hello", duration);
        }
      }}
    >
      Show
    </button>
  );
}

describe("Message", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fails visibly when the static message API has no mounted provider", () => {
    expect(() => message.info("Orphan", 0)).toThrow("MessageProvider is not mounted");
  });

  it("supports the static message API without module-global provider state", async () => {
    render(
      <MessageProvider>
        <span>App</span>
      </MessageProvider>,
    );

    act(() => {
      message.success("Saved", 0);
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    act(() => {
      message.destroy();
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("opens, auto-dismisses and destroys messages", async () => {
    render(
      <MessageProvider>
        <TestMessage duration={1} />
      </MessageProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByText("Hello")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByText("Hello")).toBeInTheDocument();
    act(() => {
      message.destroy();
    });
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });
});

describe("ImagePreviewOverlay", () => {
  it("requires open state and a source", () => {
    const { container, rerender } = render(
      <ImagePreviewOverlay src="img.png" open={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();

    rerender(<ImagePreviewOverlay src={null} open onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("closes on backdrop or Escape but not image clicks, and zooms on wheel", () => {
    const onClose = vi.fn();
    render(<ImagePreviewOverlay src="img.png" open onClose={onClose} alt="Pic" />);

    const image = screen.getByRole("img", { name: "Pic" });
    expect(image).toHaveAttribute("src", "img.png");

    fireEvent.click(image);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.wheel(screen.getByRole("dialog"), { deltaY: -100 });
    expect(image.style.transform).toMatch(/scale\(1\.\d+\)/);
  });
});

describe("Tooltip", () => {
  it("exposes tooltip metadata for non-empty text and renders bare children for empty text", () => {
    const { rerender } = render(
      <Tooltip text="Hint">
        <span data-testid="child">Hover me</span>
      </Tooltip>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    expect(wrapper).toHaveAttribute("data-tooltip-content", "Hint");
    expect(wrapper).toHaveAttribute("data-tooltip-id");

    rerender(
      <Tooltip text="  ">
        <span data-testid="child">Hover me</span>
      </Tooltip>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(document.querySelector("[data-tooltip-id]")).not.toBeInTheDocument();
  });
});
