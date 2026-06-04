import type { AiActionResponse, AiActionType, TranslationResponse } from '@/lib/messages';
import type { ExtensionSettings, ResultPopupSize } from '@/lib/settings';

export type OverlayStatus = 'hidden' | 'icon' | 'loading' | 'result' | 'error';
export type OverlayAction = 'translate' | AiActionType;
export type TextSide = 'original' | 'translation';

export type TokenPart = {
  partIndex: number;
  text: string;
  isWordLike: boolean;
  wordIndex?: number;
};

export type TokenRange = {
  startPartIndex: number;
  endPartIndex: number;
};

export type AlignmentState = {
  selectedSide: TextSide;
  selectedRange: TokenRange;
  matchedRange?: TokenRange;
  status: 'idle' | 'loading' | 'no-match';
};

export type OverlayPosition = {
  left: number;
  top: number;
};

export type OverlayState = {
  status: OverlayStatus;
  action: OverlayAction;
  position: OverlayPosition;
  selectedText: string;
  translation?: TranslationResponse;
  ai?: AiActionResponse;
  alignment?: AlignmentState;
  copied: boolean;
  popupSize: ResultPopupSize;
  settings: ExtensionSettings;
};

export type RuntimeSendResult<TResponse> =
  | { ok: true; value: TResponse }
  | { ok: false; invalidated: boolean };
