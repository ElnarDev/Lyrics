function isUsableWindow(window) {
  try {
    return Boolean(window && !window.isDestroyed() && window.webContents &&
      !window.webContents.isDestroyed());
  } catch {
    return false;
  }
}

function sendToWindow(window, channel, payload) {
  if (!isUsableWindow(window)) return false;
  try {
    window.webContents.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

function showOrCreateWindow(window, createWindow) {
  if (isUsableWindow(window)) {
    try {
      window.show();
      return "shown";
    } catch {
      // The window can be destroyed between the check and show().
    }
  }
  createWindow();
  return "created";
}

function toggleOrCreateWindow(window, createWindow) {
  if (isUsableWindow(window)) {
    try {
      if (window.isVisible()) {
        window.hide();
        return "hidden";
      }
      window.show();
      return "shown";
    } catch {
      // The window can be destroyed between the check and the visibility change.
    }
  }
  createWindow();
  return "created";
}

module.exports = { isUsableWindow, sendToWindow, showOrCreateWindow, toggleOrCreateWindow };
