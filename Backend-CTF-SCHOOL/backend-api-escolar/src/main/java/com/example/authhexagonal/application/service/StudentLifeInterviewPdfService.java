package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.StudentLifeInterview;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.text.Normalizer;

@Service
public class StudentLifeInterviewPdfService {

    private static final int PAGE_WIDTH = 612;
    private static final int PAGE_HEIGHT = 842;
    private static final int MARGIN = 36;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy", Locale.forLanguageTag("es-CL"));
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public StudentLifeInterviewPdfService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public byte[] generate(StudentLifeInterview interview) {
        InterviewPdfContext context = resolveContext(interview);
        StringBuilder stream = new StringBuilder();

        drawHeader(stream, interview);
        drawStudentBlock(stream, interview, context);
        drawSection(stream, 492, "MOTIVO DE LA ENTREVISTA", value(interview.reason()), 42);
        drawSection(stream, 318, "SINTESIS DE LO CONVERSADO", value(interview.summary()), 128);
        drawSection(stream, 144, "ACUERDOS O COMPROMISOS", value(interview.agreements()), 128);
        drawSignatures(stream, interview, context);

        return buildPdf(stream.toString());
    }

    private void drawHeader(StringBuilder stream, StudentLifeInterview interview) {
        rect(stream, MARGIN, 720, 540, 86, 0.94, 0.97, 1.0);
        rect(stream, 48, 744, 42, 42, 0.98, 0.90, 0.56);
        text(stream, "TFS", 56, 768, 14, true);
        text(stream, "Colegio Torre Fuerte School", 106, 774, 13, true);
        text(stream, "Control institucional - Plataforma ConectaSchool", 106, 756, 10, false);

        rect(stream, 324, 762, 228, 28, 1.0, 1.0, 1.0);
        text(stream, "Acta de entrevista escolar", 338, 773, 10, true);
        text(stream, formatDate(interview), 499, 738, 10, true);
        line(stream, MARGIN, 708, 576, 708);
    }

    private void drawStudentBlock(StringBuilder stream, StudentLifeInterview interview, InterviewPdfContext context) {
        rect(stream, MARGIN, 576, 540, 108, 0.96, 0.98, 1.0);

        label(stream, "ESTUDIANTE", 52, 656);
        text(stream, context.studentName(), 52, 638, 12, true);
        if (!context.studentRun().isBlank()) {
            text(stream, "RUN " + context.studentRun(), 52, 622, 9, false);
        }

        label(stream, "CURSO", 252, 656);
        text(stream, context.courseName(), 252, 638, 12, true);

        label(stream, "FECHA", 420, 656);
        text(stream, formatDate(interview), 420, 638, 12, true);
        label(stream, "HORA", 420, 620);
        text(stream, formatTime(interview), 420, 602, 10, true);

        label(stream, "APODERADO / PARTICIPANTE", 52, 606);
        text(stream, context.guardianName(), 52, 588, 11, true);

        label(stream, "TIPO", 252, 606);
        text(stream, value(interview.type()), 252, 588, 11, true);

        label(stream, "RESPONSABLE", 340, 606);
        drawWrappedText(stream, value(interview.responsible()), 340, 588, 28, 10, true);
    }

    private void drawSection(StringBuilder stream, int y, String title, String body, int height) {
        text(stream, title, 48, y + height + 14, 12, true);
        rect(stream, MARGIN, y, 540, height, 1.0, 1.0, 1.0);
        drawWrappedText(stream, body.isBlank() ? "-" : body, 52, y + height - 24, 86, 10, false);
    }

    private void drawSignatures(StringBuilder stream, StudentLifeInterview interview, InterviewPdfContext context) {
        line(stream, 70, 84, 238, 84);
        line(stream, 374, 84, 542, 84);
        text(stream, "Firma del docente", 104, 64, 10, false);
        text(stream, "Firma del apoderado", 400, 64, 10, false);

        if (!value(interview.responsible()).isBlank()) {
            text(stream, value(interview.responsible()), 70, 100, 9, false);
        }
        if (!context.guardianName().isBlank()) {
            text(stream, context.guardianName(), 374, 100, 9, false);
        }
    }

    private InterviewPdfContext resolveContext(StudentLifeInterview interview) {
        Long enrollmentId = interview.enrollmentId();
        if (enrollmentId != null) {
            return jdbcTemplate.query("""
                    SELECT
                        TRIM(CONCAT(a."NOMBRE", ' ', a."APELLIDOS")) AS student_name,
                        COALESCE(a."RUN", '') AS student_run,
                        COALESCE(c."NOMBRE", '') AS course_name,
                        COALESCE(TRIM(CONCAT(ap."NOMBRE", ' ', ap."APELLIDOS")), '') AS guardian_name
                    FROM "MATRICULAS" m
                    JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                    LEFT JOIN "MATRICULA_APODERADOS" ap ON ap."MATRICULA_ID" = m."ID" AND ap."ACTIVO" = TRUE
                    WHERE m."ID" = ?
                    """, (rs, rowNum) -> new InterviewPdfContext(
                    value(rs.getString("student_name")),
                    value(rs.getString("student_run")),
                    value(rs.getString("course_name")),
                    firstNonBlank(rs.getString("guardian_name"), firstParticipant(interview))
            ), enrollmentId).stream().findFirst().orElse(fallbackContext(interview));
        }

        return jdbcTemplate.query("""
                SELECT
                    TRIM(CONCAT(a."NOMBRE", ' ', a."APELLIDOS")) AS student_name,
                    COALESCE(a."RUN", '') AS student_run,
                    COALESCE(c."NOMBRE", '') AS course_name
                FROM "ALUMNOS" a
                LEFT JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID"
                LEFT JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                WHERE a."ID" = ?
                ORDER BY m."ID" DESC
                LIMIT 1
                """, (rs, rowNum) -> new InterviewPdfContext(
                value(rs.getString("student_name")),
                value(rs.getString("student_run")),
                value(rs.getString("course_name")),
                firstParticipant(interview)
        ), interview.studentId()).stream().findFirst().orElse(fallbackContext(interview));
    }

    private InterviewPdfContext fallbackContext(StudentLifeInterview interview) {
        return new InterviewPdfContext(
                interview.studentId() == null ? "Estudiante" : "Estudiante ID " + interview.studentId(),
                "",
                "",
                firstParticipant(interview)
        );
    }

    private byte[] buildPdf(String stream) {
        byte[] content = stream.getBytes(StandardCharsets.ISO_8859_1);
        List<byte[]> objects = List.of(
                "<< /Type /Catalog /Pages 2 0 R >>".getBytes(StandardCharsets.ISO_8859_1),
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".getBytes(StandardCharsets.ISO_8859_1),
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>".getBytes(StandardCharsets.ISO_8859_1),
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".getBytes(StandardCharsets.ISO_8859_1),
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>".getBytes(StandardCharsets.ISO_8859_1),
                ("<< /Length " + content.length + " >>\nstream\n" + stream + "endstream").getBytes(StandardCharsets.ISO_8859_1)
        );

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, "%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(out.size());
            write(out, (i + 1) + " 0 obj\n");
            out.writeBytes(objects.get(i));
            write(out, "\nendobj\n");
        }
        int xrefOffset = out.size();
        write(out, "xref\n0 " + (objects.size() + 1) + "\n");
        write(out, "0000000000 65535 f \n");
        for (Integer offset : offsets) {
            write(out, String.format("%010d 00000 n \n", offset));
        }
        write(out, "trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF");
        return out.toByteArray();
    }

    private void rect(StringBuilder stream, int x, int y, int width, int height, double r, double g, double b) {
        stream.append(formatColor(r, g, b)).append(" rg\n");
        stream.append(x).append(' ').append(y).append(' ').append(width).append(' ').append(height).append(" re f\n");
        stream.append("0.82 0.88 0.95 RG\n");
        stream.append(x).append(' ').append(y).append(' ').append(width).append(' ').append(height).append(" re S\n");
    }

    private void line(StringBuilder stream, int x1, int y1, int x2, int y2) {
        stream.append("0.08 0.15 0.26 RG\n");
        stream.append(x1).append(' ').append(y1).append(" m ").append(x2).append(' ').append(y2).append(" l S\n");
    }

    private void label(StringBuilder stream, String value, int x, int y) {
        stream.append("0.48 0.57 0.70 rg\n");
        rawText(stream, value, x, y, 8, true);
    }

    private void text(StringBuilder stream, String value, int x, int y, int size, boolean bold) {
        stream.append("0.02 0.09 0.20 rg\n");
        rawText(stream, value, x, y, size, bold);
    }

    private void drawWrappedText(StringBuilder stream, String value, int x, int y, int maxChars, int size, boolean bold) {
        int lineY = y;
        for (String line : wrap(value, maxChars)) {
            text(stream, line, x, lineY, size, bold);
            lineY -= size + 4;
        }
    }

    private void rawText(StringBuilder stream, String value, int x, int y, int size, boolean bold) {
        stream.append("BT\n/")
                .append(bold ? "F2" : "F1")
                .append(' ')
                .append(size)
                .append(" Tf\n")
                .append(x)
                .append(' ')
                .append(y)
                .append(" Td\n(")
                .append(escape(value))
                .append(") Tj\nET\n");
    }

    private List<String> wrap(String value, int maxLength) {
        String text = value(value).replace("\r", " ").replace("\n", " ").trim();
        List<String> lines = new ArrayList<>();
        if (text.isBlank()) {
            lines.add("-");
            return lines;
        }

        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            if (!current.isEmpty() && current.length() + word.length() + 1 > maxLength) {
                lines.add(current.toString());
                current.setLength(0);
            }
            if (!current.isEmpty()) {
                current.append(' ');
            }
            current.append(word);
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String formatDate(StudentLifeInterview interview) {
        return interview.date() == null ? "" : interview.date().format(DATE_FORMAT);
    }

    private String formatTime(StudentLifeInterview interview) {
        return interview.time() == null ? "" : interview.time().format(TIME_FORMAT);
    }

    private String firstParticipant(StudentLifeInterview interview) {
        return interview.participants() == null || interview.participants().isEmpty() ? "" : value(interview.participants().getFirst());
    }

    private String firstNonBlank(String primary, String fallback) {
        String cleaned = value(primary).trim();
        return cleaned.isBlank() ? value(fallback).trim() : cleaned;
    }

    private static String value(Object value) {
        return value == null ? "" : value.toString();
    }

    private String formatColor(double r, double g, double b) {
        return String.format(Locale.US, "%.2f %.2f %.2f", r, g, b);
    }

    private String escape(String value) {
        return pdfSafe(value(value))
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
                .replace("\r", " ")
                .replace("\n", " ");
    }

    private String pdfSafe(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replace("ñ", "n").replace("Ñ", "N");
    }

    private void write(ByteArrayOutputStream out, String value) {
        out.writeBytes(value.getBytes(StandardCharsets.ISO_8859_1));
    }

    private record InterviewPdfContext(
            String studentName,
            String studentRun,
            String courseName,
            String guardianName
    ) {
    }
}
