import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, Languages, MousePointerClick, Settings2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';

import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  settingsItem,
  type ExtensionSettings,
} from '@/lib/settings';
import { getUiDirection, getUiLanguage, setActiveAppLanguage, t } from '@/lib/i18n';

import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type {
  NavItem,
  NavigationDirection,
  SaveState,
  Screen,
  SettingsScreen as SettingsScreenName,
} from './types';
import './App.css';

const screenVariants: Variants = {
  initial: (direction: NavigationDirection) => ({
    x: direction === 'forward' ? 420 : -420,
    zIndex: direction === 'forward' ? 2 : 0,
  }),
  animate: {
    x: 0,
  },
  exit: (direction: NavigationDirection) => ({
    x: direction === 'forward' ? -420 : 420,
    zIndex: direction === 'forward' ? 0 : 2,
  }),
};

function clearRestingTransform(
  _: unknown,
  generatedTransform: string,
): string {
  return generatedTransform === 'translateX(0px)' ? 'none' : generatedTransform;
}

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [direction, setDirection] = useState<NavigationDirection>('forward');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  setActiveAppLanguage(settings.appLanguage);

  const uiLanguage = getUiLanguage(settings.appLanguage);
  const uiDirection = getUiDirection(uiLanguage);

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    document.documentElement.dir = uiDirection;
    document.title = t('appTitle', undefined, settings.appLanguage);
  }, [settings.appLanguage, uiDirection, uiLanguage]);

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

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        screen: 'translation',
        title: t('titleTranslation'),
        icon: <Languages size={17} />,
      },
      {
        screen: 'interaction',
        title: t('titleInteraction'),
        icon: <MousePointerClick size={17} />,
      },
      {
        screen: 'provider',
        title: t('titleProvider'),
        icon: <KeyRound size={17} />,
      },
      {
        screen: 'extension',
        title: t('titleExtension'),
        icon: <Settings2 size={17} />,
      },
    ],
    [settings.appLanguage],
  );

  function navigateTo(nextScreen: Screen): void {
    if (nextScreen === screen) {
      return;
    }

    setDirection(nextScreen === 'home' ? 'back' : 'forward');
    setScreen(nextScreen);
  }

  function updateSettings(nextSettings: ExtensionSettings): void {
    setSettings(nextSettings);
    setSaveState('idle');

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    void saveSettings(nextSettings).then(() => {
      setSaveState('saved');
      saveTimerRef.current = window.setTimeout(() => setSaveState('idle'), 1100);
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
    <main className="app-shell" aria-busy={!loaded} dir={uiDirection} lang={uiLanguage}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={screen}
          className="screen-frame"
          custom={direction}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transformTemplate={clearRestingTransform}
          transition={
            shouldReduceMotion
              ? { duration: 0.2, ease: [0.32, 0.72, 0, 1] }
              : { duration: 0.42, ease: [0.32, 0.72, 0, 1] }
          }
        >
          {renderScreen(screen)}
        </motion.div>
      </AnimatePresence>
    </main>
  );

  function renderScreen(screenName: Screen) {
    if (screenName === 'home') {
      return <HomeScreen navItems={navItems} saveState={saveState} onNavigate={navigateTo} />;
    }

    return (
      <SettingsScreen
        screen={screenName as SettingsScreenName}
        settings={settings}
        saveState={saveState}
        onBack={() => navigateTo('home')}
        onUpdate={updateSetting}
        onReset={resetSettings}
      />
    );
  }
}

export default App;
