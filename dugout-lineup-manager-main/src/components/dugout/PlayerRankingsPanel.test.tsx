// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Player, SeasonStats } from '@/types/player';

const statsByPlayer: Record<string, SeasonStats> = {
  first: {
    playerId: 'first', gamesPlayed: 1,
    hitting: { h: 1, ab: 3, avg: 1 / 3 },
    pitching: { er: 0, ip: 1, era: 0 }, fielding: {}
  },
  second: {
    playerId: 'second', gamesPlayed: 1,
    hitting: { h: 9, ab: 30, avg: .3 },
    pitching: { er: 3, ip: 1.2, era: 16.2 }, fielding: {}
  }
};

vi.mock('@/hooks/usePlayerSeasonStats', () => ({
  usePlayerSeasonStats: (playerId: string) => ({ stats: statsByPlayer[playerId], loading: false, error: null })
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

import { PlayerRankingsPanel } from './PlayerRankingsPanel';

afterEach(cleanup);

const players = ['first', 'second'].map((id): Player => ({
  id, name: id, number: 1, primaryPosition: 'P', secondaryPositions: [],
  positions: ['P'], bats: 'R', throws: 'R', status: 'active', stats: {}
}));

describe('PlayerRankingsPanel', () => {
  it('shows no value before a team has recorded stats', () => {
    render(<PlayerRankingsPanel players={[]} />);

    expect(screen.getByText('Team AVG').parentElement?.textContent).toContain('—');
    expect(screen.getByText('Team ERA').parentElement?.textContent).toContain('—');
  });

  it('uses team totals and baseball innings for AVG and ERA', async () => {
    render(<PlayerRankingsPanel players={players} />);

    expect((await screen.findByText('Team AVG')).parentElement?.textContent).toContain('.303');
    expect(screen.getByText('Team ERA').parentElement?.textContent).toContain('10.13');
  });
});
