/**
 * 내 땅 도구: 시설 설치비·보조·회수 기간 (/tools/farmland-crop-finder/).
 *
 * 단동 비닐하우스 ㎡당 단가
 * - 25,000원: 2026년 농림축산식품사업 시행지침서 「고추비가림재배시설 지원」 기준단가 (관수·자동개폐기·차광망 포함), 267쪽
 * - 33,000원: 군산시 2026 원예시설 지원 공고 기준단가 (단동)
 * 지자체 단동 하우스 지원은 보통 보조 50%·자부담 50% (군산 2026, 고창 2024). 시군마다 다르다
 *
 * 유리온실(스마트팜) ㎡당 단가
 * - 300,000원: 2025 스마트팜ICT융복합확산(온실신축) 사업시행지침 「철골유리온실 3,000백만원/ha」 (예시 기준, 부지 조성·보일러 제외)
 * - 2026 시행지침서: 국고 20%, 지방비 30%, 융자 30% 이내, 자부담 20%. 0.3ha 이상, 재배·온실 경력 3년 이상
 *
 * 회수 기간: 농촌진흥청 소득(총수입 − 경영비)의 경영비에는 기존 시설의 해마다 감가상각비(영농시설상각비)가 이미 들어 있다.
 * 새로 짓는 설치비를 따로 나누므로 상각비를 소득에 다시 더한 '한 해 현금'으로 나눈다 (두 번 빼지 않게)
 */
import type { FarmMode } from './farmland-layout'

export type BuildCost = {
	/** ㎡당 원 (범위면 lo–hi) */
	lo: number
	hi: number
	/** 보조 비율 (국고+지방비) */
	grant: number
	/** 융자 비율 (갚아야 하는 돈) */
	loan: number
	/** 신청할 수 있는 최소 시설 면적 ㎡ (없으면 0) */
	minArea: number
	src: { ko: string; en: string }
	note: { ko: string; en: string }
}

export const BUILD_COST: Partial<Record<FarmMode, BuildCost>> = {
	house: {
		lo: 25000,
		hi: 33000,
		grant: 0.5,
		loan: 0,
		minArea: 330,
		src: {
			ko: '농식품부 2026 시행지침서 고추비가림재배시설 기준단가 ㎡당 25,000원 · 군산시 2026 단동 기준단가 ㎡당 33,000원',
			en: 'MAFRA 2026 guideline (rain-shelter house) ₩25,000/㎡ · Gunsan 2026 single-span ₩33,000/㎡'
		},
		note: {
			ko: '보조는 시군 공고마다 다르며 보통 50%입니다 (군산 2026, 고창 2024).',
			en: 'Local grants vary by county; 50% is typical (Gunsan 2026, Gochang 2024).'
		}
	},
	smart: {
		lo: 300000,
		hi: 300000,
		grant: 0.5,
		loan: 0.3,
		minArea: 3000,
		src: {
			ko: '농식품부 2025 스마트팜ICT융복합확산(온실신축) 지침 철골유리온실 ha당 30억 원 (예시 단가, 부지 조성·보일러 제외) · 2026 시행지침서 국고 20%·지방비 30%·융자 30%·자부담 20%',
			en: 'MAFRA 2025 smart-farm glasshouse ₩3bn/ha (example; site works and boiler excluded) · 2026 split: 20% national, 30% local, 30% loan, 20% own'
		},
		note: {
			ko: '온실신축 지원은 0.3ha 이상, 재배·온실 경력 3년 이상만 신청할 수 있습니다.',
			en: 'The new-glasshouse grant needs 0.3 ha or more and 3+ years of growing experience.'
		}
	}
}

/** 설치비 범위와 회수 기간. yearlyCash = 한 해 현금 (소득 + 시설상각비) 원 */
export function payback(cost: BuildCost, area: number, yearlyCash: number) {
	const total: [number, number] = [cost.lo * area, cost.hi * area]
	// 내가 대는 돈 = 자부담 + 융자 (융자도 갚아야 한다)
	const mine: [number, number] = [total[0] * (1 - cost.grant), total[1] * (1 - cost.grant)]
	const years = (v: number) => (yearlyCash > 0 ? v / yearlyCash : null)
	return {
		total,
		mine,
		withGrant: [years(mine[0]), years(mine[1])] as [number | null, number | null],
		noGrant: [years(total[0]), years(total[1])] as [number | null, number | null],
		eligible: area >= cost.minArea
	}
}
