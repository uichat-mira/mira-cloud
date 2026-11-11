// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  IconButton,
  NumberInput,
  SectionCard,
  SectionCardRow,
  Skeleton,
  SkeletonBlock,
  SkeletonCard,
  SkeletonCircle,
  SkeletonText,
  Slider,
  Switch,
  Tag,
  TagInput,
  TextArea,
  TextInput,
} from "../../src/components/mira-design/index.ts";

describe("Alert", () => {
  it("renders title, children, action and a close action", async () => {
    const onClose = vi.fn();
    render(
      <Alert title="Heads up" action={<button type="button">Undo</button>} onClose={onClose}>
        Something happened.
      </Alert>,
    );

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Something happened.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close alert" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("maps variants to status roles and semantic status tokens", () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("status")).toHaveClass("border-info-border");

    rerender(<Alert variant="danger">Danger</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("border-danger-border");

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("border-warning-border");

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("status")).toHaveClass("border-success-border");
  });

  it("supports custom and suppressed icons", () => {
    const { rerender } = render(<Alert icon={<span data-testid="custom-icon" />}>Info</Alert>);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();

    rerender(<Alert icon={null}>No icon</Alert>);
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("renders variants, sizes and outline treatment", () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText("Primary")).toHaveClass("bg-primary/10");

    rerender(
      <Badge variant="danger" size="md">
        Danger
      </Badge>,
    );
    expect(screen.getByText("Danger")).toHaveClass("bg-danger/10", "text-xs");

    rerender(
      <Badge variant="primary" outline>
        Outline
      </Badge>,
    );
    expect(screen.getByText("Outline")).toHaveClass("border", "bg-transparent");
  });
});

describe("Button and IconButton", () => {
  it("uses a native button with safe defaults and disabled behavior", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Click me
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("preserves variants, legacy sizes and icon-only accessible names", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary", "text-text-inverted");

    rerender(<Button size="small">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(
      <IconButton tone="danger" styleType="outline" ariaLabel="Delete">
        x
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "border-danger-border",
      "text-danger-text",
    );
  });
});

describe("Card and SectionCard", () => {
  it("renders children instead of summary fields", () => {
    render(
      <Card label="Total" value="100" description="All records">
        <span data-testid="child">custom</span>
      </Card>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("applies card variants, padding and interactive interaction", () => {
    const { container, rerender } = render(<Card variant="subtle">Subtle</Card>);
    expect(container.firstChild).toHaveClass("bg-surface-secondary");

    rerender(
      <Card variant="dashed" padding="lg" interactive>
        Dashed
      </Card>,
    );
    expect(container.firstChild).toHaveClass("border-dashed", "p-5", "hover:-translate-y-0.5");
  });

  it("keeps SectionCard as a single bordered section with divided rows", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <SectionCard title="Workspace" meta="Windows x64" divided>
        <SectionCardRow>First row</SectionCardRow>
        <SectionCardRow as="button" type="button" onClick={onClick}>
          Open
        </SectionCardRow>
      </SectionCard>,
    );

    const section = container.querySelector("section");
    expect(section).toHaveClass("border", "rounded-ui-panel", "overflow-hidden");
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(section?.querySelector("header + div")).toHaveClass("divide-y");
    expect(section?.querySelectorAll("section")).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Divider", () => {
  it("renders a semantic horizontal rule", () => {
    render(<Divider />);
    expect(document.querySelector("hr")).toHaveClass("bg-cloudy-3/70");
  });
});

describe("Input controls", () => {
  it("links TextInput labels, help and errors", () => {
    render(
      <TextInput
        label="Name"
        value=""
        onChange={() => {}}
        error="Required"
        labelHelp="Use a real name"
        placeholder="Enter name"
      />,
    );

    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", input.getAttribute("id") + "-error");
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
  });

  it("emits controlled values for TextInput, NumberInput and TextArea", () => {
    const textChange = vi.fn();
    const numberChange = vi.fn();
    const areaChange = vi.fn();
    render(
      <>
        <TextInput label="Text" value="" onChange={textChange} />
        <NumberInput label="Age" value={0} onChange={numberChange} />
        <TextArea label="Note" value="" onChange={areaChange} rows={8} />
      </>,
    );

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "hello" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "notes" } });

    expect(textChange).toHaveBeenCalledWith("hello");
    expect(numberChange).toHaveBeenCalledWith(25);
    expect(areaChange).toHaveBeenCalledWith("notes");
    expect(screen.getByLabelText("Note")).toHaveAttribute("rows", "8");
  });
});

describe("Skeleton", () => {
  it("renders blocks, text lines, circles and card composition", () => {
    const { container, rerender } = render(
      <SkeletonBlock width={120} height={40} radius="panel" animate={false} />,
    );
    const block = container.firstChild as HTMLElement;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block.style.width).toBe("120px");
    expect(block).toHaveClass("rounded-ui-panel");
    expect(block).not.toHaveClass("animate-pulse");

    rerender(<SkeletonText lines={2} lastLineWidth="40%" />);
    const lines = container.querySelectorAll(".space-y-2 > div");
    expect(lines).toHaveLength(2);
    expect((lines[1] as HTMLElement).style.width).toBe("40%");

    rerender(<SkeletonCircle size={48} />);
    expect((container.firstChild as HTMLElement).style.width).toBe("48px");

    rerender(<SkeletonCard showAvatar />);
    expect(container.querySelector(".rounded-full")).toBeInTheDocument();
    expect(Skeleton.Text).toBe(SkeletonText);
    expect(Skeleton.Circle).toBe(SkeletonCircle);
    expect(Skeleton.Card).toBe(SkeletonCard);
  });
});

describe("Switch, Slider, Tag and TagInput", () => {
  it("keeps Switch state visible and keyboard-operable", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch checked={false} onChange={onChange} ariaLabel="Airplane mode" />,
    );

    const control = screen.getByRole("switch", { name: "Airplane mode" });
    expect(control).toHaveAttribute("aria-checked", "false");
    await userEvent.click(control);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<Switch checked onChange={onChange} ariaLabel="Airplane mode" size="md" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toHaveClass("bg-primary");
  });

  it("renders Slider with formatted value and token-based track progress", () => {
    const onChange = vi.fn();
    render(
      <Slider
        label="Opacity"
        value={50}
        onChange={onChange}
        min={0}
        max={100}
        valueFormatter={(value) => `${value}%`}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Opacity" });
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(slider.getAttribute("style")).toContain("--mira-color-primary");

    fireEvent.change(slider, { target: { value: "75" } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it("removes Tag labels and enforces TagInput limits and duplicates", async () => {
    const onRemove = vi.fn();
    const { rerender } = render(<Tag label="Apple" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove tag Apple" }));
    expect(onRemove).toHaveBeenCalledTimes(1);

    const add = vi.fn();
    rerender(<TagInput value={["existing"]} maxTags={2} onChange={add} />);
    await userEvent.type(screen.getByRole("textbox"), "EXISTING{Enter}");
    expect(add).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("textbox"), "new{Enter}");
    expect(add).toHaveBeenCalledWith(["existing", "new"]);
  });

  it("hides TagInput entry controls at the limit and when disabled", () => {
    const { rerender } = render(
      <TagInput label="Tags" value={["a", "b", "c"]} maxTags={3} onChange={() => {}} />,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();

    rerender(<TagInput value={["a"]} disabled onChange={() => {}} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove tag a" })).not.toBeInTheDocument();
  });
});
