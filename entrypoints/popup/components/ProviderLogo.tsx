import type { AiProviderType, ProviderType } from '@/lib/settings';

type ProviderLogoType = ProviderType | AiProviderType;

const PROVIDER_LOGOS = {
  'google-v2': {
    className: 'provider-logo--google',
    src: '/google-logo.svg',
  },
  deepseek: {
    className: 'provider-logo--deepseek',
    src: '/deepseek.svg',
  },
  openrouter: {
    className: 'provider-logo--openrouter',
    src: '/openrouter.png',
  },
  kimi: {
    className: 'provider-logo--kimi',
    src: '/kimi.png',
  },
} satisfies Record<ProviderLogoType, { className: string; src: string }>;

export function ProviderLogo({
  type,
}: {
  type: ProviderLogoType;
}) {
  const logo = PROVIDER_LOGOS[type];

  return (
    <span className={`provider-logo ${logo.className}`} aria-hidden="true">
      <img src={logo.src} alt="" />
    </span>
  );
}
