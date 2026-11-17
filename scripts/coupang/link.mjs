// 쿠팡 파트너스 Open API로 새 상품 제휴 링크 만들기 (파트너스 웹사이트에 들어가지 않음)
// 사진은 넣지 않는다: API 사진 주소는 약 1시간 뒤 만료된다. 박스는 글자형으로 쓴다.
//
//   node --env-file=.env scripts/coupang/link.mjs search "제주 감귤 5kg" [개수]
//   node --env-file=.env scripts/coupang/link.mjs link <productId> <itemId> <vendorItemId>
//
// 검색은 1시간 10회 제한이라 한 번에 필요한 검색어만 쓴다. 키는 .env에서만 읽는다.
import { deeplink, searchProducts } from './api.mjs'

const SUB_ID = 'imunfarm'
const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'search') {
	const [keyword, limit = '10'] = args
	if (!keyword) throw new Error('검색어가 필요합니다')
	const r = await searchProducts(keyword, Number(limit), SUB_ID)
	for (const p of r.productData ?? []) {
		const q = new URL(p.productUrl).searchParams
		console.log(
			[
				p.productId,
				q.get('itemId'),
				q.get('vendorItemId'),
				p.productPrice,
				p.isRocket ? '로켓' : '',
				p.productName
			].join('\t')
		)
	}
} else if (cmd === 'link') {
	const [productId, itemId, vendorItemId] = args
	if (!productId) throw new Error('productId가 필요합니다')
	const u = new URL(`https://www.coupang.com/vp/products/${productId}`)
	if (itemId) u.searchParams.set('itemId', itemId)
	if (vendorItemId) u.searchParams.set('vendorItemId', vendorItemId)
	const r = await deeplink([u.toString()], SUB_ID)
	const d = (Array.isArray(r) ? r : r.data)?.[0]
	if (!d?.shortenUrl) throw new Error(`딥링크 실패: ${JSON.stringify(r).slice(0, 300)}`)
	console.log(JSON.stringify({ productUrl: u.toString(), url: d.shortenUrl, subId: SUB_ID }))
} else {
	console.log(
		'사용법: link.mjs search "<검색어>" [개수] | link.mjs link <productId> <itemId> <vendorItemId>'
	)
}
