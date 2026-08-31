interface SiteConfig {
	author: {
		name: string
		summary: string
	}
	title: string
	description: string
	siteUrl: string
	social: {
		twitter: string
		github: string
	}
	config: {
		categoryNameForAll: string
		paginationPageSize: number
		commentsEnabled: boolean
		commentsProps: {
			repo: string
			repoId: string
			category: string
			categoryId: string
			mapping: string
			strict: string
			reactionsEnabled: string
			emitMetadata: string
			inputPosition: string
			theme: string
			lang: string
			loading: string
		}
	}
	lang: string
	ogLocale: string
	shareMessage: string
	paginationSize: number
}

export const CONTACT_EMAIL = 'denosinfo@gmail.com'

export const siteConfig: SiteConfig = {
	author: {
		name: `Imun Farm`,
		summary: `쌀, 샤인머스켓 포도, 감자, 수박, 메론을 재배하며 농사 기록을 남깁니다.`
	},
	title: `IMUN.FARM`,
	description: `농지, 스마트팜, 영농형 태양광, 보조금과 지역별 농산물 시세를 직접 확인한 범위에서 기록합니다.`,
	siteUrl: `https://imun.farm/`,
	social: {
		twitter: ``,
		github: ``
	},
	config: {
		categoryNameForAll: 'all',
		paginationPageSize: 10,
		commentsEnabled: true,
		commentsProps: {
			repo: 'JangHeonSoo/imunfarm',
			repoId: 'R_kgDORDA_Iw',
			category: 'General',
			categoryId: 'DIC_kwDORDA_I84C1kMb',
			mapping: 'pathname',
			strict: '0',
			reactionsEnabled: '1',
			emitMetadata: '0',
			inputPosition: 'bottom',
			theme: 'preferred_color_scheme',
			lang: 'ko',
			loading: 'lazy'
		}
	},
	lang: 'ko-KR',
	ogLocale: 'ko_KR',
	shareMessage: 'Share this post',
	paginationSize: 6
}
