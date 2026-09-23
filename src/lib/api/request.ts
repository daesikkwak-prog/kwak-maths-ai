/** AI 호출은 20~50초까지 걸리므로 넉넉히 기다리되, 이 시간을 넘기면 포기한다 */
export const AI_REQUEST_TIMEOUT = 75000;

interface JsonResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * AI 호출용 POST.
 * 타임아웃·네트워크 오류·JSON이 아닌 응답(게이트웨이 504 HTML 등)을
 * 모두 `{ success: false, error }` 형태로 바꿔 화면이 같은 방식으로 처리하게 한다.
 */
export async function postJson<T = any>(
  url: string,
  body: unknown,
  timeoutMs = AI_REQUEST_TIMEOUT
): Promise<JsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    try {
      return JSON.parse(text) as JsonResult<T>;
    } catch {
      return {
        success: false,
        error:
          res.status === 504 || res.status === 502
            ? 'AI 응답이 너무 오래 걸려 끊겼어요. 다시 시도해주세요.'
            : `요청이 실패했어요. (${res.status})`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.name === 'AbortError'
          ? 'AI 응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.'
          : '네트워크 오류로 실패했어요. 다시 시도해주세요.',
    };
  } finally {
    clearTimeout(timer);
  }
}
