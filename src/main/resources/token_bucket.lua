local bucketKey = KEYS[1]
local timestampKey = KEYS[2]

local maxCapacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = 1

local currentTokens = tonumber(redis.call('get', bucketKey))
local lastRefillTime = tonumber(redis.call('get', timestampKey))

if currentTokens == nil then
    currentTokens = maxCapacity
    lastRefillTime = now
end

local elapsedTime = math.max(0, now - lastRefillTime)
local generatedTokens = elapsedTime * refillRate
currentTokens = math.min(maxCapacity, currentTokens + generatedTokens)
lastRefillTime = now

if currentTokens >= requested then
    currentTokens = currentTokens - requested
    redis.call('set', bucketKey, currentTokens)
    redis.call('set', timestampKey, lastRefillTime)
    redis.call('expire', bucketKey, 3600)
    redis.call('expire', timestampKey, 3600)
    return 1
else
    redis.call('set', bucketKey, currentTokens)
    redis.call('set', timestampKey, lastRefillTime)
    return 0
end