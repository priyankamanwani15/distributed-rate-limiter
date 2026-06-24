-- KEYS[1]: Rate limit key (e.g., rate_limit:priyanka)
-- ARGV[1]: Max bucket capacity (e.g., 5)
-- ARGV[2]: Refill rate per second (e.g., 1)
-- ARGV[3]: Current timestamp in MILLISECONDS (from Java: System.currentTimeMillis())
-- ARGV[4]: Requested tokens count (default 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4] or 1)

-- 1. Get current bucket data
local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if not tokens then
    -- First time initialization (Full Bucket)
    tokens = capacity
    last_updated = now
else
    -- 2. Calculate elapsed time in seconds (ms / 1000)
    local elapsed = (now - last_updated) / 1000
    if elapsed > 0 then
        -- Calculate fractional tokens based on precision time gap
        local generated = elapsed * refill_rate
        -- Strict Upper Bound Check: Never allow more than burst capacity
        tokens = math.min(capacity, tokens + generated)
        last_updated = now
    end
end

-- 3. Token evaluation logic
if tokens >= requested then
    tokens = tokens - requested
    -- Atomically update both properties
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
    redis.call('EXPIRE', key, 60) -- Automatic TTL cleanup for inactive keys
    return 1 -- Request ALLOWED (Passes to Controller)
else
    -- CRITICAL FIX: Update timestamp on block to prevent continuous micro-burst attempts
    redis.call('HSET', key, 'last_updated', now)
    return 0 -- Request BLOCKED (429 Too Many Requests)
end