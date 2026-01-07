export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

export type Handedness = 'L' | 'R' | 'S'; // Left, Right, Switch

export type PlayerStatus = 'active' | 'inactive' | 'archived';

export interface PlayerStats {
  avg?: number;
  obp?: number;
  slg?: number;
  hr?: number;
  rbi?: number;
  sb?: number;
  era?: number;
  whip?: number;
  k?: number;
  isOverride?: boolean;
}

export interface Player {
  id: string;
  name: string;
  number?: number;
  primaryPosition: Position;        // Main/natural position
  secondaryPositions: Position[];   // Can play adequately
  positions: Position[];             // All positions (for backward compatibility)
  bats: Handedness;
  throws: Handedness;
  status: PlayerStatus;
  stats: PlayerStats;
}

export interface LineupSlot {
  order: number;
  playerId: string | null;
  position: Position | null;
}

export interface FieldPosition {
  position: Position;
  playerId: string | null;
  x: number;
  y: number;
}

export interface GameConfiguration {
  id: string;
  name: string;
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  useDH: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameStats {
  gameId: string;
  playerId: string;
  
  // Hitting stats
  ab?: number;        // At bats
  r?: number;         // Runs
  h?: number;         // Hits
  doubles?: number;   // 2B
  triples?: number;   // 3B
  hr?: number;        // Home runs
  rbi?: number;       // RBIs
  bb?: number;        // Walks
  so?: number;        // Strikeouts
  sb?: number;        // Stolen bases
  cs?: number;        // Caught stealing
  
  // Pitching stats
  ip?: number;        // Innings pitched
  h_allowed?: number; // Hits allowed
  r_allowed?: number; // Runs allowed
  er?: number;        // Earned runs
  bb_allowed?: number;// Walks allowed
  k?: number;         // Strikeouts (pitching)
  pitches?: number;   // Pitch count
  
  // Fielding stats
  po?: number;        // Putouts
  a?: number;         // Assists
  e?: number;         // Errors
  
  position_played?: Position[];
  innings_played?: number;
}

export interface Game {
  id: string;
  date: string;       // ISO date string
  opponent: string;
  homeAway: 'home' | 'away';
  result?: 'W' | 'L' | 'T';
  scoreUs?: number;
  scoreThem?: number;
  notes?: string;
  createdAt?: string;
}

export interface SeasonStats {
  playerId: string;
  gamesPlayed: number;
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
