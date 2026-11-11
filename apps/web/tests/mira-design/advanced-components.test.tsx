// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import {
  CompactAudioPlayer,
  ErrorFallback,
  ExternalLink,
  FileUploadDropzone,
  MinimalTable,
  Modal,
  ModalProvider,
  NavigationCardTabs,
  SearchSelectModal,
  StatusIndicator,
  StreamingTextRenderer,
  resolveNavigationCardTabsWindow,
} from "../../src/components/mira-design/index.ts";

describe("AGT-049 advanced MiraDesign components", () => {
  it("renders a generic table without a Desktop data layer", () => {
    type Item = { id: string; name: string };
    const columns: ColumnDef<Item, unknown>[] = [
      { accessorKey: "name", header: "Name", cell: (info) => String(info.getValue()) },
    ];

    render(<MinimalTable data={[{ id: "1", name: "Alpha" }]} columns={columns} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
  });

  it("resolves navigation overflow around the selected tab", () => {
    expect(
      resolveNavigationCardTabsWindow({
        availableWidth: 260,
        tabWidths: [100, 100, 100, 100],
        selectedIndex: 3,
      }),
    ).toEqual({ start: 2, end: 4, hasOverflow: true });
  });

  it("renders responsive navigation tabs without a runtime service", () => {
    render(
      <NavigationCardTabs
        tabs={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("data-state", "active");
  });

  it("drives static modal API through the mounted Web provider", async () => {
    render(
      <ModalProvider>
        <span>App</span>
      </ModalProvider>,
    );

    act(() => {
      Modal.show({ title: "Details", content: <span>Body</span>, footer: null });
    });

    expect(await screen.findByRole("dialog", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();

    act(() => {
      Modal.destroy();
    });
    await waitFor(() => expect(screen.queryByText("Body")).not.toBeInTheDocument());
  });

  it("fails visibly when the static modal API has no mounted provider", () => {
    expect(() => Modal.show({ title: "Orphan", content: <span>Body</span>, footer: null })).toThrow(
      "ModalProvider is not mounted",
    );
  });

  it("loads SearchSelect data through an injected abortable loader", async () => {
    const loadItems = vi.fn(async (signal: AbortSignal) => {
      expect(signal.aborted).toBe(false);
      return [
        { id: "a", label: "Alpha", keywords: ["first"] },
        { id: "b", label: "Beta" },
      ];
    });
    const onCheck = vi.fn(async () => true);
    const onClose = vi.fn();

    render(
      <SearchSelectModal
        open
        title="Choose"
        loadItems={loadItems}
        onCheck={onCheck}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(loadItems).toHaveBeenCalledTimes(1);

    const search = screen.getByPlaceholderText("搜索");
    await userEvent.type(search, "first");
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    await waitFor(() => expect(onCheck).toHaveBeenCalledWith(expect.objectContaining({ id: "a" })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens ExternalLink through an injected Web capability", async () => {
    const openUrl = vi.fn(async () => {});
    render(
      <ExternalLink href="https://example.com" openUrl={openUrl}>
        Docs
      </ExternalLink>,
    );

    await userEvent.click(screen.getByRole("link", { name: "Docs" }));
    expect(openUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("returns browser File objects and enforces maxCount without DataTransfer", () => {
    const onSelectFiles = vi.fn();
    const { container } = render(<FileUploadDropzone onSelectFiles={onSelectFiles} maxCount={1} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    const first = new File(["a"], "a.txt", { type: "text/plain" });
    const second = new File(["b"], "b.txt", { type: "text/plain" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [first, second] } });

    expect(onSelectFiles).toHaveBeenCalledWith([first]);
  });

  it("renders status text instead of relying on color alone", () => {
    render(<StatusIndicator status="running" />);
    expect(screen.getByText("运行中")).toBeInTheDocument();
    expect(screen.getByLabelText("运行中")).toBeInTheDocument();
  });

  it("renders an error fallback with explicit recovery actions", async () => {
    const retry = vi.fn();
    render(<ErrorFallback title="Oops" message="Failed" onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders non-streaming text immediately", () => {
    render(
      <StreamingTextRenderer text="完整结果">
        {(visibleText) => <span>{visibleText}</span>}
      </StreamingTextRenderer>,
    );
    expect(screen.getByText("完整结果")).toBeInTheDocument();
  });

  it("renders the audio control using browser-native media semantics", () => {
    const { container } = render(<CompactAudioPlayer src="/sample.mp3" title="Preview" />);
    expect(container.querySelector("audio")).toHaveAttribute("src", "/sample.mp3");
    expect(screen.getByRole("button", { name: "播放" })).toBeInTheDocument();
  });
});
