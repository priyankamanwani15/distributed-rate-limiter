package com.example.ratelimiter;

// Import your custom annotation from your separate package
import com.example.ratelimiter.annotation.RateLimit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

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
    // Use your custom annotation here.
    // It allows a burst of 5 requests, refilling 1 token every second.
    @RateLimit(capacity = 5, refillRate = 0)
    public String hello(@RequestParam String userId) {
        return "Hello, " + userId + "! Token consumed successfully.";
    }
}