CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id            UUID PRIMARY KEY,
    slug          VARCHAR(100) NOT NULL UNIQUE,
    nombre        VARCHAR(200) NOT NULL,
    total_grados  INTEGER NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_grades (
    id                UUID PRIMARY KEY,
    subject_id        UUID NOT NULL REFERENCES curriculum_subjects(id),
    grado             VARCHAR(5) NOT NULL,
    label             VARCHAR(50) NOT NULL,
    total_objetivos   INTEGER NOT NULL,
    UNIQUE(subject_id, grado)
);

CREATE TABLE IF NOT EXISTS curriculum_objectives (
    id          UUID PRIMARY KEY,
    grade_id    UUID NOT NULL REFERENCES curriculum_grades(id),
    codigo      VARCHAR(20) NOT NULL,
    tipo        VARCHAR(20) NOT NULL,
    eje         VARCHAR(200),
    descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_objective_items (
    id           SERIAL PRIMARY KEY,
    objective_id UUID NOT NULL REFERENCES curriculum_objectives(id),
    orden        INTEGER NOT NULL,
    descripcion  TEXT NOT NULL,
    UNIQUE(objective_id, orden)
);

CREATE TABLE IF NOT EXISTS planning_class_curriculum_objectives (
    planning_class_id BIGINT NOT NULL REFERENCES "CLASES_PLANIFICACION"("ID") ON DELETE CASCADE,
    objective_id      UUID NOT NULL REFERENCES curriculum_objectives(id) ON DELETE CASCADE,
    PRIMARY KEY (planning_class_id, objective_id)
);

CREATE INDEX IF NOT EXISTS idx_curobj_grade ON curriculum_objectives(grade_id);
CREATE INDEX IF NOT EXISTS idx_curobj_eje ON curriculum_objectives(eje);
CREATE INDEX IF NOT EXISTS idx_curobj_tipo ON curriculum_objectives(tipo);
CREATE INDEX IF NOT EXISTS idx_planning_curriculum_planning ON planning_class_curriculum_objectives(planning_class_id);
CREATE INDEX IF NOT EXISTS idx_planning_curriculum_objective ON planning_class_curriculum_objectives(objective_id);

ALTER TABLE curriculum_objectives
DROP CONSTRAINT IF EXISTS curriculum_objectives_grade_id_codigo_key;
