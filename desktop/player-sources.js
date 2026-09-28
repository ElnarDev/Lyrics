class PlayerSources {
  constructor(now = () => Date.now(), staleAfterMs = 5000) {
    this.now = now;
    this.staleAfterMs = staleAfterMs;
    this.sources = new Map();
    this.sequence = 0;
    this.activeSource = null;
  }

  update(source, player) {
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

  remove(source) {
    this.sources.delete(source);
    return this.select();
  }

  select() {
    const now = this.now();
    const candidates = [...this.sources].filter(([, state]) =>
      state.player.title && state.player.artist && now - state.lastSeen < this.staleAfterMs);
    const playing = candidates.filter(([, state]) => !state.player.paused);
    let selected;
    if (playing.length) {
      selected = playing.reduce((best, candidate) =>
        !best || candidate[1].startedPlaying > best[1].startedPlaying ? candidate : best, null);
    } else {
      selected = candidates.find(([source]) => source === this.activeSource) ||
        candidates.reduce((best, candidate) =>
          !best || candidate[1].lastUpdate > best[1].lastUpdate ? candidate : best, null);
    }
    this.activeSource = selected?.[0] ?? null;
    return selected ? { source: selected[0], player: selected[1].player } : null;
  }
}

module.exports = { PlayerSources };
