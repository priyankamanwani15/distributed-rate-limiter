package com.example.ratelimiter.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    // Total tokens the bucket can hold at max capacity
    int capacity() default 10;

    // Number of tokens refilled per second
    int refillRate() default 1;
}