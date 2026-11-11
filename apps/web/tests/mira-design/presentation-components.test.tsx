// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  FileIcon,
  FullPageStatus,
  NavItem,
  Result,
  SegmentedTabs,
  StepIndicator,
  TabCard,
  TerminalPanel,
  WelcomePanel,
} from "../../src/components/mira-design/index.ts";

describe("FileIcon", () => {
  it("maps file types to semantic status tokens", () => {
    const { container, rerender } = render(<FileIcon extension="pdf" />);
    expect(container.querySelector("svg")).toHaveClass("text-danger");

    rerender(<FileIcon extension="xlsx" />);
    expect(container.querySelector("svg")).toHaveClass("text-success");

    rerender(<FileIcon extension="xls" />);
    expect(container.querySelector("svg")).toHaveClass("text-success");

    rerender(<FileIcon extension="txt" />);
    expect(container.querySelector("svg")).toHaveClass("text-info");
  });

  it("applies a custom icon size", () => {
    const { container } = render(<FileIcon extension="PDF" className="h-8 w-8" />);
    expect(container.querySelector("svg")).toHaveClass("h-8", "w-8");
  });
});

describe("FullPageStatus", () => {
  it("renders the message in the main landmark", () => {
    render(<FullPageStatus message="Loading..." />);
    expect(screen.getByRole("main")).toHaveTextContent("Loading...");
  });
});

describe("NavItem", () => {
  it("renders a router link and marks the active route", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <NavItem to="/settings" icon={<span data-testid="icon" />}>
          Settings
        </NavItem>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(link).toHaveClass("bg-surface-soft");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("leaves inactive routes unhighlighted", () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <NavItem to="/settings" icon={null}>
          Settings
        </NavItem>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link")).toHaveClass("text-text-secondary");
    expect(screen.getByRole("link")).not.toHaveClass("bg-surface-soft");
  });
});

describe("Result", () => {
  it("renders an accessible empty state with a size and variant", () => {
    render(
      <Result
        size="lg"
        variant="success"
        title="完成"
        description="内容会显示在这里。"
        action={<button type="button">添加内容</button>}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "完成" })).toBeInTheDocument();
    expect(screen.getByText("内容会显示在这里。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加内容" })).toBeInTheDocument();
    expect(screen.getByRole("status").querySelector("div")).toHaveClass(
      "h-16",
      "w-16",
      "bg-success-soft",
      "text-success",
    );
  });

  it("renders content directly without an empty state", () => {
    render(
      <Result type="content">
        <div data-testid="content">Actual content</div>
      </Result>,
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("SegmentedTabs", () => {
  const items = [
    { value: "a", label: "Tab A" },
    { value: "b", label: "Tab B" },
  ];

  it("renders all tab buttons, active styling and change events", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedTabs value="b" onChange={onChange} items={items} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
    expect(screen.getByRole("button", { name: "Tab B" })).toHaveClass("bg-surface-primary");
    expect(screen.getByRole("button", { name: "Tab A" })).toHaveClass("text-text-secondary");

    await userEvent.click(screen.getByRole("button", { name: "Tab A" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("supports a compact size", () => {
    render(<SegmentedTabs value="a" onChange={() => {}} items={items} size="sm" />);
    expect(screen.getByRole("button", { name: "Tab A" })).toHaveClass("text-xs", "px-2.5");
  });
});

describe("TabCard", () => {
  const items = [
    { value: "general", label: "General" },
    { value: "advanced", label: "Advanced" },
  ];

  it("composes tabs with header aside and body content", async () => {
    const onChange = vi.fn();
    render(
      <TabCard
        items={items}
        value="general"
        onChange={onChange}
        headerAside={<span data-testid="aside">Hint</span>}
        bodyClassName="body-class"
      >
        <span data-testid="body">Body content</span>
      </TabCard>,
    );

    expect(screen.getByTestId("aside")).toBeInTheDocument();
    expect(screen.getByTestId("body").parentElement).toHaveClass("body-class");

    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(onChange).toHaveBeenCalledWith("advanced");
  });
});

describe("StepIndicator", () => {
  const steps = [
    { step: 1, label: "Upload" },
    { step: 2, label: "Process" },
    { step: 3, label: "Finish" },
  ];

  it("renders active, completed and pending steps plus separators", () => {
    const { container } = render(
      <StepIndicator currentStep={2} steps={steps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
    expect(screen.getByText("STEP 2")).toHaveClass("text-text-inverted");
    expect(screen.getByText("1")).toHaveClass("bg-primary/10");
    expect(screen.getByText("3")).toHaveClass("border", "text-text-tertiary");
    expect(container.querySelectorAll(".h-px")).toHaveLength(steps.length - 1);
  });
});

describe("TerminalPanel", () => {
  it("renders optional regions and forwards the scroll ref", () => {
    const scrollRef = vi.fn();
    const { container } = render(
      <TerminalPanel
        title="Console"
        badge={<span data-testid="badge" />}
        meta={<span data-testid="meta">Info</span>}
        footer={<span data-testid="footer">Status</span>}
        scrollRef={scrollRef}
        className="custom-class"
      >
        Output
      </TerminalPanel>,
    );

    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toBeInTheDocument();
    expect(screen.getByTestId("meta")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(scrollRef).toHaveBeenCalled();
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("supports the plain variant without a header", () => {
    const { container } = render(<TerminalPanel variant="plain">Output</TerminalPanel>);
    expect(container.firstChild).toHaveClass("rounded-none", "border-0");
    expect(container.querySelector(".border-b")).not.toBeInTheDocument();
  });
});

describe("WelcomePanel", () => {
  it("renders hero, badge, title and description when visible", () => {
    render(
      <WelcomePanel
        visible
        stateKey="welcome"
        hero={<div data-testid="hero" />}
        badge={<span data-testid="badge">New</span>}
        title="Welcome"
        description="Get started"
      />,
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
  });

  it("hides content without removing the layout contract", () => {
    const { container } = render(
      <WelcomePanel visible={false} stateKey="welcome" hero={<div />} title="Welcome" />,
    );
    expect(container.firstChild).toHaveClass("opacity-0", "pointer-events-none");
  });
});
