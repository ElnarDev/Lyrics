import type { PlayerMessage } from "../../shared/protocol.js";

const mediaEvents = ["play", "pause", "seeking", "seeked", "loadedmetadata", "durationchange", "emptied", "ended"];

export function createPlayerObserver(onUpdate: () => void) {
  let observedBar: Element | null = null;
  let observedMedia: HTMLVideoElement | null = null;
  let observedTitle: Element | null = null;
  let observedByline: Element | null = null;
  let metadataTimer: ReturnType<typeof setTimeout> | undefined;
  let title = "";
  let byline = "";
  let album = "";

  const metadataObserver = new MutationObserver(() => {
    clearTimeout(metadataTimer);
    metadataTimer = setTimeout(refreshMetadata, 50);
  });
  const barObserver = new MutationObserver(ensureMetadataTargets);

  function refreshMetadata(): void {
    title = observedTitle?.textContent?.trim() || "";
    byline = observedByline?.textContent?.trim() || "";
    album = byline.split(/[•·]/)[1]?.trim() || "";
    onUpdate();
  }

  function ensureMetadataTargets(): void {
    const titleNode = document.querySelector("ytmusic-player-bar .title");
    const bylineNode = document.querySelector("ytmusic-player-bar .byline");
    if (titleNode === observedTitle && bylineNode === observedByline) return;
    metadataObserver.disconnect();
    observedTitle = titleNode;
    observedByline = bylineNode;
    if (titleNode) metadataObserver.observe(titleNode, { childList: true, subtree: true, characterData: true });
    if (bylineNode) metadataObserver.observe(bylineNode, { childList: true, subtree: true, characterData: true });
    refreshMetadata();
  }

  function ensureTargets(): void {
    const bar = document.querySelector("ytmusic-player-bar");
    if (bar !== observedBar) {
      barObserver.disconnect();
      observedBar = bar;
      if (bar) barObserver.observe(bar, { childList: true, subtree: true });
    }
    ensureMetadataTargets();
    const media = document.querySelector<HTMLVideoElement>("video");
    if (media !== observedMedia) {
      for (const event of mediaEvents) observedMedia?.removeEventListener?.(event, onUpdate);
      observedMedia = media;
      for (const event of mediaEvents) media?.addEventListener?.(event, onUpdate);
      onUpdate();
    }
  }

  function snapshot(): PlayerMessage {
    const media = observedMedia;
    return {
      title,
      artist: byline,
      album,
      duration: media && Number.isFinite(media.duration) && media.duration > 0 ? Math.round(media.duration) : 0,
      currentTime: media?.currentTime || 0,
      paused: media?.paused ?? true,
    };
  }

  function start(): void {
    ensureTargets();
    setInterval(() => {
      if (observedMedia && !observedMedia.paused) onUpdate();
    }, 750);
    setInterval(ensureTargets, 2000);
  }

  return { snapshot, start };
}
