package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentLifeInterview;
import com.example.authhexagonal.domain.model.StudentLifeInterviewCommand;
import com.example.authhexagonal.domain.port.out.ManageStudentLifeInterviewsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Time;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class StudentLifeInterviewJdbcAdapter implements ManageStudentLifeInterviewsPort {

    private final JdbcTemplate jdbcTemplate;

    public StudentLifeInterviewJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public boolean existsStudent(Long studentId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "ALUMNOS"
                WHERE "ID" = ?
                """, Integer.class, studentId);
        return count != null && count > 0;
    }

    @Override
    public List<StudentLifeInterview> findByStudentId(Long studentId) {
        return jdbcTemplate.query("""
                SELECT *
                FROM "HOJA_VIDA_ENTREVISTAS"
                WHERE "ALUMNO_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "FECHA" DESC, "HORA" DESC NULLS LAST, "ID" DESC
                """, (rs, rowNum) -> new StudentLifeInterview(
                rs.getLong("ID"),
                rs.getLong("ALUMNO_ID"),
                rs.getObject("MATRICULA_ID") == null ? null : rs.getLong("MATRICULA_ID"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getTime("HORA") == null ? null : rs.getTime("HORA").toLocalTime(),
                rs.getString("TIPO"),
                splitParticipants(rs.getString("PARTICIPANTES")),
                rs.getString("MOTIVO"),
                rs.getString("RESPONSABLE"),
                rs.getString("ROL_RESPONSABLE"),
                rs.getString("ESTADO"),
                rs.getString("SINTESIS"),
                rs.getString("ACUERDOS")
        ), studentId);
    }

    @Override
    public StudentLifeInterview create(StudentLifeInterviewCommand command) {
        Long interviewId = jdbcTemplate.queryForObject("""
                INSERT INTO "HOJA_VIDA_ENTREVISTAS" (
                    "ALUMNO_ID",
                    "MATRICULA_ID",
                    "FECHA",
                    "HORA",
                    "TIPO",
                    "PARTICIPANTES",
                    "MOTIVO",
                    "RESPONSABLE",
                    "ROL_RESPONSABLE",
                    "ESTADO",
                    "SINTESIS",
                    "ACUERDOS",
                    "ACTIVA",
                    "CREADO_EN",
                    "ACTUALIZADO_EN"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING "ID"
                """,
                Long.class,
                command.studentId(),
                command.enrollmentId(),
                Date.valueOf(command.date()),
                command.time() == null ? null : Time.valueOf(command.time()),
                command.type(),
                joinParticipants(command.participants()),
                command.reason(),
                command.responsible(),
                command.responsibleRole(),
                command.status(),
                command.summary(),
                command.agreements()
        );

        return findById(interviewId).orElseThrow();
    }

    @Override
    public Optional<StudentLifeInterview> findById(Long interviewId) {
        if (interviewId == null) {
            return Optional.empty();
        }
        return jdbcTemplate.query("""
                SELECT *
                FROM "HOJA_VIDA_ENTREVISTAS"
                WHERE "ID" = ?
                  AND "ACTIVA" = TRUE
                """, (rs, rowNum) -> new StudentLifeInterview(
                rs.getLong("ID"),
                rs.getLong("ALUMNO_ID"),
                rs.getObject("MATRICULA_ID") == null ? null : rs.getLong("MATRICULA_ID"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getTime("HORA") == null ? null : rs.getTime("HORA").toLocalTime(),
                rs.getString("TIPO"),
                splitParticipants(rs.getString("PARTICIPANTES")),
                rs.getString("MOTIVO"),
                rs.getString("RESPONSABLE"),
                rs.getString("ROL_RESPONSABLE"),
                rs.getString("ESTADO"),
                rs.getString("SINTESIS"),
                rs.getString("ACUERDOS")
        ), interviewId).stream().findFirst();
    }

    @Override
    public StudentLifeInterview update(Long interviewId, StudentLifeInterviewCommand command) {
        jdbcTemplate.update("""
                UPDATE "HOJA_VIDA_ENTREVISTAS"
                SET "ALUMNO_ID" = ?,
                    "MATRICULA_ID" = ?,
                    "FECHA" = ?,
                    "HORA" = ?,
                    "TIPO" = ?,
                    "PARTICIPANTES" = ?,
                    "MOTIVO" = ?,
                    "RESPONSABLE" = ?,
                    "ROL_RESPONSABLE" = ?,
                    "ESTADO" = ?,
                    "SINTESIS" = ?,
                    "ACUERDOS" = ?,
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                  AND "ACTIVA" = TRUE
                """,
                command.studentId(),
                command.enrollmentId(),
                Date.valueOf(command.date()),
                command.time() == null ? null : Time.valueOf(command.time()),
                command.type(),
                joinParticipants(command.participants()),
                command.reason(),
                command.responsible(),
                command.responsibleRole(),
                command.status(),
                command.summary(),
                command.agreements(),
                interviewId
        );
        return findById(interviewId).orElseThrow();
    }

    @Override
    public void delete(Long interviewId) {
        jdbcTemplate.update("""
                UPDATE "HOJA_VIDA_ENTREVISTAS"
                SET "ACTIVA" = FALSE,
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """, interviewId);
    }

    private String joinParticipants(List<String> participants) {
        if (participants == null) {
            return "";
        }
        return String.join("\n", participants.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .toList());
    }

    private List<String> splitParticipants(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\R"))
                .map(String::trim)
                .filter(participant -> !participant.isBlank())
                .toList();
    }
}
