import type { DisplayPreferences, PreferencesApi } from "./preferences.js";

interface DisplayPreferencesControlsOptions {
  preferences: PreferencesApi;
  storage: Storage;
  onInput: () => void;
  onReset: () => void;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing overlay element: ${selector}`);
  return element;
}

export function createDisplayPreferencesControls({ preferences, storage, onInput, onReset }:
  DisplayPreferencesControlsOptions) {
  const controls = {
    windowOpacity: requiredElement<HTMLInputElement>("#window-opacity"),
    lyricsOpacity: requiredElement<HTMLInputElement>("#lyrics-opacity"),
    fontSize: requiredElement<HTMLInputElement>("#font-size"),
  };
  const fontSizeValue = requiredElement<HTMLOutputElement>("#font-size-value");

  const apply = (values: DisplayPreferences) => {
    controls.windowOpacity.value = String(values.windowOpacity);
    controls.lyricsOpacity.value = String(values.lyricsOpacity);
    controls.fontSize.value = String(values.fontSize);
    document.documentElement.style.setProperty("--panel-opacity", String(values.windowOpacity / 100));
    document.documentElement.style.setProperty("--lyrics-opacity", String(values.lyricsOpacity / 100));
    document.documentElement.style.setProperty("--font-size", `${values.fontSize}px`);
    fontSizeValue.value = `${values.fontSize} px`;
  };

  const saveInput = () => {
    const values = Object.fromEntries(Object.entries(controls).map(([name, control]) => [name, control.value]));
    const normalized = preferences.normalize(values);
    apply(normalized);
    preferences.save(storage, normalized);
    onInput();
  };

  const reset = () => {
    const defaults = preferences.normalize(null);
    apply(defaults);
    preferences.save(storage, defaults);
    onReset();
  };

  apply(preferences.load(storage));
  for (const control of Object.values(controls)) control.addEventListener("input", saveInput);
  return { getFontSize: () => Number(controls.fontSize.value), reset };
}
