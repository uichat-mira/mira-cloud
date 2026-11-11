// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { WorkspaceShell } from "../src/pages/workspace";

afterEach(cleanup);

describe("Workspace MiraDesign cutover", () => {
  it("keeps exact route semantics while using the shared navigation primitive", () => {
    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <WorkspaceShell />
      </MemoryRouter>,
    );

    const taskLink = screen.getByRole("link", { name: "任务" });
    const workbenchLink = screen.getByRole("link", { name: "工作台" });

    expect(taskLink).toHaveAttribute("aria-current", "page");
    expect(workbenchLink).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: "任务暂不可用" })).toBeInTheDocument();
  });
});
