/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts}'],
	theme: {
		extend: {
			colors: {
				white: '#f8f9fa',
				primary: '#10b981',
				'primary-dark': '#059669',
				secondary: '#0ea5e9',
				'text-main': '#1f2937',
				'text-muted': '#6b7280',
				'bg-light': '#f9fafb',
				'bg-white': '#ffffff'
			},
			fontFamily: {
				body: ['Inter', ...defaultTheme.fontFamily.sans],
				heading: ['Outfit', ...defaultTheme.fontFamily.sans]
			},
			gridTemplateColumns: {
				list: 'repeat(auto-fill, minmax(350px, 1fr))'
			},
			boxShadow: {
				card: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
}
