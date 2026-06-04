export const overlayCss = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
  }

  .translate-icon-button,
  .selection-action-bubble,
  .translation-card {
    --translate-text: #172033;
    --translate-muted: #64748b;
    --translate-secondary: #334155;
    --translate-surface: #ffffff;
    --translate-soft-surface: #f5f7fb;
    --translate-hover: #eef4ff;
    --translate-blue: #176bdf;
    --translate-blue-hover: #0f55c6;
    --translate-error: #a13b14;
    --translate-border: rgba(21, 35, 58, 0.12);
    --translate-border-soft: rgba(21, 35, 58, 0.08);
    --translate-scrollbar-thumb: rgba(60, 60, 67, 0.28);
    --translate-scrollbar-thumb-hover: rgba(60, 60, 67, 0.42);
    --translate-shadow-icon: 0 12px 30px rgba(17, 24, 39, 0.24);
    --translate-shadow-icon-hover: 0 14px 36px rgba(17, 24, 39, 0.28);
    --translate-shadow-card: 0 18px 50px rgba(17, 24, 39, 0.28);
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2147483647;
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    color: var(--translate-text);
  }

  .translate-icon-button[data-theme-mode="dark"],
  .selection-action-bubble[data-theme-mode="dark"],
  .translation-card[data-theme-mode="dark"] {
    --translate-text: #f5f7fb;
    --translate-muted: #a8b3c4;
    --translate-secondary: #cbd5e1;
    --translate-surface: #242426;
    --translate-soft-surface: #303034;
    --translate-hover: rgba(10, 132, 255, 0.16);
    --translate-blue: #0a84ff;
    --translate-blue-hover: #64aaff;
    --translate-error: #ffb4a2;
    --translate-border: rgba(235, 235, 245, 0.16);
    --translate-border-soft: rgba(235, 235, 245, 0.1);
    --translate-scrollbar-thumb: rgba(235, 235, 245, 0.28);
    --translate-scrollbar-thumb-hover: rgba(235, 235, 245, 0.42);
    --translate-shadow-icon: 0 12px 30px rgba(0, 0, 0, 0.42);
    --translate-shadow-icon-hover: 0 14px 36px rgba(0, 0, 0, 0.5);
    --translate-shadow-card: 0 18px 50px rgba(0, 0, 0, 0.46);
  }

  @media (prefers-color-scheme: dark) {
    .translate-icon-button[data-theme-mode="system"],
    .selection-action-bubble[data-theme-mode="system"],
    .translation-card[data-theme-mode="system"] {
      --translate-text: #f5f7fb;
      --translate-muted: #a8b3c4;
      --translate-secondary: #cbd5e1;
      --translate-surface: #242426;
      --translate-soft-surface: #303034;
      --translate-hover: rgba(10, 132, 255, 0.16);
      --translate-blue: #0a84ff;
      --translate-blue-hover: #64aaff;
      --translate-error: #ffb4a2;
      --translate-border: rgba(235, 235, 245, 0.16);
      --translate-border-soft: rgba(235, 235, 245, 0.1);
      --translate-scrollbar-thumb: rgba(235, 235, 245, 0.28);
      --translate-scrollbar-thumb-hover: rgba(235, 235, 245, 0.42);
      --translate-shadow-icon: 0 12px 30px rgba(0, 0, 0, 0.42);
      --translate-shadow-icon-hover: 0 14px 36px rgba(0, 0, 0, 0.5);
      --translate-shadow-card: 0 18px 50px rgba(0, 0, 0, 0.46);
    }
  }

  .translate-icon-button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid var(--translate-border);
    border-radius: 999px;
    background: var(--translate-surface);
    color: var(--translate-blue);
    box-shadow: var(--translate-shadow-icon);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .translate-icon-button:hover {
    box-shadow: var(--translate-shadow-icon-hover);
    color: var(--translate-blue-hover);
  }

  .selection-action-bubble {
    display: inline-flex;
    align-items: center;
    gap: 0;
    max-width: min(110px, calc(100vw - 24px));
    border: 1px solid var(--translate-border);
    border-radius: 10px;
    background: var(--translate-surface);
    box-shadow: var(--translate-shadow-icon);
    overflow: hidden;
  }

  .selection-action-button {
    display: grid;
    place-items: center;
    width: 36px;
    height: 34px;
    border: 0;
    background: transparent;
    color: var(--translate-blue);
    cursor: pointer;
    padding: 0;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  .selection-action-button:hover {
    background: var(--translate-hover);
    color: var(--translate-blue-hover);
  }

  .selection-action-button + .selection-action-button {
    border-inline-start: 1px solid var(--translate-border-soft);
  }

  .translation-card {
    width: min(360px, calc(100vw - 24px));
    max-height: min(440px, calc(100vh - 24px));
    overflow: hidden;
    border: 1px solid var(--translate-border);
    border-radius: 8px;
    background: var(--translate-surface);
    box-shadow: var(--translate-shadow-card);
  }

  .translation-card__header,
  .translation-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .translation-card__header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--translate-border-soft);
  }

  .translation-card__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--translate-blue);
  }

  .icon-control {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--translate-muted);
    cursor: pointer;
  }

  .icon-control:hover {
    background: var(--translate-hover);
    color: var(--translate-blue);
  }

  .translation-card__status,
  .translation-card__error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    font-size: 13px;
    line-height: 1.45;
  }

  .translation-card__text-block {
    margin: 12px 12px 0;
    padding: 10px;
    border-radius: 8px;
    background: var(--translate-soft-surface);
    color: var(--translate-secondary);
  }

  .translation-card__translation {
    margin-top: 8px;
    padding: 8px 10px 0;
    background: transparent;
  }

  .translation-card__text-label,
  .translation-card__footer {
    font-size: 11px;
    color: var(--translate-muted);
  }

  .translation-card__text-block p {
    margin: 4px 0 0;
    max-height: 82px;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--translate-scrollbar-thumb) transparent;
    font-size: 13px;
    line-height: 1.45;
    color: var(--translate-text);
    white-space: pre-wrap;
    unicode-bidi: plaintext;
    user-select: none;
  }

  .translation-card__translation p {
    max-height: 150px;
    font-size: 15px;
    line-height: 1.55;
  }

  .translation-card__text-block p::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .translation-card__text-block p::-webkit-scrollbar-track {
    background: transparent;
  }

  .translation-card__text-block p::-webkit-scrollbar-thumb {
    min-height: 32px;
    border: 3px solid transparent;
    border-radius: 999px;
    background-color: var(--translate-scrollbar-thumb);
    background-clip: content-box;
  }

  .translation-card__text-block p::-webkit-scrollbar-thumb:hover {
    background-color: var(--translate-scrollbar-thumb-hover);
  }

  .translation-token {
    border-radius: 4px;
    cursor: pointer;
    padding: 0 1px;
    transition: background-color 120ms ease, color 120ms ease, outline-color 120ms ease;
  }

  .translation-token--selected {
    background: rgba(10, 132, 255, 0.2);
    color: var(--translate-text);
  }

  .translation-token--matched {
    background: rgba(52, 199, 89, 0.2);
    color: var(--translate-text);
  }

  .translation-token--preview {
    outline: 1px solid var(--translate-blue);
    background: var(--translate-hover);
  }

  .translation-token:focus-visible {
    outline: 2px solid var(--translate-blue);
    outline-offset: 1px;
  }

  .translation-card__footer {
    padding: 8px 12px 12px;
  }

  .translation-card__error {
    color: var(--translate-error);
  }

  .translation-card__error p {
    margin: 0;
    unicode-bidi: plaintext;
  }

  .spin {
    animation: translate-bubble-spin 800ms linear infinite;
  }

  @keyframes translate-bubble-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
