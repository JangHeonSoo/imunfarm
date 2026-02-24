/**
 * Lightweight Upstash Redis client using native fetch (no npm package needed)
 * Uses Upstash REST API: https://upstash.com/docs/redis/features/restapi
 */

type Env = Record<string, string | undefined>

export function createRedis(env?: Env) {
    // 1. Try passed env (Cloudflare locals.runtime.env)
    // 2. Try import.meta.env (Vite/Astro default)
    // 3. Try process.env (Node.js fallback)
    const getEnv = (key: string) =>
        env?.[key] ||
        (typeof import.meta.env !== 'undefined' ? import.meta.env[key] : undefined) ||
        (typeof process !== 'undefined' ? process.env[key] : undefined)

    const UPSTASH_URL = getEnv('UPSTASH_REDIS_REST_URL')
    const UPSTASH_TOKEN = getEnv('UPSTASH_REDIS_REST_TOKEN')

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.error('[redis] CRITICAL Error: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing.')
    }

    async function call(command: string[]): Promise<unknown> {
        if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
        const res = await fetch(`${UPSTASH_URL}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        })
        if (!res.ok) throw new Error(`Redis error: ${res.status}`)
        const data = await res.json() as { result: unknown }
        return data.result
    }

    return {
        get: (key: string) => call(['GET', key]),
        set: (key: string, value: string) => call(['SET', key, value]),
        setex: (key: string, seconds: number, value: string) => call(['SETEX', key, String(seconds), value]),
        incr: (key: string) => call(['INCR', key]),
        exists: (key: string) => call(['EXISTS', key]),
        expire: (key: string, seconds: number) => call(['EXPIRE', key, String(seconds)]),
        del: (key: string) => call(['DEL', key]),
        keys: (pattern: string) => call(['KEYS', pattern]),
        mget: (...keys: string[]) => call(['MGET', ...keys]),
        zadd: (key: string, score: number, member: string) => call(['ZADD', key, String(score), member]),
        zincrby: (key: string, increment: number, member: string) => call(['ZINCRBY', key, String(increment), member]),
        zrevrange: (key: string, start: number, stop: number, withscores?: 'WITHSCORES') =>
            withscores
                ? call(['ZREVRANGE', key, String(start), String(stop), 'WITHSCORES'])
                : call(['ZREVRANGE', key, String(start), String(stop)]),
        zscore: (key: string, member: string) => call(['ZSCORE', key, member]),
        zrem: (key: string, member: string) => call(['ZREM', key, member]),
    }
}

// Ensure backward compatibility during transition
export const redis = createRedis()
export default redis
