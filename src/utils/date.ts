/** 2026.08.15 형식. 빌드 서버 시간대와 상관없이 한국 시간 기준 날짜로 보여 준다. */
export const formatPostDate = (date?: Date | null) => {
	if (!date) return ''
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date)
	return parts.replace(/-/g, '.')
}
