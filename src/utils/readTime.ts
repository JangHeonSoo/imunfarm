import { toString } from 'mdast-util-to-string'

/**
 * Injects `minutesRead` into frontmatter processed by Remark.
 */
export function remarkReadingTime() {
	return function (tree: unknown, { data }: any) {
		const textOnPage = toString(tree)
		// Simple reading time calculation: ~200 words per minute
		const words = textOnPage.trim().split(/\s+/).length
		const minutes = Math.ceil(words / 200) || 1

		data.astro.frontmatter.minutesRead = `${minutes} min read`
	}
}
