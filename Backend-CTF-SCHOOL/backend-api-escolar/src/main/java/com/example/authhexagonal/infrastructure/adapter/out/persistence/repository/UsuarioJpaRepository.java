package com.example.authhexagonal.infrastructure.adapter.out.persistence.repository;

import com.example.authhexagonal.infrastructure.adapter.out.persistence.entity.UsuarioEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioJpaRepository extends JpaRepository<UsuarioEntity, Long> {

    @EntityGraph(attributePaths = "persona")
    Optional<UsuarioEntity> findByUsuarioAndActivoTrue(String usuario);
}
