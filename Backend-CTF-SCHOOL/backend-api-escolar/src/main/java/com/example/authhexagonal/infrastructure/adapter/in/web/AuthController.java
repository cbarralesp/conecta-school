package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.AdministrationCurrentModuleAccess;
import com.example.authhexagonal.domain.model.AuthTokens;
import com.example.authhexagonal.domain.model.AuthUser;
import com.example.authhexagonal.domain.port.in.AuthenticateUserUseCase;
import com.example.authhexagonal.domain.port.in.CurrentUserUseCase;
import com.example.authhexagonal.domain.port.in.ManageAdministrationUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.LoginRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.LoginResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticateUserUseCase authenticateUserUseCase;
    private final CurrentUserUseCase currentUserUseCase;
    private final ManageAdministrationUseCase manageAdministrationUseCase;

    public AuthController(
            AuthenticateUserUseCase authenticateUserUseCase,
            CurrentUserUseCase currentUserUseCase,
            ManageAdministrationUseCase manageAdministrationUseCase
    ) {
        this.authenticateUserUseCase = authenticateUserUseCase;
        this.currentUserUseCase = currentUserUseCase;
        this.manageAdministrationUseCase = manageAdministrationUseCase;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        String identifier = request.identifier();
        if (identifier == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email o usuario es obligatorio");
        }
        AuthTokens tokens = authenticateUserUseCase.authenticate(identifier, request.password());
        AuthUser user = currentUserUseCase.getCurrentUser(identifier);
        return LoginResponse.fromDomain(tokens, user);
    }

    @GetMapping("/me")
    public UserResponse currentUser(Authentication authentication) {
        AuthUser user = currentUserUseCase.getCurrentUser(authentication.getName());
        return UserResponse.fromDomain(user);
    }

    @GetMapping("/module-access")
    public AdministrationCurrentModuleAccess currentModuleAccess(Authentication authentication) {
        return manageAdministrationUseCase.getCurrentModuleAccess(authentication.getName());
    }
}
