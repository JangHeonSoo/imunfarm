/**
 * 내 땅 도구 안에서 보기: 하우스·유리온실·밭 안에 그리는 시설과 설명.
 *
 * 설치비 포함 여부
 * - base: 2026년 농림축산식품사업 시행지침서 「고추비가림재배시설 지원」 기준단가 ㎡당 25,000원은
 *   관수·자동개폐기·차광망을 포함한다 (267쪽, farmland-cost.ts 와 같은 근거)
 * - extra: 위 기준단가에 적힌 항목이 아닌 것 (온풍기·유동팬·보온커튼)
 * - ict: 스마트팜 ICT 융복합 지원 대상 장비 — 환풍기, 천창, 차광·보온커튼, CO2, 양액재배 제어장비,
 *   외부 풍속·조도·실내 온습도 센서 (군산시 스마트팜 ICT 사업 공고, 센서·제어기는 KS X 3266)
 * - boilerOut: 2025 스마트팜ICT융복합확산(온실신축) 지침 철골유리온실 ha당 30억 원은 부지 조성·보일러 제외
 *
 * 장비 모양·자리·개수는 이해를 돕는 그림이다. 공식 치수를 찾지 못해 화면에 숫자를 적지 않는다
 * (유동팬 간격, 레일 파이프 굵기·간격, 거터·벤치 높이, 덕트 자리 등).
 */

export type EquipId =
	| 'vent'
	| 'shade'
	| 'water'
	| 'fan'
	| 'curtain'
	| 'heater'
	| 'sensor'
	| 'panel'
	| 'roofvent'
	| 'screen'
	| 'rail'
	| 'boiler'
	| 'trolley'
	| 'fogger'
	| 'feed'
	| 'co2'
	| 'pump'

export type EquipCost = 'base' | 'extra' | 'ict' | 'boilerOut'

type T = { ko: string; en: string }

export type EquipInfo = { name: T; role: T }

export const EQUIP_INFO: Record<EquipId, EquipInfo> = {
	vent: {
		name: { ko: '측창 개폐기', en: 'Side-vent winder' },
		role: {
			ko: '모터가 옆 비닐을 말아 올리고 내립니다. 한낮에 더워지면 열어 바람을 들이고, 밤에는 닫아 열을 가둡니다.',
			en: 'A motor rolls the side film up and down: open to let air through when it gets hot, closed at night to keep the heat in.'
		}
	},
	shade: {
		name: { ko: '차광망', en: 'Shade net' },
		role: {
			ko: '지붕 위에 덮어 한여름 햇빛을 줄입니다. 잎이 타거나 하우스 안이 너무 뜨거워지는 것을 막습니다.',
			en: 'Laid over the roof to cut midsummer sun, so leaves do not scorch and the house does not overheat.'
		}
	},
	water: {
		name: { ko: '관수 (여과기·주관·점적 호스)', en: 'Irrigation (filter, main, drip lines)' },
		role: {
			ko: '물을 여과기로 거른 뒤 주관으로 보내고, 줄마다 깐 점적 호스로 포기 밑에 조금씩 떨어뜨립니다. 비료를 물에 타서 함께 줄 수도 있습니다.',
			en: 'Water is filtered, sent down the main pipe and dripped at each plant through a line on every row. Fertiliser can go in with it.'
		}
	},
	fan: {
		name: { ko: '순환팬', en: 'Circulation fan' },
		role: {
			ko: '지붕 밑에 매달아 안의 공기를 한 방향으로 돌립니다. 위아래·앞뒤 온도와 습도를 고르게 합니다.',
			en: 'Hung under the roof to keep the air moving in one direction, evening out temperature and humidity.'
		}
	},
	curtain: {
		name: { ko: '보온커튼', en: 'Thermal curtain' },
		role: {
			ko: '겨울밤에 펼쳐 안쪽을 한 겹 더 덮어 열이 빠져나가지 않게 합니다. 낮에는 옆으로 말아 둡니다. 겨울에 키울 때 필요합니다.',
			en: 'Drawn on winter nights as an extra inner layer that holds the heat; rolled to the side by day. Needed for winter growing.'
		}
	},
	heater: {
		name: { ko: '온풍난방기·덕트', en: 'Hot-air heater and duct' },
		role: {
			ko: '데운 공기를 비닐 덕트에 불어 넣어 하우스 길이 전체에 고루 보냅니다. 겨울에 키울 때 필요합니다.',
			en: 'Blows warm air into a plastic duct that carries it the full length of the house. Needed for winter growing.'
		}
	},
	sensor: {
		name: { ko: '환경 센서', en: 'Climate sensor' },
		role: {
			ko: '가운데쯤 작물 높이에서 온도·습도를 잽니다 (유리온실은 이산화탄소도). 이 값으로 창·커튼·난방을 자동으로 움직입니다.',
			en: 'Measures temperature and humidity (and CO₂ in a glasshouse) at crop height near the middle; vents, curtains and heating run off it.'
		}
	},
	panel: {
		name: { ko: '환경 제어기', en: 'Climate controller' },
		role: {
			ko: '센서 값을 받아 창·커튼·난방·관수를 정해 둔 대로 켜고 끕니다. 휴대폰으로 보고 조작하게 이어 두기도 합니다.',
			en: 'Takes the sensor readings and runs vents, curtains, heating and watering to your settings, often from a phone.'
		}
	},
	roofvent: {
		name: { ko: '천창', en: 'Roof vents' },
		role: {
			ko: '지붕 유리를 들어 올려 위로 모인 더운 공기를 내보냅니다. 비·바람 센서와 이어 두면 저절로 닫힙니다.',
			en: 'Roof panes lift to let the hot air out at the top; linked to rain and wind sensors they close by themselves.'
		}
	},
	screen: {
		name: { ko: '보온·차광 스크린', en: 'Energy and shade screen' },
		role: {
			ko: '처마 높이에 수평으로 펼치는 천입니다. 겨울밤에는 열을 가두고 여름 한낮에는 햇빛을 가립니다. 안쪽 절반만 펼친 모습입니다.',
			en: 'A cloth drawn flat at gutter height: holds heat on winter nights, shades at summer noon. Shown drawn over the far half.'
		}
	},
	rail: {
		name: { ko: '온수 난방관 (레일)', en: 'Heating pipe rail' },
		role: {
			ko: '보일러에서 데운 물이 흘러 아래쪽부터 데웁니다. 작업 대차가 이 관 위를 달립니다.',
			en: 'Hot water from the boiler runs through it to warm the crop from below, and the work trolley rides on it.'
		}
	},
	boiler: {
		name: { ko: '보일러 온수관', en: 'Boiler supply pipe' },
		role: {
			ko: '온실 밖 보일러에서 데운 물을 줄마다 난방관으로 나눠 보냅니다.',
			en: 'Takes hot water from the boiler outside and splits it into each heating pipe.'
		}
	},
	trolley: {
		name: { ko: '작업 대차', en: 'Pipe-rail trolley' },
		role: {
			ko: '레일 위를 밀고 다니며 높은 곳의 줄기를 내리고 열매를 땁니다.',
			en: 'Pushed along the rails to lower the stems and pick the fruit up high.'
		}
	},
	fogger: {
		name: { ko: '포그 (물안개 분무)', en: 'Fogging line' },
		role: {
			ko: '여름 한낮에 아주 고운 물안개를 뿜어 온도를 낮추고 습도를 올립니다.',
			en: 'Sprays a fine mist at summer noon to cool the air and raise humidity.'
		}
	},
	feed: {
		name: { ko: '양액기 (A·B 통)', en: 'Nutrient doser (A and B tanks)' },
		role: {
			ko: '두 통의 진한 비료를 물에 정해 둔 농도로 섞어 재배 베드로 보냅니다. 흘러나온 물(배액)은 모아 다시 쓰거나 버립니다.',
			en: 'Mixes two concentrated feeds into water at a set strength and sends it to the beds; run-off is collected to reuse or drain.'
		}
	},
	co2: {
		name: { ko: '이산화탄소 공급관', en: 'CO₂ tube' },
		role: {
			ko: '작물 옆으로 이산화탄소를 흘려 보내 광합성을 돕습니다. 창을 닫아 두는 겨울 낮에 주로 씁니다.',
			en: 'Feeds CO₂ alongside the plants to boost growth, mostly on winter days when the vents stay shut.'
		}
	},
	pump: {
		name: { ko: '관정 펌프', en: 'Well pump' },
		role: {
			ko: '지하수를 끌어 올려 주관으로 보냅니다.',
			en: 'Lifts groundwater into the main pipe.'
		}
	}
}

/** 시설마다 그리는 장비와 설치비 표시 (그리는 순서 = 목록 순서) */
export const EQUIP_SET: Record<'house' | 'smart' | 'field', [EquipId, EquipCost[]][]> = {
	house: [
		['vent', ['base']],
		['shade', ['base']],
		['water', ['base']],
		['fan', ['extra']],
		['curtain', ['extra', 'ict']],
		['heater', ['extra']],
		['sensor', ['ict']],
		['panel', ['ict']]
	],
	smart: [
		['roofvent', ['ict']],
		['screen', ['ict']],
		['rail', []],
		['boiler', ['boilerOut']],
		['trolley', []],
		['fan', []],
		['fogger', []],
		['feed', ['ict']],
		['co2', ['ict']],
		['sensor', ['ict']],
		['panel', ['ict']]
	],
	field: [
		['water', []],
		['pump', []]
	]
}

export const EQUIP_COST: Record<EquipCost, T> = {
	base: {
		ko: '설치비 기준단가(㎡당 25,000원)에 들어 있습니다.',
		en: 'Included in the ₩25,000/㎡ base build cost.'
	},
	extra: {
		ko: '기준단가에 들어 있지 않아 따로 듭니다.',
		en: 'Not in the base cost; budget it separately.'
	},
	ict: {
		ko: '스마트팜 ICT 장비 지원 대상입니다.',
		en: 'Eligible for smart-farm ICT equipment grants.'
	},
	boilerOut: {
		ko: '보일러는 온실 설치비(ha당 30억 원)에 들어 있지 않습니다.',
		en: 'The boiler is not in the ₩3bn/ha glasshouse cost.'
	}
}

export const EQUIP_SRC: T = {
	ko: '설치비 포함: 농식품부 2026 시행지침서 고추비가림재배시설 기준단가(관수·자동개폐기·차광망 포함), 2025 스마트팜ICT융복합확산 온실신축 지침(보일러 제외) · ICT 지원 대상: 군산시 스마트팜 ICT 사업 공고 · 장비 모양과 자리는 이해를 돕는 그림이라 치수를 적지 않았습니다.',
	en: 'Cost inclusion: MAFRA 2026 guideline rain-shelter base cost (irrigation, auto vent winders, shade net included); 2025 smart-farm glasshouse guideline (boiler excluded) · ICT grant items: Gunsan smart-farm ICT notice · Equipment shapes and positions are illustrative, so no sizes are given.'
}
