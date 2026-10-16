/**
 * 품목 시세 페이지 위쪽 쿠팡 상품 (한국어만). 오늘 값을 본 사람이 그 품목을 바로 비교해 사게.
 * 상품은 이미 글에 넣은 파트너스 블로그용 태그를 그대로 쓴다 (href·배너 이미지·alt 바꾸지 않음).
 * 근거 글: domestic-perilla-oil-price-2026, domestic-perilla-powder-price-2026, red-bean-harvest-time-2026,
 * raw-peanut-price-boiling-2026, domestic-sesame-price-2026, ginger-new-crop-price-2026
 * 국산 들깨 알곡 태그는 아직 없다 (크롬 연결 Claude로 만들어 추가할 것).
 */

export type PricePick = {
	name: string
	reason: string
	url: string
	image: string
	imageAlt: string
	imageWidth: number
	imageHeight: number
	banner: boolean
}

const B = { imageWidth: 120, imageHeight: 240, banner: true }

const P = {
	perillaOil: {
		name: '대전기름집 100% 국산 들기름 350ml',
		reason: '국산 들깨로 짠 볶은 들기름입니다. 방앗간에서 짜는 값과 비교해 보기 좋습니다.',
		url: 'https://link.coupang.com/a/hHXMkO7WlU',
		image:
			'https://img2c.coupangcdn.com/image/affiliate/banner/e9096cf471a899c33bc82486568634bc@2x.jpg',
		imageAlt: '대전기름집 100% 국산 들기름, 350ml, 1개',
		...B
	},
	perillaPowder: {
		name: '바른먹거리 국산 들깨거피가루 500g',
		reason: '원산지 국내산, 2026년산으로 표시된 거피 들깨가루입니다.',
		url: 'https://link.coupang.com/a/hKs4eVVMsu',
		image:
			'https://image5.coupangcdn.com/image/affiliate/banner/155fde3e6871e5d739c63fe9c7a3390a@2x.jpg',
		imageAlt: '바른먹거리 국산100% 들깨거피가루 국내산 들깨탈피가루 거피, 500g, 1개',
		...B
	},
	redBeanNew: {
		name: '강원도 안흥 햇팥 적두 1kg',
		reason: '2026년산 햇팥으로 표시된 국산 적두입니다. 위 1kg 값과 비교해 보세요.',
		url: 'https://link.coupang.com/a/hIO1Lw38Oy',
		image:
			'https://image15.coupangcdn.com/image/affiliate/banner/0a5883847a56b1bb1cbebf147ca66bdb@2x.jpg',
		imageAlt: '26년 국산 강원도 안흥 햇 팥 적두, 1kg, 1개',
		...B
	},
	redBean: {
		name: '유명농산 국산 팥 적두 1kg (전북 고창)',
		reason: '원산지가 전북 고창으로 표시된 국산 팥입니다. 1kg 단위로 살 수 있습니다.',
		url: 'https://link.coupang.com/a/hIO6kYVvdk',
		image:
			'https://image9.coupangcdn.com/image/affiliate/banner/8026ccc53d9bf18fb92de45690235c2a@2x.jpg',
		imageAlt: '[유명농산] 국산 팥 적두 1kg 전북 고창, 1개',
		...B
	},
	ginger: {
		name: '국내산 햇 흙생강 10kg',
		reason: '2026년산 국내산 흙생강 10kg 상자입니다. 생강청을 담글 때 상자로 사기 좋습니다.',
		url: 'https://link.coupang.com/a/hFvs4xyAuq',
		image:
			'https://image4.coupangcdn.com/image/affiliate/banner/5d6c972f502d737011d4800fca0f548e@2x.jpg',
		imageAlt: '26년 국내산 햇 흙생강, 흙생강10kg, 1개',
		...B
	},
	peanutShell: {
		name: '26년 국산 예천 햇땅콩 생땅콩 (껍질땅콩 1kg)',
		reason: '원산지가 경북 예천으로 표시된 2026년산 껍질 땅콩입니다. 삶아 먹기 좋습니다.',
		url: 'https://link.coupang.com/a/hIO83sZA1A',
		image:
			'https://img1a.coupangcdn.com/image/affiliate/banner/cd42520ba44b97001402ba59090b4d27@2x.jpg',
		imageAlt: '26년 국산 예천 햇땅콩 생땅콩, 1개, 껍질땅콩-1kg',
		...B
	},
	peanutKernel: {
		name: '대성농협 국산 생알 땅콩 1kg',
		reason: '껍질을 깐 국산 생땅콩입니다. 볶거나 조림에 바로 쓸 수 있습니다.',
		url: 'https://link.coupang.com/a/hIPaXk6aya',
		image:
			'https://image8.coupangcdn.com/image/affiliate/banner/9280571c6d733204f85ab9309f04fd2d@2x.jpg',
		imageAlt: '대성농협 국산 생알 땅콩 당일생산, 생알땅콩 1kg, 1개',
		...B
	},
	sesame: {
		name: '지리산처럼 2026년산 국내산 생참깨 1kg',
		reason: '2026년산 국내산으로 표시된 생참깨 1kg입니다. 위 1kg 값과 비교해 보세요.',
		url: 'https://link.coupang.com/a/hFvHui0bOS',
		image:
			'https://img3c.coupangcdn.com/image/affiliate/banner/561001ac0abb2248dead7fff73867e0e@2x.jpg',
		imageAlt: '[지리산처럼] 2026년산 햇참깨 국내산 생참깨 1kg, 1개',
		...B
	},
	sesameOil: {
		name: '대전기름집 100% 국산참기름 350ml',
		reason: '원산지 국내산 참기름입니다. 방앗간에서 짜는 값과 비교해 보기 좋습니다.',
		url: 'https://link.coupang.com/a/hFvK6UlqXA',
		image:
			'https://image1.coupangcdn.com/image/affiliate/banner/bd57a68c2213f15cfba99041ea3a3e61@2x.jpg',
		imageAlt: '대전기름집 60년전통 100% 국산참기름, 350ml, 1개',
		...B
	}
} satisfies Record<string, PricePick>

/** 품목 id → 상자 제목과 상품 */
export const PRICE_PICKS: Record<string, { title: string; items: PricePick[] }> = {
	'perilla-seed': { title: '국산 들깨로 만든 상품', items: [P.perillaOil, P.perillaPowder] },
	'perilla-seed-imported': {
		title: '국산 들깨로 만든 상품',
		items: [P.perillaPowder, P.perillaOil]
	},
	'red-bean': { title: '국산 팥 1kg', items: [P.redBeanNew, P.redBean] },
	'red-bean-red': { title: '국산 팥 1kg', items: [P.redBeanNew, P.redBean] },
	ginger: { title: '국산 햇생강', items: [P.ginger] },
	'ginger-imported': { title: '국산 햇생강', items: [P.ginger] },
	peanut: { title: '국산 햇땅콩', items: [P.peanutShell, P.peanutKernel] },
	sesame: { title: '국산 참깨·참기름', items: [P.sesame, P.sesameOil] },
	'sesame-china': { title: '국산 참깨·참기름', items: [P.sesame, P.sesameOil] }
}
