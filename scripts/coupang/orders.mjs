#!/usr/bin/env node
/**
 * 최근 N일 쿠팡 파트너스 주문 상품 이름 (아침 루틴 글 주제 신호용). 화면(stdout)에만 출력하고 파일로 남기지 않는다.
 * 금액은 넣지 않는다 — 수요가 있는 상품이 무엇인지만 본다. 우리 링크가 아닌 상품도 함께 팔린다(링크로 들어가 다른 상품 구매).
 *   node scripts/coupang/orders.mjs [일수=30]
 */
import { report } from './api.mjs'

const DAY = 86400000
const days = Math.max(1, Math.min(90, Number(process.argv[2]) || 30))
const kst = new Date(Date.now() + 9 * 3600 * 1000)
const today = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()))
const end = new Date(today - DAY)
const start = new Date(today - days * DAY)
const rows = (d) => (Array.isArray(d) ? d : (d?.data ?? []))

const orders = rows(await report('orders', start, end))
const byName = new Map()
for (const o of orders) {
	const name = String(o.productName ?? '').trim()
	if (!name) continue
	const hit = byName.get(name) ?? { count: 0, last: '' }
	hit.count += Number(o.quantity) || 1
	if (String(o.date) > hit.last) hit.last = String(o.date)
	byName.set(name, hit)
}
const list = [...byName.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last))
console.log(`쿠팡 주문 상품 (최근 ${days}일, ${list.length}종)`)
for (const [name, v] of list)
	console.log(`- ${v.last.slice(4, 6)}/${v.last.slice(6)} ${name.slice(0, 60)}${v.count > 1 ? ` ×${v.count}` : ''}`)
