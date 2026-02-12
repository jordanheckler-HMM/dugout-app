// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/store/aiStore", () => ({
  useAIStore: () => ({
    mode: "local",
    provider: "ollama",
    cloudProvider: "openai",
    ollamaUrl: "http://localhost:11434",
    preferredModel: "lyra-coach:latest",
    openaiKey: "",
    anthropicKey: "",
    updateSettings: vi.fn(),
  }),
}));

vi.mock("./AISettingsPanel", () => ({
  AISettingsPanel: () => <div data-testid="ai-settings-panel">Settings Panel</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import type { FieldPosition, LineupSlot, Player } from "@/types/player";
import { LyraPanel } from "./LyraPanel";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

afterEach(() => {
  cleanup();
});

describe("LyraPanel", () => {
  it("provides explicit labels for icon actions and toggles settings state", () => {
    const players: Player[] = [];
    const lineup: LineupSlot[] = [];
    const fieldPositions: FieldPosition[] = [];

    render(
      <LyraPanel
        players={players}
        lineup={lineup}
        fieldPositions={fieldPositions}
      />,
    );

    const clearChatButton = screen.getByRole("button", { name: "Clear chat" });
    expect(clearChatButton).toBeTruthy();
    expect(clearChatButton.hasAttribute("disabled")).toBe(true);

    const settingsButton = screen.getByRole("button", { name: "Show AI settings" });
    expect(settingsButton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(settingsButton);

    expect(screen.getByRole("button", { name: "Hide AI settings" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("ai-settings-panel")).toBeTruthy();
  });
});
