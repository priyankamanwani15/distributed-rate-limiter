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

@SpringBootApplication
public class RedisRateLimiterApplication {
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
        return "Hello, " + userId + "! Token consumed successfully.";
    }
}

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
class GrafanaProxyController {

    // 🔥 Zero-dependency bypass layer: Yeh bina kisi class ke direct local actuator endpoint se raw data khinch lega
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
            return "# HELP rate_limiter_requests_blocked_total Total blocked requests\n# TYPE rate_limiter_requests_blocked_total counter\nrate_limiter_requests_blocked_total 0";
        }
    }
}