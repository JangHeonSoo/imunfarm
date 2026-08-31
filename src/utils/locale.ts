export const DEFAULT_LOCALE = 'ko'
export const SUPPORTED_LOCALES = ['ko', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const getLocalePrefix = (locale: string) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`)

export const stripLocaleFromSlug = (slug: string, locale: string) =>
	slug.startsWith(`${locale}/`) ? slug.slice(locale.length + 1) : slug

export const getLocaleLanguageTag = (locale: string) => (locale === 'en' ? 'en-US' : 'ko-KR')

export const getLocaleName = (locale: string) => (locale === 'en' ? 'English' : '한국어')

/** 현재 경로를 다른 로케일 경로로 변환 */
export const swapLocaleInPath = (pathname: string, targetLocale: string) => {
	const segments = pathname.split('/').filter(Boolean)
	const hasPrefix = (SUPPORTED_LOCALES as readonly string[]).includes(segments[0])
	const rest = hasPrefix ? segments.slice(1) : segments
	const prefix = targetLocale === DEFAULT_LOCALE ? '' : `/${targetLocale}`
	if (rest.length === 0) return `${prefix}/`
	return `${prefix}/${rest.join('/')}/`.replace(/\/{2,}/g, '/')
}
