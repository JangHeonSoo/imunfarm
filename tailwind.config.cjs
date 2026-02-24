/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts}'],
	theme: {
		extend: {
			colors: {
				white: '#ffffff',
				primary: '#2d6a4f',
				'primary-light': '#40916c',
				'primary-dark': '#1b4332',
				secondary: '#e76f51',
				accent: '#bda27e', // Soil Brown
				'text-main': '#1f2937',
				'text-muted': '#6b7280',
				'bg-light': '#f4f1ea', // Warm light cream
				'bg-white': '#ffffff',
				'glass-white': 'rgba(255, 255, 255, 0.75)'
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
