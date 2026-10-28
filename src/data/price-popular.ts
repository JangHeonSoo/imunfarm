/**
 * 많이 찾는 시세 (메인 첫 화면·품목 페이지 아래 목록). 서치어드바이저 검색어 기준으로 고른다.
 * 2026-10-19: 7일 검색어 TOP 10이 모두 시세 검색(들깨 7개, 팥·생강). 땅콩·참깨는 10/16 TOP 10.
 * 건고추·깐마늘·배추는 11월 김장철에 검색이 몰리는 품목이라 미리 둔다.
 */
export const POPULAR_PRICE_IDS = [
	'perilla-seed',
	'red-bean',
	'ginger',
	'sesame',
	'peanut',
	'dried-red-pepper',
	'garlic',
	'cabbage'
]

/**
 * 1kg 값으로 찾는 품목 (곡물·깨·생강·깐마늘). "국산 들깨 가격 1kg"처럼 검색하므로 제목과 화면에서 1kg 환산을 앞에 둔다
 * (서치어드바이저 2026-10-19: 노출 2,557, 클릭률 0.6%).
 */
/**
 * "한 말" 값으로도 찾는 품목 (서치어드바이저 2026-10-28: "들깨1말가격" 노출 1,280, 클릭률 4.1%).
 * 말은 부피 단위라 판매처마다 5kg·6kg으로 다르다. 제목엔 5kg 값, 설명엔 5kg·6kg 값을 함께 쓴다.
 */
export const MAL_KG = new Set(['perilla-seed', 'perilla-seed-imported'])

export const KG_FIRST = new Set([
	'perilla-seed',
	'perilla-seed-imported',
	'red-bean',
	'red-bean-red',
	'sesame',
	'sesame-india',
	'sesame-china',
	'peanut',
	'mung-bean',
	'mung-bean-imported',
	'soybean',
	'soybean-white',
	'ginger',
	'ginger-imported',
	'garlic',
	'garlic-2'
])

/** 단위가 kg이면 1kg 환산 (10원 단위 반올림), 아니면 null */
export const unitKgOf = (unitKo: string) => Number(unitKo.match(/^([\d.]+)kg/)?.[1]) || null
export const perKgOf = (value: number | null, unitKg: number | null) =>
	value != null && unitKg ? Math.round(value / unitKg / 10) * 10 : null
