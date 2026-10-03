#!/usr/bin/env node
/**
 * 쿠팡 파트너스 실적 요약 (Hermes 07시 보고용). 화면(stdout)에만 출력하고 파일로 남기지 않는다.
 *   node scripts/coupang/report.mjs
 */
import { report } from './api.mjs'

const DAY = 86400000
const kstToday = () => {
	const d = new Date(Date.now() + 9 * 3600 * 1000)
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
const key = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const won = (v) => Math.round(v).toLocaleString('ko-KR') + '원'
const rows = (d) => (Array.isArray(d) ? d : (d?.data ?? []))

const today = kstToday()
const yesterday = new Date(today - DAY)
const weekStart = new Date(today - 7 * DAY)
const monthStart = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), 1))
const from = weekStart < monthStart ? weekStart : monthStart

const [comm, orders] = await Promise.all([
	report('commission', from, yesterday).then(rows),
	report('orders', yesterday, yesterday).then(rows)
])

const sum = (list, f) => list.reduce((a, r) => a + (Number(r[f]) || 0), 0)
const between = (a, b) => comm.filter((r) => r.date >= key(a) && r.date <= key(b))
const y = between(yesterday, yesterday)
const w = between(weekStart, yesterday)
const m = between(monthStart, yesterday)

const lines = [
	`쿠팡 파트너스 (${key(yesterday).slice(4, 6)}/${key(yesterday).slice(6)})`,
	`어제: 클릭 ${sum(y, 'click')} · 주문 ${sum(y, 'order')} · 취소 ${sum(y, 'cancel')} · 수수료 ${won(sum(y, 'commission'))}`,
	`최근 7일: 클릭 ${sum(w, 'click')} · 주문 ${sum(w, 'order')} · 수수료 ${won(sum(w, 'commission'))}`,
	`${+key(yesterday).slice(4, 6)}월 누적: 클릭 ${sum(m, 'click')} · 수수료 ${won(sum(m, 'commission'))}`
]
if (orders.length)
	lines.push(
		'어제 주문: ' +
			orders
				.slice(0, 5)
				.map((o) => `${String(o.productName).slice(0, 24)} ${won(o.commission)}`)
				.join(' / ')
	)
console.log(lines.join('\n'))
