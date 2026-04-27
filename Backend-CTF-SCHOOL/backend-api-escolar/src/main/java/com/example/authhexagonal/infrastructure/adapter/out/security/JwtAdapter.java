package com.example.authhexagonal.infrastructure.adapter.out.security;

import com.example.authhexagonal.domain.model.AuthTokens;
import com.example.authhexagonal.domain.model.AuthUser;
import com.example.authhexagonal.domain.port.out.TokenProviderPort;
import com.example.authhexagonal.infrastructure.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtAdapter implements TokenProviderPort {

    private final JwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtAdapter(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public AuthTokens generateToken(AuthUser user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(jwtProperties.expirationSeconds());

        String token = Jwts.builder()
                .subject(user.username())
                .claim("roles", user.roles())
                .claim("roleCode", user.roleCode())
                .claim("applicationRole", user.applicationRole())
                .claim("email", user.email())
                .claim("displayName", user.displayName())
                .claim("userId", user.id())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();

        return new AuthTokens(token, "Bearer", jwtProperties.expirationSeconds());
    }

    @Override
    public Optional<String> extractUsername(String token) {
        try {
            return Optional.of(parseClaims(token).getSubject());
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    @Override
    public boolean isTokenValid(String token, AuthUser user) {
        return extractUsername(token)
                .map(username -> username.equals(user.username()) && !parseClaims(token).getExpiration().before(new Date()))
                .orElse(false);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
