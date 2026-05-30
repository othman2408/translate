import { useEffect, useState } from 'react';
import { Button, Field, Input, Switch } from '@base-ui/react';
import { Check, KeyRound, Languages, MousePointerClick, RotateCcw, Settings2, Zap } from 'lucide-react';

import { LANGUAGE_OPTIONS, TARGET_LANGUAGE_OPTIONS } from '@/lib/languages';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  settingsItem,
  type ExtensionSettings,
  type PopupMode,
  type TriggerMode,
} from '@/lib/settings';

import './App.css';

function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    let active = true;

    void getSettings().then((nextSettings) => {
      if (!active) {
        return;
      }

      setSettings(nextSettings);
      setLoaded(true);
    });

    const unwatch = settingsItem.watch((nextSettings) => {
      if (active) {
        setSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
      }
    });

    return () => {
      active = false;
      unwatch();
    };
  }, []);

  function updateSettings(nextSettings: ExtensionSettings): void {
    setSettings(nextSettings);
    setSaveState('idle');

    void saveSettings(nextSettings).then(() => {
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1100);
    });
  }

  function updateSetting<TKey extends keyof ExtensionSettings>(
    key: TKey,
    value: ExtensionSettings[TKey],
  ): void {
    updateSettings({ ...settings, [key]: value });
  }

  function resetSettings(): void {
    updateSettings(DEFAULT_SETTINGS);
  }

  return (
    <main className="app-shell" aria-busy={!loaded}>
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <Languages size={20} />
        </div>
        <div>
          <h1>Translate Bubble</h1>
          <p>Google Cloud Translation with your own key</p>
        </div>
      </header>

      <section className="settings-stack">
        <Field.Root className="field">
          <Field.Label className="field-label">
            <KeyRound size={14} />
            Google API key
          </Field.Label>
          <Input
            className="text-input"
            type="password"
            spellCheck={false}
            placeholder="AIza..."
            value={settings.apiKey}
            onValueChange={(value) => updateSetting('apiKey', value)}
          />
          <Field.Description className="field-description">
            Stored only in this browser profile.
          </Field.Description>
        </Field.Root>

        <div className="language-grid">
          <label className="field">
            <span className="field-label">From</span>
            <select
              className="select-input"
              value={settings.sourceLanguage}
              onChange={(event) => updateSetting('sourceLanguage', event.target.value)}
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">To</span>
            <select
              className="select-input"
              value={settings.targetLanguage}
              onChange={(event) => updateSetting('targetLanguage', event.target.value)}
            >
              {TARGET_LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="control-group" aria-label="Trigger mode">
          <div className="control-group__heading">
            <Zap size={14} />
            Trigger
          </div>
          <SegmentedControl<TriggerMode>
            value={settings.triggerMode}
            options={[
              { value: 'click', label: 'Click icon' },
              { value: 'instant', label: 'Instant' },
            ]}
            onChange={(value) => updateSetting('triggerMode', value)}
          />
        </section>

        <section className="control-group" aria-label="Popup style">
          <div className="control-group__heading">
            <Settings2 size={14} />
            Popup
          </div>
          <SegmentedControl<PopupMode>
            value={settings.popupMode}
            options={[
              { value: 'bubble', label: 'Bubble' },
              { value: 'dictionary', label: 'Dictionary' },
            ]}
            onChange={(value) => updateSetting('popupMode', value)}
          />
        </section>

        <label className="switch-row">
          <span>
            <strong>Cache translations</strong>
            <small>Keep recent translations local for faster repeats.</small>
          </span>
          <Switch.Root
            className="switch"
            checked={settings.cacheEnabled}
            onCheckedChange={(checked) => updateSetting('cacheEnabled', checked)}
          >
            <Switch.Thumb className="switch-thumb" />
          </Switch.Root>
        </label>

        <label className="switch-row">
          <span>
            <strong>
              <MousePointerClick size={14} />
              Close on outside click
            </strong>
            <small>Dismiss the translation popup when clicking the page.</small>
          </span>
          <Switch.Root
            className="switch"
            checked={settings.closeOnOutsideClick}
            onCheckedChange={(checked) => updateSetting('closeOnOutsideClick', checked)}
          >
            <Switch.Thumb className="switch-thumb" />
          </Switch.Root>
        </label>
      </section>

      <footer className="app-footer">
        <Button className="secondary-button" type="button" onClick={resetSettings}>
          <RotateCcw size={14} />
          Reset
        </Button>
        <span className="save-state" aria-live="polite">
          {saveState === 'saved' && (
            <>
              <Check size={14} />
              Saved
            </>
          )}
        </span>
      </footer>
    </main>
  );
}

function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <Button
          key={option.value}
          className="segmented-control__button"
          data-active={option.value === value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export default App;
