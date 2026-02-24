import type { APIRoute } from 'astro'
import redis from '../../../lib/redis'

// Idea 타입
interface Idea {
    id: string
    title: string
    author: string
    date: string
    votes: number
}

// GET /api/ideas — 전체 아이디어 목록 (투표수 기준 정렬)
export const GET: APIRoute = async () => {
    try {
        // Redis에서 아이디어 인덱스 목록 가져오기
        const ids = (await redis.zrevrange('ideas:index', 0, -1, 'WITHSCORES')) as string[] | null

        if (!ids || ids.length === 0) {
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // id와 score를 페어로 파싱 [id, score, id, score, ...]
        const ideas: Idea[] = []
        for (let i = 0; i < ids.length; i += 2) {
            const id = ids[i]
            const votes = parseInt(ids[i + 1] ?? '0', 10)
            const raw = (await redis.get(`idea:${id}`)) as string | null
            if (raw) {
                const idea = JSON.parse(raw) as Omit<Idea, 'votes'>
                ideas.push({ ...idea, votes })
            }
        }

        return new Response(JSON.stringify(ideas), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (e) {
        console.error('[GET /api/ideas]', e)
        return new Response(JSON.stringify({ error: 'Failed to fetch ideas' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

// POST /api/ideas — 새 아이디어 제출
export const POST: APIRoute = async ({ request }) => {
    try {
        // IP 추출
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        // IP 기반 제출 쿨다운 (1시간에 1개)
        const rateLimitKey = `submit_limit:${ip}`
        const limited = await redis.exists(rateLimitKey)
        if (limited) {
            return new Response(
                JSON.stringify({ error: '1시간에 1개의 아이디어만 제안할 수 있습니다.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const body = await request.json() as { title?: string; author?: string }
        const title = (body.title || '').trim()
        const author = (body.author || '익명의 씨앗').trim().slice(0, 20)

        if (!title || title.length < 5) {
            return new Response(
                JSON.stringify({ error: '아이디어를 5자 이상 입력해주세요.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (title.length > 100) {
            return new Response(
                JSON.stringify({ error: '아이디어는 100자 이하로 입력해주세요.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 고유 ID 생성 (타임스탬프 기반)
        const id = `idea_${Date.now()}`
        const now = new Date()
        const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

        const idea = { id, title, author, date }
        await redis.set(`idea:${id}`, JSON.stringify(idea))
        await redis.zadd('ideas:index', 0, id)

        // 제출 쿨다운 설정 (1시간)
        await redis.setex(rateLimitKey, 3600, '1')

        return new Response(JSON.stringify({ ...idea, votes: 0 }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (e) {
        console.error('[POST /api/ideas]', e)
        return new Response(JSON.stringify({ error: '아이디어 등록에 실패했습니다.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

export const prerender = false
