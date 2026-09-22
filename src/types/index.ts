// User & Auth
export type UserRole = 'student' | 'admin';
export type SchoolLevel = '초' | '중' | '고';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  school_level: SchoolLevel;
  grade: number;
  my_problem_formula_required: boolean;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

// AI Rules
export type AIRuleLevel = 'common' | '초' | '중' | '고';

export interface AIRule {
  id: string;
  level: AIRuleLevel;
  content: string;
  is_active: boolean;
  deleted_at: string | null;
  updated_at: string;
}

// Options (선택지)
export type OptionType = 'grade' | 'difficulty';

export interface Option {
  id: string;
  type: OptionType;
  value: string; // 예: "중1", "상", "중", "하"
  order: number;
  is_active: boolean;
  deleted_at: string | null;
}

// Units (단원)
export type AnswerType = 'subjective' | 'objective';

export interface Unit {
  id: string;
  grade_option_id: string;
  name: string;
  answer_type: AnswerType;
  formula_required: boolean;
  order: number;
  is_active: boolean;
  deleted_at: string | null;
}

// Problems
export type ProblemSource = 'ai_generated' | 'user_uploaded';

export interface Problem {
  id: string;
  source: ProblemSource;
  grade_option_id: string | null;
  unit_id: string | null;
  difficulty_option_id: string | null;
  answer: string | null; // AI가 생성한 정답 (user_uploaded는 null)
  solution: string | null; // AI가 생성한 풀이 (user_uploaded는 null)
  created_at: string;
  is_active: boolean;
  deleted_at: string | null;
}

// Attempts (풀이 시도)
export interface Attempt {
  id: string;
  student_id: string;
  problem_id: string;
  attempt_no: number;
  is_correct: boolean;
  gave_up: boolean;
  issue_summary: string; // 해당 회차 AI 피드백 요약
  final_solution_text: string | null; // 정답 도달 시에만 채워짐
  created_at: string;
}

// Study Time Logs
export interface StudyTimeLog {
  id: string;
  student_id: string;
  session_start: string;
  session_end: string | null;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GeminiResponse {
  is_correct: boolean;
  issue_summary: string;
  final_solution_text?: string;
  feedback: string;
}
