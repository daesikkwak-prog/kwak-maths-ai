/** 그림 SVG 최대 길이 (이보다 길면 비정상으로 보고 버린다) */
const MAX_SVG_LENGTH = 20000;

/**
 * AI가 생성한 SVG를 화면에 넣기 전에 정리한다.
 * - 코드펜스/설명 문구를 벗겨 <svg>...</svg> 한 덩어리만 남긴다
 * - 스크립트·외부 리소스·이벤트 속성을 제거한다
 * 형식이 아니면 빈 문자열을 반환해 그림 없이 문제만 보여준다.
 */
export function sanitizeSvg(input: string | null | undefined): string {
  if (!input) return '';

  let svg = String(input).trim();

  const fenced = svg.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/);
  if (fenced) svg = fenced[1].trim();

  const start = svg.indexOf('<svg');
  const end = svg.lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end < start) return '';
  svg = svg.slice(start, end + '</svg>'.length);

  // 위험 태그는 내용까지 통째로 제거
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|use|image|a|animate|set)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ''
  );
  // 자기닫힘 형태도 제거
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|use|image|animate|set)\b[^>]*\/?>/gi,
    ''
  );
  // 이벤트 핸들러 / 외부 링크 / javascript: URL 제거
  svg = svg.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svg = svg.replace(/\s(?:xlink:href|href|xmlns:xlink)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svg = svg.replace(/javascript:/gi, '');

  if (svg.length > MAX_SVG_LENGTH) return '';

  return svg.trim();
}
