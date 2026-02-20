import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/site-config'
import { getPostUrl, DEFAULT_LOCALE } from '@/utils'

export async function GET() {
	const posts = await getCollection('blog')
	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: posts.map((post) => ({
			...post.data,
			link: getPostUrl(post.slug, DEFAULT_LOCALE, post.data.category)
		}))
	})
}
