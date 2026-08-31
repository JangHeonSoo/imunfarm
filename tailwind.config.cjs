/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				ink: 'var(--ink)',
				bg: 'var(--bg)',
				muted: 'var(--muted)',
				faint: 'var(--faint)',
				line: 'var(--line)'
			},
			fontFamily: {
				body: ['Manrope', 'Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: []
}
