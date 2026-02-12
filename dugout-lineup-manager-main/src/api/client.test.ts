import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { playersApi } from "./client";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("playersApi", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets players from the backend API", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse([
        {
          id: "player-1",
          name: "Test Player",
          primary_position: "SS",
          bats: "R",
          throws: "R",
        },
      ]),
    );

    const players = await playersApi.getAll();

    expect(players).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8100/players",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("posts create payloads to the correct endpoint", async () => {
    const payload = {
      name: "New Player",
      number: 12,
      primary_position: "CF",
      secondary_positions: ["RF"],
      bats: "L",
      throws: "R",
      status: "active",
      notes: "",
    };

    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: "player-2", ...payload }, 201),
    );

    const created = await playersApi.create(payload);

    expect(created.id).toBe("player-2");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8100/players",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("surfaces backend API errors with status codes", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404 }));

    await expect(playersApi.getAll()).rejects.toThrow("API Error: 404 - Not found");
  });

  it("surfaces network failures with a stable local-run message", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));

    await expect(playersApi.getAll()).rejects.toThrow(
      "Failed to connect to backend at http://localhost:8100. Make sure the backend is running.",
    );
  });
});
