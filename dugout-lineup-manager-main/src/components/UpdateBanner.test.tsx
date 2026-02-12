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

    expect(screen.getByText(/Dugout v1.2.3/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
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

    expect(screen.getByText(/Downloading update v1.2.3/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update Now" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Later" })).toBeNull();

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

    expect(screen.getByText(/Updater check failed/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
