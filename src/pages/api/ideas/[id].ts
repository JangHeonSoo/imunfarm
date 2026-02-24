import type { APIRoute } from 'astro'
import { createRedis } from '../../../lib/redis'

// DELETE /api/ideas/[id] — 아이디어 삭제 (관리용)
export const DELETE: APIRoute = async ({ params, locals }) => {
    const { id } = params
    if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid idea id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    try {
        const redis = createRedis((locals as any)?.runtime?.env)
        const exists = await redis.exists(`idea:${id}`)
        if (!exists) {
            return new Response(JSON.stringify({ error: '존재하지 않는 아이디어입니다.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // 아이디어 데이터 삭제
        await redis.del(`idea:${id}`)

        // 인덱스에서 제거
        await redis.zrem('ideas:index', id)

        return new Response(JSON.stringify({ success: true, id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (e) {
        console.error('[DELETE /api/ideas]', e)
        return new Response(JSON.stringify({ error: '삭제에 실패했습니다.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

export const prerender = false
