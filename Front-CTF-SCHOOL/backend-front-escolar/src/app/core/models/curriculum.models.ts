export interface CurriculumSubject {
  id: string;
  slug: string;
  nombre: string;
  totalGrados: number;
}

export interface CurriculumGrade {
  id: string;
  grado: string;
  label: string;
  totalObjetivos: number;
}

export interface CurriculumObjective {
  id: string;
  codigo: string;
  tipo: 'conocimiento' | 'habilidad';
  eje: string;
  descripcion: string;
  subItems: string[];
  suggestedSkills: string[];
  suggestedAttitudes: string[];
  suggestedResources: string[];
  suggestedDiversityNote: string;
  suggestedEvaluationType: string;
  suggestedLearningApproach: string;
  suggestedInstrument: string;
}
