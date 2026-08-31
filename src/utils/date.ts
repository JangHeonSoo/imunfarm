/** 2026.08.15 형식 */
export const formatPostDate = (date?: Date | null) => {
	if (!date) return ''
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}.${month}.${day}`
}
