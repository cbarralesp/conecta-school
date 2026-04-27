package com.example.authhexagonal.domain.port.out;

public interface RegisterSecurityAuditPort {

    void registerSuccessfulLogin(String username);

    void registerFailedLogin(String username);
}
