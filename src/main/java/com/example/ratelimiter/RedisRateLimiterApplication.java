package com.example.ratelimiter;

import com.example.ratelimiter.annotation.RateLimit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.atomic.AtomicInteger;

@SpringBootApplication
public class RedisRateLimiterApplication {

    // 🔥 Global thread-safe counters ko top-level PUBLIC class me shift kar diya!
    public static final AtomicInteger totalAllowed = new AtomicInteger(0);
    public static final AtomicInteger totalBlocked = new AtomicInteger(0);

    public static void main(String[] args) {
        SpringApplication.run(RedisRateLimiterApplication.class, args);
    }
}

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*")
class RateLimitedController {

    @GetMapping("/hello")
    @RateLimit(capacity = 5, refillRate = 0)
    public String hello(@RequestParam String userId) {
        // Application context se reference link kiya
        RedisRateLimiterApplication.totalAllowed.incrementAndGet();
        return "Hello, " + userId + "! Token consumed successfully.";
    }

    @GetMapping("/metrics")
    @CrossOrigin(origins = "*")
    public Map<String, Integer> getLiveMetrics() {
        Map<String, Integer> metrics = new HashMap<>();
        metrics.put("allowed", RedisRateLimiterApplication.totalAllowed.get());
        metrics.put("blocked", RedisRateLimiterApplication.totalBlocked.get());
        return metrics;
    }
}

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
class GrafanaProxyController {

    @RequestMapping(value = {"/query", "/query_range", "/label/__name__/values"})
    public String proxyGrafanaQueries() {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:8080/actuator/prometheus"))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (Exception e) {
            return "# HELP rate_limiter_requests_blocked_total Total blocked requests\n" +
                    "# TYPE rate_limiter_requests_blocked_total counter\n" +
                    "rate_limiter_requests_blocked_total " + RedisRateLimiterApplication.totalBlocked.get();
        }
    }
}