// Supabase 客户端配置
const SUPABASE_URL = 'https://ymrhorxtglbsoccpxnwv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltcmhvcnh0Z2xic29jY3B4bnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTgxNjUsImV4cCI6MjA4OTc5NDE2NX0.wav36aWORPcWOhX33ga73puQf3b3ofxHbXD2vB6myoA';

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// API 封装
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get(table, params = {}) {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    const url = `${this.baseUrl}/rest/v1/${table}${query ? '?' + query : ''}`;
    const res = await fetch(url, { headers: H });
    return res.json();
  }

  async post(table, data) {
    const url = `${this.baseUrl}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(data)
    });
    return res.json();
  }

  async patch(table, id, data) {
    const url = `${this.baseUrl}/rest/v1/${table}?id=eq.${id}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
    return res;
  }

  async delete(table, id) {
    const url = `${this.baseUrl}/rest/v1/${table}?id=eq.${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: H
    });
    return res;
  }

  async rpc(fn, params = {}) {
    const url = `${this.baseUrl}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(params)
    });
    return res.json();
  }
}

const api = new ApiClient(SUPABASE_URL);

// 业务 API
const projectsApi = {
  list: () => api.get('projects', { select: '*', order: 'created_at.desc' }),
  get: (id) => api.get('projects', { id: `eq.${id}`, select: '*' }),
  create: (data) => api.post('projects', data),
  update: (id, data) => api.patch('projects', id, data),
  delete: (id) => api.delete('projects', id),
};

const contractsApi = {
  list: () => api.get('contracts', { select: '*,projects:project_id(name)', order: 'created_at.desc' }),
  create: (data) => api.post('contracts', data),
  update: (id, data) => api.patch('contracts', id, data),
  delete: (id) => api.delete('contracts', id),
};

const expensesApi = {
  list: () => api.get('expenses', { select: '*,projects:project_id(name)', order: 'created_at.desc' }),
  create: (data) => api.post('expenses', data),
  update: (id, data) => api.patch('expenses', id, data),
  delete: (id) => api.delete('expenses', id),
};

const risksApi = {
  list: () => api.get('risks', { select: '*,projects:project_id(name)', order: 'created_at.desc' }),
  create: (data) => api.post('risks', data),
  update: (id, data) => api.patch('risks', id, data),
  delete: (id) => api.delete('risks', id),
};

const phasesApi = {
  list: (projectId) => api.get('project_phases', { project_id: `eq.${projectId}`, order: 'start_date.asc' }),
  create: (data) => api.post('project_phases', data),
  update: (id, data) => api.patch('project_phases', id, data),
  delete: (id) => api.delete('project_phases', id),
};

const configApi = {
  get: () => api.get('app_config', { select: 'config_key,config_value' }),
  update: async (key, value) => {
    await api.patch('app_config', key, { config_key: `eq.${key}` }, { config_value: value });
  }
};
