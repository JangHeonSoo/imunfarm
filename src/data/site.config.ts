import dotenv from 'dotenv'
dotenv.config()
import { queries } from '../utils/algolia-queries'

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
		// contentPath: string
		// assetPath: string
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
		algoliaProps: {
			indexName: string
			appId: string
			apiKey: string
			dryRun: boolean
			continueOnFailure: boolean
			queries: string
		}
	}
	lang: string
	ogLocale: string
	shareMessage: string
	paginationSize: number
}

export const siteConfig: SiteConfig = {
	author: {
		name: `Imun Farm`,
		summary: `경북 구미에서 쌀, 샤인머스켓 포도, 감자, 수박, 메론을 재배하는 농장입니다.`
	},
	title: `imun.farm - 농업 지식 공유 블로그`,
	description: `경북 구미 실전 농업 노하우와 농사 기록`,
	siteUrl: `https://imun.farm/`,
	social: {
		twitter: ``,
		github: ``
	},
	config: {
		// contentPath: `${__dirname}/../content`,
		// assetPath: `${__dirname}/../assets`,
		categoryNameForAll: 'all',
		paginationPageSize: 10,
		commentsEnabled: false,
		commentsProps: {
			repo: 'lucernae/astro-blog-template',
			repoId: 'R_kgDOMuDGhA',
			category: 'Announcements',
			categoryId: 'DIC_kwDOMuDGhM4Cij7I',
			mapping: 'pathname',
			strict: '0',
			reactionsEnabled: '1',
			emitMetadata: '1',
			inputPosition: 'top',
			theme: 'preferred_color_scheme',
			lang: 'en',
			loading: 'lazy'
		},
		algoliaProps: {
			indexName: 'Pages',
			appId: process.env.GATSBY_ALGOLIA_APP_ID ?? '',
			apiKey: process.env.GATSBY_ALGOLIA_WRITE_KEY ?? '',
			dryRun: process.env.GATSBY_ALGOLIA_DRY_RUN === 'true',
			continueOnFailure: process.env.GATSBY_ALGOLIA_CONTINUE_ON_FAILURE === 'true',
			queries: queries
		}
	},
	lang: 'ko-KR',
	ogLocale: 'ko_KR',
	shareMessage: 'Share this post', // Message to share a post on social media
	paginationSize: 6 // Number of posts per page
}
