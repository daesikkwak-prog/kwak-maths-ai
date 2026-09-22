// School levels
export const SCHOOL_LEVELS = {
  ELEMENTARY: '초',
  MIDDLE: '중',
  HIGH: '고',
} as const;

export const SCHOOL_LEVELS_DISPLAY = {
  '초': '초등학교',
  '중': '중학교',
  '고': '고등학교',
} as const;

// Answer types
export const ANSWER_TYPES = {
  SUBJECTIVE: 'subjective',
  OBJECTIVE: 'objective',
} as const;

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: '하',
  MEDIUM: '중',
  HARD: '상',
} as const;

// Attempt limits & rules
export const MIN_ATTEMPTS_FOR_GIVE_UP = 3; // 포기 활성화 최소 시도 횟수

// Image processing
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const RESIZE_WIDTH = 1024;
export const RESIZE_QUALITY = 80;

// Tokens & context
export const MAX_CONTEXT_TOKENS = 100000; // Gemini 컨텍스트 제한
