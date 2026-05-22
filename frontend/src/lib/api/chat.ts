const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getChatHistory(repositoryId: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/chat/history/${repositoryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch chat history');
  }
  return res.json();
}

export async function clearChatHistory(repositoryId: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/chat/history/${repositoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to clear chat history');
  }
  return res.json();
}

export async function queryRepositoryStream(
  repositoryId: string,
  query: string,
  onMessage: (message: { type: string; content?: string; sources?: any[]; message?: string }) => void
) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${API_URL}/chat/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ repositoryId, query })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to initialize chat connection');
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported by response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('data: ')) {
          const dataStr = cleaned.slice(6).trim();
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            onMessage(parsed);
          } catch (e) {
            console.error('Error parsing stream chunk:', dataStr, e);
          }
        }
      }
    }

    // Process remainder of buffer
    if (buffer) {
      const cleaned = buffer.trim();
      if (cleaned.startsWith('data: ')) {
        const dataStr = cleaned.slice(6).trim();
        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            onMessage(parsed);
          } catch (e) {}
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
