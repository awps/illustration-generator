import type { LocaleMapping } from '../types/config'

/** SEO locale code for <html lang> and hreflang: "pt" or "pt-br" */
export function localeCode(mapping: LocaleMapping): string {
  return mapping.country
    ? `${mapping.language}-${mapping.country}`
    : mapping.language
}

/** DB locale code: always just the language. Returns '_' for the default locale. */
export function localeDbCode(language: string, defaultLocale: string): string {
  return language === defaultLocale ? '_' : language
}

/** Build canonical URL for a locale + content path */
export function canonicalUrl(
  mapping: LocaleMapping,
  contentPath: string,
  mainDomain: string,
): string {
  if (mapping.route.type === 'domain') {
    return `https://${mapping.route.domain}${contentPath}`
  }
  const prefix = mapping.route.slug ? `/${mapping.route.slug}` : ''
  return `https://${mainDomain}${prefix}${contentPath}`
}

/** Build hreflang alternate links for all locales */
export function alternateLinks(
  locales: LocaleMapping[],
  defaultLocale: string,
  contentPath: string,
  mainDomain: string,
): Array<{ hreflang: string; href: string }> {
  const links: Array<{ hreflang: string; href: string }> = []

  for (const loc of locales) {
    links.push({
      hreflang: localeCode(loc),
      href: canonicalUrl(loc, contentPath, mainDomain),
    })
  }

  // x-default points to the default locale URL
  const defaultLoc = locales.find((l) => l.language === defaultLocale)
  if (defaultLoc) {
    links.push({
      hreflang: 'x-default',
      href: canonicalUrl(defaultLoc, contentPath, mainDomain),
    })
  }

  return links
}
