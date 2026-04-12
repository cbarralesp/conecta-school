package com.example.authhexagonal.infrastructure.security;

import com.example.authhexagonal.domain.model.AuthUser;
import com.example.authhexagonal.domain.port.out.LoadUserPort;
import com.example.authhexagonal.domain.port.out.TokenProviderPort;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenProviderPort tokenProviderPort;
    private final LoadUserPort loadUserPort;

    public JwtAuthenticationFilter(TokenProviderPort tokenProviderPort, LoadUserPort loadUserPort) {
        this.tokenProviderPort = tokenProviderPort;
        this.loadUserPort = loadUserPort;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            tokenProviderPort.extractUsername(token)
                    .flatMap(loadUserPort::findByUsername)
                    .filter(user -> tokenProviderPort.isTokenValid(token, user))
                    .ifPresent(this::setAuthentication);
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthentication(AuthUser user) {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return;
        }

        var authorities = user.roles().stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        var authentication = new UsernamePasswordAuthenticationToken(
                user.username(),
                null,
                authorities
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
