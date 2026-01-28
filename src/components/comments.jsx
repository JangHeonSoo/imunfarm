import * as React from 'react'
import Giscus from '@giscus/react'

const Comments = (props) => {
	const { enabled } = props
	const [mounted, setMounted] = React.useState(false)
	const [theme, setTheme] = React.useState('light')

	React.useEffect(() => {
		setMounted(true)
		// Function to get current theme
		const getTheme = () => {
			if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
				return localStorage.getItem('theme')
			}
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				return 'dark'
			}
			return 'light'
		}

		// Initial set
		setTheme(getTheme())

		// Observer for class changes on html element (standard Astro/Tailwind method)
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					const isDark = document.documentElement.classList.contains('dark')
					setTheme(isDark ? 'dark' : 'light')
				}
			})
		})

		observer.observe(document.documentElement, { attributes: true })

		return () => observer.disconnect()
	}, [])

	if (enabled == false || enabled == null || !mounted) {
		return <></>
	}

	// Determine Giscus theme based on site mode
	// 'noborder_light' is cleaner for light mode
	// 'transparent_dark' fits well with dark mode
	// Note: To use the custom CSS for hiding branding, we would need to pass the URL.
	// However, Giscus often fails to load local CSS. We use standard themes for reliability.
	const giscusTheme = theme === 'dark' ? 'transparent_dark' : 'noborder_light'

	return (
		<div className='comments w-full mt-10 p-6 bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50'>
			<Giscus
				id='comments'
				{...props}
				theme={giscusTheme}
			/>
		</div>
	)
}

export default Comments
