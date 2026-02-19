export const DEFAULT_LOCALE = 'ko'
export const SUPPORTED_LOCALES = ['ko', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const getLocalePrefix = (locale: string) => `/${locale}`

export const stripLocaleFromSlug = (slug: string, locale: string) =>
    slug.startsWith(`${locale}/`) ? slug.slice(locale.length + 1) : slug

export const getLocaleLanguageTag = (locale: string) => {
    const normalizedLocale = locale === 'en' ? 'en-US' : 'ko-KR'
    return normalizedLocale
}
