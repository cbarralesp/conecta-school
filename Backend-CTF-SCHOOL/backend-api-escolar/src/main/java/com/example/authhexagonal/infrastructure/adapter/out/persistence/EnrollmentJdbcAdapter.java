package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.EnrollmentCourseOption;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentListItem;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentSummary;
import com.example.authhexagonal.domain.port.out.ManageEnrollmentsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class EnrollmentJdbcAdapter implements ManageEnrollmentsPort {

    private final JdbcTemplate jdbcTemplate;

    public EnrollmentJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public EnrollmentSummary summarizeEnrollments(String search, Long courseId, String status) {
        String normalizedSearch = search == null ? "" : search.trim();
        String normalizedStatus = status == null ? "" : status.trim();
        long normalizedCourseId = courseId == null ? -1L : courseId;

        return jdbcTemplate.queryForObject("""
                SELECT
                    COUNT(1) AS total,
                    COUNT(*) FILTER (WHERE UPPER(m."ESTADO") = 'ACTIVO') AS active_count,
                    COUNT(*) FILTER (WHERE UPPER(m."ESTADO") = 'PENDIENTE') AS pending_count,
                    COUNT(DISTINCT c."ID") AS course_count
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                LEFT JOIN "MATRICULA_APODERADOS" ap ON ap."MATRICULA_ID" = m."ID" AND ap."ACTIVO" = TRUE
                WHERE m."ACTIVA" = TRUE
                  AND (? = '' OR UPPER(a."NOMBRE" || ' ' || a."APELLIDOS" || ' ' || a."RUN" || ' ' || COALESCE(ap."NOMBRE", '') || ' ' || COALESCE(ap."APELLIDOS", ''))
                        LIKE '%' || UPPER(?) || '%')
                  AND (? = -1 OR c."ID" = ?)
                  AND (? = '' OR UPPER(m."ESTADO") = UPPER(?))
                """,
                (rs, rowNum) -> new EnrollmentSummary(
                        rs.getInt("total"),
                        rs.getInt("active_count"),
                        rs.getInt("pending_count"),
                        rs.getInt("course_count")
                ),
                normalizedSearch, normalizedSearch, normalizedCourseId, normalizedCourseId, normalizedStatus, normalizedStatus
        );
    }

    @Override
    public List<EnrollmentCourseOption> findActiveCourses() {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "NOMBRE", "ANIO_ESCOLAR"
                FROM "CURSOS"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ANIO_ESCOLAR" DESC, "NOMBRE"
                """, (rs, rowNum) -> new EnrollmentCourseOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ));
    }

    @Override
    public List<EnrollmentListItem> findEnrollments(String search, Long courseId, String status, Integer page, Integer size) {
        String normalizedSearch = search == null ? "" : search.trim();
        String normalizedStatus = status == null ? "" : status.trim();
        long normalizedCourseId = courseId == null ? -1L : courseId;
        boolean paginated = page != null && size != null;
        int normalizedPage = page == null ? 0 : Math.max(page, 0);
        int normalizedSize = size == null ? Integer.MAX_VALUE : Math.max(size, 1);
        int offset = normalizedPage * normalizedSize;

        String sql = """
                SELECT
                    m."ID",
                    a."ID" AS student_id,
                    a."RUN",
                    a."NOMBRE",
                    a."APELLIDOS",
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    COALESCE(ap."NOMBRE" || ' ' || ap."APELLIDOS", 'Sin apoderado') AS guardian_name,
                    m."ESTADO",
                    m."FECHA_MATRICULA"
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                LEFT JOIN "MATRICULA_APODERADOS" ap ON ap."MATRICULA_ID" = m."ID" AND ap."ACTIVO" = TRUE
                WHERE m."ACTIVA" = TRUE
                  AND (? = '' OR UPPER(a."NOMBRE" || ' ' || a."APELLIDOS" || ' ' || a."RUN" || ' ' || COALESCE(ap."NOMBRE", '') || ' ' || COALESCE(ap."APELLIDOS", ''))
                        LIKE '%' || UPPER(?) || '%')
                  AND (? = -1 OR c."ID" = ?)
                  AND (? = '' OR UPPER(m."ESTADO") = UPPER(?))
                ORDER BY a."NOMBRE", a."APELLIDOS"
                """;

        if (paginated) {
            sql += """
                    LIMIT ?
                    OFFSET ?
                    """;
        }

        Object[] params = paginated
                ? new Object[] {
                normalizedSearch, normalizedSearch, normalizedCourseId, normalizedCourseId, normalizedStatus, normalizedStatus,
                normalizedSize, offset
        }
                : new Object[] {
                normalizedSearch, normalizedSearch, normalizedCourseId, normalizedCourseId, normalizedStatus, normalizedStatus
        };

        return jdbcTemplate.query(sql, (rs, rowNum) -> new EnrollmentListItem(
                rs.getLong("ID"),
                rs.getLong("student_id"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                (rs.getString("NOMBRE") + " " + rs.getString("APELLIDOS")).trim(),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getString("guardian_name"),
                rs.getString("ESTADO"),
                rs.getObject("FECHA_MATRICULA", LocalDate.class).toString()
        ), params);
    }

    @Override
    public Optional<EnrollmentDetail> findEnrollmentDetailById(Long enrollmentId) {
        List<EnrollmentDetail> details = jdbcTemplate.query("""
                SELECT
                    m."ID",
                    a."ID" AS student_id,
                    a."RUN",
                    a."NOMBRE",
                    a."APELLIDOS",
                    a."FECHA_NACIMIENTO",
                    COALESCE(a."GENERO", '') AS genero,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    a."REGION_ID" AS region_id,
                    a."COMUNA_ID" AS comuna_id,
                    COALESCE(a."DIRECCION", '') AS direccion,
                    COALESCE(a."NECESIDADES_ESPECIALES", 'No') AS necesidades,
                    m."ESTADO",
                    m."FECHA_MATRICULA",
                    m."ESTABLECIMIENTO_REGION_ID" AS establecimiento_region_id,
                    m."ESTABLECIMIENTO_COMUNA_ID" AS establecimiento_comuna_id,
                    COALESCE(m."ESTABLECIMIENTO_NOMBRE", '') AS establecimiento_nombre,
                    COALESCE(m."ESTABLECIMIENTO_ANIO_ACADEMICO", '') AS establecimiento_anio,
                    COALESCE(m."ESTABLECIMIENTO_DEPENDENCIA", '') AS establecimiento_dependencia,
                    COALESCE(m."ESTABLECIMIENTO_REGION", '') AS establecimiento_region,
                    COALESCE(m."ESTABLECIMIENTO_COMUNA", '') AS establecimiento_comuna,
                    COALESCE(m."ESTABLECIMIENTO_DIRECCION", '') AS establecimiento_direccion
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                WHERE m."ID" = ?
                """, (rs, rowNum) -> new EnrollmentDetail(
                rs.getLong("ID"),
                rs.getLong("student_id"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getObject("FECHA_NACIMIENTO", LocalDate.class).toString(),
                rs.getString("genero"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                readNullableLong(rs, "region_id"),
                readNullableLong(rs, "comuna_id"),
                rs.getString("direccion"),
                rs.getString("necesidades"),
                rs.getString("ESTADO"),
                rs.getObject("FECHA_MATRICULA", LocalDate.class).toString(),
                mapEstablishment(rs),
                findGuardianByEnrollmentId(enrollmentId).orElse(new EnrollmentGuardian(
                        null, "", "", "", "", "", "", false
                )),
                findPickupContactsByEnrollmentId(enrollmentId),
                findDocumentsByEnrollmentId(enrollmentId)
        ), enrollmentId);

        return details.stream().findFirst();
    }

    @Override
    public Optional<Long> findStudentIdByRun(String run) {
        return jdbcTemplate.query("""
                SELECT "ID"
                FROM "ALUMNOS"
                WHERE UPPER("RUN") = UPPER(?)
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), run).stream().findFirst();
    }

    @Override
    public boolean hasActiveEnrollmentForStudent(Long studentId, Long excludeEnrollmentId) {
        String sql = """
                SELECT COUNT(1)
                FROM "MATRICULAS"
                WHERE "ALUMNO_ID" = ?
                  AND "ACTIVA" = TRUE
                """;

        Integer count;
        if (excludeEnrollmentId == null) {
            count = jdbcTemplate.queryForObject(sql, Integer.class, studentId);
        } else {
            count = jdbcTemplate.queryForObject(
                    sql + """
                            AND "ID" <> ?
                            """,
                    Integer.class,
                    studentId,
                    excludeEnrollmentId
            );
        }
        return count != null && count > 0;
    }

    @Override
    public Long createStudent(
            String run,
            String name,
            String lastName,
            LocalDate birthDate,
            String gender,
            Long regionId,
            Long communeId,
            String address,
            String specialNeeds
    ) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO "ALUMNOS" (
                    "RUN",
                    "NOMBRE",
                    "APELLIDOS",
                    "DIRECCION",
                    "FECHA_NACIMIENTO",
                    "GENERO",
                    "REGION_ID",
                    "COMUNA_ID",
                    "NECESIDADES_ESPECIALES",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, run, name, lastName, address, birthDate, gender, regionId, communeId, specialNeeds);
    }

    @Override
    public void updateStudent(
            Long studentId,
            String run,
            String name,
            String lastName,
            LocalDate birthDate,
            String gender,
            Long regionId,
            Long communeId,
            String address,
            String specialNeeds
    ) {
        jdbcTemplate.update("""
                UPDATE "ALUMNOS"
                SET "RUN" = ?,
                    "NOMBRE" = ?,
                    "APELLIDOS" = ?,
                    "DIRECCION" = ?,
                    "FECHA_NACIMIENTO" = ?,
                    "GENERO" = ?,
                    "REGION_ID" = ?,
                    "COMUNA_ID" = ?,
                    "NECESIDADES_ESPECIALES" = ?,
                    "ACTIVO" = TRUE
                WHERE "ID" = ?
                """, run, name, lastName, address, birthDate, gender, regionId, communeId, specialNeeds, studentId);
    }

    @Override
    public boolean existsActiveCourse(Long courseId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, Integer.class, courseId);
        return count != null && count > 0;
    }

    @Override
    public Long createEnrollment(
            Long studentId,
            Long courseId,
            String status,
            LocalDate enrollmentDate,
            EnrollmentEstablishment establishment
    ) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO "MATRICULAS" (
                    "ALUMNO_ID",
                    "CURSO_ID",
                    "ESTADO",
                    "FECHA_MATRICULA",
                    "ACTIVA",
                    "OBSERVACIONES",
                    "ESTABLECIMIENTO_REGION_ID",
                    "ESTABLECIMIENTO_COMUNA_ID",
                    "ESTABLECIMIENTO_NOMBRE",
                    "ESTABLECIMIENTO_ANIO_ACADEMICO",
                    "ESTABLECIMIENTO_DEPENDENCIA",
                    "ESTABLECIMIENTO_REGION",
                    "ESTABLECIMIENTO_COMUNA",
                    "ESTABLECIMIENTO_DIRECCION"
                )
                VALUES (?, ?, ?, ?, TRUE, '', ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class,
                studentId,
                courseId,
                status,
                enrollmentDate,
                establishment.regionId(),
                establishment.communeId(),
                establishment.name(),
                establishment.academicYear(),
                establishment.dependency(),
                establishment.region(),
                establishment.commune(),
                establishment.address()
        );
    }

    @Override
    public void updateEnrollment(
            Long enrollmentId,
            Long studentId,
            Long courseId,
            String status,
            LocalDate enrollmentDate,
            EnrollmentEstablishment establishment
    ) {
        jdbcTemplate.update("""
                UPDATE "MATRICULAS"
                SET "ALUMNO_ID" = ?,
                    "CURSO_ID" = ?,
                    "ESTADO" = ?,
                    "FECHA_MATRICULA" = ?,
                    "ESTABLECIMIENTO_REGION_ID" = ?,
                    "ESTABLECIMIENTO_COMUNA_ID" = ?,
                    "ESTABLECIMIENTO_NOMBRE" = ?,
                    "ESTABLECIMIENTO_ANIO_ACADEMICO" = ?,
                    "ESTABLECIMIENTO_DEPENDENCIA" = ?,
                    "ESTABLECIMIENTO_REGION" = ?,
                    "ESTABLECIMIENTO_COMUNA" = ?,
                    "ESTABLECIMIENTO_DIRECCION" = ?
                WHERE "ID" = ?
                """,
                studentId,
                courseId,
                status,
                enrollmentDate,
                establishment.regionId(),
                establishment.communeId(),
                establishment.name(),
                establishment.academicYear(),
                establishment.dependency(),
                establishment.region(),
                establishment.commune(),
                establishment.address(),
                enrollmentId
        );
    }

    @Override
    public void deactivateEnrollment(Long enrollmentId) {
        jdbcTemplate.update("""
                UPDATE "MATRICULAS"
                SET "ACTIVA" = FALSE,
                    "ESTADO" = 'INACTIVA'
                WHERE "ID" = ?
                """, enrollmentId);
        jdbcTemplate.update("""
                UPDATE "MATRICULA_APODERADOS"
                SET "ACTIVO" = FALSE
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);
        jdbcTemplate.update("""
                UPDATE "MATRICULA_RETIRO_RESPONSABLES"
                SET "ACTIVO" = FALSE
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);
    }

    @Override
    public void replaceGuardian(Long enrollmentId, EnrollmentGuardian guardian) {
        jdbcTemplate.update("""
                DELETE FROM "MATRICULA_APODERADOS"
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);
        jdbcTemplate.update("""
                INSERT INTO "MATRICULA_APODERADOS" (
                    "MATRICULA_ID",
                    "RUN",
                    "NOMBRE",
                    "APELLIDOS",
                    "TELEFONO",
                    "EMAIL",
                    "RELACION",
                    "AUTORIZADO_RETIRO",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                """, enrollmentId, guardian.run(), guardian.name(), guardian.lastName(), guardian.phone(),
                guardian.email(), guardian.relation(), guardian.authorizedPickup());
    }

    @Override
    public void replacePickupContacts(Long enrollmentId, List<EnrollmentPickupContact> contacts) {
        jdbcTemplate.update("""
                DELETE FROM "MATRICULA_RETIRO_RESPONSABLES"
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);
        for (EnrollmentPickupContact contact : contacts) {
            jdbcTemplate.update("""
                    INSERT INTO "MATRICULA_RETIRO_RESPONSABLES" (
                        "MATRICULA_ID",
                        "RUN",
                        "NOMBRE",
                        "APELLIDOS",
                        "TELEFONO",
                        "RELACION",
                        "AUTORIZADO_RETIRO",
                        "ACTIVO"
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
                    """, enrollmentId, contact.run(), contact.name(), contact.lastName(),
                    contact.phone(), contact.relation(), contact.authorizedPickup());
        }
    }

    @Override
    public void replaceDocuments(Long enrollmentId, List<EnrollmentDocument> documents) {
        jdbcTemplate.update("""
                DELETE FROM "MATRICULA_DOCUMENTOS"
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);

        for (EnrollmentDocument document : documents) {
            jdbcTemplate.update("""
                    INSERT INTO "MATRICULA_DOCUMENTOS" (
                        "MATRICULA_ID",
                        "DOCUMENTO_CLAVE",
                        "NOMBRE_ARCHIVO",
                        "DRIVE_FILE_ID",
                        "DRIVE_URL",
                        "ACTIVO"
                    )
                    VALUES (?, ?, ?, ?, ?, TRUE)
                    """,
                    enrollmentId,
                    document.documentKey(),
                    document.fileName(),
                    document.driveFileId(),
                    document.driveUrl()
            );
        }
    }

    private Optional<EnrollmentGuardian> findGuardianByEnrollmentId(Long enrollmentId) {
        return jdbcTemplate.query("""
                SELECT "ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", COALESCE("EMAIL", '') AS "EMAIL",
                       "RELACION", "AUTORIZADO_RETIRO"
                FROM "MATRICULA_APODERADOS"
                WHERE "MATRICULA_ID" = ?
                  AND "ACTIVO" = TRUE
                LIMIT 1
                """, (rs, rowNum) -> mapGuardian(rs), enrollmentId).stream().findFirst();
    }

    private List<EnrollmentPickupContact> findPickupContactsByEnrollmentId(Long enrollmentId) {
        return jdbcTemplate.query("""
                SELECT "ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "RELACION", "AUTORIZADO_RETIRO"
                FROM "MATRICULA_RETIRO_RESPONSABLES"
                WHERE "MATRICULA_ID" = ?
                  AND "ACTIVO" = TRUE
                ORDER BY "ID"
                """, (rs, rowNum) -> mapPickupContact(rs), enrollmentId);
    }

    private List<EnrollmentDocument> findDocumentsByEnrollmentId(Long enrollmentId) {
        return jdbcTemplate.query("""
                SELECT "ID", "DOCUMENTO_CLAVE", "NOMBRE_ARCHIVO", COALESCE("DRIVE_FILE_ID", '') AS "DRIVE_FILE_ID",
                       COALESCE("DRIVE_URL", '') AS "DRIVE_URL"
                FROM "MATRICULA_DOCUMENTOS"
                WHERE "MATRICULA_ID" = ?
                  AND "ACTIVO" = TRUE
                ORDER BY "ID"
                """, (rs, rowNum) -> new EnrollmentDocument(
                rs.getLong("ID"),
                rs.getString("DOCUMENTO_CLAVE"),
                rs.getString("NOMBRE_ARCHIVO"),
                rs.getString("DRIVE_FILE_ID"),
                rs.getString("DRIVE_URL")
        ), enrollmentId);
    }

    private EnrollmentEstablishment mapEstablishment(ResultSet rs) throws SQLException {
        return new EnrollmentEstablishment(
                readNullableLong(rs, "establecimiento_region_id"),
                readNullableLong(rs, "establecimiento_comuna_id"),
                rs.getString("establecimiento_nombre"),
                rs.getString("establecimiento_anio"),
                rs.getString("establecimiento_dependencia"),
                rs.getString("establecimiento_region"),
                rs.getString("establecimiento_comuna"),
                rs.getString("establecimiento_direccion")
        );
    }

    private EnrollmentGuardian mapGuardian(ResultSet rs) throws SQLException {
        return new EnrollmentGuardian(
                rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getString("TELEFONO"),
                rs.getString("EMAIL"),
                rs.getString("RELACION"),
                rs.getBoolean("AUTORIZADO_RETIRO")
        );
    }

    private EnrollmentPickupContact mapPickupContact(ResultSet rs) throws SQLException {
        return new EnrollmentPickupContact(
                rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getString("TELEFONO"),
                rs.getString("RELACION"),
                rs.getBoolean("AUTORIZADO_RETIRO")
        );
    }

    private Long readNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
