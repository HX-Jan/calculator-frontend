// The browser sends expressions, never computed results.
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    throw new Error('暂时无法连接计算服务。首次启动可能需要等待，请稍后重试。');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('服务返回了无法识别的响应，请稍后重试。');
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || '请求未完成，请稍后重试。');
  }
  return payload.data;
}
