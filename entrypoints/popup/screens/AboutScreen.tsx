import { browser } from '#imports';

import { t } from '@/lib/i18n';

const GITHUB_ACCOUNT = 'othman2408';
const GITHUB_REPOSITORY = 'translate';
const GITHUB_URL = `https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}`;

export function AboutScreen() {
  const manifest = browser.runtime.getManifest();

  return (
    <div className="settings-stack">
      <section className="about-hero" aria-label={t('titleAbout')}>
        <img className="about-hero__logo" src="/icon/logo.svg" alt="" />
        <div className="about-hero__copy">
          <h2>{t('appTitle')}</h2>
          <p>{t('aboutDescription')}</p>
        </div>
      </section>

      <section className="about-list" aria-label={t('aboutDetails')}>
        <AboutRow label={t('labelVersion')} value={`v${manifest.version}`} />
        <AboutRow label={t('labelAppType')} value={t('aboutAppTypeValue')} />
        <AboutRow label={t('labelDeveloper')} value={`@${GITHUB_ACCOUNT}`} />
        <a
          className="about-row about-row--link"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t('actionOpenGithub')}
        >
          <span className="about-row__label">
            <GitHubIcon />
            {t('labelRepository')}
          </span>
          <span className="about-row__value">
            github.com/{GITHUB_ACCOUNT}/{GITHUB_REPOSITORY}
          </span>
        </a>
      </section>
    </div>
  );
}

function GitHubIcon() {
  return (
    <span className="about-row__github" aria-hidden="true">
      <img className="about-row__github-logo about-row__github-logo--light" src="/github_light.svg" alt="" />
      <img className="about-row__github-logo about-row__github-logo--dark" src="/github_dark.svg" alt="" />
    </span>
  );
}

function AboutRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="about-row">
      <span className="about-row__label">{label}</span>
      <span className="about-row__value">{value}</span>
    </div>
  );
}
