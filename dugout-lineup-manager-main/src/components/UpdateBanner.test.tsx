// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UpdateBanner } from "./UpdateBanner";

describe("UpdateBanner", () => {
  it("handles critical updater state transitions and actions", () => {
    const onInstall = vi.fn();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();

    const { rerender, container } = render(
      <UpdateBanner
        status={{
          checking: false,
          available: false,
          downloading: false,
          progress: 0,
        }}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(container.firstChild).toBeNull();

    rerender(
      <UpdateBanner
        status={{
          checking: false,
          available: true,
          downloading: false,
          progress: 0,
          version: "1.2.3",
          notes: "Important stability fixes and lineup sync improvements.",
        }}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("v1.2.3")).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toBe("Update");
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(
      <UpdateBanner
        status={{
          checking: false,
          available: false,
          downloading: true,
          progress: 25,
          version: "1.2.3",
        }}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("v1.2.3")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Download progress" }).getAttribute("aria-valuenow")).toBe("25");
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();

    rerender(
      <UpdateBanner
        status={{
          checking: false,
          available: false,
          downloading: false,
          progress: 0,
          error: "Temporary updater outage",
        }}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Temporary updater outage")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
