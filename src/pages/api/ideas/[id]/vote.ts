import type { APIRoute } from 'astro'
import redis from '../../../../lib/redis'

// POST /api/ideas/[id]/vote — 투표하기
export const POST: APIRoute = async ({ params, request, cookies }) => {
    const { id } = params
    if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid idea id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    try {
        // IP 추출
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        // 쿠키에서 visitor UUID 가져오기 (없으면 생성)
        let visitorId = cookies.get('imunfarm_vid')?.value
        if (!visitorId) {
            visitorId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
            cookies.set('imunfarm_vid', visitorId, {
                maxAge: 60 * 60 * 24 * 365, // 1년
                path: '/',
                sameSite: 'lax',
                httpOnly: true,
                secure: import.meta.env.PROD,
            })
        }

        // 중복 투표 체크: IP 기반 (24시간)
        const ipKey = `vote_limit:ip:${ip}:${id}`
        const ipLimited = await redis.exists(ipKey)

        // 중복 투표 체크: 쿠키 기반 (24시간)
        const cookieKey = `vote_limit:vid:${visitorId}:${id}`
        const cookieLimited = await redis.exists(cookieKey)

        if (ipLimited || cookieLimited) {
            return new Response(
                JSON.stringify({ error: '24시간 내에 이미 이 아이디어에 투표하셨습니다.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 아이디어 존재 확인
        const ideaExists = await redis.exists(`idea:${id}`)
        if (!ideaExists) {
            return new Response(JSON.stringify({ error: '존재하지 않는 아이디어입니다.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // 투표 처리
        await redis.zincrby('ideas:index', 1, id)

        // 중복 방지 키 세팅 (24시간)
        await redis.setex(ipKey, 86400, '1')
        await redis.setex(cookieKey, 86400, '1')

        // 현재 투표수 반환
        const newScore = (await redis.zscore('ideas:index', id)) as string | null
        const votes = parseInt(newScore ?? '0', 10)

        return new Response(JSON.stringify({ success: true, votes }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (e) {
        console.error('[POST /api/ideas/vote]', e)
        return new Response(JSON.stringify({ error: '투표 처리에 실패했습니다.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

// 취소 투표 (DELETE)
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
    const { id } = params
    if (!id) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 })

    try {
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'
        const visitorId = cookies.get('imunfarm_vid')?.value || ''

        const ipKey = `vote_limit:ip:${ip}:${id}`
        const cookieKey = `vote_limit:vid:${visitorId}:${id}`

        const ipLimited = await redis.exists(ipKey)
        if (!ipLimited) {
            return new Response(JSON.stringify({ error: '투표 기록이 없습니다.' }), { status: 400 })
        }

        await redis.zincrby('ideas:index', -1, id)
        await redis.del(ipKey)
        await redis.del(cookieKey)

        const newScore = (await redis.zscore('ideas:index', id)) as string | null
        const votes = Math.max(0, parseInt(newScore ?? '0', 10))

        return new Response(JSON.stringify({ success: true, votes }), { status: 200 })
    } catch (e) {
        return new Response(JSON.stringify({ error: '취소 실패' }), { status: 500 })
    }
}

export const prerender = false
