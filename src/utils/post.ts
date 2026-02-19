import { getCollection } from 'astro:content'
import { CATEGORIES } from '@/data/categories.ts'
import { unsluglify, sluglify } from './sluglify.ts'
import { DEFAULT_LOCALE, stripLocaleFromSlug } from './locale'

export const getAllCollection = async (locale: string = DEFAULT_LOCALE) => {
	const collections = ['blogs', 'physics', 'soft-dev', 'blog']
	const allPosts = await Promise.all(
		collections.map(async (col) => {
			try {
				return await getCollection(col as any)
			} catch (e) {
				return []
			}
		})
	)
	return allPosts
		.flat()
		.filter((c) => c.data.title !== undefined && c.data.post)
		.filter((post) => post.id.startsWith(`${locale}/`))
}

export const getCategories = async (locale: string = DEFAULT_LOCALE) => {
	const posts = await getAllCollection(locale)
	const categories = new Set(posts.map((post) => getCategoryName(post.data.category)))
	return Array.from(categories)
}

export const getCategoryTitleFromSlug = (cat: string | any) => {
	const name = getCategoryName(cat)
	const title = CATEGORIES.find((o) => o.slug === name)?.title
	return title || unsluglify(cat)
}

export const getCategoryName = (cat: string | any) => {
	switch (typeof cat) {
		case 'string':
			return cat
		case 'object':
			return cat.name
	}
	return cat
}

export const getCategorySlug = (cat: string | any) => {
	const name = getCategoryName(cat)
	const found = CATEGORIES.find((o) => o.slug === name || o.title === name)
	return found ? found.slug : sluglify(name.toLowerCase())
}

export const getPosts = async (max?: number, locale: string = DEFAULT_LOCALE) => {
	return (await getAllCollection(locale))
		.filter((post) => !post.data.draft && !post.data.index)
		.map((post) => {
			const rawDate = post.data.pubDate ?? post.data.date
			post.data.pubDate = rawDate ? new Date(rawDate) : new Date()
			if (post.data.tags === undefined) {
				post.data.tags = []
			}
			return post
		})
		.sort(
			(a, b) =>
				(b.data.pubDate ?? new Date(0)).valueOf() - (a.data.pubDate ?? new Date(0)).valueOf()
		)
		.slice(0, max)
}

export const getTags = async (locale: string = DEFAULT_LOCALE) => {
	const posts = await getPosts(undefined, locale)
	const tags = new Set()
	posts.forEach((post) => {
		post.data.tags.forEach((tag: string) => {
			tags.add(tag.toLowerCase())
		})
	})

	return Array.from(tags)
}

export const getIndexPageByCategory = async (category: string, locale: string = DEFAULT_LOCALE) => {
	const posts = await getAllCollection(locale)
	return posts.find(
		(post) => post.data.index && getCategorySlug(post.data.category) === category
	)
}

export const getPostByTag = async (tag: string, locale: string = DEFAULT_LOCALE) => {
	const posts = await getPosts(undefined, locale)
	const lowercaseTag = tag.toLowerCase()
	return posts.filter((post) => {
		return post.data.tags.some((postTag: string) => postTag.toLowerCase() === lowercaseTag)
	})
}

export const filterPostsByCategory = async (category: string, locale: string = DEFAULT_LOCALE) => {
	const posts = await getPosts(undefined, locale)
	return posts.filter((post) => getCategorySlug(post.data.category) === category)
}

export const getPostUrl = (slug: string, locale: string = DEFAULT_LOCALE, category?: any) => {
	const cleanSlug = stripLocaleFromSlug(slug, locale)
	if (locale !== DEFAULT_LOCALE) {
		return `/${locale}/blog/${cleanSlug}/`
	}
	const categorySlug = getCategorySlug(category)
	return `/${categorySlug}/${cleanSlug}/`
}
