/**
 * 지역별·날짜별 주요 농산물 도매 시세.
 *
 * 값은 aT KAMIS 가격정보(공공데이터포털 한국농수산식품유통공사 API)의 실제 조사값이다.
 * - 일별: 기간별 중도매인 가격정보 (src/data/generated/kamis/daily.json, 최근 400일)
 * - 월별: 연월별 도·소매가격정보 (src/data/generated/kamis/monthly.json, 최근 10년)
 * 두 파일은 scripts/kamis/fetch.mjs 가 받아 저장하고, 빌드는 저장된 파일만 읽는다.
 * 품목별 KAMIS 코드는 src/data/kamis-items.json 에 있다.
 */
import daily from './generated/kamis/daily.json'
import monthlyFile from './generated/kamis/monthly.json'
import kamisItems from './kamis-items.json'

export type Region = {
	id: string
	ko: string
	en: string
	/** KAMIS 시군구 코드 */
	sgg: string
}
export type Item = {
	id: string
	ko: string
	en: string
	gradeKo: string
	gradeEn: string
	unitKo: string
	unitEn: string
	keywordsKo: string[]
	keywordsEn: string[]
}
export const REGIONS: Region[] = [
	{ id: 'seoul', ko: '서울', en: 'Seoul', sgg: '1101' },
	{ id: 'busan', ko: '부산', en: 'Busan', sgg: '2100' },
	{ id: 'daegu', ko: '대구', en: 'Daegu', sgg: '2200' },
	{ id: 'gwangju', ko: '광주', en: 'Gwangju', sgg: '2401' },
	{ id: 'daejeon', ko: '대전', en: 'Daejeon', sgg: '2501' }
]

const RAW_ITEMS: Item[] = [
	{
		id: 'mandarin',
		ko: '감귤 (시설)',
		en: 'Mandarin (시설)',
		gradeKo: 'M과',
		gradeEn: 'M',
		unitKo: '3kg',
		unitEn: '3kg',
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

type ItemOverride = { codes: string[]; ko?: string; en?: string }
const OVERRIDES = kamisItems as Record<string, ItemOverride>

export const ITEMS: Item[] = RAW_ITEMS.map((item) => {
	const o = OVERRIDES[item.id]
	return o ? { ...item, ko: o.ko ?? item.ko, en: o.en ?? item.en } : item
})

/** 차트·표에 보여 주는 최근 조사일 수 */
export const HISTORY_DAYS = 30
/** 장기 분석 기간(년) */
export const HISTORY_YEARS = 10
/** 마지막 조사가 이보다 오래되면 '제철 아님(최근 조사 없음)'으로 본다 */
const STALE_DAYS = 7
/** 주말·연휴 정도만 이어 쓴다. 이보다 오래 비면 조사 없음으로 둔다 */
const CARRY_LIMIT_DAYS = 10

type Series = Record<string, Record<string, Record<string, number>>>
const DAILY = daily as unknown as { lastDate: string; series: Series }
const MONTHLY = monthlyFile as unknown as { series: Series }

const DAY = 86400000
const isoOf = (ymd: string) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
const msOf = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
export const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const keyOfDate = (d: Date) => toKey(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))

const codesOf = (item: Item) => OVERRIDES[item.id]?.codes ?? []

/** 품목·지역의 조사값 (iso 날짜 → 가격). 품종이 철마다 바뀌는 품목은 코드 순서대로 이어 붙인다. */
const dailyCache = new Map<string, Map<string, number>>()
const dailyOf = (item: Item, region: Region) => {
	const cacheKey = `${item.id}|${region.id}`
	const cached = dailyCache.get(cacheKey)
	if (cached) return cached
	const merged = new Map<string, number>()
	for (const code of codesOf(item)) {
		const byDate = DAILY.series[code]?.[region.sgg] ?? {}
		for (const [ymd, price] of Object.entries(byDate)) {
			const iso = isoOf(ymd)
			if (!merged.has(iso)) merged.set(iso, price)
		}
	}
	const sorted = new Map([...merged.entries()].sort(([a], [b]) => (a < b ? -1 : 1)))
	dailyCache.set(cacheKey, sorted)
	return sorted
}

const monthlyCache = new Map<string, Map<string, number>>()
const monthlyOf = (item: Item, region: Region) => {
	const cacheKey = `${item.id}|${region.id}`
	const cached = monthlyCache.get(cacheKey)
	if (cached) return cached
	const merged = new Map<string, number>()
	for (const code of codesOf(item)) {
		const byYm = MONTHLY.series[code]?.[region.sgg] ?? {}
		for (const [ym, price] of Object.entries(byYm)) {
			const key = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
			if (!merged.has(key)) merged.set(key, price)
		}
	}
	const sorted = new Map([...merged.entries()].sort(([a], [b]) => (a < b ? -1 : 1)))
	monthlyCache.set(cacheKey, sorted)
	return sorted
}

/** 데이터가 있는 모든 조사일 (오름차순) */
const SURVEY_DATES = (() => {
	const set = new Set<string>()
	for (const bySgg of Object.values(DAILY.series))
		for (const byDate of Object.values(bySgg))
			for (const ymd of Object.keys(byDate)) set.add(isoOf(ymd))
	return [...set].sort()
})()

const keysCache = new Map<Map<string, number>, string[]>()
const keysOf = (series: Map<string, number>) => {
	let keys = keysCache.get(series)
	if (!keys) {
		keys = [...series.keys()]
		keysCache.set(series, keys)
	}
	return keys
}

/** date 당일 또는 그 이전 가장 가까운 조사값. CARRY_LIMIT_DAYS 넘게 비면 null. */
const valueOn = (item: Item, region: Region, iso: string) => {
	const series = dailyOf(item, region)
	const keys = keysOf(series)
	let lo = 0
	let hi = keys.length - 1
	let found = -1
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		if (keys[mid] <= iso) {
			found = mid
			lo = mid + 1
		} else hi = mid - 1
	}
	if (found < 0) return null
	const date = keys[found]
	if (msOf(iso) - msOf(date) > CARRY_LIMIT_DAYS * DAY) return null
	return { price: series.get(date) as number, date }
}

/** 기준일까지 최근 HISTORY_DAYS 개 조사일 (+ 전일비 계산용 하루) */
const windowDates = (asOf: string) =>
	SURVEY_DATES.filter((d) => d <= asOf).slice(-(HISTORY_DAYS + 1))

/**
 * 시세표 기준일 = 저장된 데이터의 마지막 조사일.
 * IMUNFARM_PRICE_AS_OF=YYYY-MM-DD 를 넘기면 그 날짜(이전 조사일)를 기준으로 굽는다.
 */
export const getPriceAsOfDate = () => {
	const raw = import.meta.env.IMUNFARM_PRICE_AS_OF
	const last = isoOf(DAILY.lastDate)
	const wanted =
		typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw < last ? raw : last
	const [year, month, day] = wanted.split('-').map(Number)
	return new Date(year, month - 1, day)
}

/** 품목의 마지막 조사일 (모든 지역 중 가장 늦은 날) */
export const getItemStatus = (item: Item, today = getPriceAsOfDate()) => {
	const asOf = keyOfDate(today)
	let last: string | null = null
	for (const region of REGIONS)
		for (const d of dailyOf(item, region).keys()) if (d <= asOf && (!last || d > last)) last = d
	const stale = !last || msOf(asOf) - msOf(last) > STALE_DAYS * DAY
	return { lastSurvey: last, stale }
}

export type PriceCell = { price: number | null; delta: number | null }
export type PriceTable = Record<string, Record<string, Record<string, PriceCell>>>
export type PriceData = { dates: string[]; table: PriceTable }

/** 최근 HISTORY_DAYS 개 조사일의 시세. 조사가 빈 날은 직전 조사값을 이어 쓴다. */
const priceDataCache = new Map<string, PriceData>()
export const buildPriceData = (today = getPriceAsOfDate()): PriceData => {
	const asOf = keyOfDate(today)
	const cached = priceDataCache.get(asOf)
	if (cached) return cached
	const window = windowDates(asOf)
	const dates = window.slice(1)
	const table: PriceTable = {}
	for (let i = 0; i < dates.length; i++) {
		const date = dates[i]
		const prevDate = window[i]
		table[date] = {}
		for (const region of REGIONS) {
			table[date][region.id] = {}
			for (const item of ITEMS) {
				const price = valueOn(item, region, date)?.price ?? null
				const prev = valueOn(item, region, prevDate)?.price ?? null
				const delta = price != null && prev ? Math.round(((price - prev) / prev) * 1000) / 10 : null
				table[date][region.id][item.id] = { price, delta }
			}
		}
	}
	const data = { dates, table }
	priceDataCache.set(asOf, data)
	return data
}

export type Benchmark = {
	yearsAgo: number
	year: number
	avg: number | null
	diffPct: number | null
}

export type ItemAnalysis = {
	/** 최근가 (조사가 없으면 null) */
	current: number | null
	/** 최근가의 조사일 */
	currentDate: string | null
	/** 최근 30개 조사일 평균·최저·최고 */
	windowAvg: number | null
	windowMin: number | null
	windowMax: number | null
	/** 30개 조사일 변동률 */
	trend30: number
	/** 최근 30개 조사일 변동성 (표준편차 / 평균) */
	volatility: number
	/** 1·3·5·10년 전 같은 달 평균과 비교 */
	benchmarks: Benchmark[]
	/** 최근 1년 안에서 현재가의 백분위 (0~100) */
	percentile: number | null
	/** 월별 계절지수 (10년 평균 = 100, 조사 없는 달은 null) */
	seasonality: (number | null)[]
	/** 이번 달 / 다음 달 계절지수 */
	monthIndex: number | null
	nextMonthIndex: number | null
	/** 최근 60개월 월평균 */
	monthly: { ym: string; avg: number }[]
	/** 10년 연평균 상승률 (%) */
	cagr: number | null
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / (values.length || 1)
const pctDiff = (now: number, then: number) => Math.round(((now - then) / then) * 1000) / 10

export const buildAnalysis = (
	item: Item,
	region: Region,
	today = getPriceAsOfDate()
): ItemAnalysis => {
	const asOf = keyOfDate(today)
	const series = dailyOf(item, region)
	const monthly = monthlyOf(item, region)
	const dates = windowDates(asOf).slice(1)

	const recent = dates
		.map((d) => valueOn(item, region, d)?.price)
		.filter((v): v is number => v != null)
	const last = valueOn(item, region, asOf)
	const current = last?.price ?? null
	const windowAvg = recent.length ? Math.round(mean(recent)) : null
	const windowMin = recent.length ? Math.min(...recent) : null
	const windowMax = recent.length ? Math.max(...recent) : null
	const trend30 = recent.length > 1 ? pctDiff(recent[recent.length - 1], recent[0]) : 0
	const variance = windowAvg ? mean(recent.map((v) => (v - windowAvg) ** 2)) : 0
	const volatility = windowAvg ? Math.round((Math.sqrt(variance) / windowAvg) * 1000) / 10 : 0

	// 이번 기간 = 기준일 앞 30일 실제 조사값 평균
	const thisPeriod = [...series.entries()]
		.filter(([d]) => d <= asOf && msOf(asOf) - msOf(d) < 30 * DAY)
		.map(([, v]) => v)
	const thisPeriodAvg = thisPeriod.length ? mean(thisPeriod) : null

	const month = today.getMonth()
	const ymOf = (yearsAgo: number) =>
		`${today.getFullYear() - yearsAgo}-${String(month + 1).padStart(2, '0')}`
	const benchmarks: Benchmark[] = [1, 3, 5, 10].map((yearsAgo) => {
		const avg = monthly.get(ymOf(yearsAgo)) ?? null
		return {
			yearsAgo,
			year: today.getFullYear() - yearsAgo,
			avg,
			diffPct: avg && thisPeriodAvg ? pctDiff(thisPeriodAvg, avg) : null
		}
	})

	// 최근 1년 실제 조사값 안에서의 위치
	const yearValues = [...series.entries()]
		.filter(([d]) => d <= asOf && msOf(asOf) - msOf(d) < 365 * DAY)
		.map(([, v]) => v)
	// 같은 값은 절반만 아래로 센다 (최저가와 같으면 0이 아니라 하위 구간으로 보이게)
	const percentile =
		current != null && yearValues.length
			? Math.round(
					((yearValues.filter((v) => v < current).length +
						yearValues.filter((v) => v === current).length / 2) /
						yearValues.length) *
						100
				)
			: null

	// 월별 계절지수: 10년 같은 달 평균 / 전체 평균
	const monthBuckets = Array.from({ length: 12 }, () => [] as number[])
	for (const [ym, avg] of monthly) monthBuckets[+ym.slice(5, 7) - 1].push(avg)
	const monthAvgs = monthBuckets.map((b) => (b.length ? mean(b) : null))
	const present = monthAvgs.filter((v): v is number => v != null)
	const overall = present.length ? mean(present) : null
	const seasonality = monthAvgs.map((v) =>
		v != null && overall ? Math.round((v / overall) * 100) : null
	)

	const monthlyList = [...monthly.entries()].map(([ym, avg]) => ({ ym, avg })).slice(-60)
	const decadeAgo = monthly.get(ymOf(10)) ?? null
	const cagr =
		decadeAgo && thisPeriodAvg
			? Math.round((Math.pow(thisPeriodAvg / decadeAgo, 1 / 10) - 1) * 1000) / 10
			: null

	return {
		current,
		currentDate: last?.date ?? null,
		windowAvg,
		windowMin,
		windowMax,
		trend30,
		volatility,
		benchmarks,
		percentile,
		seasonality,
		monthIndex: seasonality[month],
		nextMonthIndex: seasonality[(month + 1) % 12],
		monthly: monthlyList,
		cagr
	}
}

export type ItemSeries = {
	/** 지역별 일별 조사값 [iso, 가격] (최근 400일) */
	daily: Record<string, [string, number][]>
	/** 지역별 월평균 [YYYY-MM, 가격] (저장된 전체) */
	monthly: Record<string, [string, number][]>
}

/** 품목 페이지 차트용 원자료 */
export const buildItemSeries = (item: Item, today = getPriceAsOfDate()): ItemSeries => {
	const asOf = keyOfDate(today)
	const daily: ItemSeries['daily'] = {}
	const monthly: ItemSeries['monthly'] = {}
	for (const region of REGIONS) {
		daily[region.id] = [...dailyOf(item, region).entries()].filter(([d]) => d <= asOf)
		monthly[region.id] = [...monthlyOf(item, region).entries()].filter(
			([ym]) => ym <= asOf.slice(0, 7)
		)
	}
	return { daily, monthly }
}

export const formatDate = (iso: string) => iso.replace(/-/g, '.')
