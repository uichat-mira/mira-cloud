// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "../../src/components/mira-design/index.ts";
import { loadMarkdownEditor, loadMarkdownText } from "../../src/components/mira-design/content.ts";

describe("AGT-049 content component loading", () => {
  it("keeps CodeBlock in the light main component entry", () => {
    render(<CodeBlock>const answer = 42;</CodeBlock>);
    expect(screen.getByText("const answer = 42;")).toBeInTheDocument();
  });

  it("loads MarkdownText through the explicit heavy-content boundary", async () => {
    const module = await loadMarkdownText();
    expect(module.default).toBeTypeOf("object");
  });

  it("renders basic markdown without a chat-runtime wrapper", async () => {
    const { default: MarkdownText } = await loadMarkdownText();
    render(<MarkdownText features="basic">{"**MiraDesign**"}</MarkdownText>);
    expect(await screen.findByText("MiraDesign")).toBeInTheDocument();
  });

  it("loads MarkdownEditor only through its explicit dynamic boundary", async () => {
    const module = await loadMarkdownEditor();
    expect(module.default).toBeTypeOf("function");
  });
});
