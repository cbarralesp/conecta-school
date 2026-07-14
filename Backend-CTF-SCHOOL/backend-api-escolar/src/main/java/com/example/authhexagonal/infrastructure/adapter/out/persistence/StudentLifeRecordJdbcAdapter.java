package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentLifeRecord;
import com.example.authhexagonal.domain.model.StudentLifeRecordCommand;
import com.example.authhexagonal.domain.port.out.ManageStudentLifeRecordsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.util.List;
import java.util.Optional;

@Component
public class StudentLifeRecordJdbcAdapter implements ManageStudentLifeRecordsPort {

    private final JdbcTemplate jdbcTemplate;

    public StudentLifeRecordJdbcAdapter(JdbcTemplate jdbcTemplate) {
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
    public List<StudentLifeRecord> findByStudentId(Long studentId) {
        return jdbcTemplate.query("""
                SELECT *
                FROM "HOJA_VIDA_CONVIVENCIA"
                WHERE "ALUMNO_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "FECHA" DESC, "HORA" DESC NULLS LAST, "ID" DESC
                """, (rs, rowNum) -> mapRecord(rs), studentId);
    }

    @Override
    public StudentLifeRecord create(StudentLifeRecordCommand command) {
        Long recordId = jdbcTemplate.queryForObject("""
                INSERT INTO "HOJA_VIDA_CONVIVENCIA" (
                    "ALUMNO_ID", "MATRICULA_ID", "FECHA", "HORA", "TIPO",
                    "CATEGORIA", "AREA", "RESPONSABLE", "ESTADO", "PLAZO",
                    "DESCRIPCION", "ACTIVA", "CREADO_EN", "ACTUALIZADO_EN"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING "ID"
                """,
                Long.class,
                command.studentId(),
                command.enrollmentId(),
                Date.valueOf(command.date()),
                command.time() == null ? null : Time.valueOf(command.time()),
                command.type(),
                command.category(),
                command.area(),
                command.responsible(),
                command.status(),
                command.deadline(),
                command.description()
        );
        return findById(recordId).orElseThrow();
    }

    @Override
    public Optional<StudentLifeRecord> findById(Long recordId) {
        if (recordId == null) {
            return Optional.empty();
        }
        return jdbcTemplate.query("""
                SELECT *
                FROM "HOJA_VIDA_CONVIVENCIA"
                WHERE "ID" = ?
                  AND "ACTIVA" = TRUE
                """, (rs, rowNum) -> mapRecord(rs), recordId).stream().findFirst();
    }

    @Override
    public StudentLifeRecord update(Long recordId, StudentLifeRecordCommand command) {
        jdbcTemplate.update("""
                UPDATE "HOJA_VIDA_CONVIVENCIA"
                SET "ALUMNO_ID" = ?,
                    "MATRICULA_ID" = ?,
                    "FECHA" = ?,
                    "HORA" = ?,
                    "TIPO" = ?,
                    "CATEGORIA" = ?,
                    "AREA" = ?,
                    "RESPONSABLE" = ?,
                    "ESTADO" = ?,
                    "PLAZO" = ?,
                    "DESCRIPCION" = ?,
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                  AND "ACTIVA" = TRUE
                """,
                command.studentId(),
                command.enrollmentId(),
                Date.valueOf(command.date()),
                command.time() == null ? null : Time.valueOf(command.time()),
                command.type(),
                command.category(),
                command.area(),
                command.responsible(),
                command.status(),
                command.deadline(),
                command.description(),
                recordId
        );
        return findById(recordId).orElseThrow();
    }

    @Override
    public void delete(Long recordId) {
        jdbcTemplate.update("""
                UPDATE "HOJA_VIDA_CONVIVENCIA"
                SET "ACTIVA" = FALSE,
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """, recordId);
    }

    private StudentLifeRecord mapRecord(ResultSet rs) throws SQLException {
        return new StudentLifeRecord(
                rs.getLong("ID"),
                rs.getLong("ALUMNO_ID"),
                rs.getObject("MATRICULA_ID") == null ? null : rs.getLong("MATRICULA_ID"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getTime("HORA") == null ? null : rs.getTime("HORA").toLocalTime(),
                rs.getString("TIPO"),
                rs.getString("CATEGORIA"),
                rs.getString("AREA"),
                rs.getString("RESPONSABLE"),
                rs.getString("ESTADO"),
                rs.getString("PLAZO"),
                rs.getString("DESCRIPCION")
        );
    }
}
