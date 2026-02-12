/**
 * API Client for Dugout Baseball Coaching Backend
 * 
 * Connects to the local FastAPI backend running at http://localhost:8100
 * All operations are local-first with no authentication.
 * 
 * CHANGES: Created new file to handle all backend communication
 */

// Backend configuration
const API_BASE = "http://localhost:8100";

// Type definitions matching backend models
export interface BackendPlayer {
  id: string;
  name: string;
  number?: number;
  primary_position: string;
  secondary_positions?: string[];
  bats: string;
  throws: string;
  status?: string;
  notes?: string;
}

export interface BackendLineupSlot {
  slot_number: number;
  player_id: string | null;
}

export interface BackendFieldPosition {
  position: string;
  player_id: string | null;
}

export interface BackendConfiguration {
  id: string;
  name: string;
  lineup: BackendLineupSlot[];
  field_positions: BackendFieldPosition[];
  use_dh?: boolean;
  notes?: string;
  last_used_timestamp?: string;
}

export interface LyraAnalysisRequest {
  lineup: BackendLineupSlot[];
  field_positions: BackendFieldPosition[];
  players: BackendPlayer[];
  question?: string;
}

export interface LyraAnalysisResponse {
  analysis: string;
  timestamp: string;
}

export interface OllamaModelsResponse {
  ollama_url: string;
  connected: boolean;
  models: string[];
  error?: string;
}

export interface BackendGame {
  id: string;
  date: string;
  opponent: string;
  home_away: string;
  result?: string;
  score_us?: number;
  score_them?: number;
  notes?: string;
  created_at?: string;
}

export interface BackendGameStats {
  game_id: string;
  player_id: string;
  ab?: number;
  r?: number;
  h?: number;
  doubles?: number;
  triples?: number;
  hr?: number;
  rbi?: number;
  bb?: number;
  so?: number;
  sb?: number;
  cs?: number;
  ip?: number;
  h_allowed?: number;
  r_allowed?: number;
  er?: number;
  bb_allowed?: number;
  k?: number;
  pitches?: number;
  po?: number;
  a?: number;
  e?: number;
  position_played?: string[];
  innings_played?: number;
}

export interface BackendSeasonStats {
  player_id: string;
  games_played: number;
  hitting: {
    ab?: number;
    r?: number;
    h?: number;
    doubles?: number;
    triples?: number;
    hr?: number;
    rbi?: number;
    bb?: number;
    so?: number;
    sb?: number;
    cs?: number;
    avg?: number;
    obp?: number;
    slg?: number;
    ops?: number;
  };
  pitching: {
    ip?: number;
    h?: number;
    r?: number;
    er?: number;
    bb?: number;
    k?: number;
    pitches?: number;
    era?: number;
    whip?: number;
  };
  fielding: {
    po?: number;
    a?: number;
    e?: number;
    fpct?: number;
  };
}

// AI Settings types
import { AIConfig, ChatMessage } from '@/types/ai';

interface BackendAIConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  ollama_url: string;
  preferred_model: string;
  openai_key?: string | null;
  anthropic_key?: string | null;
}

interface BackendAIConfigResponse {
  provider: 'ollama' | 'openai' | 'anthropic';
  ollama_url: string;
  preferred_model: string;
  openai_key_set?: boolean;
  anthropic_key_set?: boolean;
}

function mapFrontendAIConfigToBackend(config: AIConfig): BackendAIConfig {
  const resolvedProvider = config.mode === 'local'
    ? 'ollama'
    : config.cloudProvider;

  return {
    provider: resolvedProvider,
    ollama_url: config.ollamaUrl,
    preferred_model: config.preferredModel,
    openai_key: config.openaiKey || undefined,
    anthropic_key: config.anthropicKey || undefined,
  };
}

function mapBackendAIConfigToFrontend(
  config: BackendAIConfigResponse,
  previousConfig?: AIConfig
): AIConfig {
  const mode = config.provider === 'ollama' ? 'local' : 'cloud';
  const cloudProvider = config.provider === 'anthropic'
    ? 'anthropic'
    : 'openai';

  return {
    mode,
    provider: mode === 'local' ? 'ollama' : cloudProvider,
    cloudProvider,
    ollamaUrl: config.ollama_url,
    preferredModel: config.preferred_model,
    openaiKey: previousConfig?.openaiKey ?? '',
    anthropicKey: previousConfig?.anthropicKey ?? '',
  };
}

// Helper for error handling
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        response.status,
        `API Error: ${response.status} - ${errorText}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    throw new Error(
      `Failed to connect to backend at ${API_BASE}. Make sure the backend is running.`
    );
  }
}

// ==================== Player API ====================

export const playersApi = {
  /**
   * Get all players from the backend
   */
  async getAll(): Promise<BackendPlayer[]> {
    return fetchApi<BackendPlayer[]>('/players');
  },

  /**
   * Create a new player
   */
  async create(player: Omit<BackendPlayer, 'id'>): Promise<BackendPlayer> {
    return fetchApi<BackendPlayer>('/players', {
      method: 'POST',
      body: JSON.stringify(player),
    });
  },

  /**
   * Update an existing player
   */
  async update(
    id: string,
    updates: Partial<Omit<BackendPlayer, 'id'>>
  ): Promise<BackendPlayer> {
    return fetchApi<BackendPlayer>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a player
   */
  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/players/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Lineup API ====================

export const lineupApi = {
  /**
   * Get current lineup (9 slots)
   */
  async get(): Promise<BackendLineupSlot[]> {
    return fetchApi<BackendLineupSlot[]>('/lineup');
  },

  /**
   * Update the entire lineup
   */
  async update(lineup: BackendLineupSlot[]): Promise<BackendLineupSlot[]> {
    return fetchApi<BackendLineupSlot[]>('/lineup', {
      method: 'PUT',
      body: JSON.stringify({ lineup }),
    });
  },
};

// ==================== Field API ====================

export const fieldApi = {
  /**
   * Get current field positions
   */
  async get(): Promise<BackendFieldPosition[]> {
    return fetchApi<BackendFieldPosition[]>('/field');
  },

  /**
   * Update field positions
   */
  async update(
    fieldPositions: BackendFieldPosition[]
  ): Promise<BackendFieldPosition[]> {
    return fetchApi<BackendFieldPosition[]>('/field', {
      method: 'PUT',
      body: JSON.stringify({ field_positions: fieldPositions }),
    });
  },
};

// ==================== Configuration API ====================

export const configurationApi = {
  /**
   * Get all saved configurations
   */
  async getAll(): Promise<BackendConfiguration[]> {
    return fetchApi<BackendConfiguration[]>('/configurations');
  },

  /**
   * Get a specific configuration by ID
   */
  async getById(id: string): Promise<BackendConfiguration> {
    return fetchApi<BackendConfiguration>(`/configurations/${id}`);
  },

  /**
   * Save a new configuration
   */
  async create(config: {
    name: string;
    lineup: BackendLineupSlot[];
    field_positions: BackendFieldPosition[];
    use_dh: boolean;
    notes?: string;
  }): Promise<BackendConfiguration> {
    return fetchApi<BackendConfiguration>('/configurations', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * Delete a configuration
   */
  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/configurations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Lyra API ====================

export const lyraApi = {
  /**
   * Get coaching perspective from Lyra
   * Returns advisory text only - does not modify lineup/field
   */
  async analyze(
    request: LyraAnalysisRequest
  ): Promise<LyraAnalysisResponse> {
    return fetchApi<LyraAnalysisResponse>('/lyra/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Stream chat with AI provider
   */
  async streamChat(
    messages: ChatMessage[],
    model: string,
    onChunk: (chunk: string) => void,
    onDone?: () => void,
    onError?: (err: unknown) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/lyra/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, model }),
        signal,
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format if needed, or if backend sends raw text chunks
        // Backend sends "text/event-stream" but implementation uses yield plain text in chunks?
        // Wait, StreamingResponse in FastAPI usually sends chunks as is if media_type is generic, 
        // but text/event-stream implies "data: ..." format.
        // My backend implementation yielded raw text or json? 
        // Let's check backend ai_service.py: yield chunk. 
        // FastAPI StreamingResponse just yields what you give it. 
        // If I put media_type="text/event-stream", browser might expect SSE format (data: ...\n\n).
        // My backend yielded raw content chunks. 
        // So I'll treat it as raw stream for now.
        onChunk(chunk);
      }
      if (onDone) onDone();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (onDone) onDone();
        return;
      }
      if (onError) onError(err);
    }
  },
};

// ==================== Settings API ====================

export const settingsApi = {
  async getAISettings(previousConfig?: AIConfig): Promise<AIConfig> {
    const backendConfig = await fetchApi<BackendAIConfigResponse>('/settings/ai');
    return mapBackendAIConfigToFrontend(backendConfig, previousConfig);
  },

  async updateAISettings(config: AIConfig): Promise<AIConfig> {
    const backendConfig = await fetchApi<BackendAIConfigResponse>('/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(mapFrontendAIConfigToBackend(config)),
    });
    return mapBackendAIConfigToFrontend(backendConfig, config);
  },

  async getOllamaModels(ollamaUrl?: string): Promise<OllamaModelsResponse> {
    const query = ollamaUrl
      ? `?ollama_url=${encodeURIComponent(ollamaUrl)}`
      : '';
    return fetchApi<OllamaModelsResponse>(`/settings/ai/ollama-models${query}`);
  },
};

// ==================== Health Check ====================

export const healthApi = {
  /**
   * Check backend and Ollama status
   */
  async check(): Promise<{
    api: string;
    ollama_connected: boolean;
    ollama_models: string[];
    lyra_model_available: boolean;
  }> {
    return fetchApi('/health');
  },
};

// ==================== Games API ====================

export const gamesApi = {
  /**
   * Get all games
   */
  async getAll(): Promise<BackendGame[]> {
    return fetchApi<BackendGame[]>('/games');
  },

  /**
   * Get a specific game by ID
   */
  async getById(id: string): Promise<BackendGame> {
    return fetchApi<BackendGame>(`/games/${id}`);
  },

  /**
   * Create a new game
   */
  async create(game: {
    date: string;
    opponent: string;
    home_away?: string;
    result?: string;
    score_us?: number;
    score_them?: number;
    notes?: string;
  }): Promise<BackendGame> {
    return fetchApi<BackendGame>('/games', {
      method: 'POST',
      body: JSON.stringify(game),
    });
  },

  /**
   * Update a game
   */
  async update(
    id: string,
    updates: Partial<Omit<BackendGame, 'id' | 'created_at'>>
  ): Promise<BackendGame> {
    return fetchApi<BackendGame>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a game and all its stats
   */
  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/games/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Game Stats API ====================

export const gameStatsApi = {
  /**
   * Get all stats for a game
   */
  async getByGame(gameId: string): Promise<BackendGameStats[]> {
    return fetchApi<BackendGameStats[]>(`/games/${gameId}/stats`);
  },

  /**
   * Add/update stats for multiple players in a game
   */
  async bulkUpdate(
    gameId: string,
    stats: Omit<BackendGameStats, 'game_id'>[]
  ): Promise<BackendGameStats[]> {
    return fetchApi<BackendGameStats[]>(`/games/${gameId}/stats`, {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, stats }),
    });
  },

  /**
   * Get all game stats for a specific player
   */
  async getByPlayer(playerId: string): Promise<BackendGameStats[]> {
    return fetchApi<BackendGameStats[]>(`/players/${playerId}/stats`);
  },

  /**
   * Get calculated season stats for a player
   */
  async getSeasonStats(playerId: string): Promise<BackendSeasonStats> {
    return fetchApi<BackendSeasonStats>(`/players/${playerId}/stats/season`);
  },
};
