/**
 * AI가 섞어 보내는 LaTeX 표기를 학생이 바로 읽을 수 있는 텍스트로 바꾼다.
 * (예: "$4\text{cm}$" → "4cm", "\frac{1}{2}" → "1/2", "x^2" → "x²")
 *
 * 프롬프트에서 LaTeX를 쓰지 말라고 지시하지만 모델이 습관적으로 넣는 경우가 있고,
 * 이미 저장된 기록에도 남아 있어 화면에 그릴 때 한 번 더 정리한다.
 */

const SYMBOLS: Array<[RegExp, string]> = [
  [/\\times/g, '×'],
  [/\\div/g, '÷'],
  [/\\cdot/g, '·'],
  [/\\pm/g, '±'],
  [/\\mp/g, '∓'],
  [/\\leq?\b/g, '≤'],
  [/\\geq?\b/g, '≥'],
  [/\\neq/g, '≠'],
  [/\\approx/g, '≈'],
  [/\\equiv/g, '≡'],
  [/\\infty/g, '∞'],
  [/\\pi\b/g, 'π'],
  [/\\theta\b/g, 'θ'],
  [/\\alpha\b/g, 'α'],
  [/\\beta\b/g, 'β'],
  [/\\angle/g, '∠'],
  [/\\triangle/g, '△'],
  [/\\square/g, '□'],
  [/\\perp/g, '⊥'],
  [/\\parallel/g, '∥'],
  [/\\rightarrow|\\to\b/g, '→'],
  [/\\ldots|\\cdots|\\dots/g, '…'],
  [/\^\s*\\circ|\\degree/g, '°'],
  [/\\%/g, '%'],
];

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', n: 'ⁿ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

/** 중괄호 안 내용을 여러 겹이라도 벗겨내기 위해 같은 치환을 반복 적용한다. */
function replaceRepeatedly(text: string, pattern: RegExp, replacer: (...args: any[]) => string) {
  let prev = text;
  for (let i = 0; i < 5; i += 1) {
    const next = prev.replace(pattern, replacer as any);
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

/** 분자·분모가 두 글자 이상이면 괄호로 감싼다 ((x+1)/2). */
function wrapIfCompound(part: string): string {
  const trimmed = part.trim();
  return /^[\w.]+$/.test(trimmed) ? trimmed : `(${trimmed})`;
}

function toScript(body: string, map: Record<string, string>, prefix: string): string {
  const chars = [...body];
  if (chars.every((c) => map[c])) return chars.map((c) => map[c]).join('');
  return `${prefix}${body.length > 1 ? `(${body})` : body}`;
}

export function toReadableMath(input: string | null | undefined): string {
  if (!input) return '';

  let text = String(input);

  // 수식 구분자 제거 ($...$, \(...\), \[...\])
  text = text.replace(/\$\$?/g, '');
  text = text.replace(/\\[()[\]]/g, '');

  // 줄바꿈 / 간격 명령
  text = text.replace(/\\\\/g, '\n');
  text = text.replace(/\\(?:quad|qquad|,|;|:|!)/g, ' ');
  text = text.replace(/\\left|\\right/g, '');

  // 글꼴 명령은 내용만 남긴다 (\text{cm} → cm)
  text = replaceRepeatedly(
    text,
    /\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname|overline|mbox)\s*\{([^{}]*)\}/g,
    (_m, body: string) => body
  );

  // 분수 / 제곱근
  text = replaceRepeatedly(
    text,
    /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_m, a: string, b: string) => `${wrapIfCompound(a)}/${wrapIfCompound(b)}`
  );
  text = replaceRepeatedly(text, /\\sqrt\s*\{([^{}]*)\}/g, (_m, body: string) => `√${wrapIfCompound(body)}`);
  text = text.replace(/\\sqrt\s*([\w.]+)/g, '√$1');

  for (const [pattern, symbol] of SYMBOLS) {
    text = text.replace(pattern, symbol);
  }

  // 위/아래 첨자
  text = text.replace(/\^\s*\{([^{}]*)\}/g, (_m, body: string) => toScript(body, SUPERSCRIPTS, '^'));
  text = text.replace(/\^\s*([A-Za-z0-9+-])/g, (_m, ch: string) => toScript(ch, SUPERSCRIPTS, '^'));
  text = text.replace(/_\s*\{([^{}]*)\}/g, (_m, body: string) => toScript(body, SUBSCRIPTS, '_'));
  text = text.replace(/_\s*([A-Za-z0-9])/g, (_m, ch: string) => toScript(ch, SUBSCRIPTS, '_'));

  // 남은 명령어는 이름만 남기고 백슬래시 제거
  text = replaceRepeatedly(text, /\\[a-zA-Z]+\s*\{([^{}]*)\}/g, (_m, body: string) => body);
  text = text.replace(/\\[a-zA-Z]+/g, '');
  text = text.replace(/\\(.)/g, '$1');

  // 수식에서만 쓰이던 중괄호 정리 (내용은 유지)
  text = text.replace(/[{}]/g, '');

  // 마크다운 강조도 그대로 노출되므로 벗겨낸다 (곱셈 기호로 쓰인 *는 건드리지 않는다)
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  text = text.replace(/`([^`\n]+)`/g, '$1');

  // 기호 치환으로 생긴 군더더기 공백 정리 (줄바꿈은 보존)
  text = text.replace(/[^\S\n]{2,}/g, ' ');
  text = text.replace(/[^\S\n]+([,.)}\]])/g, '$1');

  return text.trim();
}
