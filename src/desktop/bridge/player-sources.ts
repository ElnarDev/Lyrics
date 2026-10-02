import type { PlayerMessage } from "../../shared/protocol.js";

interface SourceState {
  player: PlayerMessage;
  track: string;
  lastSeen: number;
  lastUpdate: number;
  startedPlaying: number;
}

export interface SelectedPlayer<Source> {
  source: Source;
  player: PlayerMessage;
}

export class PlayerSources<Source extends object = object> {
  readonly now: () => number;
  readonly staleAfterMs: number;
  readonly sources = new Map<Source, SourceState>();
  sequence = 0;
  activeSource: Source | null = null;

  constructor(now = () => Date.now(), staleAfterMs = 5000) {
    this.now = now;
    this.staleAfterMs = staleAfterMs;
  }

  update(source: Source, player: PlayerMessage): SelectedPlayer<Source> | null {
    const previous = this.sources.get(source);
    const track = `${player.title}\u0000${player.artist}`;
    const order = ++this.sequence;
    this.sources.set(source, {
      player,
      track,
      lastSeen: this.now(),
      lastUpdate: order,
      startedPlaying: !player.paused && (previous?.player.paused !== false || previous.track !== track)
        ? order
        : previous?.startedPlaying ?? 0,
    });
    return this.select();
  }

  remove(source: Source): SelectedPlayer<Source> | null {
    this.sources.delete(source);
    return this.select();
  }

  select(): SelectedPlayer<Source> | null {
    const now = this.now();
    const candidates = [...this.sources].filter(([, state]) =>
      state.player.title && state.player.artist && now - state.lastSeen < this.staleAfterMs);
    const playing = candidates.filter(([, state]) => !state.player.paused);
    type Candidate = [Source, SourceState];
    let selected: Candidate | null;
    if (playing.length) {
      selected = playing.reduce<Candidate | null>((best, candidate) =>
        !best || candidate[1].startedPlaying > best[1].startedPlaying ? candidate : best, null);
    } else {
      selected = candidates.find(([source]) => source === this.activeSource) ||
        candidates.reduce<Candidate | null>((best, candidate) =>
          !best || candidate[1].lastUpdate > best[1].lastUpdate ? candidate : best, null);
    }
    this.activeSource = selected?.[0] ?? null;
    return selected ? { source: selected[0], player: selected[1].player } : null;
  }
}
