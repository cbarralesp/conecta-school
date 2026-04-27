package com.example.authhexagonal.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "\"USUARIOS\"")
public class UsuarioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"PERSONA_ID\"", nullable = false, unique = true)
    private PersonaEntity persona;

    @Column(name = "\"USUARIO\"", nullable = false, unique = true)
    private String usuario;

    @Column(name = "\"CLAVE\"", nullable = false)
    private String clave;

    @Column(name = "\"ACTIVO\"", nullable = false)
    private boolean activo;

    public Long getId() {
        return id;
    }

    public PersonaEntity getPersona() {
        return persona;
    }

    public String getUsuario() {
        return usuario;
    }

    public String getClave() {
        return clave;
    }

    public boolean isActivo() {
        return activo;
    }
}
