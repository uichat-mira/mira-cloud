import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { Card } from "../src/components/ui/card";
import { FormField } from "../src/components/ui/form-field";
import { Input } from "../src/components/ui/input";

describe("Web UI primitive semantics", () => {
  it("creates a native disabled button with a discernible label and type", () => {
    const output = renderToStaticMarkup(<Button disabled>创建任务</Button>);
    expect(output).toContain('type="button"');
    expect(output).toContain("disabled");
    expect(output).toContain("创建任务");
  });

  it("provides an accessible name to icon-only actions", () => {
    const output = renderToStaticMarkup(
      <IconButton label="切换主题" icon={<span aria-hidden="true">◇</span>} />,
    );
    expect(output).toContain('aria-label="切换主题"');
    expect(output).toContain('aria-hidden="true"');
  });

  it("links field labels and error messages and exposes aria-invalid", () => {
    const output = renderToStaticMarkup(
      <FormField id="demo" label="输入框" error="请输入内容">
        <Input id="demo" hasError />
      </FormField>,
    );
    expect(output).toContain('for="demo"');
    expect(output).toContain('id="demo"');
    expect(output).toContain('aria-invalid="true"');
    expect(output).toContain('aria-describedby="demo-error"');
    expect(output).toContain('role="alert"');
  });

  it("renders a styled semantic card without side effects", () => {
    const output = renderToStaticMarkup(<Card aria-label="摘要">未连接</Card>);
    expect(output).toContain("<section");
    expect(output).toContain('aria-label="摘要"');
    expect(output).toContain("未连接");
  });
});
