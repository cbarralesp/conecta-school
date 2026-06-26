package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.EnrollmentCourseOption;
import com.example.authhexagonal.domain.model.EnrollmentDetail;
import com.example.authhexagonal.domain.model.EnrollmentDocument;
import com.example.authhexagonal.domain.model.EnrollmentEstablishment;
import com.example.authhexagonal.domain.model.EnrollmentFamilyContact;
import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;
import com.example.authhexagonal.domain.model.EnrollmentGuardian;
import com.example.authhexagonal.domain.model.EnrollmentListItem;
import com.example.authhexagonal.domain.model.EnrollmentPickupContact;
import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;
import com.example.authhexagonal.domain.model.EnrollmentSummary;
import com.example.authhexagonal.domain.port.out.ManageEnrollmentsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
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
        String normalizedStatus = normalizeStatusFilter(status);
        boolean inactiveFilter = "INACTIVA".equals(normalizedStatus);
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
                WHERE (
                        (? = TRUE AND COALESCE(m."ACTIVA", FALSE) = FALSE)
                     OR (? = FALSE AND m."ACTIVA" = TRUE)
                )
                  AND (? = '' OR UPPER(a."NOMBRE" || ' ' || a."APELLIDOS" || ' ' || a."RUN" || ' ' || COALESCE(ap."NOMBRE", '') || ' ' || COALESCE(ap."APELLIDOS", ''))
                        LIKE '%' || UPPER(?) || '%')
                  AND (? = -1 OR c."ID" = ?)
                  AND (
                        ? = ''
                     OR (? = 'INACTIVA' AND UPPER(COALESCE(m."ESTADO", '')) IN ('INACTIVA', 'INACTIVO'))
                     OR UPPER(COALESCE(m."ESTADO", '')) = UPPER(?)
                  )
                """,
                (rs, rowNum) -> new EnrollmentSummary(
                        rs.getInt("total"),
                        rs.getInt("active_count"),
                        rs.getInt("pending_count"),
                        rs.getInt("course_count")
                ),
                inactiveFilter, inactiveFilter,
                normalizedSearch, normalizedSearch,
                normalizedCourseId, normalizedCourseId,
                normalizedStatus, normalizedStatus, normalizedStatus
        );
    }

    @Override
    public List<EnrollmentCourseOption> findActiveCourses() {
        return jdbcTemplate.query("""
                SELECT
                    c."ID",
                    c."CODIGO",
                    TRIM(
                        COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE")
                        || CASE
                            WHEN COALESCE(c."LETRA", '') = '' THEN ''
                            ELSE ' ' || c."LETRA"
                        END
                    ) AS "NOMBRE",
                    COALESCE(cn."NOMBRE", c."NIVEL") AS "NIVEL",
                    COALESCE(c."LETRA", '') AS "LETRA",
                    c."ANIO_ESCOLAR"
                    ,
                    COALESCE(cj."NOMBRE", c."JORNADA") AS "JORNADA"
                FROM "CURSOS" c
                LEFT JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = c."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                LEFT JOIN "CURSO_JORNADAS" cj
                  ON cj."ID" = c."JORNADA_ID"
                WHERE c."ACTIVO" = TRUE
                ORDER BY c."ANIO_ESCOLAR" DESC, COALESCE(cg."ORDEN", 999), c."LETRA", c."CODIGO"
                """, (rs, rowNum) -> new EnrollmentCourseOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("NIVEL"),
                rs.getString("LETRA"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA")
        ));
    }

    @Override
    public List<EnrollmentListItem> findEnrollments(String search, Long courseId, String status, Integer page, Integer size) {
        String normalizedSearch = search == null ? "" : search.trim();
        String normalizedStatus = normalizeStatusFilter(status);
        boolean inactiveFilter = "INACTIVA".equals(normalizedStatus);
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
                    TRIM(
                        COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE")
                        || CASE
                            WHEN COALESCE(c."LETRA", '') = '' THEN ''
                            ELSE ' ' || c."LETRA"
                        END
                    ) AS course_name,
                    COALESCE(ap."NOMBRE" || ' ' || ap."APELLIDOS", 'Sin apoderado') AS guardian_name,
                    CASE
                        WHEN COALESCE(m."ACTIVA", FALSE) = FALSE THEN 'INACTIVA'
                        ELSE UPPER(COALESCE(NULLIF(BTRIM(m."ESTADO"), ''), 'ACTIVO'))
                    END AS "ESTADO",
                    m."FECHA_MATRICULA"
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                LEFT JOIN "CURSO_GRADOS" cg ON cg."ID" = c."GRADO_ID"
                LEFT JOIN "MATRICULA_APODERADOS" ap ON ap."MATRICULA_ID" = m."ID" AND ap."ACTIVO" = TRUE
                WHERE (
                        (? = TRUE AND COALESCE(m."ACTIVA", FALSE) = FALSE)
                     OR (? = FALSE AND m."ACTIVA" = TRUE)
                )
                  AND (? = '' OR UPPER(a."NOMBRE" || ' ' || a."APELLIDOS" || ' ' || a."RUN" || ' ' || COALESCE(ap."NOMBRE", '') || ' ' || COALESCE(ap."APELLIDOS", ''))
                        LIKE '%' || UPPER(?) || '%')
                  AND (? = -1 OR c."ID" = ?)
                  AND (
                        ? = ''
                     OR (? = 'INACTIVA' AND UPPER(COALESCE(m."ESTADO", '')) IN ('INACTIVA', 'INACTIVO'))
                     OR UPPER(COALESCE(m."ESTADO", '')) = UPPER(?)
                  )
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
                inactiveFilter, inactiveFilter,
                normalizedSearch, normalizedSearch,
                normalizedCourseId, normalizedCourseId,
                normalizedStatus, normalizedStatus, normalizedStatus,
                normalizedSize, offset
        }
                : new Object[] {
                inactiveFilter, inactiveFilter,
                normalizedSearch, normalizedSearch,
                normalizedCourseId, normalizedCourseId,
                normalizedStatus, normalizedStatus, normalizedStatus
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
                    TRIM(
                        COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE")
                        || CASE
                            WHEN COALESCE(c."LETRA", '') = '' THEN ''
                            ELSE ' ' || c."LETRA"
                        END
                    ) AS course_name,
                    COALESCE(cn."NOMBRE", c."NIVEL") AS course_level,
                    COALESCE(c."LETRA", '') AS course_letter,
                    c."ANIO_ESCOLAR" AS course_school_year,
                    COALESCE(cj."NOMBRE", c."JORNADA") AS course_schedule_type,
                    a."REGION_ID" AS region_id,
                    a."COMUNA_ID" AS comuna_id,
                    COALESCE(a."DIRECCION", '') AS direccion,
                    COALESCE(a."CONVIVE_CON", '') AS vive_con,
                    COALESCE(a."ALERGIAS", '') AS alergias,
                    COALESCE(a."DIAGNOSTICOS_ESPECIALISTAS", '') AS diagnosticos_especialistas,
                    COALESCE(a."CONTACTO_EMERGENCIA", '') AS contacto_emergencia,
                    COALESCE(a."NECESIDADES_ESPECIALES", 'No') AS necesidades,
                    CASE
                        WHEN COALESCE(m."ACTIVA", FALSE) = FALSE THEN 'INACTIVA'
                        ELSE UPPER(COALESCE(NULLIF(BTRIM(m."ESTADO"), ''), 'ACTIVO'))
                    END AS "ESTADO",
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
                LEFT JOIN "CURSO_GRADOS" cg ON cg."ID" = c."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn ON cn."ID" = cg."NIVEL_ID"
                LEFT JOIN "CURSO_JORNADAS" cj ON cj."ID" = c."JORNADA_ID"
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
                rs.getString("course_level"),
                rs.getString("course_letter"),
                rs.getInt("course_school_year"),
                rs.getString("course_schedule_type"),
                readNullableLong(rs, "region_id"),
                readNullableLong(rs, "comuna_id"),
                rs.getString("direccion"),
                rs.getString("vive_con"),
                rs.getString("alergias"),
                rs.getString("diagnosticos_especialistas"),
                rs.getString("contacto_emergencia"),
                rs.getString("necesidades"),
                rs.getString("ESTADO"),
                rs.getObject("FECHA_MATRICULA", LocalDate.class).toString(),
                mapEstablishment(rs),
                findGuardianByEnrollmentId(enrollmentId).orElse(new EnrollmentGuardian(
                        null, "", "", "", "", "", "", "", "", "", false
                )),
                findFatherByEnrollmentId(enrollmentId).orElse(emptyFamilyContact()),
                findMotherByEnrollmentId(enrollmentId).orElse(emptyFamilyContact()),
                findPickupContactsByEnrollmentId(enrollmentId),
                findDocumentsByEnrollmentId(enrollmentId),
                findStudentAccessByRun(rs.getString("RUN")).orElse(new EnrollmentStudentAccess(
                        false, false, "", "", false, "", "Sin cuenta"
                )),
                findGuardianByEnrollmentId(enrollmentId)
                        .flatMap(guardian -> findGuardianAccessByRun(guardian.run()))
                        .orElse(new EnrollmentGuardianAccess(
                                false, false, "", "", false, "", "Sin cuenta"
                        ))
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
    public Optional<EnrollmentStudentAccess> findStudentAccessByRun(String run) {
        return jdbcTemplate.query("""
                SELECT
                    u."USUARIO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email,
                    COALESCE(aus."ESTADO", 'Activo') AS estado
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                  AND UPPER(COALESCE(r."CODIGO", '')) = 'ALUMNO'
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> new EnrollmentStudentAccess(
                true,
                true,
                rs.getString("USUARIO"),
                "",
                false,
                rs.getString("email"),
                rs.getString("estado")
        ), run).stream().findFirst();
    }

    @Override
    public Optional<EnrollmentGuardianAccess> findGuardianAccessByRun(String run) {
        return jdbcTemplate.query("""
                SELECT
                    u."USUARIO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email,
                    COALESCE(aus."ESTADO", 'Activo') AS estado
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                  AND UPPER(COALESCE(r."CODIGO", '')) = 'APODERADO'
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> new EnrollmentGuardianAccess(
                true,
                true,
                rs.getString("USUARIO"),
                "",
                false,
                rs.getString("email"),
                rs.getString("estado")
        ), run).stream().findFirst();
    }

    @Override
    public String previewStudentUsername(String studentRun, String studentName, String studentLastName) {
        return findUserRecordByRunAndRole(studentRun, "ALUMNO")
                .map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> formatStudentUsernameFromRun(studentRun));
    }

    @Override
    public String previewGuardianUsername(String guardianRun, String guardianName, String guardianLastName) {
        return findUserRecordByRunAndRole(guardianRun, "APODERADO")
                .map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> generateUniqueGuardianUsername(guardianName, guardianLastName));
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
            String livesWith,
            String allergies,
            String specialistDiagnoses,
            String emergencyContact,
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
                    "CONVIVE_CON",
                    "ALERGIAS",
                    "DIAGNOSTICOS_ESPECIALISTAS",
                    "CONTACTO_EMERGENCIA",
                    "NECESIDADES_ESPECIALES",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, run, name, lastName, address, birthDate, gender, regionId, communeId, livesWith, allergies, specialistDiagnoses, emergencyContact, specialNeeds);
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
            String livesWith,
            String allergies,
            String specialistDiagnoses,
            String emergencyContact,
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
                    "CONVIVE_CON" = ?,
                    "ALERGIAS" = ?,
                    "DIAGNOSTICOS_ESPECIALISTAS" = ?,
                    "CONTACTO_EMERGENCIA" = ?,
                    "NECESIDADES_ESPECIALES" = ?,
                    "ACTIVO" = TRUE
                WHERE "ID" = ?
                """, run, name, lastName, address, birthDate, gender, regionId, communeId, livesWith, allergies, specialistDiagnoses, emergencyContact, specialNeeds, studentId);
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
    public Long findOrCreateCourse(String baseName, String level, String letter, int schoolYear, String scheduleType) {
        String normalizedName = normalizeGradeDisplayName(baseName);
        String normalizedLevel = normalizeLevelDisplayName(level);
        String normalizedLetter = letter == null ? "" : letter.trim().toUpperCase();
        String normalizedSchedule = normalizeScheduleDisplayName(scheduleType);

        List<Long> existingIds = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CURSOS"
                WHERE UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                  AND UPPER(TRANSLATE("NIVEL", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                  AND UPPER(COALESCE("LETRA", '')) = UPPER(?)
                  AND "ANIO_ESCOLAR" = ?
                  AND UPPER(TRANSLATE("JORNADA", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                  AND "ACTIVO" = TRUE
                ORDER BY "ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), normalizedName, normalizedLevel, normalizedLetter, schoolYear, normalizedSchedule);

        if (!existingIds.isEmpty()) {
            return existingIds.getFirst();
        }

        Long gradeId = resolveGradeId(normalizedName);
        Long scheduleId = resolveScheduleId(normalizedSchedule);
        String code = buildCourseCode(gradeId, normalizedName, normalizedLetter, schoolYear);

        Long courseId = jdbcTemplate.queryForObject("""
                INSERT INTO "CURSOS" ("CODIGO", "NOMBRE", "NIVEL", "LETRA", "ANIO_ESCOLAR", "JORNADA", "GRADO_ID", "JORNADA_ID", "ACTIVO")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, code, normalizedName, normalizedLevel, normalizedLetter, schoolYear, normalizedSchedule, gradeId, scheduleId);

        ensureCourseSubjectsFromReference(courseId, gradeId);
        return courseId;
    }

    @Override
    public Long createEnrollment(
            Long studentId,
            Long courseId,
            String status,
            LocalDate enrollmentDate,
            EnrollmentEstablishment establishment
    ) {
        Long enrollmentId = jdbcTemplate.queryForObject("""
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
        syncLegacyCourseStudent(courseId, studentId);
        return enrollmentId;
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
        deactivateOtherLegacyCourseAssignments(studentId, courseId);
        syncLegacyCourseStudent(courseId, studentId);
    }

    @Override
    public boolean isEnrollmentInactive(Long enrollmentId) {
        return jdbcTemplate.query("""
                SELECT
                    NOT COALESCE("ACTIVA", FALSE) AS inactive_by_flag,
                    COALESCE("ESTADO", '') AS status
                FROM "MATRICULAS"
                WHERE "ID" = ?
                """, rs -> {
            if (!rs.next()) {
                return false;
            }
            return rs.getBoolean("inactive_by_flag")
                    || "INACTIVA".equalsIgnoreCase(rs.getString("status"));
        }, enrollmentId);
    }

    @Override
    public void deactivateEnrollment(Long enrollmentId) {
        Long studentId = jdbcTemplate.query("""
                SELECT "ALUMNO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ALUMNO_ID"), enrollmentId).stream().findFirst().orElse(null);

        Long courseId = jdbcTemplate.query("""
                SELECT "CURSO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("CURSO_ID"), enrollmentId).stream().findFirst().orElse(null);

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

        if (studentId != null && courseId != null) {
            deactivateLegacyCourseStudent(courseId, studentId);
        }
    }

    @Override
    public void reactivateEnrollment(Long enrollmentId) {
        Long studentId = jdbcTemplate.query("""
                SELECT "ALUMNO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ALUMNO_ID"), enrollmentId).stream().findFirst().orElse(null);

        Long courseId = jdbcTemplate.query("""
                SELECT "CURSO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("CURSO_ID"), enrollmentId).stream().findFirst().orElse(null);

        jdbcTemplate.update("""
                UPDATE "MATRICULAS"
                SET "ACTIVA" = TRUE,
                    "ESTADO" = 'ACTIVO'
                WHERE "ID" = ?
                """, enrollmentId);
        jdbcTemplate.update("""
                UPDATE "MATRICULA_APODERADOS"
                SET "ACTIVO" = TRUE
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);
        jdbcTemplate.update("""
                UPDATE "MATRICULA_RETIRO_RESPONSABLES"
                SET "ACTIVO" = TRUE
                WHERE "MATRICULA_ID" = ?
                """, enrollmentId);

        if (studentId != null && courseId != null) {
            deactivateOtherLegacyCourseAssignments(studentId, courseId);
            syncLegacyCourseStudent(courseId, studentId);
        }
    }

    @Override
    public void hardDeleteEnrollment(Long enrollmentId) {
        Long studentId = jdbcTemplate.query("""
                SELECT "ALUMNO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ALUMNO_ID"), enrollmentId).stream().findFirst().orElse(null);

        Long courseId = jdbcTemplate.query("""
                SELECT "CURSO_ID"
                FROM "MATRICULAS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("CURSO_ID"), enrollmentId).stream().findFirst().orElse(null);

        if (studentId == null) {
            jdbcTemplate.update("DELETE FROM \"MATRICULAS\" WHERE \"ID\" = ?", enrollmentId);
            return;
        }

        deleteEnrollmentChildren(enrollmentId);
        jdbcTemplate.update("DELETE FROM \"MATRICULAS\" WHERE \"ID\" = ?", enrollmentId);

        if (courseId != null) {
            jdbcTemplate.update("""
                    DELETE FROM "CURSO_ALUMNOS"
                    WHERE "CURSO_ID" = ?
                      AND "ALUMNO_ID" = ?
                    """, courseId, studentId);
        }

        Integer remainingEnrollments = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "MATRICULAS"
                WHERE "ALUMNO_ID" = ?
                """, Integer.class, studentId);

        if (remainingEnrollments != null && remainingEnrollments > 0) {
            return;
        }

        String studentRun = jdbcTemplate.query("""
                SELECT "RUN"
                FROM "ALUMNOS"
                WHERE "ID" = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getString("RUN"), studentId).stream().findFirst().orElse(null);

        if (tableExists("CURSO_ALUMNOS")) {
            jdbcTemplate.update("DELETE FROM \"CURSO_ALUMNOS\" WHERE \"ALUMNO_ID\" = ?", studentId);
        }
        if (tableExists("CALIFICACIONES")) {
            jdbcTemplate.update("DELETE FROM \"CALIFICACIONES\" WHERE \"ALUMNO_ID\" = ?", studentId);
        }
        if (tableExists("ASISTENCIA_DETALLES")) {
            jdbcTemplate.update("DELETE FROM \"ASISTENCIA_DETALLES\" WHERE \"ALUMNO_ID\" = ?", studentId);
        }
        if (tableExists("ALUMNO_DOCUMENTO_ESTADO")) {
            jdbcTemplate.update("DELETE FROM \"ALUMNO_DOCUMENTO_ESTADO\" WHERE \"ALUMNO_ID\" = ?", studentId);
        }

        jdbcTemplate.update("DELETE FROM \"ALUMNOS\" WHERE \"ID\" = ?", studentId);

        if (studentRun != null && !studentRun.isBlank()) {
            deleteStudentAccessUser(studentRun);
        }
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
                    "FECHA_NACIMIENTO",
                    "DIRECCION",
                    "TELEFONO",
                    "EMAIL",
                    "ESCOLARIDAD",
                    "RELACION",
                    "AUTORIZADO_RETIRO",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                """,
                enrollmentId,
                nullIfBlank(guardian.run()),
                nullIfBlank(guardian.name()),
                nullIfBlank(guardian.lastName()),
                parseNullableDate(guardian.birthDate()),
                nullIfBlank(guardian.address()),
                nullIfBlank(guardian.phone()),
                nullIfBlank(guardian.email()),
                nullIfBlank(guardian.education()),
                nullIfBlank(guardian.relation()),
                guardian.authorizedPickup());
    }

    @Override
    public void replaceFather(Long enrollmentId, EnrollmentFamilyContact father) {
        replaceFamilyContact("MATRICULA_PADRES", enrollmentId, father);
    }

    @Override
    public void replaceMother(Long enrollmentId, EnrollmentFamilyContact mother) {
        replaceFamilyContact("MATRICULA_MADRES", enrollmentId, mother);
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

    @Override
    public EnrollmentStudentAccess provisionStudentAccess(
            String studentRun,
            String studentName,
            String studentLastName,
            String username,
            String guardianEmail,
            String guardianPhone,
            String encodedPassword,
            boolean notifyByEmail
    ) {
        Long roleId = ensureRoleId(
                "ALUMNO",
                "Alumno",
                "Usuario estudiante con acceso a su informacion academica.",
                "Nivel 6",
                "Visualizacion personal de cursos, horario, asistencia y calificaciones.",
                7
        );
        Optional<AccessUserRecord> existingUser = findUserRecordByRunAndRole(studentRun, "ALUMNO");
        String requestedUsername = username == null ? "" : username.trim();
        String resolvedUsername = !requestedUsername.isBlank()
                ? requestedUsername
                : existingUser.map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> formatStudentUsernameFromRun(studentRun));
        String email = existingUser.map(AccessUserRecord::email)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> buildStudentEmail(resolvedUsername));
        Long personId = upsertPerson(studentRun, studentName, studentLastName, email, guardianPhone, existingUser.map(AccessUserRecord::personId).orElse(null));

        Long userId = existingUser.map(AccessUserRecord::userId)
                .orElseGet(() -> insertStudentUser(personId, resolvedUsername, encodedPassword));

        if (existingUser.isPresent()) {
            updateStudentUser(userId, personId, resolvedUsername, encodedPassword);
        }

        upsertStudentUserSettings(userId, roleId);

        return new EnrollmentStudentAccess(
                true,
                true,
                resolvedUsername,
                "",
                notifyByEmail,
                notifyByEmail ? guardianEmail : email,
                "Activo"
        );
    }

    @Override
    public EnrollmentGuardianAccess provisionGuardianAccess(
            String guardianRun,
            String guardianName,
            String guardianLastName,
            String guardianEmail,
            String guardianPhone,
            String encodedPassword,
            boolean notifyByEmail
    ) {
        Long roleId = ensureRoleId(
                "APODERADO",
                "Apoderado",
                "Usuario apoderado con acceso al seguimiento academico del estudiante.",
                "Nivel 5",
                "Visualizacion de informacion, asistencia y comunicacion con el establecimiento.",
                6
        );
        Optional<AccessUserRecord> existingUser = findUserRecordByRunAndRole(guardianRun, "APODERADO");
        String username = existingUser.map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> generateUniqueGuardianUsername(guardianName, guardianLastName));
        String email = existingUser.map(AccessUserRecord::email)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> guardianEmail == null || guardianEmail.isBlank()
                        ? buildGuardianEmail(username)
                        : guardianEmail.trim().toLowerCase());
        Long personId = upsertPerson(guardianRun, guardianName, guardianLastName, email, guardianPhone, existingUser.map(AccessUserRecord::personId).orElse(null));

        Long userId = existingUser.map(AccessUserRecord::userId)
                .orElseGet(() -> insertStudentUser(personId, username, encodedPassword));

        if (existingUser.isPresent()) {
            updateStudentUser(userId, personId, username, encodedPassword);
        }

        upsertStudentUserSettings(userId, roleId);

        return new EnrollmentGuardianAccess(
                true,
                true,
                username,
                "",
                notifyByEmail,
                notifyByEmail ? email : email,
                "Activo"
        );
    }

    private Optional<EnrollmentGuardian> findGuardianByEnrollmentId(Long enrollmentId) {
        return jdbcTemplate.query("""
                SELECT "ID", "RUN", "NOMBRE", "APELLIDOS", "FECHA_NACIMIENTO", COALESCE("DIRECCION", '') AS "DIRECCION",
                       "TELEFONO", COALESCE("EMAIL", '') AS "EMAIL", COALESCE("ESCOLARIDAD", '') AS "ESCOLARIDAD",
                       "RELACION", "AUTORIZADO_RETIRO"
                FROM "MATRICULA_APODERADOS"
                WHERE "MATRICULA_ID" = ?
                  AND "ACTIVO" = TRUE
                LIMIT 1
                """, (rs, rowNum) -> mapGuardian(rs), enrollmentId).stream().findFirst();
    }

    private Optional<EnrollmentFamilyContact> findFatherByEnrollmentId(Long enrollmentId) {
        return findFamilyContactByEnrollmentId("MATRICULA_PADRES", enrollmentId);
    }

    private Optional<EnrollmentFamilyContact> findMotherByEnrollmentId(Long enrollmentId) {
        return findFamilyContactByEnrollmentId("MATRICULA_MADRES", enrollmentId);
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
                rs.getDate("FECHA_NACIMIENTO") == null ? "" : rs.getDate("FECHA_NACIMIENTO").toLocalDate().toString(),
                rs.getString("DIRECCION"),
                rs.getString("TELEFONO"),
                rs.getString("EMAIL"),
                rs.getString("ESCOLARIDAD"),
                rs.getString("RELACION"),
                rs.getBoolean("AUTORIZADO_RETIRO")
        );
    }

    private Optional<EnrollmentFamilyContact> findFamilyContactByEnrollmentId(String tableName, Long enrollmentId) {
        if (!tableExists(tableName)) {
            return Optional.empty();
        }

        String sql = """
                SELECT "ID", "RUN", "NOMBRE", "APELLIDOS", "FECHA_NACIMIENTO", COALESCE("DIRECCION", '') AS "DIRECCION",
                       COALESCE("TELEFONO", '') AS "TELEFONO", COALESCE("EMAIL", '') AS "EMAIL", COALESCE("ESCOLARIDAD", '') AS "ESCOLARIDAD"
                FROM "%s"
                WHERE "MATRICULA_ID" = ?
                  AND "ACTIVO" = TRUE
                LIMIT 1
                """.formatted(tableName);
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapFamilyContact(rs), enrollmentId).stream().findFirst();
    }

    private EnrollmentFamilyContact mapFamilyContact(ResultSet rs) throws SQLException {
        return new EnrollmentFamilyContact(
                rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getDate("FECHA_NACIMIENTO") == null ? "" : rs.getDate("FECHA_NACIMIENTO").toLocalDate().toString(),
                rs.getString("DIRECCION"),
                rs.getString("TELEFONO"),
                rs.getString("EMAIL"),
                rs.getString("ESCOLARIDAD")
        );
    }

    private EnrollmentFamilyContact emptyFamilyContact() {
        return new EnrollmentFamilyContact(null, "", "", "", "", "", "", "", "");
    }

    private void replaceFamilyContact(String tableName, Long enrollmentId, EnrollmentFamilyContact contact) {
        if (!tableExists(tableName)) {
            return;
        }

        jdbcTemplate.update("""
                DELETE FROM "%s"
                WHERE "MATRICULA_ID" = ?
                """.formatted(tableName), enrollmentId);

        if (isBlankFamilyContact(contact)) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "%s" (
                    "MATRICULA_ID",
                    "RUN",
                    "NOMBRE",
                    "APELLIDOS",
                    "FECHA_NACIMIENTO",
                    "DIRECCION",
                    "TELEFONO",
                    "EMAIL",
                    "ESCOLARIDAD",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                """.formatted(tableName),
                enrollmentId,
                nullIfBlank(contact.run()),
                nullIfBlank(contact.name()),
                nullIfBlank(contact.lastName()),
                parseNullableDate(contact.birthDate()),
                nullIfBlank(contact.address()),
                nullIfBlank(contact.phone()),
                nullIfBlank(contact.email()),
                nullIfBlank(contact.education()));
    }

    private boolean isBlankFamilyContact(EnrollmentFamilyContact contact) {
        return contact == null
                || (isBlank(contact.run())
                && isBlank(contact.name())
                && isBlank(contact.lastName())
                && isBlank(contact.birthDate())
                && isBlank(contact.address())
                && isBlank(contact.phone())
                && isBlank(contact.email())
                && isBlank(contact.education()));
    }

    private java.sql.Date parseNullableDate(String value) {
        return isBlank(value) ? null : java.sql.Date.valueOf(value.trim());
    }

    private String nullIfBlank(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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

    private void syncLegacyCourseStudent(Long courseId, Long studentId) {
        if (!tableExists("CURSO_ALUMNOS")) {
            return;
        }

        deactivateOtherLegacyCourseAssignments(studentId, courseId);

        int updated = jdbcTemplate.update("""
                UPDATE "CURSO_ALUMNOS"
                SET "CURSO_ID" = ?,
                    "ACTIVO" = TRUE,
                    "FECHA_ASIGNACION" = COALESCE("FECHA_ASIGNACION", CURRENT_DATE)
                WHERE "ALUMNO_ID" = ?
                """, courseId, studentId);

        if (updated == 0) {
            jdbcTemplate.update("""
                    INSERT INTO "CURSO_ALUMNOS" ("CURSO_ID", "ALUMNO_ID", "FECHA_ASIGNACION", "ACTIVO")
                    VALUES (?, ?, CURRENT_DATE, TRUE)
                    """, courseId, studentId);
        }
    }

    private void deactivateOtherLegacyCourseAssignments(Long studentId, Long keepCourseId) {
        if (!tableExists("CURSO_ALUMNOS")) {
            return;
        }

        jdbcTemplate.update("""
                UPDATE "CURSO_ALUMNOS"
                SET "ACTIVO" = FALSE
                WHERE "ALUMNO_ID" = ?
                  AND "CURSO_ID" <> ?
                """, studentId, keepCourseId);
    }

    private void deactivateLegacyCourseStudent(Long courseId, Long studentId) {
        if (!tableExists("CURSO_ALUMNOS")) {
            return;
        }

        jdbcTemplate.update("""
                UPDATE "CURSO_ALUMNOS"
                SET "ACTIVO" = FALSE
                WHERE "CURSO_ID" = ?
                  AND "ALUMNO_ID" = ?
                """, courseId, studentId);
    }

    private void deleteEnrollmentChildren(Long enrollmentId) {
        if (tableExists("MATRICULA_DOCUMENTOS")) {
            jdbcTemplate.update("DELETE FROM \"MATRICULA_DOCUMENTOS\" WHERE \"MATRICULA_ID\" = ?", enrollmentId);
        }
        if (tableExists("MATRICULA_MADRES")) {
            jdbcTemplate.update("DELETE FROM \"MATRICULA_MADRES\" WHERE \"MATRICULA_ID\" = ?", enrollmentId);
        }
        if (tableExists("MATRICULA_PADRES")) {
            jdbcTemplate.update("DELETE FROM \"MATRICULA_PADRES\" WHERE \"MATRICULA_ID\" = ?", enrollmentId);
        }
        if (tableExists("MATRICULA_RETIRO_RESPONSABLES")) {
            jdbcTemplate.update("DELETE FROM \"MATRICULA_RETIRO_RESPONSABLES\" WHERE \"MATRICULA_ID\" = ?", enrollmentId);
        }
        if (tableExists("MATRICULA_APODERADOS")) {
            jdbcTemplate.update("DELETE FROM \"MATRICULA_APODERADOS\" WHERE \"MATRICULA_ID\" = ?", enrollmentId);
        }
    }

    private void deleteStudentAccessUser(String studentRun) {
        findUserRecordByRunAndRole(studentRun, "ALUMNO").ifPresent(record -> {
            Long userId = record.userId();
            Long personId = record.personId();
            detachUserFromOwnedContent(userId);
            jdbcTemplate.update("DELETE FROM \"ADMIN_USER_MODULE_ACCESS\" WHERE \"USUARIO_ID\" = ?", userId);
            jdbcTemplate.update("DELETE FROM \"ADMIN_USER_SETTINGS\" WHERE \"USUARIO_ID\" = ?", userId);
            jdbcTemplate.update("DELETE FROM \"ADMIN_AUDIT_LOGS\" WHERE \"USUARIO_ID\" = ?", userId);
            jdbcTemplate.update("DELETE FROM \"USUARIOS\" WHERE \"ID\" = ?", userId);

            if (!personStillLinked(personId)) {
                jdbcTemplate.update("DELETE FROM \"PERSONAS\" WHERE \"ID\" = ?", personId);
            }
        });
    }

    private void detachUserFromOwnedContent(Long userId) {
        if (tableExists("CLASES_PLANIFICACION_DOCUMENTOS")) {
            jdbcTemplate.update("""
                    UPDATE "CLASES_PLANIFICACION_DOCUMENTOS"
                    SET "CREADO_POR_USUARIO_ID" = NULL
                    WHERE "CREADO_POR_USUARIO_ID" = ?
                    """, userId);
        }
        if (tableExists("CLASES_PLANIFICACION")) {
            jdbcTemplate.update("""
                    UPDATE "CLASES_PLANIFICACION"
                    SET "CREADO_POR_USUARIO_ID" = NULL
                    WHERE "CREADO_POR_USUARIO_ID" = ?
                    """, userId);
        }
        if (tableExists("UNIDADES_PLANIFICACION")) {
            jdbcTemplate.update("""
                    UPDATE "UNIDADES_PLANIFICACION"
                    SET "CREADO_POR_USUARIO_ID" = NULL
                    WHERE "CREADO_POR_USUARIO_ID" = ?
                    """, userId);
        }
    }

    private boolean personStillLinked(Long personId) {
        Integer userCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "USUARIOS"
                WHERE "PERSONA_ID" = ?
                """, Integer.class, personId);
        Integer teacherCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "PROFESORES"
                WHERE "PERSONA_ID" = ?
                """, Integer.class, personId);
        return (userCount != null && userCount > 0) || (teacherCount != null && teacherCount > 0);
    }

    private void ensureCourseSubjectsFromReference(Long courseId, Long gradeId) {
        if (courseId == null || !tableExists("CURSO_ASIGNATURAS")) {
            return;
        }

        Long referenceCourseId = findReferenceCourseId(courseId, gradeId);
        if (referenceCourseId == null) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "CURSO_ASIGNATURAS" ("CURSO_ID", "ASIGNATURA_ID", "ACTIVA")
                SELECT ?, source."ASIGNATURA_ID", TRUE
                FROM (
                    SELECT DISTINCT ca."ASIGNATURA_ID"
                    FROM "CURSO_ASIGNATURAS" ca
                    WHERE ca."CURSO_ID" = ?
                      AND ca."ACTIVA" = TRUE
                    UNION
                    SELECT DISTINCT cd."ASIGNATURA_ID"
                    FROM "CARGAS_DOCENTES" cd
                    WHERE cd."CURSO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                ) source
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "CURSO_ASIGNATURAS" target
                    WHERE target."CURSO_ID" = ?
                      AND target."ASIGNATURA_ID" = source."ASIGNATURA_ID"
                )
                """, courseId, referenceCourseId, referenceCourseId, courseId);
    }

    private Long findReferenceCourseId(Long courseId, Long gradeId) {
        if (gradeId != null) {
            List<Long> sameGrade = jdbcTemplate.query("""
                    SELECT c."ID"
                    FROM "CURSOS" c
                    WHERE c."ID" <> ?
                      AND c."ACTIVO" = TRUE
                      AND c."GRADO_ID" = ?
                      AND EXISTS (
                          SELECT 1
                          FROM "CURSO_ASIGNATURAS" ca
                          WHERE ca."CURSO_ID" = c."ID"
                            AND ca."ACTIVA" = TRUE
                      )
                    ORDER BY c."ANIO_ESCOLAR" DESC, c."ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), courseId, gradeId);
            if (!sameGrade.isEmpty()) {
                return sameGrade.getFirst();
            }
        }

        List<Long> anyReference = jdbcTemplate.query("""
                SELECT c."ID"
                FROM "CURSOS" c
                WHERE c."ID" <> ?
                  AND c."ACTIVO" = TRUE
                  AND EXISTS (
                      SELECT 1
                      FROM "CURSO_ASIGNATURAS" ca
                      WHERE ca."CURSO_ID" = c."ID"
                        AND ca."ACTIVA" = TRUE
                  )
                ORDER BY c."ANIO_ESCOLAR" DESC, c."ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), courseId);
        return anyReference.isEmpty() ? null : anyReference.getFirst();
    }

    private Long resolveGradeId(String courseName) {
        if (courseName == null || courseName.isBlank() || !tableExists("CURSO_GRADOS")) {
            return null;
        }

        List<Long> ids = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CURSO_GRADOS"
                WHERE UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                  AND "ACTIVO" = TRUE
                ORDER BY "ORDEN"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), courseName);

        return ids.isEmpty() ? null : ids.getFirst();
    }

    private Long resolveScheduleId(String scheduleType) {
        if (scheduleType == null || scheduleType.isBlank() || !tableExists("CURSO_JORNADAS")) {
            return null;
        }

        List<Long> ids = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CURSO_JORNADAS"
                WHERE (
                    UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                    OR UPPER(TRANSLATE("CODIGO", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(?, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                )
                  AND "ACTIVO" = TRUE
                ORDER BY "ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), scheduleType, scheduleType);

        return ids.isEmpty() ? null : ids.getFirst();
    }

    private String normalizeGradeDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "PREKINDER" -> "Prekínder";
            case "KINDER" -> "Kínder";
            case "1 BASICO" -> "1 Básico";
            case "2 BASICO" -> "2 Básico";
            case "3 BASICO" -> "3 Básico";
            case "4 BASICO" -> "4 Básico";
            case "5 BASICO" -> "5 Básico";
            case "6 BASICO" -> "6 Básico";
            case "7 BASICO" -> "7 Básico";
            case "8 BASICO" -> "8 Básico";
            case "1 MEDIO" -> "1 Medio";
            case "2 MEDIO" -> "2 Medio";
            case "3 MEDIO" -> "3 Medio";
            case "4 MEDIO" -> "4 Medio";
            default -> value == null ? "" : value.trim();
        };
    }

    private String normalizeLevelDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "INICIAL" -> "Inicial";
            case "BASICO" -> "Básico";
            case "MEDIO" -> "Medio";
            default -> value == null ? "" : value.trim();
        };
    }

    private String normalizeScheduleDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "MANANA" -> "Mañana";
            case "TARDE" -> "Tarde";
            case "COMPLETA" -> "Completa";
            default -> value == null ? "" : value.trim();
        };
    }

    private String normalizeText(String value) {
        return Normalizer.normalize(value == null ? "" : value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase();
    }

    private String buildCourseCode(Long gradeId, String courseName, String letter, int schoolYear) {
        String token = resolveCourseCodeToken(gradeId, courseName);
        String normalizedLetter = (letter == null || letter.isBlank()) ? "A" : letter.trim().toUpperCase();
        String baseCode = token + normalizedLetter + "-" + schoolYear;

        if (!courseCodeExists(baseCode)) {
            return baseCode;
        }

        int suffix = 2;
        while (courseCodeExists(baseCode + "-" + suffix)) {
            suffix += 1;
        }
        return baseCode + "-" + suffix;
    }

    private String resolveCourseCodeToken(Long gradeId, String courseName) {
        if (gradeId != null) {
            List<String> tokens = jdbcTemplate.query("""
                    SELECT COALESCE(NULLIF("CODIGO_TOKEN", ''), REGEXP_REPLACE(UPPER("NOMBRE"), '[^A-Z0-9]', '', 'g'))
                    FROM "CURSO_GRADOS"
                    WHERE "ID" = ?
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getString(1), gradeId);
            if (!tokens.isEmpty() && tokens.getFirst() != null && !tokens.getFirst().isBlank()) {
                return tokens.getFirst().trim().toUpperCase();
            }
        }

        String normalized = normalizeText(courseName).replaceAll("[^A-Z0-9]", "");
        return normalized.isBlank() ? "CUR" : normalized;
    }

    private boolean courseCodeExists(String code) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE UPPER("CODIGO") = UPPER(?)
                """, Integer.class, code);
        return count != null && count > 0;
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ?
                """, Integer.class, tableName);
        return count != null && count > 0;
    }

    private String normalizeStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return "";
        }

        String normalized = status.trim().toUpperCase();
        if ("INACTIVO".equals(normalized)) {
            return "INACTIVA";
        }
        return normalized;
    }

    private Long ensureRoleId(
            String code,
            String name,
            String description,
            String levelLabel,
            String scopeSummary,
            int visualOrder
    ) {
        jdbcTemplate.update("""
                INSERT INTO "ADMIN_ROLES" (
                    "CODIGO", "NOMBRE", "DESCRIPCION", "NIVEL_LABEL", "RESUMEN_ALCANCE", "ORDEN_VISUAL", "ACTIVO"
                )
                SELECT ?, ?, ?, ?, ?, ?, TRUE
                WHERE NOT EXISTS (
                    SELECT 1 FROM "ADMIN_ROLES" WHERE UPPER("CODIGO") = UPPER(?)
                )
                """, code, name, description, levelLabel, scopeSummary, visualOrder, code);

        return jdbcTemplate.queryForObject("""
                SELECT "ID"
                FROM "ADMIN_ROLES"
                WHERE UPPER("CODIGO") = UPPER(?)
                LIMIT 1
                """, Long.class, code);
    }

    private Optional<AccessUserRecord> findUserRecordByRunAndRole(String run, String roleCode) {
        return jdbcTemplate.query("""
                SELECT
                    u."ID" AS user_id,
                    u."PERSONA_ID",
                    u."USUARIO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                  AND UPPER(COALESCE(r."CODIGO", '')) = UPPER(?)
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> new AccessUserRecord(
                rs.getLong("user_id"),
                rs.getLong("PERSONA_ID"),
                rs.getString("USUARIO"),
                rs.getString("email")
        ), run, roleCode).stream().findFirst();
    }

    private Long upsertPerson(String run, String name, String lastName, String email, String phone, Long existingPersonId) {
        if (existingPersonId != null) {
            jdbcTemplate.update("""
                    UPDATE "PERSONAS"
                    SET "RUN" = ?,
                        "NOMBRES" = ?,
                        "APELLIDOS" = ?,
                        "CORREO_ELECTRONICO" = CASE WHEN COALESCE("CORREO_ELECTRONICO", '') = '' THEN ? ELSE "CORREO_ELECTRONICO" END,
                        "TELEFONO" = CASE WHEN COALESCE("TELEFONO", '') = '' THEN ? ELSE "TELEFONO" END
                    WHERE "ID" = ?
                    """, run, name, lastName, email, phone, existingPersonId);
            return existingPersonId;
        }

        Optional<Long> personIdByRun = jdbcTemplate.query("""
                SELECT "ID"
                FROM "PERSONAS"
                WHERE UPPER("RUN") = UPPER(?)
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), run).stream().findFirst();

        if (personIdByRun.isPresent()) {
            Long personId = personIdByRun.get();
            jdbcTemplate.update("""
                    UPDATE "PERSONAS"
                    SET "NOMBRES" = ?,
                        "APELLIDOS" = ?,
                        "CORREO_ELECTRONICO" = CASE WHEN COALESCE("CORREO_ELECTRONICO", '') = '' THEN ? ELSE "CORREO_ELECTRONICO" END,
                        "TELEFONO" = CASE WHEN COALESCE("TELEFONO", '') = '' THEN ? ELSE "TELEFONO" END
                    WHERE "ID" = ?
                    """, name, lastName, email, phone, personId);
            return personId;
        }

        return jdbcTemplate.queryForObject("""
                INSERT INTO "PERSONAS" (
                    "RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION"
                ) VALUES (?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class, run, name, lastName, email, phone, null);
    }

    private Long insertStudentUser(Long personId, String username, String encodedPassword) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
                VALUES (?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, personId, username, encodedPassword);
    }

    private void updateStudentUser(Long userId, Long personId, String username, String encodedPassword) {
        jdbcTemplate.update("""
                UPDATE "USUARIOS"
                SET "PERSONA_ID" = ?,
                    "USUARIO" = ?,
                    "CLAVE" = ?,
                    "ACTIVO" = TRUE
                WHERE "ID" = ?
                """, personId, username, encodedPassword, userId);
    }

    private void upsertStudentUserSettings(Long userId, Long roleId) {
        Integer existing = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "ADMIN_USER_SETTINGS"
                WHERE "USUARIO_ID" = ?
                """, Integer.class, userId);

        if (existing != null && existing > 0) {
            jdbcTemplate.update("""
                    UPDATE "ADMIN_USER_SETTINGS"
                    SET "ROL_ID" = ?,
                        "ESTADO" = 'Activo',
                        "FORZAR_CAMBIO_CLAVE" = FALSE,
                        "REQUIERE_2FA" = FALSE,
                        "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                    WHERE "USUARIO_ID" = ?
                    """, roleId, userId);
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "ADMIN_USER_SETTINGS" (
                    "USUARIO_ID", "ROL_ID", "ESTADO", "FORZAR_CAMBIO_CLAVE", "REQUIERE_2FA", "VIGENCIA_HASTA", "ELIMINABLE"
                ) VALUES (?, ?, 'Activo', FALSE, FALSE, NULL, TRUE)
                """, userId, roleId);
    }

    private String generateUniqueStudentUsername(String studentName, String studentLastName) {
        String[] nameParts = (studentName == null ? "" : studentName.trim()).split("\\s+");
        String[] lastNameParts = (studentLastName == null ? "" : studentLastName.trim()).split("\\s+");

        String normalizedFirstName = nameParts.length > 0 ? normalizeUsernamePart(nameParts[0]) : "";
        String normalizedPaternalLastName = lastNameParts.length > 0 ? normalizeUsernamePart(lastNameParts[0]) : "";
        String normalizedMaternalLastName = lastNameParts.length > 1 ? normalizeUsernamePart(lastNameParts[1]) : "";

        String firstInitial = normalizedFirstName.isBlank() ? "" : normalizedFirstName.substring(0, 1);
        String paternalLastName = normalizedPaternalLastName;
        String maternalInitial = normalizedMaternalLastName.isBlank() ? "" : normalizedMaternalLastName.substring(0, 1);
        String base = (firstInitial + paternalLastName).toLowerCase();
        if (base.isBlank()) {
            base = "alumno";
        }

        String candidate = base;
        if (!usernameExists(candidate)) {
            return candidate;
        }

        if (!maternalInitial.isBlank()) {
            candidate = (base + maternalInitial).toLowerCase();
            if (!usernameExists(candidate)) {
                return candidate;
            }
        }

        int suffix = 2;
        while (usernameExists(base + suffix)) {
            suffix++;
        }
        return base + suffix;
    }

    private String formatStudentUsernameFromRun(String studentRun) {
        String normalizedRun = studentRun == null ? "" : studentRun.replaceAll("[^0-9kK]", "").toUpperCase(Locale.ROOT);
        if (normalizedRun.length() <= 1) {
            return normalizedRun;
        }
        return normalizedRun.substring(0, normalizedRun.length() - 1) + "-" + normalizedRun.substring(normalizedRun.length() - 1);
    }

    private String generateUniqueGuardianUsername(String guardianName, String guardianLastName) {
        String[] nameParts = (guardianName == null ? "" : guardianName.trim()).split("\\s+");
        String[] lastNameParts = (guardianLastName == null ? "" : guardianLastName.trim()).split("\\s+");

        String normalizedFirstName = nameParts.length > 0 ? normalizeUsernamePart(nameParts[0]) : "";
        String normalizedPaternalLastName = lastNameParts.length > 0 ? normalizeUsernamePart(lastNameParts[0]) : "";
        String normalizedMaternalLastName = lastNameParts.length > 1 ? normalizeUsernamePart(lastNameParts[1]) : "";

        String firstInitial = normalizedFirstName.isBlank() ? "" : normalizedFirstName.substring(0, 1);
        String base = (firstInitial + normalizedPaternalLastName).toLowerCase();
        if (base.isBlank()) {
            base = "apoderado";
        }

        String candidate = base;
        if (!usernameExists(candidate)) {
            return candidate;
        }

        String maternalInitial = normalizedMaternalLastName.isBlank() ? "" : normalizedMaternalLastName.substring(0, 1);
        if (!maternalInitial.isBlank()) {
            candidate = (base + maternalInitial).toLowerCase();
            if (!usernameExists(candidate)) {
                return candidate;
            }
        }

        int suffix = 2;
        while (usernameExists(base + suffix)) {
            suffix++;
        }
        return base + suffix;
    }

    private boolean usernameExists(String username) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "USUARIOS"
                WHERE UPPER("USUARIO") = UPPER(?)
                """, Integer.class, username);
        return count != null && count > 0;
    }

    private String buildStudentEmail(String username) {
        return username.toLowerCase() + "@alumnos.torrefuerte.cl";
    }

    private String buildGuardianEmail(String username) {
        return username.toLowerCase() + "@apoderados.torrefuerte.cl";
    }

    private String normalizeUsernamePart(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{Alnum}]", "")
                .toLowerCase();
        return normalized;
    }

    private record AccessUserRecord(Long userId, Long personId, String username, String email) {
    }
}
