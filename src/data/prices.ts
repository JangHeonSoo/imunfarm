/**
 * 지역별·날짜별 주요 농산물 도매 시세.
 *
 * aT KAMIS에서 확인한 품목·품종·단위·기준가를 바탕으로 구성했다.
 * 값은 고정 시드(품목·지역·날짜)로 계산되므로 같은 날짜는 언제 빌드해도 같은 값이 나온다.
 * 과거 일자 기록은 비교용으로 생성한다.
 *
 * 실데이터(KAMIS 농산물유통정보 OpenAPI 등)를 붙일 때는
 * priceAt() 한 곳만 교체하면 나머지(표·차트·분석)는 그대로 동작한다.
 */

export type Region = {
	id: string
	ko: string
	en: string
	adj: number
}

export type Item = {
	id: string
	ko: string
	en: string
	gradeKo: string
	gradeEn: string
	unitKo: string
	unitEn: string
	base: number
	vol: number
	/** 계절성 진폭 (0이면 연중 평탄) */
	season: number
	/** 연중 최고가가 오는 달 (1~12) */
	peakMonth: number
	/** 연평균 추세 (물가·작황 추세) */
	drift: number
	keywordsKo: string[]
	keywordsEn: string[]
}

export const REGIONS: Region[] = [
	{ id: 'garak', ko: '서울 가락', en: 'Seoul Garak', adj: 0 },
	{ id: 'gangseo', ko: '서울 강서', en: 'Seoul Gangseo', adj: -0.014 },
	{ id: 'busan', ko: '부산 엄궁', en: 'Busan Eomgung', adj: 0.021 },
	{ id: 'daegu', ko: '대구 북부', en: 'Daegu Bukbu', adj: -0.026 },
	{ id: 'gwangju', ko: '광주 각화', en: 'Gwangju Gakhwa', adj: -0.033 },
	{ id: 'daejeon', ko: '대전 오정', en: 'Daejeon Ojeong', adj: -0.009 }
]

export const ITEMS: Item[] = [
	{
		id: 'mandarin',
		ko: '감귤 (시설)',
		en: 'Mandarin (시설)',
		gradeKo: 'M과',
		gradeEn: 'M',
		unitKo: '3kg',
		unitEn: '3kg',
		base: 19200,
		vol: 0.058,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'감귤 시세',
			'감귤 가격',
			'감귤 도매가',
			'감귤 (시설)',
			'시설',
			'시설 시세',
			'시설 가격'
		],
		keywordsEn: ['Mandarin price', 'Mandarin wholesale korea', 'Mandarin (시설)']
	},
	{
		id: 'lemon',
		ko: '레몬',
		en: 'Lemon',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '17kg',
		unitEn: '17kg',
		base: 63000,
		vol: 0.073,
		season: 0.18,
		peakMonth: 8,
		drift: 0.032,
		keywordsKo: ['레몬 시세', '레몬 가격', '레몬 도매가', '레몬', '수입', '수입 시세', '수입 가격'],
		keywordsEn: ['Lemon price', 'Lemon wholesale korea', 'Lemon']
	},
	{
		id: 'mango',
		ko: '망고',
		en: 'Mango',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '5kg',
		unitEn: '5kg',
		base: 75000,
		vol: 0.043,
		season: 0.18,
		peakMonth: 8,
		drift: 0.032,
		keywordsKo: ['망고 시세', '망고 가격', '망고 도매가', '망고', '수입', '수입 시세', '수입 가격'],
		keywordsEn: ['Mango price', 'Mango wholesale korea', 'Mango']
	},
	{
		id: 'banana',
		ko: '바나나',
		en: 'Banana',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '13kg',
		unitEn: '13kg',
		base: 29500,
		vol: 0.036,
		season: 0.18,
		peakMonth: 8,
		drift: 0.032,
		keywordsKo: [
			'바나나 시세',
			'바나나 가격',
			'바나나 도매가',
			'바나나',
			'수입',
			'수입 시세',
			'수입 가격'
		],
		keywordsEn: ['Banana price', 'Banana wholesale korea', 'Banana']
	},
	{
		id: 'pear',
		ko: '배 (원황)',
		en: 'Pear (원황)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '15kg',
		unitEn: '15kg',
		base: 57000,
		vol: 0.067,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: ['배 시세', '배 가격', '배 도매가', '배 (원황)', '원황', '원황 시세', '원황 가격'],
		keywordsEn: ['Pear price', 'Pear wholesale korea', 'Pear (원황)']
	},
	{
		id: 'apple',
		ko: '사과 (쓰가루)',
		en: 'Apple (쓰가루)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 60300,
		vol: 0.033,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'사과 시세',
			'사과 가격',
			'사과 도매가',
			'사과 (쓰가루)',
			'쓰가루',
			'쓰가루 시세',
			'쓰가루 가격'
		],
		keywordsEn: ['Apple price', 'Apple wholesale korea', 'Apple (쓰가루)']
	},
	{
		id: 'apple-hongro',
		ko: '사과 (홍로)',
		en: 'Apple (홍로)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 89000,
		vol: 0.05,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'사과 시세',
			'사과 가격',
			'사과 도매가',
			'사과 (홍로)',
			'홍로',
			'홍로 시세',
			'홍로 가격'
		],
		keywordsEn: ['Apple price', 'Apple wholesale korea', 'Apple (홍로)']
	},
	{
		id: 'orange',
		ko: '오렌지 (네이블 호주)',
		en: 'Orange (네이블 호주)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '18kg',
		unitEn: '18kg',
		base: 61500,
		vol: 0.044,
		season: 0.18,
		peakMonth: 8,
		drift: 0.032,
		keywordsKo: [
			'오렌지 시세',
			'오렌지 가격',
			'오렌지 도매가',
			'오렌지 (네이블 호주)',
			'네이블 호주',
			'네이블 호주 시세',
			'네이블 호주 가격'
		],
		keywordsEn: ['Orange price', 'Orange wholesale korea', 'Orange (네이블 호주)']
	},
	{
		id: 'pineapple',
		ko: '파인애플',
		en: 'Pineapple',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '12kg',
		unitEn: '12kg',
		base: 37000,
		vol: 0.021,
		season: 0.18,
		peakMonth: 8,
		drift: 0.032,
		keywordsKo: [
			'파인애플 시세',
			'파인애플 가격',
			'파인애플 도매가',
			'파인애플',
			'수입',
			'수입 시세',
			'수입 가격'
		],
		keywordsEn: ['Pineapple price', 'Pineapple wholesale korea', 'Pineapple']
	},
	{
		id: 'grape',
		ko: '포도 (거봉)',
		en: 'Grape (거봉)',
		gradeKo: 'L과',
		gradeEn: 'L',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 16200,
		vol: 0.064,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'포도 시세',
			'포도 가격',
			'포도 도매가',
			'포도 (거봉)',
			'거봉',
			'거봉 시세',
			'거봉 가격'
		],
		keywordsEn: ['Grape price', 'Grape wholesale korea', 'Grape (거봉)']
	},
	{
		id: 'grape-shine-muscat',
		ko: '포도 (샤인머스켓)',
		en: 'Grape (샤인머스켓)',
		gradeKo: 'L과',
		gradeEn: 'L',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 15600,
		vol: 0.042,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'포도 시세',
			'포도 가격',
			'포도 도매가',
			'포도 (샤인머스켓)',
			'샤인머스켓',
			'샤인머스켓 시세',
			'샤인머스켓 가격'
		],
		keywordsEn: ['Grape price', 'Grape wholesale korea', 'Grape (샤인머스켓)']
	},
	{
		id: 'grape-campbell-early',
		ko: '포도 (캠벨얼리)',
		en: 'Grape (캠벨얼리)',
		gradeKo: 'L과',
		gradeEn: 'L',
		unitKo: '3kg',
		unitEn: '3kg',
		base: 21000,
		vol: 0.052,
		season: 0.18,
		peakMonth: 9,
		drift: 0.032,
		keywordsKo: [
			'포도 시세',
			'포도 가격',
			'포도 도매가',
			'포도 (캠벨얼리)',
			'캠벨얼리',
			'캠벨얼리 시세',
			'캠벨얼리 가격'
		],
		keywordsEn: ['Grape price', 'Grape wholesale korea', 'Grape (캠벨얼리)']
	},
	{
		id: 'potato',
		ko: '감자 (수미)',
		en: 'Potato (수미)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 37300,
		vol: 0.06,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'감자 시세',
			'감자 가격',
			'감자 도매가',
			'감자 (수미)',
			'수미',
			'수미 시세',
			'수미 가격'
		],
		keywordsEn: ['Potato price', 'Potato wholesale korea', 'Potato (수미)']
	},
	{
		id: 'sweet-potato',
		ko: '고구마 (밤)',
		en: 'Sweet potato (밤)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 36000,
		vol: 0.064,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'고구마 시세',
			'고구마 가격',
			'고구마 도매가',
			'고구마 (밤)',
			'밤',
			'밤 시세',
			'밤 가격'
		],
		keywordsEn: ['Sweet potato price', 'Sweet potato wholesale korea', 'Sweet potato (밤)']
	},
	{
		id: 'mung-bean',
		ko: '녹두',
		en: 'Mung bean',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 500000,
		vol: 0.056,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['녹두 시세', '녹두 가격', '녹두 도매가', '녹두', '국산', '국산 시세', '국산 가격'],
		keywordsEn: ['Mung bean price', 'Mung bean wholesale korea', 'Mung bean']
	},
	{
		id: 'mung-bean-imported',
		ko: '녹두',
		en: 'Mung bean',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 184000,
		vol: 0.025,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['녹두 시세', '녹두 가격', '녹두 도매가', '녹두', '수입', '수입 시세', '수입 가격'],
		keywordsEn: ['Mung bean price', 'Mung bean wholesale korea', 'Mung bean']
	},
	{
		id: 'buckwheat',
		ko: '메밀',
		en: 'Buckwheat',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '1kg',
		unitEn: '1kg',
		base: 2800,
		vol: 0.074,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['메밀 시세', '메밀 가격', '메밀 도매가', '메밀', '메밀', '메밀 시세', '메밀 가격'],
		keywordsEn: ['Buckwheat price', 'Buckwheat wholesale korea', 'Buckwheat']
	},
	{
		id: 'rice',
		ko: '쌀 (20kg)',
		en: 'Rice (20kg)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 59000,
		vol: 0.037,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['쌀 시세', '쌀 가격', '쌀 도매가', '쌀 (20kg)', '20kg', '20kg 시세', '20kg 가격'],
		keywordsEn: ['Rice price', 'Rice wholesale korea', 'Rice (20kg)']
	},
	{
		id: 'glutinous-rice',
		ko: '찹쌀',
		en: 'Glutinous rice',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 142000,
		vol: 0.038,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'찹쌀 시세',
			'찹쌀 가격',
			'찹쌀 도매가',
			'찹쌀',
			'일반계',
			'일반계 시세',
			'일반계 가격'
		],
		keywordsEn: ['Glutinous rice price', 'Glutinous rice wholesale korea', 'Glutinous rice']
	},
	{
		id: 'soybean',
		ko: '콩 (흰 콩)',
		en: 'Soybean (흰 콩)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 225000,
		vol: 0.057,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'콩 시세',
			'콩 가격',
			'콩 도매가',
			'콩 (흰 콩)',
			'흰 콩',
			'흰 콩 시세',
			'흰 콩 가격'
		],
		keywordsEn: ['Soybean price', 'Soybean wholesale korea', 'Soybean (흰 콩)']
	},
	{
		id: 'soybean-white',
		ko: '콩 (흰 콩)',
		en: 'Soybean (흰 콩)',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '35kg',
		unitEn: '35kg',
		base: 120000,
		vol: 0.057,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'콩 시세',
			'콩 가격',
			'콩 도매가',
			'콩 (흰 콩)',
			'흰 콩',
			'흰 콩 시세',
			'흰 콩 가격'
		],
		keywordsEn: ['Soybean price', 'Soybean wholesale korea', 'Soybean (흰 콩)']
	},
	{
		id: 'red-bean',
		ko: '팥 (붉은 팥)',
		en: 'Red bean (붉은 팥)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 744000,
		vol: 0.021,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'팥 시세',
			'팥 가격',
			'팥 도매가',
			'팥 (붉은 팥)',
			'붉은 팥',
			'붉은 팥 시세',
			'붉은 팥 가격'
		],
		keywordsEn: ['Red bean price', 'Red bean wholesale korea', 'Red bean (붉은 팥)']
	},
	{
		id: 'red-bean-red',
		ko: '팥 (붉은 팥)',
		en: 'Red bean (붉은 팥)',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '40kg',
		unitEn: '40kg',
		base: 267000,
		vol: 0.07,
		season: 0.08,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'팥 시세',
			'팥 가격',
			'팥 도매가',
			'팥 (붉은 팥)',
			'붉은 팥',
			'붉은 팥 시세',
			'붉은 팥 가격'
		],
		keywordsEn: ['Red bean price', 'Red bean wholesale korea', 'Red bean (붉은 팥)']
	},
	{
		id: 'oyster-mushroom',
		ko: '느타리버섯',
		en: 'Oyster mushroom',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 25500,
		vol: 0.053,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'느타리버섯 시세',
			'느타리버섯 가격',
			'느타리버섯 도매가',
			'느타리버섯',
			'느타리버섯',
			'느타리버섯 시세',
			'느타리버섯 가격'
		],
		keywordsEn: ['Oyster mushroom price', 'Oyster mushroom wholesale korea', 'Oyster mushroom']
	},
	{
		id: 'oyster-mushroom-2',
		ko: '느타리버섯 (애느타리버섯)',
		en: 'Oyster mushroom (애느타리버섯)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 8250,
		vol: 0.042,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'느타리버섯 시세',
			'느타리버섯 가격',
			'느타리버섯 도매가',
			'느타리버섯 (애느타리버섯)',
			'애느타리버섯',
			'애느타리버섯 시세',
			'애느타리버섯 가격'
		],
		keywordsEn: [
			'Oyster mushroom price',
			'Oyster mushroom wholesale korea',
			'Oyster mushroom (애느타리버섯)'
		]
	},
	{
		id: 'perilla-seed',
		ko: '들깨',
		en: 'Perilla seed',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '22.5kg',
		unitEn: '22.5kg',
		base: 374000,
		vol: 0.065,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['들깨 시세', '들깨 가격', '들깨 도매가', '들깨', '국산', '국산 시세', '국산 가격'],
		keywordsEn: ['Perilla seed price', 'Perilla seed wholesale korea', 'Perilla seed']
	},
	{
		id: 'perilla-seed-imported',
		ko: '들깨',
		en: 'Perilla seed',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '45kg',
		unitEn: '45kg',
		base: 290000,
		vol: 0.023,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['들깨 시세', '들깨 가격', '들깨 도매가', '들깨', '수입', '수입 시세', '수입 가격'],
		keywordsEn: ['Perilla seed price', 'Perilla seed wholesale korea', 'Perilla seed']
	},
	{
		id: 'peanut',
		ko: '땅콩',
		en: 'Peanut',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '30kg',
		unitEn: '30kg',
		base: 486000,
		vol: 0.026,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: ['땅콩 시세', '땅콩 가격', '땅콩 도매가', '땅콩', '국산', '국산 시세', '국산 가격'],
		keywordsEn: ['Peanut price', 'Peanut wholesale korea', 'Peanut']
	},
	{
		id: 'king-oyster-mushroom',
		ko: '새송이버섯',
		en: 'King oyster mushroom',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 8250,
		vol: 0.026,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'새송이버섯 시세',
			'새송이버섯 가격',
			'새송이버섯 도매가',
			'새송이버섯',
			'새송이버섯',
			'새송이버섯 시세',
			'새송이버섯 가격'
		],
		keywordsEn: [
			'King oyster mushroom price',
			'King oyster mushroom wholesale korea',
			'King oyster mushroom'
		]
	},
	{
		id: 'sesame',
		ko: '참깨 (백색)',
		en: 'Sesame (백색)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '30kg',
		unitEn: '30kg',
		base: 773000,
		vol: 0.063,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'참깨 시세',
			'참깨 가격',
			'참깨 도매가',
			'참깨 (백색)',
			'백색',
			'백색 시세',
			'백색 가격'
		],
		keywordsEn: ['Sesame price', 'Sesame wholesale korea', 'Sesame (백색)']
	},
	{
		id: 'sesame-india',
		ko: '참깨 (인도)',
		en: 'Sesame (인도)',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '30kg',
		unitEn: '30kg',
		base: 165000,
		vol: 0.028,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'참깨 시세',
			'참깨 가격',
			'참깨 도매가',
			'참깨 (인도)',
			'인도',
			'인도 시세',
			'인도 가격'
		],
		keywordsEn: ['Sesame price', 'Sesame wholesale korea', 'Sesame (인도)']
	},
	{
		id: 'sesame-china',
		ko: '참깨 (중국)',
		en: 'Sesame (중국)',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '30kg',
		unitEn: '30kg',
		base: 217000,
		vol: 0.057,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'참깨 시세',
			'참깨 가격',
			'참깨 도매가',
			'참깨 (중국)',
			'중국',
			'중국 시세',
			'중국 가격'
		],
		keywordsEn: ['Sesame price', 'Sesame wholesale korea', 'Sesame (중국)']
	},
	{
		id: 'enoki-mushroom',
		ko: '팽이버섯',
		en: 'Enoki mushroom',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '5kg',
		unitEn: '5kg',
		base: 11700,
		vol: 0.047,
		season: 0.12,
		peakMonth: 10,
		drift: 0.02,
		keywordsKo: [
			'팽이버섯 시세',
			'팽이버섯 가격',
			'팽이버섯 도매가',
			'팽이버섯',
			'팽이버섯',
			'팽이버섯 시세',
			'팽이버섯 가격'
		],
		keywordsEn: ['Enoki mushroom price', 'Enoki mushroom wholesale korea', 'Enoki mushroom']
	},
	{
		id: 'dried-red-pepper',
		ko: '건고추 (햇산화건)',
		en: 'Dried red pepper (햇산화건)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '30kg',
		unitEn: '30kg',
		base: 675000,
		vol: 0.056,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'건고추 시세',
			'건고추 가격',
			'건고추 도매가',
			'건고추 (햇산화건)',
			'햇산화건',
			'햇산화건 시세',
			'햇산화건 가격'
		],
		keywordsEn: [
			'Dried red pepper price',
			'Dried red pepper wholesale korea',
			'Dried red pepper (햇산화건)'
		]
	},
	{
		id: 'garlic',
		ko: '마늘 (깐마늘)',
		en: 'Garlic, peeled (깐마늘)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 173000,
		vol: 0.065,
		season: 0.25,
		peakMonth: 4,
		drift: 0.028,
		keywordsKo: [
			'깐마늘(국산) 시세',
			'깐마늘(국산) 가격',
			'깐마늘(국산) 도매가',
			'마늘 (깐마늘)',
			'깐마늘',
			'깐마늘 시세',
			'깐마늘 가격'
		],
		keywordsEn: [
			'Garlic, peeled price',
			'Garlic, peeled wholesale korea',
			'Garlic, peeled (깐마늘)'
		]
	},
	{
		id: 'garlic-2',
		ko: '마늘 (깐마늘)',
		en: 'Garlic, peeled (깐마늘)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 165000,
		vol: 0.043,
		season: 0.25,
		peakMonth: 4,
		drift: 0.028,
		keywordsKo: [
			'깐마늘(국산) 시세',
			'깐마늘(국산) 가격',
			'깐마늘(국산) 도매가',
			'마늘 (깐마늘)',
			'깐마늘',
			'깐마늘 시세',
			'깐마늘 가격'
		],
		keywordsEn: [
			'Garlic, peeled price',
			'Garlic, peeled wholesale korea',
			'Garlic, peeled (깐마늘)'
		]
	},
	{
		id: 'perilla-leaf',
		ko: '깻잎',
		en: 'Perilla leaf',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '2kg',
		unitEn: '2kg',
		base: 34500,
		vol: 0.037,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['깻잎 시세', '깻잎 가격', '깻잎 도매가', '깻잎', '깻잎', '깻잎 시세', '깻잎 가격'],
		keywordsEn: ['Perilla leaf price', 'Perilla leaf wholesale korea', 'Perilla leaf']
	},
	{
		id: 'carrot',
		ko: '당근 (무세척)',
		en: 'Carrot (무세척)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 37000,
		vol: 0.036,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'당근 시세',
			'당근 가격',
			'당근 도매가',
			'당근 (무세척)',
			'무세척',
			'무세척 시세',
			'무세척 가격'
		],
		keywordsEn: ['Carrot price', 'Carrot wholesale korea', 'Carrot (무세척)']
	},
	{
		id: 'carrot-2',
		ko: '당근 (세척)',
		en: 'Carrot (세척)',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 8500,
		vol: 0.07,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'당근 시세',
			'당근 가격',
			'당근 도매가',
			'당근 (세척)',
			'세척',
			'세척 시세',
			'세척 가격'
		],
		keywordsEn: ['Carrot price', 'Carrot wholesale korea', 'Carrot (세척)']
	},
	{
		id: 'melon',
		ko: '멜론',
		en: 'Melon',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '8kg',
		unitEn: '8kg',
		base: 29200,
		vol: 0.063,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['멜론 시세', '멜론 가격', '멜론 도매가', '멜론', '멜론', '멜론 시세', '멜론 가격'],
		keywordsEn: ['Melon price', 'Melon wholesale korea', 'Melon']
	},
	{
		id: 'radish',
		ko: '무 (고랭지)',
		en: 'Korean radish (고랭지)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 18600,
		vol: 0.033,
		season: 0.25,
		peakMonth: 9,
		drift: 0.028,
		keywordsKo: [
			'무 시세',
			'무 가격',
			'무 도매가',
			'무 (고랭지)',
			'고랭지',
			'고랭지 시세',
			'고랭지 가격'
		],
		keywordsEn: ['Korean radish price', 'Korean radish wholesale korea', 'Korean radish (고랭지)']
	},
	{
		id: 'water-parsley',
		ko: '미나리',
		en: 'Water parsley',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '8kg',
		unitEn: '8kg',
		base: 96000,
		vol: 0.059,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'미나리 시세',
			'미나리 가격',
			'미나리 도매가',
			'미나리',
			'미나리',
			'미나리 시세',
			'미나리 가격'
		],
		keywordsEn: ['Water parsley price', 'Water parsley wholesale korea', 'Water parsley']
	},
	{
		id: 'cherry-tomato',
		ko: '방울토마토 (대추방울토마토)',
		en: 'Cherry tomato (대추방울토마토)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '3kg',
		unitEn: '3kg',
		base: 14400,
		vol: 0.071,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'방울토마토 시세',
			'방울토마토 가격',
			'방울토마토 도매가',
			'방울토마토 (대추방울토마토)',
			'대추방울토마토',
			'대추방울토마토 시세',
			'대추방울토마토 가격'
		],
		keywordsEn: [
			'Cherry tomato price',
			'Cherry tomato wholesale korea',
			'Cherry tomato (대추방울토마토)'
		]
	},
	{
		id: 'cabbage',
		ko: '배추 (여름)',
		en: 'Napa cabbage (summer)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg(그물망 3포기)',
		unitEn: '10kg(그물망 3포기)',
		base: 13000,
		vol: 0.025,
		season: 0.25,
		peakMonth: 9,
		drift: 0.028,
		keywordsKo: [
			'배추 시세',
			'배추 가격',
			'배추 도매가',
			'배추 (여름)',
			'여름배추',
			'여름배추 시세',
			'여름배추 가격'
		],
		keywordsEn: ['Napa cabbage price', 'Napa cabbage wholesale korea', 'summer napa cabbage']
	},
	{
		id: 'red-chili-pepper',
		ko: '붉은고추',
		en: 'Red chili pepper',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 47500,
		vol: 0.022,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'붉은고추 시세',
			'붉은고추 가격',
			'붉은고추 도매가',
			'붉은고추',
			'붉은고추',
			'붉은고추 시세',
			'붉은고추 가격'
		],
		keywordsEn: ['Red chili pepper price', 'Red chili pepper wholesale korea', 'Red chili pepper']
	},
	{
		id: 'broccoli',
		ko: '브로콜리',
		en: 'Broccoli',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '8kg',
		unitEn: '8kg',
		base: 62600,
		vol: 0.072,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'브로콜리 시세',
			'브로콜리 가격',
			'브로콜리 도매가',
			'브로콜리',
			'브로콜리',
			'브로콜리 시세',
			'브로콜리 가격'
		],
		keywordsEn: ['Broccoli price', 'Broccoli wholesale korea', 'Broccoli']
	},
	{
		id: 'lettuce',
		ko: '상추 (적)',
		en: 'Lettuce (적)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 57600,
		vol: 0.02,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['상추 시세', '상추 가격', '상추 도매가', '상추 (적)', '적', '적 시세', '적 가격'],
		keywordsEn: ['Lettuce price', 'Lettuce wholesale korea', 'Lettuce (적)']
	},
	{
		id: 'lettuce-green',
		ko: '상추 (청)',
		en: 'Lettuce (청)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 58300,
		vol: 0.071,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['상추 시세', '상추 가격', '상추 도매가', '상추 (청)', '청', '청 시세', '청 가격'],
		keywordsEn: ['Lettuce price', 'Lettuce wholesale korea', 'Lettuce (청)']
	},
	{
		id: 'ginger',
		ko: '생강',
		en: 'Ginger',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 61600,
		vol: 0.068,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['생강 시세', '생강 가격', '생강 도매가', '생강', '국산', '국산 시세', '국산 가격'],
		keywordsEn: ['Ginger price', 'Ginger wholesale korea', 'Ginger']
	},
	{
		id: 'ginger-imported',
		ko: '생강',
		en: 'Ginger',
		gradeKo: '중품',
		gradeEn: 'B',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 80600,
		vol: 0.072,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['생강 시세', '생강 가격', '생강 도매가', '생강', '수입', '수입 시세', '수입 가격'],
		keywordsEn: ['Ginger price', 'Ginger wholesale korea', 'Ginger']
	},
	{
		id: 'watermelon',
		ko: '수박',
		en: 'Watermelon',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '1개',
		unitEn: '1개',
		base: 22000,
		vol: 0.03,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['수박 시세', '수박 가격', '수박 도매가', '수박', '수박', '수박 시세', '수박 가격'],
		keywordsEn: ['Watermelon price', 'Watermelon wholesale korea', 'Watermelon']
	},
	{
		id: 'spinach',
		ko: '시금치',
		en: 'Spinach',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 75000,
		vol: 0.02,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'시금치 시세',
			'시금치 가격',
			'시금치 도매가',
			'시금치',
			'시금치',
			'시금치 시세',
			'시금치 가격'
		],
		keywordsEn: ['Spinach price', 'Spinach wholesale korea', 'Spinach']
	},
	{
		id: 'baby-napa-cabbage',
		ko: '알배기배추',
		en: 'Baby napa cabbage',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '8kg',
		unitEn: '8kg',
		base: 37300,
		vol: 0.066,
		season: 0.25,
		peakMonth: 9,
		drift: 0.028,
		keywordsKo: [
			'알배기배추 시세',
			'알배기배추 가격',
			'알배기배추 도매가',
			'알배기배추',
			'알배기배추',
			'알배기배추 시세',
			'알배기배추 가격'
		],
		keywordsEn: [
			'Baby napa cabbage price',
			'Baby napa cabbage wholesale korea',
			'Baby napa cabbage'
		]
	},
	{
		id: 'cabbage-round',
		ko: '양배추',
		en: 'Cabbage',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '8kg',
		unitEn: '8kg',
		base: 6000,
		vol: 0.058,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'양배추 시세',
			'양배추 가격',
			'양배추 도매가',
			'양배추',
			'양배추',
			'양배추 시세',
			'양배추 가격'
		],
		keywordsEn: ['Cabbage price', 'Cabbage wholesale korea', 'Cabbage']
	},
	{
		id: 'onion',
		ko: '양파',
		en: 'Onion',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '15kg',
		unitEn: '15kg',
		base: 18800,
		vol: 0.057,
		season: 0.25,
		peakMonth: 4,
		drift: 0.028,
		keywordsKo: ['양파 시세', '양파 가격', '양파 도매가', '양파', '양파', '양파 시세', '양파 가격'],
		keywordsEn: ['Onion price', 'Onion wholesale korea', 'Onion']
	},
	{
		id: 'eolgari-cabbage',
		ko: '얼갈이배추',
		en: 'Eolgari cabbage',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 14300,
		vol: 0.021,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'얼갈이배추 시세',
			'얼갈이배추 가격',
			'얼갈이배추 도매가',
			'얼갈이배추',
			'얼갈이배추',
			'얼갈이배추 시세',
			'얼갈이배추 가격'
		],
		keywordsEn: ['Eolgari cabbage price', 'Eolgari cabbage wholesale korea', 'Eolgari cabbage']
	},
	{
		id: 'young-radish-greens',
		ko: '열무',
		en: 'Young radish greens',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 19300,
		vol: 0.025,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: ['열무 시세', '열무 가격', '열무 도매가', '열무', '열무', '열무 시세', '열무 가격'],
		keywordsEn: [
			'Young radish greens price',
			'Young radish greens wholesale korea',
			'Young radish greens'
		]
	},
	{
		id: 'cucumber',
		ko: '오이 (다다기계통)',
		en: 'Cucumber (다다기계통)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '50개',
		unitEn: '50개',
		base: 45300,
		vol: 0.052,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'오이 시세',
			'오이 가격',
			'오이 도매가',
			'오이 (다다기계통)',
			'다다기계통',
			'다다기계통 시세',
			'다다기계통 가격'
		],
		keywordsEn: ['Cucumber price', 'Cucumber wholesale korea', 'Cucumber (다다기계통)']
	},
	{
		id: 'cucumber-cheong',
		ko: '오이 (취청)',
		en: 'Cucumber (취청)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '50개',
		unitEn: '50개',
		base: 43200,
		vol: 0.051,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'오이 시세',
			'오이 가격',
			'오이 도매가',
			'오이 (취청)',
			'취청',
			'취청 시세',
			'취청 가격'
		],
		keywordsEn: ['Cucumber price', 'Cucumber wholesale korea', 'Cucumber (취청)']
	},
	{
		id: 'tomato',
		ko: '토마토',
		en: 'Tomato',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '5kg',
		unitEn: '5kg',
		base: 33400,
		vol: 0.034,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'토마토 시세',
			'토마토 가격',
			'토마토 도매가',
			'토마토',
			'토마토',
			'토마토 시세',
			'토마토 가격'
		],
		keywordsEn: ['Tomato price', 'Tomato wholesale korea', 'Tomato']
	},
	{
		id: 'greenonion',
		ko: '파 (대파)',
		en: 'Green onion (대파)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '1kg',
		unitEn: '1kg',
		base: 2320,
		vol: 0.057,
		season: 0.25,
		peakMonth: 4,
		drift: 0.028,
		keywordsKo: ['파 시세', '파 가격', '파 도매가', '파 (대파)', '대파', '대파 시세', '대파 가격'],
		keywordsEn: ['Green onion price', 'Green onion wholesale korea', 'Green onion (대파)']
	},
	{
		id: 'greenonion-2',
		ko: '파 (쪽파)',
		en: 'Green onion (쪽파)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '1kg',
		unitEn: '1kg',
		base: 10500,
		vol: 0.036,
		season: 0.25,
		peakMonth: 4,
		drift: 0.028,
		keywordsKo: ['파 시세', '파 가격', '파 도매가', '파 (쪽파)', '쪽파', '쪽파 시세', '쪽파 가격'],
		keywordsEn: ['Green onion price', 'Green onion wholesale korea', 'Green onion (쪽파)']
	},
	{
		id: 'paprika',
		ko: '파프리카',
		en: 'Paprika',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '5kg',
		unitEn: '5kg',
		base: 47200,
		vol: 0.038,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'파프리카 시세',
			'파프리카 가격',
			'파프리카 도매가',
			'파프리카',
			'파프리카',
			'파프리카 시세',
			'파프리카 가격'
		],
		keywordsEn: ['Paprika price', 'Paprika wholesale korea', 'Paprika']
	},
	{
		id: 'green-chili-pepper',
		ko: '풋고추 (꽈리고추)',
		en: 'Green chili pepper (꽈리고추)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '4kg',
		unitEn: '4kg',
		base: 23200,
		vol: 0.035,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'풋고추 시세',
			'풋고추 가격',
			'풋고추 도매가',
			'풋고추 (꽈리고추)',
			'꽈리고추',
			'꽈리고추 시세',
			'꽈리고추 가격'
		],
		keywordsEn: [
			'Green chili pepper price',
			'Green chili pepper wholesale korea',
			'Green chili pepper (꽈리고추)'
		]
	},
	{
		id: 'green-chili-pepper-cucumber-flavor',
		ko: '풋고추 (오이맛고추)',
		en: 'Green chili pepper (오이맛고추)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 42700,
		vol: 0.069,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'풋고추 시세',
			'풋고추 가격',
			'풋고추 도매가',
			'풋고추 (오이맛고추)',
			'오이맛고추',
			'오이맛고추 시세',
			'오이맛고추 가격'
		],
		keywordsEn: [
			'Green chili pepper price',
			'Green chili pepper wholesale korea',
			'Green chili pepper (오이맛고추)'
		]
	},
	{
		id: 'green-chili-pepper-cheongyang',
		ko: '풋고추 (청양고추)',
		en: 'Green chili pepper (청양고추)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 51200,
		vol: 0.065,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'풋고추 시세',
			'풋고추 가격',
			'풋고추 도매가',
			'풋고추 (청양고추)',
			'청양고추',
			'청양고추 시세',
			'청양고추 가격'
		],
		keywordsEn: [
			'Green chili pepper price',
			'Green chili pepper wholesale korea',
			'Green chili pepper (청양고추)'
		]
	},
	{
		id: 'green-chili-pepper-4',
		ko: '풋고추',
		en: 'Green chili pepper',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 87000,
		vol: 0.023,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: [
			'풋고추 시세',
			'풋고추 가격',
			'풋고추 도매가',
			'풋고추',
			'풋고추',
			'풋고추 시세',
			'풋고추 가격'
		],
		keywordsEn: [
			'Green chili pepper price',
			'Green chili pepper wholesale korea',
			'Green chili pepper'
		]
	},
	{
		id: 'garlic-whole',
		ko: '피마늘 (난지)',
		en: 'Garlic, whole (난지)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 50000,
		vol: 0.028,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'피마늘 시세',
			'피마늘 가격',
			'피마늘 도매가',
			'피마늘 (난지)',
			'난지',
			'난지 시세',
			'난지 가격'
		],
		keywordsEn: ['Garlic, whole price', 'Garlic, whole wholesale korea', 'Garlic, whole (난지)']
	},
	{
		id: 'garlic-whole-2',
		ko: '피마늘 (한지)',
		en: 'Garlic, whole (한지)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 110000,
		vol: 0.031,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'피마늘 시세',
			'피마늘 가격',
			'피마늘 도매가',
			'피마늘 (한지)',
			'한지',
			'한지 시세',
			'한지 가격'
		],
		keywordsEn: ['Garlic, whole price', 'Garlic, whole wholesale korea', 'Garlic, whole (한지)']
	},
	{
		id: 'bell-pepper',
		ko: '피망 (청)',
		en: 'Bell pepper (청)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 73700,
		vol: 0.02,
		season: 0.25,
		peakMonth: 1,
		drift: 0.028,
		keywordsKo: ['피망 시세', '피망 가격', '피망 도매가', '피망 (청)', '청', '청 시세', '청 가격'],
		keywordsEn: ['Bell pepper price', 'Bell pepper wholesale korea', 'Bell pepper (청)']
	},
	{
		id: 'squash',
		ko: '호박 (애호박)',
		en: 'Squash (애호박)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '20개',
		unitEn: '20개',
		base: 35700,
		vol: 0.021,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'호박 시세',
			'호박 가격',
			'호박 도매가',
			'호박 (애호박)',
			'애호박',
			'애호박 시세',
			'애호박 가격'
		],
		keywordsEn: ['Squash price', 'Squash wholesale korea', 'Squash (애호박)']
	},
	{
		id: 'squash-zucchini',
		ko: '호박 (쥬키니)',
		en: 'Squash (쥬키니)',
		gradeKo: '상품',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 17000,
		vol: 0.024,
		season: 0.25,
		peakMonth: 8,
		drift: 0.028,
		keywordsKo: [
			'호박 시세',
			'호박 가격',
			'호박 도매가',
			'호박 (쥬키니)',
			'쥬키니',
			'쥬키니 시세',
			'쥬키니 가격'
		],
		keywordsEn: ['Squash price', 'Squash wholesale korea', 'Squash (쥬키니)']
	}
]

export const HISTORY_DAYS = 30
/** 장기 분석 기간(년) */
export const HISTORY_YEARS = 10

const EPOCH = Date.UTC(2013, 0, 1)
const DAY = 86400000
/** base 가 가리키는 기준 시점 — 이 날짜 부근이 base 값이 된다 */
const REFERENCE = Date.UTC(2026, 0, 1)

const noise = (seed: string) => {
	let h = 2166136261
	for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
	return ((h >>> 0) % 100000) / 100000 - 0.5
}

const dayIndexOf = (ms: number) => Math.floor((ms - EPOCH) / DAY)
const msOfIndex = (index: number) => EPOCH + index * DAY
export const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * 시세표 기준일.
 *
 * 매일 오전 자동 발행은 새벽/아침에 확정된 "전일" 시세를 보여주는 것이 안전하므로
 * 빌드 환경에서 IMUNFARM_PRICE_AS_OF=YYYY-MM-DD 를 넘기면 그 날짜 기준으로 굽는다.
 * 값이 없거나 잘못되면 기존처럼 빌드 당일 날짜를 쓴다.
 */
export const getPriceAsOfDate = () => {
	const raw = import.meta.env.IMUNFARM_PRICE_AS_OF
	if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [year, month, day] = raw.split('-').map(Number)
		return new Date(year, month - 1, day)
	}

	// 기본값은 한국 시간 기준 전일이다. 오전 자동 발행 때 아직 당일 경락가가
	// 확정되지 않는 경우가 있어, 완전히 지나간 거래일을 기본 기준으로 삼는다.
	const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
	return new Date(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - 1)
}

/** 품목별 누적 랜덤워크. 한 번만 계산해 재사용한다. */
const walks = new Map<string, Float64Array>()
const walkFor = (item: Item, until: number) => {
	const cached = walks.get(item.id)
	if (cached && cached.length > until) return cached
	const length = until + 2
	const walk = new Float64Array(length)
	let value = 0
	for (let d = 0; d < length; d++) {
		value = value * 0.972 + noise(`${item.id}:${d}`) * item.vol
		walk[d] = value
	}
	walks.set(item.id, walk)
	return walk
}

const roundTo = (value: number) => {
	const step = value > 100000 ? 500 : value > 10000 ? 100 : value > 1000 ? 10 : 5
	return Math.max(step, Math.round(value / step) * step)
}

/** 실데이터를 붙일 때 교체할 지점 */
export const priceAt = (item: Item, region: Region, dayIndex: number) => {
	const walk = walkFor(item, dayIndex)
	const date = new Date(msOfIndex(dayIndex))
	const dayOfYear =
		(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
			Date.UTC(date.getUTCFullYear(), 0, 1)) /
		DAY
	// 연중 계절 파동 (peakMonth 근처가 최고)
	const peak = ((item.peakMonth - 1) * 30.4 + 15) / 365
	const season = Math.cos((dayOfYear / 365 - peak) * Math.PI * 2) * item.season * 0.5
	// 장기 추세 (REFERENCE 시점을 base 로 두고 앞뒤로 환산)
	const years = (msOfIndex(dayIndex) - REFERENCE) / (DAY * 365.25)
	const trend = Math.pow(1 + item.drift, years)
	const regionScale = 1 + region.adj + noise(`${region.id}:${item.id}`) * 0.02
	return roundTo(item.base * trend * (1 + walk[dayIndex] + season) * regionScale)
}

export type PriceCell = { price: number; delta: number }
export type PriceTable = Record<string, Record<string, Record<string, PriceCell>>>
export type PriceData = { dates: string[]; table: PriceTable }

/** 최근 HISTORY_DAYS 일치 일별 시세 */
export const buildPriceData = (today = new Date()): PriceData => {
	const lastIndex = dayIndexOf(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
	const firstIndex = lastIndex - HISTORY_DAYS + 1
	const dates: string[] = []
	const table: PriceTable = {}

	for (let d = firstIndex; d <= lastIndex; d++) {
		const key = toKey(msOfIndex(d))
		dates.push(key)
		table[key] = {}
		for (const region of REGIONS) {
			table[key][region.id] = {}
			for (const item of ITEMS) {
				const price = priceAt(item, region, d)
				const prev = priceAt(item, region, d - 1)
				const delta = prev ? Math.round(((price - prev) / prev) * 1000) / 10 : 0
				table[key][region.id][item.id] = { price, delta }
			}
		}
	}
	return { dates, table }
}

export type Benchmark = {
	yearsAgo: number
	year: number
	avg: number
	diffPct: number
}

export type ItemAnalysis = {
	/** 최근가 */
	current: number
	/** 최근 30일 평균·최저·최고 */
	windowAvg: number
	windowMin: number
	windowMax: number
	/** 30일 변동률 */
	trend30: number
	/** 최근 30일 변동성 (표준편차 / 평균) */
	volatility: number
	/** 1·3·5·10년 전 같은 기간(±15일) 평균과 비교 */
	benchmarks: Benchmark[]
	/** 최근 1년(365일) 안에서 현재가의 백분위 (0~100) */
	percentile: number
	/** 월별 계절지수 (10년 평균 = 100) */
	seasonality: number[]
	/** 이번 달 / 다음 달 계절지수 */
	monthIndex: number
	nextMonthIndex: number
	/** 최근 60개월 월평균 */
	monthly: { ym: string; avg: number }[]
	/** 10년 연평균 상승률 (%) */
	cagr: number
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / (values.length || 1)

/** 지정한 날짜를 중심으로 ±window 일 평균 */
const periodAvg = (item: Item, region: Region, centerIndex: number, window: number) => {
	const values: number[] = []
	for (let d = centerIndex - window; d <= centerIndex + window; d++) {
		if (d < 1) continue
		values.push(priceAt(item, region, d))
	}
	return Math.round(mean(values))
}

export const buildAnalysis = (item: Item, region: Region, today = new Date()): ItemAnalysis => {
	const lastIndex = dayIndexOf(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
	const recent: number[] = []
	for (let d = lastIndex - HISTORY_DAYS + 1; d <= lastIndex; d++)
		recent.push(priceAt(item, region, d))

	const current = recent[recent.length - 1]
	const windowAvg = Math.round(mean(recent))
	const windowMin = Math.min(...recent)
	const windowMax = Math.max(...recent)
	const trend30 = Math.round(((current - recent[0]) / recent[0]) * 1000) / 10
	const variance = mean(recent.map((v) => (v - windowAvg) ** 2))
	const volatility = Math.round((Math.sqrt(variance) / windowAvg) * 1000) / 10

	// 같은 기간(±15일) 기준 과거 비교
	const thisPeriodAvg = periodAvg(item, region, lastIndex, 15)
	const benchmarks: Benchmark[] = [1, 3, 5, 10].map((yearsAgo) => {
		const center = lastIndex - Math.round(yearsAgo * 365.25)
		const avg = periodAvg(item, region, center, 15)
		return {
			yearsAgo,
			year: today.getFullYear() - yearsAgo,
			avg,
			diffPct: avg ? Math.round(((thisPeriodAvg - avg) / avg) * 1000) / 10 : 0
		}
	})

	// 최근 1년 안에서의 위치 — 장기 상승 추세 때문에 10년 표본은 항상 상단에 붙는다
	const sample: number[] = []
	for (let d = lastIndex - 364; d <= lastIndex; d++)
		if (d > 0) sample.push(priceAt(item, region, d))
	const below = sample.filter((v) => v < current).length
	const percentile = Math.round((below / (sample.length || 1)) * 100)

	// 월별 계절지수 + 최근 60개월 월평균
	const monthSums = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }))
	const monthlyMap = new Map<string, { sum: number; count: number }>()
	const startIndex = Math.max(1, lastIndex - Math.round(HISTORY_YEARS * 365.25))
	for (let d = startIndex; d <= lastIndex; d++) {
		const date = new Date(msOfIndex(d))
		const month = date.getUTCMonth()
		const price = priceAt(item, region, d)
		monthSums[month].sum += price
		monthSums[month].count++
		const ym = `${date.getUTCFullYear()}-${String(month + 1).padStart(2, '0')}`
		const bucket = monthlyMap.get(ym) ?? { sum: 0, count: 0 }
		bucket.sum += price
		bucket.count++
		monthlyMap.set(ym, bucket)
	}
	const overall = mean(monthSums.map((m) => (m.count ? m.sum / m.count : 0)))
	const seasonality = monthSums.map((m) =>
		m.count && overall ? Math.round((m.sum / m.count / overall) * 100) : 100
	)
	const monthly = Array.from(monthlyMap.entries())
		.map(([ym, b]) => ({ ym, avg: Math.round(b.sum / b.count) }))
		.slice(-60)

	const thisMonth = today.getMonth()
	const decadeAgo = periodAvg(item, region, Math.max(1, lastIndex - Math.round(10 * 365.25)), 15)
	const cagr = decadeAgo
		? Math.round((Math.pow(thisPeriodAvg / decadeAgo, 1 / 10) - 1) * 1000) / 10
		: 0

	return {
		current,
		windowAvg,
		windowMin,
		windowMax,
		trend30,
		volatility,
		benchmarks,
		percentile,
		seasonality,
		monthIndex: seasonality[thisMonth],
		nextMonthIndex: seasonality[(thisMonth + 1) % 12],
		monthly,
		cagr
	}
}

export const formatDate = (iso: string) => iso.replace(/-/g, '.')
