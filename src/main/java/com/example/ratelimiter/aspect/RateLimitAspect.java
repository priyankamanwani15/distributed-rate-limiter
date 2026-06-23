package com.example.ratelimiter.aspect;


import com.example.ratelimiter.annotation.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Aspect
@Component
public class RateLimitAspect {

    private final StringRedisTemplate redisTemplate;
    private final RedisScript<Long> tokenBucketScript;
    @Autowired
    private MeterRegistry meterRegistry;

    public RateLimitAspect(StringRedisTemplate redisTemplate, RedisScript<Long> tokenBucketScript) {
        this.redisTemplate = redisTemplate;
        this.tokenBucketScript = tokenBucketScript;
    }

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        // Extract userId parameter or fallback to client remote IP address
        String userId = request.getParameter("userId");
        if (userId == null || userId.trim().isEmpty()) {
            userId = request.getRemoteAddr();
        }

        String methodName = joinPoint.getSignature().getName();

        // Generate isolated distinct key pairs for token balances and timelines
        String bucketKey = "rate:tokenbucket:" + userId + ":" + methodName + ":tokens";
        String timestampKey = "rate:tokenbucket:" + userId + ":" + methodName + ":timestamp";
        List<String> keys = Arrays.asList(bucketKey, timestampKey);

        String currentEpochSecond = String.valueOf(Instant.now().getEpochSecond());

        // Fire atomic Lua operation inside Redis
        Long result = redisTemplate.execute(
                tokenBucketScript,
                keys,
                String.valueOf(rateLimit.capacity()),
                String.valueOf(rateLimit.refillRate()),
                currentEpochSecond
        );

        // If returned flag is 0, the client bucket has run dry
        if (result == null || result == 0) {
            Counter.builder("rate_limiter_requests_blocked")
                    .tag("user", userId)
                    .tag("method", methodName)
                    .description("Tracks total requests blocked by token bucket limiter")
                    .register(meterRegistry)
                    .increment();
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests - Token Bucket empty.");
        }
        Counter.builder("rate_limiter_requests_allowed")
                .tag("user", userId)
                .tag("method", methodName)
                .register(meterRegistry)
                .increment();
        return joinPoint.proceed();
    }
}