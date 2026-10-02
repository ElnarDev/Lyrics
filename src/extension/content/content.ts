import { createBridgeConnection, type BridgeStorage } from "./bridge-connection.js";
import { createPlayerObserver } from "./player-observer.js";

declare const chrome: { storage: BridgeStorage };

(() => {
  const observer = createPlayerObserver(() => connection.publish());
  const connection = createBridgeConnection(chrome.storage, () => observer.snapshot());
  connection.start();
  observer.start();
})();
