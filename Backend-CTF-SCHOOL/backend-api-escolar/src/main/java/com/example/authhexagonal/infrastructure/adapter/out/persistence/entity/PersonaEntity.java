package com.example.authhexagonal.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "\"PERSONAS\"")
public class PersonaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @Column(name = "\"RUN\"", nullable = false, unique = true)
    private String run;

    @Column(name = "\"NOMBRES\"", nullable = false)
    private String nombres;

    @Column(name = "\"APELLIDOS\"", nullable = false)
    private String apellidos;

    @Column(name = "\"CORREO_ELECTRONICO\"", nullable = false, unique = true)
    private String correoElectronico;

    @Column(name = "\"DIRECCION\"")
    private String direccion;

    @Column(name = "\"TELEFONO\"")
    private String telefono;

    public Long getId() {
        return id;
    }

    public String getRun() {
        return run;
    }

    public String getNombres() {
        return nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public String getCorreoElectronico() {
        return correoElectronico;
    }

    public String getDireccion() {
        return direccion;
    }

    public String getTelefono() {
        return telefono;
    }
}
