import { useUiSettings } from '@/hooks/use-ui-settings';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import { cn } from '@/lib/utils';

function LanguageToggle() {
  const { language, setLanguage } = useUiSettings();

  const handleClick = () => {
    const currentIndex = SUPPORTED_LOCALES.indexOf(language);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length;
    setLanguage(SUPPORTED_LOCALES[nextIndex] as SupportedLocale);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-sm px-2',
        'text-xs font-medium text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
      )}
      aria-label={`Switch language to ${language === 'ja' ? 'English' : '日本語'}`}
    >
      {language.toUpperCase()}
    </button>
  );
}

export { LanguageToggle };
