-- KEYS[1]: rate:tokenbucket:userId:methodName:tokens
-- KEYS[2]: rate:tokenbucket:userId:methodName:timestamp
-- ARGV[1]: Max bucket capacity (5)
-- ARGV[2]: Refill rate per second (1)
-- ARGV[3]: Current timestamp in MILLISECONDS

local tokens_key = KEYS[1]
local timestamp_key = KEYS[2]

local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = 1

local tokens = tonumber(redis.call('GET', tokens_key))
local last_updated = tonumber(redis.call('GET', timestamp_key))

if not tokens then
    tokens = capacity
    last_updated = now
else
    -- 🔥 MILLISECOND PRECISION: (now - last_updated) / 1000 se exact fractional tokens milenge
    local elapsed = (now - last_updated) / 1000
    if elapsed > 0 then
        local generated = elapsed * refill_rate
        tokens = math.min(capacity, tokens + generated)
        last_updated = now
    end
end

if tokens >= requested then
    tokens = tokens - requested
    redis.call('SET', tokens_key, tokens)
    redis.call('SET', timestamp_key, last_updated)
    redis.call('EXPIRE', tokens_key, 60)
    redis.call('EXPIRE', timestamp_key, 60)
    return 1 -- ALLOWED
else
    -- Request block hone par timestamp halkan se update nahi karenge taaki loop isko exploit na kare
    return 0 -- BLOCKED
end