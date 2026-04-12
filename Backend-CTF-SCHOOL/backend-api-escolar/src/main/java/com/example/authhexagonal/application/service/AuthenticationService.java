package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.AuthTokens;
import com.example.authhexagonal.domain.model.AuthUser;
import com.example.authhexagonal.domain.port.in.AuthenticateUserUseCase;
import com.example.authhexagonal.domain.port.in.CurrentUserUseCase;
import com.example.authhexagonal.domain.port.out.LoadUserPort;
import com.example.authhexagonal.domain.port.out.RegisterSecurityAuditPort;
import com.example.authhexagonal.domain.port.out.TokenProviderPort;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService implements AuthenticateUserUseCase, CurrentUserUseCase {

    private final LoadUserPort loadUserPort;
    private final TokenProviderPort tokenProviderPort;
    private final PasswordEncoder passwordEncoder;
    private final RegisterSecurityAuditPort registerSecurityAuditPort;

    public AuthenticationService(
            LoadUserPort loadUserPort,
            TokenProviderPort tokenProviderPort,
            PasswordEncoder passwordEncoder,
            RegisterSecurityAuditPort registerSecurityAuditPort
    ) {
        this.loadUserPort = loadUserPort;
        this.tokenProviderPort = tokenProviderPort;
        this.passwordEncoder = passwordEncoder;
        this.registerSecurityAuditPort = registerSecurityAuditPort;
    }

    @Override
    public AuthTokens authenticate(String username, String password) {
        AuthUser user;
        try {
            user = getCurrentUser(username);
        } catch (UsernameNotFoundException exception) {
            registerSecurityAuditPort.registerFailedLogin(username);
            throw exception;
        }
        if (!passwordEncoder.matches(password, user.encodedPassword())) {
            registerSecurityAuditPort.registerFailedLogin(username);
            throw new BadCredentialsException("Invalid credentials");
        }
        registerSecurityAuditPort.registerSuccessfulLogin(username);
        return tokenProviderPort.generateToken(user);
    }

    @Override
    public AuthUser getCurrentUser(String username) {
        return loadUserPort.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
