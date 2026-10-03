/**
 * 추천 장비(/picks/): 한국어 글 본문의 <AffiliateBox> 상품을 빌드 때 모아 용도별로 묶는다.
 * 상품 목록을 따로 관리하지 않는다. 새 글에 박스를 넣으면 다음 빌드에 자동으로 들어온다.
 */

export type PickPost = { title: string; url: string; date: number }
export type Pick = {
	url: string
	name: string
	reason: string
	image: string
	imageAlt: string
	group: string
	posts: PickPost[]
}

export const PICK_GROUPS = [
	{
		id: 'harvest',
		title: '수확·건조·보관',
		lede: '땅콩·들깨·팥처럼 거둬서 말리고 털어 보관하는 작물에 쓰는 도구입니다.',
		months: [9, 10, 11],
		match: /peanut|perilla|red-bean|sesame|threshing/
	},
	{
		id: 'kimchi',
		title: '김장·제철',
		lede: '김장 김치를 담그고 보관하는 데 쓰는 도구와 제철 먹거리 손질 도구입니다.',
		months: [10, 11, 12],
		match: /kimchi|gimjang/
	},
	{
		id: 'balcony',
		title: '베란다 텃밭',
		lede: '베란다와 옥상 화분에서 채소를 키울 때 필요한 흙·화분·조명입니다.',
		months: [3, 4, 5, 9, 10],
		match: /balcony|container-garden|indoor-garden/
	},
	{
		id: 'winter',
		title: '전원생활 겨울 준비',
		lede: '농막·전원주택의 수도 동파와 한파에 대비하는 도구입니다.',
		months: [11, 12, 1, 2],
		match: /freeze|frozen-pipe|winter-prep|winterize/
	},
	{
		id: 'tools',
		title: '농기계·공구',
		lede: '전정 가위, 농기계 점검 도구처럼 장비 고르는 글에서 소개한 공구입니다.',
		months: [1, 2, 3, 11, 12],
		match: /machinery|pruning|pruner|equipment|power-tool/
	},
	{
		id: 'garden',
		title: '텃밭·채소 재배',
		lede: '과채류 유인·수확과 월동 채소 보온에 쓰는 도구입니다.',
		months: [3, 4, 5, 6, 10, 11],
		match: /tomato|pepper|spinach|garden|vegetable/
	},
	{
		id: 'cold',
		title: '저온저장고 운영',
		lede: '저장고 온도·습도 관리와 입출고 정리에 쓰는 도구입니다.',
		months: [7, 8, 9, 10],
		match: /cold-storage|ginger/
	},
	{
		id: 'energy',
		title: '농막·태양광',
		lede: '농막에 작은 태양광을 꾸리는 부품과 영농형 태양광 현장을 직접 재 보는 측정 도구입니다.',
		months: [3, 4, 5, 11, 12],
		match: /farm-shed|solar|off-grid|agrivoltaic/
	},
	{
		id: 'aqua',
		title: '아쿠아포닉스·수경',
		lede: '물고기와 채소를 함께 키우는 순환 수조에 필요한 장비입니다.',
		months: [1, 2, 3, 4, 12],
		match: /aquapon|aquafarm|tropical-fish|biofilter/
	}
] as const

const field = (block: string, key: string) => {
	const m = block.match(new RegExp(`${key}:\\s*(['"])([\\s\\S]*?)\\1\\s*,?\\s*\\n`))
	return m ? m[2].trim() : ''
}

/** MDX 본문에서 AffiliateBox 상품 블록을 꺼낸다 */
export const parseAffiliateItems = (body: string) => {
	const items: { url: string; name: string; reason: string; image: string; imageAlt: string }[] = []
	for (const box of body.match(/<AffiliateBox[\s\S]*?\n\/>/g) ?? []) {
		for (const block of box.match(/\{[^{}]*?url:[^{}]*?\}/g) ?? []) {
			const url = field(block, 'url')
			if (!url.startsWith('https://link.coupang.com/')) continue
			items.push({
				url,
				name: field(block, 'name'),
				reason: field(block, 'reason'),
				image: field(block, 'image'),
				imageAlt: field(block, 'imageAlt')
			})
		}
	}
	return items
}

export const groupOf = (slug: string) => PICK_GROUPS.find((g) => g.match.test(slug))?.id ?? 'garden'

/** 이번 달에 많이 찾는 묶음이 먼저 오도록 정렬 */
export const groupsForMonth = (month: number) =>
	[...PICK_GROUPS].sort(
		(a, b) =>
			Number((b.months as readonly number[]).includes(month)) -
			Number((a.months as readonly number[]).includes(month))
	)

/* ---------- 본문(~다)을 화면 문구(~습니다)로 ---------- */
const BASE = 0xac00
const JONG_N = 4 // ㄴ
const JONG_B = 17 // ㅂ
const hasBatchim = (c: string) => (c.charCodeAt(0) - BASE) % 28 !== 0
const withJong = (c: string, jong: number) => {
	const code = c.charCodeAt(0) - BASE
	return String.fromCharCode(BASE + code - (code % 28) + jong)
}
const politeWord = (word: string) => {
	if (!word.endsWith('다') || word.length < 2) return word
	const stem = word.slice(0, -1)
	const last = stem.at(-1)!
	// 영문·숫자 뒤 '다' (예: LED다, 40A다) 는 서술격 조사
	if (!/[가-힣]/.test(last)) return stem + '입니다'
	if (last === '는' && stem.length >= 2) return stem.slice(0, -1) + '습니다'
	if ((last.charCodeAt(0) - BASE) % 28 === JONG_N)
		return stem.slice(0, -1) + withJong(last, JONG_B) + '니다'
	if (hasBatchim(last)) return stem + '습니다'
	// 이다·하다·되다와 받침 없는 형용사(크다·빠르다 등)는 ㅂ니다, 그 밖에는 명사 + 이다 로 본다
	if (/[이하되크르쁘프쓰]$/.test(last)) return stem.slice(0, -1) + withJong(last, JONG_B) + '니다'
	return stem + '입니다'
}
/** 문장 끝의 '~다.'만 공손체로 바꾼다 (본문 발췌를 화면 문구로 쓸 때) */
export const toPolite = (text: string) =>
	text.replace(/([가-힣A-Za-z0-9]+다)(?=\.(\s|$)|$)/g, (w) => politeWord(w))
