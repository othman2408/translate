import { useEffect, useMemo, useState } from 'react';
import { Database, Info, Languages, MousePointerClick, Settings2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';

import { getUiDirection, getUiLanguage, setActiveAppLanguage, t } from '@/lib/i18n';

import { useSettings } from './hooks/useSettings';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { CacheScreen } from './screens/CacheScreen';
import { AiHubScreen } from './screens/AiHubScreen';
import { StorageHubScreen } from './screens/StorageHubScreen';
import { TranslationHubScreen } from './screens/TranslationHubScreen';
import { SettingsHubScreen } from './screens/SettingsHubScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type {
  AiSettingsScreen,
  NavItem,
  NavigationDirection,
  Screen,
  SettingsScreen as SettingsScreenName,
} from './types';
import './App.css';

const screenVariants: Variants = {
  initial: (direction: NavigationDirection) => ({
    x: direction === 'forward' ? 380 : -380,
    zIndex: direction === 'forward' ? 2 : 0,
  }),
  animate: {
    x: 0,
  },
  exit: (direction: NavigationDirection) => ({
    x: direction === 'forward' ? -380 : 380,
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
  const {
    loaded,
    resetSettings,
    saveState,
    settings,
    updateSetting,
    updateSettings,
  } = useSettings();
  const shouldReduceMotion = useReducedMotion();
  setActiveAppLanguage(settings.appLanguage);

  const uiLanguage = getUiLanguage(settings.appLanguage);
  const uiDirection = getUiDirection(uiLanguage);

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    document.documentElement.dir = uiDirection;
    document.documentElement.dataset.themeMode = settings.themeMode;
    document.documentElement.style.colorScheme = settings.themeMode === 'system' ? 'light dark' : settings.themeMode;
    document.title = t('appTitle', undefined, settings.appLanguage);
  }, [settings.appLanguage, settings.themeMode, uiDirection, uiLanguage]);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        screen: 'general',
        title: t('titleGeneral'),
        icon: <Settings2 size={17} />,
      },
      {
        screen: 'translation',
        title: t('titleTranslation'),
        icon: <Languages size={17} />,
      },
      {
        screen: 'ai',
        title: t('titleAi'),
        icon: <Sparkles size={17} />,
      },
      {
        screen: 'interaction',
        title: t('titleInteraction'),
        icon: <MousePointerClick size={17} />,
      },
      {
        screen: 'storage',
        title: t('titleStorage'),
        icon: <Database size={17} />,
      },
      {
        screen: 'about',
        title: t('titleAbout'),
        icon: <Info size={17} />,
      },
    ],
    [settings.appLanguage],
  );

  function navigateTo(nextScreen: Screen): void {
    if (nextScreen === screen) {
      return;
    }

    setDirection(isBackNavigation(screen, nextScreen) ? 'back' : 'forward');
    setScreen(nextScreen);
  }

  return (
    <main
      className="app-shell"
      aria-busy={!loaded}
      data-theme-mode={settings.themeMode}
      dir={uiDirection}
      lang={uiLanguage}
    >
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
      return (
        <HomeScreen
          settings={settings}
          onNavigate={navigateTo}
          onUpdate={updateSetting}
        />
      );
    }

    if (screenName === 'settings') {
      return (
        <SettingsHubScreen
          navItems={navItems}
          saveState={saveState}
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo}
        />
      );
    }

    if (screenName === 'storage') {
      return (
        <StorageHubScreen
          settings={settings}
          saveState={saveState}
          onBack={() => navigateTo('settings')}
          onNavigate={navigateTo}
          onUpdate={updateSetting}
        />
      );
    }

    if (screenName === 'translation') {
      return (
        <TranslationHubScreen
          saveState={saveState}
          onBack={() => navigateTo('settings')}
          onNavigate={navigateTo}
        />
      );
    }

    if (screenName === 'history') {
      return (
        <HistoryScreen
          mode="translation"
          settings={settings}
          saveState={saveState}
          onBack={() => navigateTo('storage')}
        />
      );
    }

    if (screenName === 'cache') {
      return (
        <CacheScreen
          settings={settings}
          saveState={saveState}
          onBack={() => navigateTo('storage')}
        />
      );
    }

    if (screenName === 'ai') {
      return (
        <AiHubScreen
          saveState={saveState}
          onBack={() => navigateTo('settings')}
          onNavigate={navigateTo}
        />
      );
    }

    if (screenName === 'ai-history') {
      return (
        <HistoryScreen
          mode="ai"
          settings={settings}
          saveState={saveState}
          onBack={() => navigateTo('storage')}
        />
      );
    }

    return (
      <SettingsScreen
        screen={screenName as SettingsScreenName}
        aiScreen={isAiSettingsScreen(screenName) ? screenName : undefined}
        settings={settings}
        saveState={saveState}
        onBack={() => navigateTo(
          isAiChildScreen(screenName)
            ? 'ai'
            : isTranslationChildScreen(screenName)
            ? 'translation'
            : 'settings'
        )}
        onUpdate={updateSetting}
        onUpdateSettings={updateSettings}
        onReset={resetSettings}
      />
    );
  }
}

function isBackNavigation(currentScreen: Screen, nextScreen: Screen): boolean {
  if (nextScreen === 'home') {
    return true;
  }

  if (nextScreen === 'ai' && isAiChildScreen(currentScreen)) {
    return true;
  }

  if (nextScreen === 'translation' && isTranslationChildScreen(currentScreen)) {
    return true;
  }

  if (nextScreen === 'storage' && (
    currentScreen === 'cache'
    || currentScreen === 'history'
    || currentScreen === 'ai-history'
  )) {
    return true;
  }

  return currentScreen !== 'home' && nextScreen === 'settings';
}

function isAiChildScreen(screen: Screen): boolean {
  return screen === 'ai-behavior'
    || screen === 'ai-rewrite'
    || screen === 'ai-explain'
    || screen === 'ai-providers';
}

function isTranslationChildScreen(screen: Screen): boolean {
  return screen === 'translation-languages' || screen === 'translation-providers';
}

function isAiSettingsScreen(screen: Screen): screen is AiSettingsScreen {
  return screen === 'ai-behavior'
    || screen === 'ai-rewrite'
    || screen === 'ai-explain'
    || screen === 'ai-providers';
}

export default App;
