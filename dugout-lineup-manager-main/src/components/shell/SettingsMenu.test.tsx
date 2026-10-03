// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useTextSize } from "@/hooks/useTextSize";
import { SettingsMenu } from "./SettingsMenu";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-text-size");
  document.documentElement.className = "";
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

function AppearanceHarness() {
  const { textSize, setTextSize } = useTextSize();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsMenu onClose={() => undefined} textSize={textSize} setTextSize={setTextSize} />
    </ThemeProvider>
  );
}

describe("SettingsMenu", () => {
  it("offers appearance choices and saves the text size locally", () => {
    render(<AppearanceHarness />);

    expect(screen.getByRole("heading", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByText(/account|sign in|log in/i)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "Large" }));
    expect(document.documentElement.dataset.textSize).toBe("large");
    expect(JSON.parse(localStorage.getItem("dugout.appearance.v1") ?? "{}").textSize).toBe("large");
  });
});
