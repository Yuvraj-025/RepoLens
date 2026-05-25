const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function uploadRepository(file: File) {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/repository/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to upload repository');
  }
  return res.json();
}

export async function getRepositories() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch repositories');
  }
  return res.json();
}

export async function getRepositoryDetails(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch repository details');
  }
  return res.json();
}

export async function getRepositoryFiles(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository/${id}/files`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch repository files');
  }
  return res.json();
}

export async function getRepositoryFile(id: string, fileId: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository/${id}/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch repository file details');
  }
  return res.json();
}

export async function deleteRepository(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to delete repository');
  }
  return res.json();
}

export async function getRepositorySummary(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/repository/${id}/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('401: Unauthorized');
    throw new Error(err.message || 'Failed to fetch repository summary');
  }
  return res.json();
}
