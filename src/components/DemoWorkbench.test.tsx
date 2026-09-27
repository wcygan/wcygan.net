/** @vitest-environment jsdom */
import { createRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoWorkbench } from "./DemoWorkbench";

afterEach(cleanup);

describe("DemoWorkbench composition", () => {
  it("keeps independent accessible titles, guides, and one stage per figure", () => {
    render(
      <>
        {["First demo", "Second demo"].map((title) => (
          <DemoWorkbench.Root key={title} title={title}>
            <DemoWorkbench.Header>
              <p>Description</p>
            </DemoWorkbench.Header>
            <DemoWorkbench.Stage state="ready">
              <canvas />
            </DemoWorkbench.Stage>
            <DemoWorkbench.Guide>{title} instructions</DemoWorkbench.Guide>
          </DemoWorkbench.Root>
        ))}
      </>,
    );
    const figures = screen.getAllByRole("figure");
    const titles = figures.map((figure) =>
      figure.getAttribute("aria-labelledby"),
    );
    expect(new Set(titles).size).toBe(2);
    for (const title of ["First demo", "Second demo"]) {
      const figure = screen.getByRole("figure", { name: title });
      const stage = within(figure).getByRole("group", {
        name: title + ": 3D view",
      });
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(
        document.getElementById(stage.getAttribute("aria-describedby")!)
          ?.textContent,
      ).toBe(title + " instructions");
      expect(stage.tabIndex).toBe(0);
    }
  });

  it("connects choices, control actions, and refs without a transaction model", () => {
    const change = vi.fn();
    const step = vi.fn();
    const playback = vi.fn();
    const replay = vi.fn();
    const resetView = vi.fn();
    const stage = createRef<HTMLDivElement>();
    const timer = createRef<HTMLDivElement>();
    render(
      <DemoWorkbench.Root title="Example">
        <DemoWorkbench.Header />
        <DemoWorkbench.Options
          options={[
            { id: "first", label: "First" },
            { id: "second", label: "Second" },
          ]}
          value="first"
          onChange={change}
        />
        <DemoWorkbench.Stage ref={stage} state="unavailable">
          Scene fallback
        </DemoWorkbench.Stage>
        <DemoWorkbench.Controls
          step={{ label: "Recover", onClick: step }}
          playback={{ label: "Play", onClick: playback, disabled: true }}
          replay={{ onClick: replay }}
          resetView={{ onClick: resetView, disabled: true }}
        />
        <DemoWorkbench.Guide>Use the controls</DemoWorkbench.Guide>
        <DemoWorkbench.Step live="polite">
          <DemoWorkbench.Timer ref={timer} />
          <DemoWorkbench.StepTitle number={2} total={4}>
            Recover state
          </DemoWorkbench.StepTitle>
          <p>A domain-specific explanation</p>
        </DemoWorkbench.Step>
      </DemoWorkbench.Root>,
    );
    expect(
      screen
        .getByRole("button", { name: "First" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(change).toHaveBeenCalledWith("second");
    for (const name of ["Recover", "Play", "Replay", "Reset view"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(step).toHaveBeenCalledOnce();
    expect(replay).toHaveBeenCalledOnce();
    expect(playback).not.toHaveBeenCalled();
    expect(resetView).not.toHaveBeenCalled();
    expect(stage.current?.tabIndex).toBe(-1);
    expect(timer.current?.parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByRole("status").textContent).toContain("2 / 4");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });
});
