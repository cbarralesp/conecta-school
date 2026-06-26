package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AcademicSubject;
import com.example.authhexagonal.domain.model.TeacherAssignedCourse;
import com.example.authhexagonal.domain.model.TeacherCommand;
import com.example.authhexagonal.domain.model.TeacherEmergencyContact;
import com.example.authhexagonal.domain.model.TeacherListItem;
import com.example.authhexagonal.domain.model.TeacherOverview;
import com.example.authhexagonal.domain.model.TeacherRecord;
import com.example.authhexagonal.domain.model.TeacherScheduleItem;
import com.example.authhexagonal.domain.model.TeacherSummary;
import com.example.authhexagonal.domain.model.TeacherSystemAccess;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.text.Normalizer;
import java.util.Optional;
import java.util.StringJoiner;

@Component
public class TeacherJdbcAdapter {

    private final JdbcTemplate jdbcTemplate;

    public TeacherJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public TeacherOverview findOverview(String search, Long subjectId, String status) {
        return new TeacherOverview(
                fetchSummary(),
                findSubjectOptions(),
                findTeachers(search, subjectId, status)
        );
    }

    public Optional<TeacherRecord> findById(Long teacherId) {
        return jdbcTemplate.query(detailQuery(), (rs, rowNum) -> {
                    String[] lastNames = splitLastNames(rs.getString("APELLIDOS"));
                    return new TeacherRecord(
                            rs.getLong("ID"),
                            rs.getString("CODIGO"),
                            rs.getString("TIPO_PERSONAL"),
                            rs.getString("NOMBRES"),
                            lastNames[0],
                            lastNames[1],
                            rs.getString("NOMBRES") + " " + rs.getString("APELLIDOS"),
                            rs.getString("RUN"),
                            readLocalDate(rs.getDate("FECHA_NACIMIENTO")),
                            rs.getString("GENERO"),
                            rs.getString("TELEFONO"),
                            rs.getString("CORREO_ELECTRONICO"),
                            readNullableLong(rs, "REGION_ID"),
                            readNullableLong(rs, "COMUNA_ID"),
                            rs.getString("DIRECCION"),
                            rs.getString("TITULO_PROFESIONAL"),
                            rs.getString("TIPO_CONTRATO"),
                            rs.getInt("HORAS_SEMANALES"),
                            readLocalDate(rs.getDate("FECHA_INGRESO")),
                            rs.getString("ESTADO_DOCENTE"),
                            rs.getBoolean("ACTIVO"),
                            findSubjectsByTeacherId(rs.getLong("ID")),
                            findAssignedCoursesByTeacherId(rs.getLong("ID")),
                            findWeeklyScheduleByTeacherId(rs.getLong("ID")),
                            findEmergencyContactByTeacherId(rs.getLong("ID")),
                            findSystemAccessByRunAndStaffType(
                                    rs.getString("RUN"),
                                    rs.getString("TIPO_PERSONAL"),
                                    rs.getString("CORREO_ELECTRONICO")
                            )
                    );
                }, teacherId).stream().findFirst();
    }

    public boolean existsTeacherRun(String run, Long excludeTeacherId) {
        String sql = """
                SELECT COUNT(1)
                FROM "PROFESORES" pr
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                WHERE UPPER(pe."RUN") = UPPER(?)
                """;

        Integer count;
        if (excludeTeacherId == null) {
            count = jdbcTemplate.queryForObject(sql, Integer.class, run);
        } else {
            count = jdbcTemplate.queryForObject(
                    sql + """
                            AND pr."ID" <> ?
                            """,
                    Integer.class,
                    run,
                    excludeTeacherId
            );
        }
        return count != null && count > 0;
    }

    public TeacherRecord createTeacher(TeacherCommand command, String encodedPassword) {
        Long personId = insertPerson(command);
        Long teacherId = insertTeacher(personId, command);
        replaceTeacherSubjects(teacherId, command.subjectIds());
        syncTeacherCourseAssignments(teacherId, command.subjectIds(), command.courseIds());
        replaceEmergencyContact(teacherId, command);
        maybeProvisionSystemAccess(personId, command, encodedPassword);
        return findById(teacherId).orElseThrow();
    }

    public String previewStaffUsername(
            String run,
            String firstNames,
            String paternalLastName,
            String maternalLastName,
            String staffType
    ) {
        String roleCode = resolveRoleCodeForStaffType(staffType);
        return findUserRecordByRunAndRole(run, roleCode)
                .map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> generateUniqueStaffUsername(firstNames, paternalLastName, maternalLastName, staffType));
    }

    public TeacherRecord updateTeacher(Long teacherId, TeacherCommand command, String encodedPassword) {
        Long personId = jdbcTemplate.queryForObject(
                "SELECT \"PERSONA_ID\" FROM \"PROFESORES\" WHERE \"ID\" = ?",
                Long.class,
                teacherId
        );
        updatePerson(personId, command);
        updateTeacherRecord(teacherId, command);
        replaceTeacherSubjects(teacherId, command.subjectIds());
        syncTeacherCourseAssignments(teacherId, command.subjectIds(), command.courseIds());
        replaceEmergencyContact(teacherId, command);
        maybeProvisionSystemAccess(personId, command, encodedPassword);
        return findById(teacherId).orElseThrow();
    }

    public void deleteTeacherPermanently(Long teacherId) {
        TeacherRecord teacher = findById(teacherId).orElseThrow();

        detachTeacherFromPlanning(teacherId);

        if (tableExists("HORARIOS_CARGAS")) {
            jdbcTemplate.update("""
                    DELETE FROM "HORARIOS_CARGAS"
                    WHERE "CARGA_DOCENTE_ID" IN (
                        SELECT "ID" FROM "CARGAS_DOCENTES" WHERE "PROFESOR_ID" = ?
                    )
                    """, teacherId);
        }

        jdbcTemplate.update("DELETE FROM \"CARGAS_DOCENTES\" WHERE \"PROFESOR_ID\" = ?", teacherId);

        if (tableExists("CURSO_DOCENTES")) {
            jdbcTemplate.update("DELETE FROM \"CURSO_DOCENTES\" WHERE \"PROFESOR_ID\" = ?", teacherId);
        }

        if (tableExists("PROFESOR_ASIGNATURAS")) {
            jdbcTemplate.update("DELETE FROM \"PROFESOR_ASIGNATURAS\" WHERE \"PROFESOR_ID\" = ?", teacherId);
        }

        if (tableExists("PROFESOR_CONTACTOS_EMERGENCIA")) {
            jdbcTemplate.update("DELETE FROM \"PROFESOR_CONTACTOS_EMERGENCIA\" WHERE \"PROFESOR_ID\" = ?", teacherId);
        }

        deleteStaffSystemAccess(teacher.run(), teacher.staffType());

        Long personId = jdbcTemplate.queryForObject(
                "SELECT \"PERSONA_ID\" FROM \"PROFESORES\" WHERE \"ID\" = ?",
                Long.class,
                teacherId
        );

        jdbcTemplate.update("DELETE FROM \"PROFESORES\" WHERE \"ID\" = ?", teacherId);

        if (personId != null && !personStillLinked(personId)) {
            jdbcTemplate.update("DELETE FROM \"PERSONAS\" WHERE \"ID\" = ?", personId);
        }
    }

    private void detachTeacherFromPlanning(Long teacherId) {
        if (tableExists("CLASES_PLANIFICACION_DOCUMENTOS")) {
            jdbcTemplate.update("""
                    DELETE FROM "CLASES_PLANIFICACION_DOCUMENTOS"
                    WHERE "UNIDAD_ID" IN (
                        SELECT up."ID"
                        FROM "UNIDADES_PLANIFICACION" up
                        JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                        WHERE cd."PROFESOR_ID" = ?
                    )
                       OR "CLASE_ID" IN (
                        SELECT cp."ID"
                        FROM "CLASES_PLANIFICACION" cp
                        JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = cp."UNIDAD_ID"
                        JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                        WHERE cd."PROFESOR_ID" = ?
                    )
                    """, teacherId, teacherId);
        }

        if (tableExists("CLASES_PLANIFICACION")) {
            jdbcTemplate.update("""
                    DELETE FROM "CLASES_PLANIFICACION"
                    WHERE "UNIDAD_ID" IN (
                        SELECT up."ID"
                        FROM "UNIDADES_PLANIFICACION" up
                        JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                        WHERE cd."PROFESOR_ID" = ?
                    )
                    """, teacherId);
        }

        if (tableExists("PLANIFICACIONES")) {
            jdbcTemplate.update("""
                    DELETE FROM "PLANIFICACIONES"
                    WHERE "CARGA_DOCENTE_ID" IN (
                        SELECT "ID"
                        FROM "CARGAS_DOCENTES"
                        WHERE "PROFESOR_ID" = ?
                    )
                    """, teacherId);
        }

        if (tableExists("UNIDADES_PLANIFICACION")) {
            jdbcTemplate.update("""
                    DELETE FROM "UNIDADES_PLANIFICACION"
                    WHERE "CARGA_DOCENTE_ID" IN (
                        SELECT "ID"
                        FROM "CARGAS_DOCENTES"
                        WHERE "PROFESOR_ID" = ?
                    )
                    """, teacherId);
        }
    }

    public List<AcademicSubject> findSubjectOptions() {
        return jdbcTemplate.query(subjectOptionsQuery(), (rs, rowNum) -> new AcademicSubject(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("AREA"),
                rs.getString("COLOR_HEX"),
                rs.getString("DESCRIPCION"),
                rs.getString("NIVEL_REFERENCIA"),
                "NUMERICA",
                rs.getString("NIVEL_REFERENCIA"),
                rs.getInt("HORAS_SUGERIDAS"),
                rs.getBoolean("ACTIVA"),
                List.of(),
                findApplicableGradeIdsBySubjectId(rs.getLong("ID")),
                findApplicableGradeNamesBySubjectId(rs.getLong("ID")),
                findApplicableCourseIdsBySubjectId(rs.getLong("ID")),
                findApplicableCourseNamesBySubjectId(rs.getLong("ID"))
        ));
    }

    private TeacherSummary fetchSummary() {
        return jdbcTemplate.queryForObject(summaryQuery(), (rs, rowNum) -> new TeacherSummary(
                rs.getInt("total_teachers"),
                rs.getInt("active_teachers"),
                rs.getInt("subject_count"),
                rs.getInt("full_time_teachers")
        ));
    }

    private List<TeacherListItem> findTeachers(String search, Long subjectId, String status) {
        String normalizedSearch = normalize(search);
        String normalizedStatus = normalize(status);
        List<Object> args = new ArrayList<>();
        String sql = listQuery(normalizedSearch, subjectId, normalizedStatus, args);
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TeacherListItem(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("TIPO_PERSONAL"),
                rs.getString("full_name"),
                rs.getString("RUN"),
                rs.getString("TITULO_PROFESIONAL"),
                rs.getString("TIPO_CONTRATO"),
                rs.getInt("HORAS_SEMANALES"),
                rs.getString("ESTADO_DOCENTE"),
                rs.getBoolean("ACTIVO"),
                findSubjectsByTeacherId(rs.getLong("ID")),
                findCourseNamesByTeacherId(rs.getLong("ID"))
        ), args.toArray());
    }

    private List<AcademicSubject> findSubjectsByTeacherId(Long teacherId) {
        String sql = subjectsByTeacherQuery();
        Object[] args = tableExists("PROFESOR_ASIGNATURAS")
                ? new Object[]{teacherId, teacherId}
                : new Object[]{teacherId};
        return jdbcTemplate.query(sql, (rs, rowNum) -> new AcademicSubject(
                rs.getLong("ID"), rs.getString("CODIGO"), rs.getString("NOMBRE"), rs.getString("AREA"),
                rs.getString("COLOR_HEX"), rs.getString("DESCRIPCION"), rs.getString("NIVEL_REFERENCIA"),
                "NUMERICA",
                rs.getString("NIVEL_REFERENCIA"),
                rs.getInt("HORAS_SUGERIDAS"), rs.getBoolean("ACTIVA"), List.of(),
                findApplicableGradeIdsBySubjectId(rs.getLong("ID")),
                findApplicableGradeNamesBySubjectId(rs.getLong("ID")),
                findApplicableCourseIdsBySubjectId(rs.getLong("ID")),
                findApplicableCourseNamesBySubjectId(rs.getLong("ID"))
        ), args);
    }

    private List<String> findCourseNamesByTeacherId(Long teacherId) {
        return jdbcTemplate.query("""
                SELECT DISTINCT course_name
                FROM (
                    SELECT c."NOMBRE" AS course_name
                    FROM "CARGAS_DOCENTES" cd
                    JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                    WHERE cd."PROFESOR_ID" = ?
                      AND cd."ACTIVA" = TRUE
                      AND c."ACTIVO" = TRUE

                    UNION

                    SELECT c."NOMBRE" AS course_name
                    FROM "CURSO_DOCENTES" ct
                    JOIN "CURSOS" c ON c."ID" = ct."CURSO_ID"
                    WHERE ct."PROFESOR_ID" = ?
                      AND c."ACTIVO" = TRUE
                ) course_source
                ORDER BY course_name
                """, (rs, rowNum) -> rs.getString("course_name"), teacherId, teacherId);
    }

    private List<TeacherAssignedCourse> findAssignedCoursesByTeacherId(Long teacherId) {
        String horarioJoin = tableExists("HORARIOS_CARGAS")
                ? " LEFT JOIN \"HORARIOS_CARGAS\" hc ON hc.\"CARGA_DOCENTE_ID\" = cd.\"ID\" "
                : "";
        String weeklyHoursCount = tableExists("HORARIOS_CARGAS") ? "COUNT(hc.\"ID\")" : "0";
        String sql = """
                SELECT *
                FROM (
                    SELECT
                        c."ID",
                        c."NOMBRE",
                        c."CODIGO",
                        a."NOMBRE" AS subject_name,
                        a."COLOR_HEX",
                        %s AS weekly_hours,
                        FALSE AS homeroom_teacher,
                        1 AS sort_order
                    FROM "CARGAS_DOCENTES" cd
                    JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                    JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                    %s
                    WHERE cd."PROFESOR_ID" = ? AND cd."ACTIVA" = TRUE AND c."ACTIVO" = TRUE
                    GROUP BY c."ID", c."NOMBRE", c."CODIGO", a."NOMBRE", a."COLOR_HEX"

                    UNION ALL

                    SELECT
                        c."ID",
                        c."NOMBRE",
                        c."CODIGO",
                        'Profesor jefe' AS subject_name,
                        '#DCEBFB' AS "COLOR_HEX",
                        0 AS weekly_hours,
                        TRUE AS homeroom_teacher,
                        2 AS sort_order
                    FROM "CURSO_DOCENTES" ct
                    JOIN "CURSOS" c ON c."ID" = ct."CURSO_ID"
                    WHERE ct."PROFESOR_ID" = ?
                      AND c."ACTIVO" = TRUE
                      AND NOT EXISTS (
                          SELECT 1
                          FROM "CARGAS_DOCENTES" cd2
                          WHERE cd2."PROFESOR_ID" = ct."PROFESOR_ID"
                            AND cd2."CURSO_ID" = ct."CURSO_ID"
                            AND cd2."ACTIVA" = TRUE
                      )
                ) course_assignments
                ORDER BY "NOMBRE", sort_order, subject_name
                """.formatted(weeklyHoursCount, horarioJoin);
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TeacherAssignedCourse(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getString("CODIGO"),
                rs.getString("subject_name"),
                rs.getString("COLOR_HEX"),
                rs.getInt("weekly_hours"),
                rs.getBoolean("homeroom_teacher")
        ), teacherId, teacherId);
    }

    private List<TeacherScheduleItem> findWeeklyScheduleByTeacherId(Long teacherId) {
        if (!tableExists("HORARIOS_CARGAS") || !tableExists("BLOQUES_HORARIOS")) {
            return List.of();
        }
        return jdbcTemplate.query("""
                SELECT bh."DIA_SEMANA", bh."HORA_INICIO", bh."HORA_FIN", c."NOMBRE" AS course_name, a."NOMBRE" AS subject_name, hc."SALA"
                FROM "HORARIOS_CARGAS" hc
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE cd."PROFESOR_ID" = ? AND cd."ACTIVA" = TRUE AND bh."ACTIVO" = TRUE
                ORDER BY bh."ORDEN",
                    CASE bh."DIA_SEMANA" WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3 WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 ELSE 6 END
                """, (rs, rowNum) -> new TeacherScheduleItem(
                rs.getString("DIA_SEMANA"),
                rs.getString("HORA_INICIO"),
                rs.getString("HORA_FIN"),
                rs.getString("course_name"),
                rs.getString("subject_name"),
                rs.getString("SALA")
        ), teacherId);
    }

    private TeacherEmergencyContact findEmergencyContactByTeacherId(Long teacherId) {
        if (!tableExists("PROFESOR_CONTACTOS_EMERGENCIA")) {
            return new TeacherEmergencyContact(null, "", "", "");
        }
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE_COMPLETO", "RELACION", "TELEFONO"
                FROM "PROFESOR_CONTACTOS_EMERGENCIA"
                WHERE "PROFESOR_ID" = ? AND "ACTIVO" = TRUE
                ORDER BY "ID" LIMIT 1
                """, (rs, rowNum) -> new TeacherEmergencyContact(
                rs.getLong("ID"),
                rs.getString("NOMBRE_COMPLETO"),
                rs.getString("RELACION"),
                rs.getString("TELEFONO")
        ), teacherId).stream().findFirst().orElse(new TeacherEmergencyContact(null, "", "", ""));
    }

    private TeacherSystemAccess findSystemAccessByRunAndStaffType(String run, String staffType, String fallbackEmail) {
        String roleCode = resolveRoleCodeForStaffType(staffType);
        return findUserRecordByRunAndRole(run, roleCode)
                .map(record -> new TeacherSystemAccess(
                        true,
                        true,
                        record.username() == null ? "" : record.username(),
                        "",
                        record.email() != null && !record.email().isBlank(),
                        record.email() == null || record.email().isBlank() ? safeEmail(fallbackEmail) : record.email(),
                        normalizeAccountStatus(record.status())
                ))
                .orElseGet(() -> new TeacherSystemAccess(
                        false,
                        false,
                        "",
                        "",
                        false,
                        safeEmail(fallbackEmail),
                        "Sin cuenta"
                ));
    }

    private void maybeProvisionSystemAccess(Long personId, TeacherCommand command, String encodedPassword) {
        TeacherSystemAccess systemAccess = command.systemAccess();
        if (systemAccess == null || !systemAccess.configureAccess() || !systemAccess.createAccount()) {
            return;
        }

        provisionStaffAccess(
                personId,
                command.run(),
                command.firstNames(),
                command.paternalLastName(),
                command.maternalLastName(),
                command.institutionalEmail(),
                encodedPassword,
                systemAccess.notifyByEmail(),
                normalizeStaffType(command.staffType())
        );
    }

    private TeacherSystemAccess provisionStaffAccess(
            Long personId,
            String run,
            String firstNames,
            String paternalLastName,
            String maternalLastName,
            String institutionalEmail,
            String encodedPassword,
            boolean notifyByEmail,
            String staffType
    ) {
        String roleCode = resolveRoleCodeForStaffType(staffType);
        Long roleId = ensureRoleId(
                roleCode,
                roleCode.equals("PROFESOR") ? "Profesor" : "Asistente",
                roleCode.equals("PROFESOR")
                        ? "Usuario docente con acceso a gestion academica y evaluacion."
                        : "Usuario asistente con acceso administrativo interno.",
                roleCode.equals("PROFESOR") ? "Nivel 4" : "Nivel 3",
                roleCode.equals("PROFESOR")
                        ? "Gestion de cursos, planificacion y seguimiento academico."
                        : "Apoyo operativo, administracion y seguimiento institucional.",
                roleCode.equals("PROFESOR") ? 4 : 5
        );

        Optional<AccessUserRecord> existingUser = findUserRecordByRunAndRole(run, roleCode);
        String username = existingUser.map(AccessUserRecord::username)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> generateUniqueStaffUsername(firstNames, paternalLastName, maternalLastName, staffType));
        String email = existingUser.map(AccessUserRecord::email)
                .filter(value -> value != null && !value.isBlank())
                .orElseGet(() -> {
                    String normalizedEmail = safeEmail(institutionalEmail);
                    return normalizedEmail.isBlank() ? buildStaffEmail(username, staffType) : normalizedEmail;
                });

        Long userId = existingUser.map(AccessUserRecord::userId)
                .orElseGet(() -> insertStaffUser(personId, username, encodedPassword));

        if (existingUser.isPresent()) {
            updateStaffUser(userId, personId, username, encodedPassword);
        }

        upsertStaffUserSettings(userId, roleId);

        return new TeacherSystemAccess(
                true,
                true,
                username,
                "",
                notifyByEmail,
                email,
                "Activo"
        );
    }

    private Long insertPerson(TeacherCommand command) {
        StringBuilder sql = new StringBuilder("""
                INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "DIRECCION", "TELEFONO"
                """);
        List<Object> values = new ArrayList<>(List.of(
                command.run(),
                command.firstNames(),
                composeLastNames(command),
                command.institutionalEmail(),
                command.address(),
                command.phone()
        ));
        if (columnExists("PERSONAS", "FECHA_NACIMIENTO")) {
            sql.append(", \"FECHA_NACIMIENTO\"");
            values.add(command.birthDate());
        }
        if (columnExists("PERSONAS", "GENERO")) {
            sql.append(", \"GENERO\"");
            values.add(command.gender());
        }
        if (columnExists("PERSONAS", "REGION_ID")) {
            sql.append(", \"REGION_ID\"");
            values.add(command.regionId());
        }
        if (columnExists("PERSONAS", "COMUNA_ID")) {
            sql.append(", \"COMUNA_ID\"");
            values.add(command.communeId());
        }
        sql.append(") VALUES (");
        StringJoiner joiner = new StringJoiner(", ");
        for (int index = 0; index < values.size(); index++) {
            joiner.add("?");
        }
        sql.append(joiner).append(")");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql.toString(), Statement.RETURN_GENERATED_KEYS);
            bindValues(statement, values);
            return statement;
        }, keyHolder);
        return extractGeneratedId(keyHolder);
    }

    private Long insertTeacher(Long personId, TeacherCommand command) {
        StringBuilder sql = new StringBuilder("""
                INSERT INTO "PROFESORES" ("CODIGO", "PERSONA_ID", "ESPECIALIDAD"
                """);
        List<Object> values = new ArrayList<>(List.of(
                nextTeacherCode(),
                personId,
                command.professionalTitle()
        ));
        if (columnExists("PROFESORES", "TITULO_PROFESIONAL")) {
            sql.append(", \"TITULO_PROFESIONAL\"");
            values.add(command.professionalTitle());
        }
        if (columnExists("PROFESORES", "TIPO_CONTRATO")) {
            sql.append(", \"TIPO_CONTRATO\"");
            values.add(command.contractType());
        }
        if (columnExists("PROFESORES", "HORAS_SEMANALES")) {
            sql.append(", \"HORAS_SEMANALES\"");
            values.add(command.weeklyHours());
        }
        if (columnExists("PROFESORES", "FECHA_INGRESO")) {
            sql.append(", \"FECHA_INGRESO\"");
            values.add(command.startDate());
        }
        if (columnExists("PROFESORES", "ESTADO_DOCENTE")) {
            sql.append(", \"ESTADO_DOCENTE\"");
            values.add(command.employmentStatus());
        }
        if (columnExists("PROFESORES", "TIPO_PERSONAL")) {
            sql.append(", \"TIPO_PERSONAL\"");
            values.add(normalizeStaffType(command.staffType()));
        }
        sql.append(", \"ACTIVO\") VALUES (");
        StringJoiner joiner = new StringJoiner(", ");
        for (int index = 0; index < values.size(); index++) {
            joiner.add("?");
        }
        joiner.add("TRUE");
        sql.append(joiner).append(")");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql.toString(), Statement.RETURN_GENERATED_KEYS);
            bindValues(statement, values);
            return statement;
        }, keyHolder);
        return extractGeneratedId(keyHolder);
    }

    private void replaceTeacherSubjects(Long teacherId, List<Long> subjectIds) {
        if (!tableExists("PROFESOR_ASIGNATURAS")) {
            return;
        }
        jdbcTemplate.update("DELETE FROM \"PROFESOR_ASIGNATURAS\" WHERE \"PROFESOR_ID\" = ?", teacherId);
        boolean hasSubjectIdColumn = columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA_ID");
        boolean hasSubjectNameColumn = columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA");
        if (hasSubjectIdColumn && hasSubjectNameColumn) {
            for (Long subjectId : subjectIds) {
                String subjectName = jdbcTemplate.queryForObject(
                        "SELECT \"NOMBRE\" FROM \"ASIGNATURAS\" WHERE \"ID\" = ?",
                        String.class,
                        subjectId
                );
                if (subjectName != null && !subjectName.isBlank()) {
                    jdbcTemplate.update(
                            "INSERT INTO \"PROFESOR_ASIGNATURAS\" (\"PROFESOR_ID\", \"ASIGNATURA\", \"ASIGNATURA_ID\", \"ACTIVO\") VALUES (?, ?, ?, TRUE)",
                            teacherId,
                            subjectName,
                            subjectId
                    );
                }
            }
            return;
        }
        if (hasSubjectIdColumn) {
            for (Long subjectId : subjectIds) {
                jdbcTemplate.update("INSERT INTO \"PROFESOR_ASIGNATURAS\" (\"PROFESOR_ID\", \"ASIGNATURA_ID\", \"ACTIVO\") VALUES (?, ?, TRUE)", teacherId, subjectId);
            }
            return;
        }
        if (hasSubjectNameColumn) {
            for (Long subjectId : subjectIds) {
                String subjectName = jdbcTemplate.queryForObject(
                        "SELECT \"NOMBRE\" FROM \"ASIGNATURAS\" WHERE \"ID\" = ?",
                        String.class,
                        subjectId
                );
                if (subjectName != null && !subjectName.isBlank()) {
                    jdbcTemplate.update(
                            "INSERT INTO \"PROFESOR_ASIGNATURAS\" (\"PROFESOR_ID\", \"ASIGNATURA\", \"ACTIVO\") VALUES (?, ?, TRUE)",
                            teacherId,
                            subjectName
                    );
                }
            }
        }
    }

    private void replaceEmergencyContact(Long teacherId, TeacherCommand command) {
        if (!tableExists("PROFESOR_CONTACTOS_EMERGENCIA")) {
            return;
        }
        jdbcTemplate.update("DELETE FROM \"PROFESOR_CONTACTOS_EMERGENCIA\" WHERE \"PROFESOR_ID\" = ?", teacherId);
        jdbcTemplate.update("""
                INSERT INTO "PROFESOR_CONTACTOS_EMERGENCIA" ("PROFESOR_ID", "NOMBRE_COMPLETO", "RELACION", "TELEFONO", "ACTIVO")
                VALUES (?, ?, ?, ?, TRUE)
                """, teacherId, command.emergencyContactName(), command.emergencyContactRelation(), command.emergencyContactPhone());
    }

    private void syncTeacherCourseAssignments(Long teacherId, List<Long> subjectIds, List<Long> courseIds) {
        if (!tableExists("CARGAS_DOCENTES") || subjectIds == null || subjectIds.isEmpty() || courseIds == null || courseIds.isEmpty()) {
            return;
        }

        Long createdByUserId = resolveTeacherUserId(teacherId);
        for (Long courseId : courseIds) {
            Integer schoolYear = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(\"ANIO_ESCOLAR\", EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) FROM \"CURSOS\" WHERE \"ID\" = ?",
                    Integer.class,
                    courseId
            );

            for (Long subjectId : subjectIds) {
                if (!subjectAppliesToCourse(subjectId, courseId)) {
                    continue;
                }

                Integer suggestedHours = jdbcTemplate.queryForObject(
                        "SELECT COALESCE(\"HORAS_SUGERIDAS\", 1) FROM \"ASIGNATURAS\" WHERE \"ID\" = ?",
                        Integer.class,
                        subjectId
                );

                Long loadId = jdbcTemplate.query("""
                        SELECT "ID"
                        FROM "CARGAS_DOCENTES"
                        WHERE "PROFESOR_ID" = ?
                          AND "CURSO_ID" = ?
                          AND "ASIGNATURA_ID" = ?
                        ORDER BY "ID"
                        LIMIT 1
                        """, (rs, rowNum) -> rs.getLong("ID"), teacherId, courseId, subjectId)
                        .stream()
                        .findFirst()
                        .orElse(null);

                if (loadId == null) {
                    Long nextLoadId = nextTableId("CARGAS_DOCENTES");
                    loadId = jdbcTemplate.queryForObject("""
                            INSERT INTO "CARGAS_DOCENTES" (
                                "ID",
                                "PROFESOR_ID",
                                "CURSO_ID",
                                "ASIGNATURA_ID",
                                "ANIO_ESCOLAR",
                                "HORAS_SEMANALES",
                                "ES_PROFESOR_JEFE",
                                "ACTIVA"
                            )
                            VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE)
                            RETURNING "ID"
                            """, Long.class,
                            nextLoadId,
                            teacherId,
                            courseId,
                            subjectId,
                            schoolYear == null ? LocalDate.now().getYear() : schoolYear,
                            suggestedHours == null ? 1 : suggestedHours
                    );
                } else {
                    jdbcTemplate.update("""
                            UPDATE "CARGAS_DOCENTES"
                            SET "ANIO_ESCOLAR" = ?,
                                "HORAS_SEMANALES" = ?,
                                "ACTIVA" = TRUE
                            WHERE "ID" = ?
                            """,
                            schoolYear == null ? LocalDate.now().getYear() : schoolYear,
                            suggestedHours == null ? 1 : suggestedHours,
                            loadId
                    );
                }

                ensureDefaultPlanningUnit(loadId, createdByUserId, courseId, subjectId);
            }
        }
    }

    private void ensureDefaultPlanningUnit(Long loadId, Long createdByUserId, Long courseId, Long subjectId) {
        if (!tableExists("UNIDADES_PLANIFICACION")) {
            return;
        }

        Integer unitCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "UNIDADES_PLANIFICACION"
                WHERE "CARGA_DOCENTE_ID" = ?
                """, Integer.class, loadId);

        if (unitCount != null && unitCount > 0) {
            return;
        }

        String subjectName = jdbcTemplate.queryForObject(
                "SELECT \"NOMBRE\" FROM \"ASIGNATURAS\" WHERE \"ID\" = ?",
                String.class,
                subjectId
        );
        String courseName = jdbcTemplate.queryForObject(
                "SELECT \"NOMBRE\" FROM \"CURSOS\" WHERE \"ID\" = ?",
                String.class,
                courseId
        );
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusWeeks(4);

        jdbcTemplate.update("""
                INSERT INTO "UNIDADES_PLANIFICACION" (
                    "ID",
                    "CARGA_DOCENTE_ID",
                    "NUMERO_UNIDAD",
                    "NOMBRE",
                    "SEMANA_INICIO",
                    "FECHA_INICIO",
                    "FECHA_TERMINO",
                    "SEMANAS_ESTIMADAS",
                    "CLASES_PLANIFICADAS",
                    "DESCRIPCION_GENERAL",
                    "OBJETIVOS_APRENDIZAJE",
                    "INDICADORES_LOGRO",
                    "ESTADO",
                    "CREADO_POR_USUARIO_ID",
                    "FECHA_CREACION",
                    "FECHA_ACTUALIZACION"
                )
                VALUES (?, ?, 'UNIDAD_I', ?, 1, ?, ?, 4, 1, ?, ?, ?, 'CREADA', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                nextTableId("UNIDADES_PLANIFICACION"),
                loadId,
                "Unidad I",
                startDate,
                endDate,
                "Unidad generada automaticamente para habilitar la planificacion del curso y asignatura.",
                "Objetivos iniciales de " + (subjectName == null ? "la asignatura" : subjectName) + " para " + (courseName == null ? "el curso" : courseName) + ".",
                "Participa en actividades iniciales y desarrolla evidencia basica del aprendizaje esperado.",
                createdByUserId
        );
    }

    private Long resolveTeacherUserId(Long teacherId) {
        return jdbcTemplate.query("""
                SELECT u."ID"
                FROM "USUARIOS" u
                JOIN "PROFESORES" pr ON pr."PERSONA_ID" = u."PERSONA_ID"
                WHERE pr."ID" = ?
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), teacherId)
                .stream()
                .findFirst()
                .orElseGet(() -> jdbcTemplate.query("""
                        SELECT "ID"
                        FROM "USUARIOS"
                        ORDER BY "ID"
                        LIMIT 1
                        """, (rs, rowNum) -> rs.getLong("ID"))
                        .stream()
                        .findFirst()
                        .orElse(1L));
    }

    private Long nextTableId(String tableName) {
        Long nextId = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(\"ID\"), 0) + 1 FROM \"" + tableName + "\"",
                Long.class
        );
        return nextId == null ? 1L : nextId;
    }

    private String nextTeacherCode() {
        Integer nextValue = jdbcTemplate.queryForObject("SELECT COALESCE(MAX(\"ID\"), 0) + 1 FROM \"PROFESORES\"", Integer.class);
        return "PROF-" + String.format("%03d", nextValue == null ? 1 : nextValue);
    }

    private String composeLastNames(TeacherCommand command) {
        List<String> lastNames = new ArrayList<>();
        lastNames.add(command.paternalLastName().trim());
        if (command.maternalLastName() != null && !command.maternalLastName().isBlank()) {
            lastNames.add(command.maternalLastName().trim());
        }
        return String.join(" ", lastNames);
    }

    private String[] splitLastNames(String lastNames) {
        if (lastNames == null || lastNames.isBlank()) {
            return new String[]{"", ""};
        }
        String[] parts = lastNames.trim().split("\\s+", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : ""};
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase();
    }

    private LocalDate readLocalDate(Date value) {
        return value != null ? value.toLocalDate() : null;
    }

    private Long readNullableLong(java.sql.ResultSet rs, String columnName) throws java.sql.SQLException {
        long value = rs.getLong(columnName);
        return rs.wasNull() ? null : value;
    }

    private String detailQuery() {
        return "SELECT " +
                "pr.\"ID\", " +
                "pr.\"CODIGO\", " +
                selectColumnOrAlias("PROFESORES", "TIPO_PERSONAL", "pr", "'DOCENTE'", "TIPO_PERSONAL") + ", " +
                "pr.\"PERSONA_ID\", " +
                selectColumnOrAlias("PROFESORES", "TITULO_PROFESIONAL", "pr", "COALESCE(pr.\"ESPECIALIDAD\", '')", "TITULO_PROFESIONAL") + ", " +
                selectColumnOrAlias("PROFESORES", "TIPO_CONTRATO", "pr", "'Jornada completa'", "TIPO_CONTRATO") + ", " +
                selectColumnOrAlias("PROFESORES", "HORAS_SEMANALES", "pr", "0", "HORAS_SEMANALES") + ", " +
                selectColumnOrAlias("PROFESORES", "FECHA_INGRESO", "pr", "NULL::date", "FECHA_INGRESO") + ", " +
                selectColumnOrAlias("PROFESORES", "ESTADO_DOCENTE", "pr", "'Activo'", "ESTADO_DOCENTE") + ", " +
                "pr.\"ACTIVO\", " +
                "pe.\"RUN\", " +
                "pe.\"NOMBRES\", " +
                "pe.\"APELLIDOS\", " +
                selectColumnOrAlias("PERSONAS", "FECHA_NACIMIENTO", "pe", "NULL::date", "FECHA_NACIMIENTO") + ", " +
                selectColumnOrAlias("PERSONAS", "GENERO", "pe", "''", "GENERO") + ", " +
                "pe.\"CORREO_ELECTRONICO\", " +
                selectColumnOrAlias("PERSONAS", "REGION_ID", "pe", "NULL::bigint", "REGION_ID") + ", " +
                selectColumnOrAlias("PERSONAS", "COMUNA_ID", "pe", "NULL::bigint", "COMUNA_ID") + ", " +
                "pe.\"DIRECCION\", " +
                "pe.\"TELEFONO\" " +
                "FROM \"PROFESORES\" pr " +
                "JOIN \"PERSONAS\" pe ON pe.\"ID\" = pr.\"PERSONA_ID\" " +
                "WHERE pr.\"ID\" = ?";
    }

    private String subjectOptionsQuery() {
        String colorHex = columnExists("ASIGNATURAS", "COLOR_HEX") ? "COALESCE(\"COLOR_HEX\", '#7AA7E9')" : "'#7AA7E9'";
        String description = columnExists("ASIGNATURAS", "DESCRIPCION") ? "COALESCE(\"DESCRIPCION\", '')" : "''";
        String level = columnExists("ASIGNATURAS", "NIVEL_REFERENCIA") ? "COALESCE(\"NIVEL_REFERENCIA\", '')" : "''";
        String hours = columnExists("ASIGNATURAS", "HORAS_SUGERIDAS") ? "COALESCE(\"HORAS_SUGERIDAS\", 0)" : "0";
        String activeExpression = columnExists("ASIGNATURAS", "ACTIVA") ? "COALESCE(\"ACTIVA\", TRUE)" : "TRUE";
        return "SELECT " +
                "\"ID\", " +
                "\"CODIGO\", " +
                "\"NOMBRE\", " +
                "COALESCE(\"AREA\", '') AS \"AREA\", " +
                colorHex + " AS \"COLOR_HEX\", " +
                description + " AS \"DESCRIPCION\", " +
                level + " AS \"NIVEL_REFERENCIA\", " +
                hours + " AS \"HORAS_SUGERIDAS\", " +
                activeExpression + " AS \"ACTIVA\" " +
                "FROM \"ASIGNATURAS\" " +
                "WHERE " + activeExpression + " = TRUE " +
                "ORDER BY \"NOMBRE\"";
    }

    private List<Long> findApplicableGradeIdsBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_GRADOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT "GRADO_ID"
                FROM "ASIGNATURA_GRADOS"
                WHERE "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "GRADO_ID"
                """, (rs, rowNum) -> rs.getLong("GRADO_ID"), subjectId);
    }

    private List<Long> findApplicableCourseIdsBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_CURSOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT "CURSO_ID"
                FROM "ASIGNATURA_CURSOS"
                WHERE "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "CURSO_ID"
                """, (rs, rowNum) -> rs.getLong("CURSO_ID"), subjectId);
    }

    private List<String> findApplicableGradeNamesBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_GRADOS") || !tableExists("CURSO_GRADOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT cg."NOMBRE"
                FROM "ASIGNATURA_GRADOS" ag
                JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = ag."GRADO_ID"
                WHERE ag."ASIGNATURA_ID" = ?
                  AND ag."ACTIVA" = TRUE
                  AND cg."ACTIVO" = TRUE
                ORDER BY cg."ORDEN", cg."NOMBRE"
                """, (rs, rowNum) -> rs.getString("NOMBRE"), subjectId);
    }

    private List<String> findApplicableCourseNamesBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_CURSOS") || !tableExists("CURSOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS "COURSE_NAME"
                FROM "ASIGNATURA_CURSOS" ac
                JOIN "CURSOS" c
                  ON c."ID" = ac."CURSO_ID"
                WHERE ac."ASIGNATURA_ID" = ?
                  AND ac."ACTIVA" = TRUE
                  AND c."ACTIVO" = TRUE
                ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE", c."LETRA"
                """, (rs, rowNum) -> rs.getString("COURSE_NAME"), subjectId);
    }

    private boolean subjectAppliesToCourse(Long subjectId, Long courseId) {
        if (tableExists("ASIGNATURA_CURSOS")) {
            Integer scopedCourseCount = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "ASIGNATURA_CURSOS"
                    WHERE "ASIGNATURA_ID" = ?
                      AND "ACTIVA" = TRUE
                    """, Integer.class, subjectId);
            if (scopedCourseCount != null && scopedCourseCount > 0) {
                Integer matchingCourseCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(1)
                        FROM "ASIGNATURA_CURSOS" ac
                        JOIN "CURSOS" c
                          ON c."ID" = ac."CURSO_ID"
                        WHERE ac."ASIGNATURA_ID" = ?
                          AND ac."CURSO_ID" = ?
                          AND ac."ACTIVA" = TRUE
                          AND c."ACTIVO" = TRUE
                        """, Integer.class, subjectId, courseId);
                return matchingCourseCount != null && matchingCourseCount > 0;
            }
        }

        if (!tableExists("ASIGNATURA_GRADOS")
                || !tableExists("CURSO_GRADOS")
                || !columnExists("CURSOS", "GRADO_ID")) {
            return true;
        }

        Integer scopedGradeCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "ASIGNATURA_GRADOS"
                WHERE "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                """, Integer.class, subjectId);
        if (scopedGradeCount == null || scopedGradeCount == 0) {
            return true;
        }

        Integer matchingCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS" c
                JOIN "ASIGNATURA_GRADOS" ag
                  ON ag."GRADO_ID" = c."GRADO_ID"
                 AND ag."ASIGNATURA_ID" = ?
                 AND ag."ACTIVA" = TRUE
                WHERE c."ID" = ?
                  AND c."ACTIVO" = TRUE
                """, Integer.class, subjectId, courseId);
        return matchingCount != null && matchingCount > 0;
    }

    private String summaryQuery() {
        String activeTeachersFilter = columnExists("PROFESORES", "ESTADO_DOCENTE")
                ? " AND \"ESTADO_DOCENTE\" = 'Activo' "
                : "";
        String fullTimeFilter = columnExists("PROFESORES", "TIPO_CONTRATO")
                ? " AND LOWER(COALESCE(\"TIPO_CONTRATO\", '')) LIKE '%completa%' "
                : "";
        String subjectActive = columnExists("ASIGNATURAS", "ACTIVA") ? "\"ACTIVA\" = TRUE" : "TRUE";
        return "SELECT " +
                "COUNT(1) AS total_teachers, " +
                "COUNT(*) FILTER (WHERE \"ACTIVO\" = TRUE" + activeTeachersFilter + ") AS active_teachers, " +
                "(SELECT COUNT(DISTINCT \"ID\") FROM \"ASIGNATURAS\" WHERE " + subjectActive + ") AS subject_count, " +
                "COUNT(*) FILTER (WHERE \"ACTIVO\" = TRUE" + fullTimeFilter + ") AS full_time_teachers " +
                "FROM \"PROFESORES\"";
    }

    private String listQuery(String search, Long subjectId, String status, List<Object> args) {
        boolean hasTeacherSubjects = tableExists("PROFESOR_ASIGNATURAS");
        String subjectJoin =
                " LEFT JOIN \"CARGAS_DOCENTES\" cd ON cd.\"PROFESOR_ID\" = pr.\"ID\" AND cd.\"ACTIVA\" = TRUE " +
                " LEFT JOIN \"ASIGNATURAS\" carga_asig ON carga_asig.\"ID\" = cd.\"ASIGNATURA_ID\" ";
        if (hasTeacherSubjects) {
            subjectJoin += subjectCatalogJoin("pr", "pa", "resumen_asig");
        }
        String employmentSelect = columnExists("PROFESORES", "ESTADO_DOCENTE")
                ? "pr.\"ESTADO_DOCENTE\""
                : "'Activo' AS \"ESTADO_DOCENTE\"";
        String staffTypeSelect = columnExists("PROFESORES", "TIPO_PERSONAL")
                ? "COALESCE(NULLIF(TRIM(pr.\"TIPO_PERSONAL\"), ''), 'DOCENTE') AS \"TIPO_PERSONAL\""
                : "'DOCENTE' AS \"TIPO_PERSONAL\"";
        String titleSelect = columnExists("PROFESORES", "TITULO_PROFESIONAL")
                ? "pr.\"TITULO_PROFESIONAL\""
                : "COALESCE(pr.\"ESPECIALIDAD\", '') AS \"TITULO_PROFESIONAL\"";
        String contractSelect = columnExists("PROFESORES", "TIPO_CONTRATO")
                ? "pr.\"TIPO_CONTRATO\""
                : "'Jornada completa' AS \"TIPO_CONTRATO\"";
        String hoursSelect = columnExists("PROFESORES", "HORAS_SEMANALES")
                ? "pr.\"HORAS_SEMANALES\""
                : "0 AS \"HORAS_SEMANALES\"";
        String statusWhere = columnExists("PROFESORES", "ESTADO_DOCENTE")
                ? "UPPER(COALESCE(pr.\"ESTADO_DOCENTE\", 'ACTIVO'))"
                : "'ACTIVO'";
        String subjectNameExpression = hasTeacherSubjects
                ? "COALESCE(carga_asig.\"NOMBRE\", resumen_asig.\"NOMBRE\", '')"
                : "COALESCE(carga_asig.\"NOMBRE\", '')";
        StringBuilder sql = new StringBuilder("SELECT DISTINCT " +
                "pr.\"ID\", " +
                "pr.\"CODIGO\", " +
                staffTypeSelect + ", " +
                titleSelect + ", " +
                contractSelect + ", " +
                hoursSelect + ", " +
                employmentSelect + ", " +
                "pr.\"ACTIVO\", " +
                "pe.\"RUN\", " +
                "pe.\"NOMBRES\" || ' ' || pe.\"APELLIDOS\" AS full_name " +
                "FROM \"PROFESORES\" pr " +
                "JOIN \"PERSONAS\" pe ON pe.\"ID\" = pr.\"PERSONA_ID\" " +
                subjectJoin +
                "WHERE 1 = 1 ");
        if (search != null) {
            sql.append("AND (UPPER(pe.\"NOMBRES\" || ' ' || pe.\"APELLIDOS\") LIKE ? ")
                    .append("OR UPPER(pe.\"RUN\") LIKE ? ")
                    .append("OR UPPER(").append(subjectNameExpression).append(") LIKE ?) ");
            String like = "%" + search + "%";
            args.add(like);
            args.add(like);
            args.add(like);
        }
        if (subjectId != null) {
            if (hasTeacherSubjects) {
                sql.append("AND (carga_asig.\"ID\" = ? OR resumen_asig.\"ID\" = ?) ");
                args.add(subjectId);
                args.add(subjectId);
            } else {
                sql.append("AND carga_asig.\"ID\" = ? ");
                args.add(subjectId);
            }
        }
        String normalizedStatus = normalizeEmploymentStatus(status);
        if (normalizedStatus != null) {
            sql.append("AND ").append(statusWhere).append(" = ? ");
            args.add(normalizedStatus);
        }
        sql.append("ORDER BY full_name");
        return sql.toString();
    }

    private String normalizeEmploymentStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        return switch (status.trim().toUpperCase()) {
            case "ACTIVE", "ACTIVO" -> "ACTIVO";
            case "INACTIVE", "INACTIVO" -> "INACTIVO";
            case "LICENSE", "LICENCIA" -> "LICENCIA";
            default -> status.trim().toUpperCase();
        };
    }

    private String normalizeStaffType(String staffType) {
        if (staffType == null || staffType.isBlank()) {
            return "DOCENTE";
        }

        return switch (staffType.trim().toUpperCase()) {
            case "ASISTENTE", "ASSISTANT" -> "ASISTENTE";
            default -> "DOCENTE";
        };
    }

    private String subjectsByTeacherQuery() {
        if (tableExists("PROFESOR_ASIGNATURAS")) {
            return """
                    SELECT DISTINCT subject_source."ID", subject_source."CODIGO", subject_source."NOMBRE", subject_source."AREA",
                           subject_source."COLOR_HEX", subject_source."DESCRIPCION", subject_source."NIVEL_REFERENCIA",
                           subject_source."HORAS_SUGERIDAS", subject_source."ACTIVA"
                    FROM (
                        SELECT a."ID", a."CODIGO", a."NOMBRE", a."AREA",
                               COALESCE(a."COLOR_HEX", '#7AA7E9') AS "COLOR_HEX",
                               COALESCE(a."DESCRIPCION", '') AS "DESCRIPCION",
                               COALESCE(a."NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                               COALESCE(a."HORAS_SUGERIDAS", 0) AS "HORAS_SUGERIDAS",
                               a."ACTIVA"
                        FROM "CARGAS_DOCENTES" cd
                        JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                        WHERE cd."PROFESOR_ID" = ? AND cd."ACTIVA" = TRUE AND a."ACTIVA" = TRUE

                        UNION

                        SELECT a."ID", a."CODIGO", a."NOMBRE", a."AREA",
                               COALESCE(a."COLOR_HEX", '#7AA7E9') AS "COLOR_HEX",
                               COALESCE(a."DESCRIPCION", '') AS "DESCRIPCION",
                               COALESCE(a."NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                               COALESCE(a."HORAS_SUGERIDAS", 0) AS "HORAS_SUGERIDAS",
                               a."ACTIVA"
                        FROM "PROFESOR_ASIGNATURAS" pa
                        """ + subjectLookupJoin() + """
                        WHERE pa."PROFESOR_ID" = ? AND pa."ACTIVO" = TRUE AND a."ACTIVA" = TRUE
                    ) subject_source
                    ORDER BY subject_source."NOMBRE"
                    """;
        }
        return """
                SELECT DISTINCT a."ID", a."CODIGO", a."NOMBRE", a."AREA",
                       COALESCE(a."COLOR_HEX", '#7AA7E9') AS "COLOR_HEX",
                       COALESCE(a."DESCRIPCION", '') AS "DESCRIPCION",
                       COALESCE(a."NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                       COALESCE(a."HORAS_SUGERIDAS", 0) AS "HORAS_SUGERIDAS",
                       a."ACTIVA"
                FROM "CARGAS_DOCENTES" cd
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE cd."PROFESOR_ID" = ? AND cd."ACTIVA" = TRUE AND a."ACTIVA" = TRUE
                ORDER BY a."NOMBRE"
                """;
    }

    private Long ensureRoleId(
            String code,
            String name,
            String description,
            String levelLabel,
            String scopeSummary,
            int visualOrder
    ) {
        Optional<Long> existingRoleId = jdbcTemplate.query("""
                SELECT "ID"
                FROM "ADMIN_ROLES"
                WHERE UPPER("CODIGO") = UPPER(?)
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), code).stream().findFirst();
        if (existingRoleId.isPresent()) {
            return existingRoleId.get();
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO "ADMIN_ROLES" (
                        "CODIGO", "NOMBRE", "DESCRIPCION", "ACTIVO",
                        "NIVEL_LABEL", "RESUMEN_ALCANCE", "ORDEN_VISUAL"
                    ) VALUES (?, ?, ?, TRUE, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, code);
            statement.setString(2, name);
            statement.setString(3, description);
            statement.setString(4, levelLabel);
            statement.setString(5, scopeSummary);
            statement.setInt(6, visualOrder);
            return statement;
        }, keyHolder);
        return extractGeneratedId(keyHolder);
    }

    private Optional<AccessUserRecord> findUserRecordByRunAndRole(String run, String roleCode) {
        String sql = "ASISTENTE".equalsIgnoreCase(roleCode)
                ? """
                SELECT
                    u."ID" AS user_id,
                    u."PERSONA_ID",
                    u."USUARIO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email,
                    COALESCE(aus."ESTADO", CASE WHEN u."ACTIVO" THEN 'Activo' ELSE 'Inactivo' END) AS status
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                  AND UPPER(COALESCE(r."CODIGO", '')) IN ('ASISTENTE', 'SECRETARIA')
                ORDER BY u."ID"
                LIMIT 1
                """
                : """
                SELECT
                    u."ID" AS user_id,
                    u."PERSONA_ID",
                    u."USUARIO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email,
                    COALESCE(aus."ESTADO", CASE WHEN u."ACTIVO" THEN 'Activo' ELSE 'Inactivo' END) AS status
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                  AND UPPER(COALESCE(r."CODIGO", '')) = UPPER(?)
                ORDER BY u."ID"
                LIMIT 1
                """;

        Object[] args = "ASISTENTE".equalsIgnoreCase(roleCode)
                ? new Object[]{run}
                : new Object[]{run, roleCode};

        return jdbcTemplate.query(sql, (rs, rowNum) -> new AccessUserRecord(
                rs.getLong("user_id"),
                rs.getLong("PERSONA_ID"),
                rs.getString("USUARIO"),
                rs.getString("email"),
                rs.getString("status")
        ), args).stream().findFirst();
    }

    private void deleteStaffSystemAccess(String run, String staffType) {
        String roleCode = resolveRoleCodeForStaffType(staffType);
        findUserRecordByRunAndRole(run, roleCode).ifPresent(record -> {
            jdbcTemplate.update("DELETE FROM \"ADMIN_USER_SETTINGS\" WHERE \"USUARIO_ID\" = ?", record.userId());
            jdbcTemplate.update("DELETE FROM \"USUARIOS\" WHERE \"ID\" = ?", record.userId());
        });
    }

    private boolean personStillLinked(Long personId) {
        Integer userCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "USUARIOS"
                WHERE "PERSONA_ID" = ?
                """, Integer.class, personId);
        return userCount != null && userCount > 0;
    }

    private Long insertStaffUser(Long personId, String username, String encodedPassword) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
                    VALUES (?, ?, ?, TRUE)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, personId);
            statement.setString(2, username);
            statement.setString(3, encodedPassword);
            return statement;
        }, keyHolder);
        return extractGeneratedId(keyHolder);
    }

    private void updateStaffUser(Long userId, Long personId, String username, String encodedPassword) {
        jdbcTemplate.update("""
                UPDATE "USUARIOS"
                SET "PERSONA_ID" = ?,
                    "USUARIO" = ?,
                    "CLAVE" = ?,
                    "ACTIVO" = TRUE
                WHERE "ID" = ?
                """, personId, username, encodedPassword, userId);
    }

    private void upsertStaffUserSettings(Long userId, Long roleId) {
        Integer updated = jdbcTemplate.update("""
                UPDATE "ADMIN_USER_SETTINGS"
                SET "ROL_ID" = ?,
                    "ESTADO" = 'Activo',
                    "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                WHERE "USUARIO_ID" = ?
                """, roleId, userId);
        if (updated != null && updated > 0) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "ADMIN_USER_SETTINGS" (
                    "USUARIO_ID", "ROL_ID", "ESTADO", "FORZAR_CAMBIO_CLAVE", "REQUIERE_2FA", "ELIMINABLE"
                ) VALUES (?, ?, 'Activo', TRUE, FALSE, TRUE)
                """, userId, roleId);
    }

    private String generateUniqueStaffUsername(String firstNames, String paternalLastName, String maternalLastName, String staffType) {
        String[] nameParts = (firstNames == null ? "" : firstNames.trim()).split("\\s+");
        String normalizedFirstName = nameParts.length > 0 ? normalizeUsernamePart(nameParts[0]) : "";
        String normalizedPaternalLastName = normalizeUsernamePart(paternalLastName);
        String normalizedMaternalLastName = normalizeUsernamePart(maternalLastName);

        String firstInitial = normalizedFirstName.isBlank() ? "" : normalizedFirstName.substring(0, 1);
        String maternalInitial = normalizedMaternalLastName.isBlank() ? "" : normalizedMaternalLastName.substring(0, 1);
        String base = (firstInitial + normalizedPaternalLastName).toLowerCase(Locale.ROOT);
        if (base.isBlank()) {
            base = "ASISTENTE".equalsIgnoreCase(staffType) ? "asistente" : "docente";
        }

        String candidate = base;
        if (!usernameExists(candidate)) {
            return candidate;
        }

        if (!maternalInitial.isBlank()) {
            candidate = (base + maternalInitial).toLowerCase(Locale.ROOT);
            if (!usernameExists(candidate)) {
                return candidate;
            }
        }

        int suffix = 2;
        while (usernameExists(base + suffix)) {
            suffix++;
        }
        return (base + suffix).toLowerCase(Locale.ROOT);
    }

    private boolean usernameExists(String username) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "USUARIOS"
                WHERE UPPER("USUARIO") = UPPER(?)
                """, Integer.class, username);
        return count != null && count > 0;
    }

    private String buildStaffEmail(String username, String staffType) {
        String domain = "ASISTENTE".equalsIgnoreCase(staffType) ? "asistentes.torrefuerte.cl" : "docentes.torrefuerte.cl";
        return username.toLowerCase(Locale.ROOT) + "@" + domain;
    }

    private String resolveRoleCodeForStaffType(String staffType) {
        return "ASISTENTE".equalsIgnoreCase(staffType) ? "ASISTENTE" : "PROFESOR";
    }

    private String normalizeAccountStatus(String status) {
        if (status == null || status.isBlank()) {
            return "Activo";
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
    }

    private String safeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUsernamePart(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{Alnum}]", "")
                .toLowerCase(Locale.ROOT);
    }

    private void updatePerson(Long personId, TeacherCommand command) {
        StringBuilder sql = new StringBuilder("""
                UPDATE "PERSONAS"
                SET "RUN" = ?, "NOMBRES" = ?, "APELLIDOS" = ?, "CORREO_ELECTRONICO" = ?, "DIRECCION" = ?, "TELEFONO" = ?
                """);
        List<Object> values = new ArrayList<>(List.of(
                command.run(),
                command.firstNames(),
                composeLastNames(command),
                command.institutionalEmail(),
                command.address(),
                command.phone()
        ));
        if (columnExists("PERSONAS", "FECHA_NACIMIENTO")) {
            sql.append(", \"FECHA_NACIMIENTO\" = ?");
            values.add(command.birthDate());
        }
        if (columnExists("PERSONAS", "GENERO")) {
            sql.append(", \"GENERO\" = ?");
            values.add(command.gender());
        }
        if (columnExists("PERSONAS", "REGION_ID")) {
            sql.append(", \"REGION_ID\" = ?");
            values.add(command.regionId());
        }
        if (columnExists("PERSONAS", "COMUNA_ID")) {
            sql.append(", \"COMUNA_ID\" = ?");
            values.add(command.communeId());
        }
        sql.append(" WHERE \"ID\" = ?");
        values.add(personId);
        jdbcTemplate.update(sql.toString(), values.toArray());
    }

    private void updateTeacherRecord(Long teacherId, TeacherCommand command) {
        StringBuilder sql = new StringBuilder("""
                UPDATE "PROFESORES"
                SET "ESPECIALIDAD" = ?
                """);
        List<Object> values = new ArrayList<>(List.of(command.professionalTitle()));
        if (columnExists("PROFESORES", "TITULO_PROFESIONAL")) {
            sql.append(", \"TITULO_PROFESIONAL\" = ?");
            values.add(command.professionalTitle());
        }
        if (columnExists("PROFESORES", "TIPO_CONTRATO")) {
            sql.append(", \"TIPO_CONTRATO\" = ?");
            values.add(command.contractType());
        }
        if (columnExists("PROFESORES", "HORAS_SEMANALES")) {
            sql.append(", \"HORAS_SEMANALES\" = ?");
            values.add(command.weeklyHours());
        }
        if (columnExists("PROFESORES", "FECHA_INGRESO")) {
            sql.append(", \"FECHA_INGRESO\" = ?");
            values.add(command.startDate());
        }
        if (columnExists("PROFESORES", "ESTADO_DOCENTE")) {
            sql.append(", \"ESTADO_DOCENTE\" = ?");
            values.add(command.employmentStatus());
        }
        if (columnExists("PROFESORES", "TIPO_PERSONAL")) {
            sql.append(", \"TIPO_PERSONAL\" = ?");
            values.add(normalizeStaffType(command.staffType()));
        }
        sql.append(" WHERE \"ID\" = ?");
        values.add(teacherId);
        jdbcTemplate.update(sql.toString(), values.toArray());
    }

    private void bindValues(PreparedStatement statement, List<Object> values) throws java.sql.SQLException {
        for (int index = 0; index < values.size(); index++) {
            Object value = values.get(index);
            int parameterIndex = index + 1;
            if (value instanceof LocalDate localDate) {
                statement.setDate(parameterIndex, Date.valueOf(localDate));
            } else if (value instanceof Integer integerValue) {
                statement.setInt(parameterIndex, integerValue);
            } else if (value instanceof Long longValue) {
                statement.setLong(parameterIndex, longValue);
            } else {
                statement.setObject(parameterIndex, value);
            }
        }
    }

    private Long extractGeneratedId(KeyHolder keyHolder) {
        Number directKey = keyHolder.getKeyList().stream()
                .findFirst()
                .map((keys) -> keys.get("ID"))
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .orElse(null);
        if (directKey != null) {
            return directKey.longValue();
        }

        Number fallbackKey = keyHolder.getKey();
        if (fallbackKey != null) {
            return fallbackKey.longValue();
        }

        throw new IllegalStateException("No fue posible obtener la llave generada del registro docente");
    }

    private String subjectCatalogJoin() {
        return subjectCatalogJoin("pr", "pa", "a");
    }

    private String subjectCatalogJoin(String teacherAlias, String assignmentAlias, String subjectAlias) {
        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA_ID")) {
            return " LEFT JOIN \"PROFESOR_ASIGNATURAS\" " + assignmentAlias +
                    " ON " + assignmentAlias + ".\"PROFESOR_ID\" = " + teacherAlias + ".\"ID\" AND " + assignmentAlias + ".\"ACTIVO\" = TRUE " +
                    " LEFT JOIN \"ASIGNATURAS\" " + subjectAlias +
                    " ON " + subjectAlias + ".\"ID\" = " + assignmentAlias + ".\"ASIGNATURA_ID\" ";
        }
        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA")) {
            return " LEFT JOIN \"PROFESOR_ASIGNATURAS\" " + assignmentAlias +
                    " ON " + assignmentAlias + ".\"PROFESOR_ID\" = " + teacherAlias + ".\"ID\" AND " + assignmentAlias + ".\"ACTIVO\" = TRUE " +
                    " LEFT JOIN \"ASIGNATURAS\" " + subjectAlias +
                    " ON UPPER(TRIM(" + subjectAlias + ".\"NOMBRE\")) = UPPER(TRIM(" + assignmentAlias + ".\"ASIGNATURA\")) ";
        }
        return " LEFT JOIN \"PROFESOR_ASIGNATURAS\" " + assignmentAlias + " ON 1 = 0 LEFT JOIN \"ASIGNATURAS\" " + subjectAlias + " ON 1 = 0 ";
    }

    private String subjectLookupJoin() {
        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA_ID")) {
            return "JOIN \"ASIGNATURAS\" a ON a.\"ID\" = pa.\"ASIGNATURA_ID\"";
        }
        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA")) {
            return "JOIN \"ASIGNATURAS\" a ON UPPER(TRIM(a.\"NOMBRE\")) = UPPER(TRIM(pa.\"ASIGNATURA\"))";
        }
        return "JOIN \"ASIGNATURAS\" a ON 1 = 0";
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND (table_name = ? OR table_name = LOWER(?) OR table_name = UPPER(?))
                )
                """, Boolean.class, tableName, tableName, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private boolean columnExists(String tableName, String columnName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND (table_name = ? OR table_name = LOWER(?) OR table_name = UPPER(?))
                      AND (column_name = ? OR column_name = LOWER(?) OR column_name = UPPER(?))
                )
                """, Boolean.class, tableName, tableName, tableName, columnName, columnName, columnName);
        return Boolean.TRUE.equals(exists);
    }

    private String selectColumnOrAlias(String tableName, String columnName, String alias, String fallbackExpression, String selectAlias) {
        if (columnExists(tableName, columnName)) {
            return alias + ".\"" + columnName + "\"";
        }
        return fallbackExpression + " AS \"" + selectAlias + "\"";
    }

    private record AccessUserRecord(Long userId, Long personId, String username, String email, String status) {
    }
}
