-- KEYS[1]: rate:tokenbucket:userId:methodName:tokens
-- KEYS[2]: rate:tokenbucket:userId:methodName:timestamp
-- ARGV[1]: Max bucket capacity (rateLimit.capacity())
-- ARGV[2]: Refill rate per second (rateLimit.refillRate())
-- ARGV[3]: Current timestamp in SECONDS (currentEpochSecond)

local tokens_key = KEYS[1]
local timestamp_key = KEYS[2]

local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = 1

-- 1. Read existing values from generic string keys
local tokens = tonumber(redis.call('GET', tokens_key))
local last_updated = tonumber(redis.call('GET', timestamp_key))

if not tokens then
    -- First time request initialization (Full Bucket)
    tokens = capacity
    last_updated = now
else
    -- 2. Calculate elapsed time in pure seconds
    local elapsed = now - last_updated
    if elapsed > 0 then
        local generated = elapsed * refill_rate
        -- Strict Upper Bound Check
        tokens = math.min(capacity, tokens + generated)
        last_updated = now
    end
end

-- 3. Token evaluation logic
if tokens >= requested then
    tokens = tokens - requested
    -- Save atomically as clean string values
    redis.call('SET', tokens_key, tokens)
    redis.call('SET', timestamp_key, last_updated)
    -- 60 seconds key expiration for automatic clean up
    redis.call('EXPIRE', tokens_key, 60)
    redis.call('EXPIRE', timestamp_key, 60)
    return 1 -- Request ALLOWED
else
    -- Update timestamp even on failure to block micro-bursting hacks
    redis.call('SET', timestamp_key, now)
    redis.call('EXPIRE', timestamp_key, 60)
    return 0 -- Request BLOCKED (429)
end