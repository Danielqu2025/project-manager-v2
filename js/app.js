// 主应用入口
class App {
  constructor() {
    this.config = { status: [], risk: [], type: [] };
    this.projects = [];
    this.init();
  }

  async init() {
    // 等待 DOM 加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bootstrap());
    } else {
      this.bootstrap();
    }
  }

  async bootstrap() {
    await this.loadConfig();
    this.setupRoutes();
    console.log('App initialized');
  }

  async loadConfig() {
    try {
      const data = await configApi.get();
      data.forEach(item => {
        this.config[item.config_key] = item.config_value || [];
      });
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  setupRoutes() {
    router.register('/login', () => this.renderLogin());
    router.register('/dashboard', () => this.renderDashboard());
    router.register('/projects', () => this.renderProjects());
    router.register('/project/:id', (params) => renderProjectDetail(params.id));
    router.register('/contracts', () => this.renderContracts());
    router.register('/expenses', () => this.renderExpenses());
    router.register('/risks', () => this.renderRisks());
  }

  renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-page">
        <div class="login-box">
          <div class="login-logo">🏗️</div>
          <h1>项目管理中心</h1>
          <p>请输入访问密码</p>
          <form onsubmit="app.doLogin(event)">
            <input type="password" id="password" class="form-control" placeholder="密码" required>
            <div id="login-error" class="error-msg" style="display:none">密码错误</div>
            <button type="submit" class="btn btn-primary btn-block">登 录</button>
          </form>
        </div>
      </div>
    `;
  }

  doLogin(e) {
    e.preventDefault();
    const pwd = document.getElementById('password').value;
    if (pwd === 'admin123') {
      localStorage.setItem('pm_in', 'y');
      router.navigate('/dashboard');
    } else {
      document.getElementById('login-error').style.display = 'block';
    }
  }

  renderDashboard() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <nav class="sidebar">
          <div class="nav-brand">🏗️ 项目管理</div>
          <div class="nav-item active" data-page="dashboard">📊 数据概览</div>
          <div class="nav-item" data-page="projects">📁 项目</div>
          <div class="nav-item" data-page="contracts">📄 合同</div>
          <div class="nav-item" data-page="expenses">💰 费用</div>
          <div class="nav-item" data-page="risks">⚠️ 风险</div>
          <div class="nav-item" onclick="app.logout()">🚪 退出</div>
        </nav>
        <main class="main-content">
          <div class="page-header">
            <h2>📊 数据概览</h2>
          </div>
          <div id="dashboard-content">
            <div class="loading">加载中...</div>
          </div>
        </main>
      </div>
    `;
    this.bindNavEvents();
    this.loadDashboard();
  }

  bindNavEvents() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        router.navigate(`/${page}`);
      });
    });
  }

  async loadDashboard() {
    try {
      const [projects, expenses] = await Promise.all([
        projectsApi.list(),
        expensesApi.list()
      ]);

      const total = projects.length;
      const budget = projects.reduce((s, p) => s + (p.budget || 0), 0) / 10000;
      const paid = expenses
        .filter(e => e.payment_status === '已付清')
        .reduce((s, e) => s + (e.amount || 0), 0) / 10000;
      const highRisk = projects.filter(p => p.risk_level === '高').length;

      document.getElementById('dashboard-content').innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue">📁</div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">项目总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">💵</div>
            <div class="stat-value">${budget.toFixed(0)}万</div>
            <div class="stat-label">总预算</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">💸</div>
            <div class="stat-value">${paid.toFixed(0)}万</div>
            <div class="stat-label">已付款</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red">⚠️</div>
            <div class="stat-value">${highRisk}</div>
            <div class="stat-label">高风险项目</div>
          </div>
        </div>
        <div class="row mt-4">
          <div class="col-md-6">
            <div class="card">
              <h4>📊 项目状态</h4>
              <div id="status-chart"></div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <h4>💰 预算执行</h4>
              <div id="budget-chart"></div>
            </div>
          </div>
        </div>
      `;

      // 状态分布
      const statusCounts = {};
      this.config.status.forEach(s => statusCounts[s] = 0);
      projects.forEach(p => statusCounts[p.status] = (statusCounts[p.status] || 0) + 1);
      
      const statusHtml = this.config.status.map((s, i) => {
        const colors = ['badge-info', 'badge-success', 'badge-warning', 'badge-secondary'];
        return `<span class="badge ${colors[i % 4]}">${s}: ${statusCounts[s] || 0}</span>`;
      }).join('');
      document.getElementById('status-chart').innerHTML = statusHtml || '<p class="text-muted">暂无数据</p>';

      // 预算执行
      const rate = budget > 0 ? ((paid / budget) * 100).toFixed(1) : 0;
      document.getElementById('budget-chart').innerHTML = `
        <div class="mb-2">总预算: ¥${budget.toFixed(2)}万 | 已付: ¥${paid.toFixed(2)}万</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${rate}%"></div>
        </div>
        <small class="text-muted">执行率: ${rate}%</small>
      `;

    } catch (err) {
      console.error('Dashboard error:', err);
      document.getElementById('dashboard-content').innerHTML = `
        <div class="error-msg">加载失败: ${err.message}</div>
      `;
    }
  }

  renderProjects() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <nav class="sidebar">
          <div class="nav-brand">🏗️ 项目管理</div>
          <div class="nav-item" data-page="dashboard">📊 数据概览</div>
          <div class="nav-item active" data-page="projects">📁 项目</div>
          <div class="nav-item" data-page="contracts">📄 合同</div>
          <div class="nav-item" data-page="expenses">💰 费用</div>
          <div class="nav-item" data-page="risks">⚠️ 风险</div>
          <div class="nav-item" onclick="app.logout()">🚪 退出</div>
        </nav>
        <main class="main-content">
          <div class="page-header">
            <h2>📁 项目列表</h2>
            <button class="btn btn-primary" onclick="app.showAddProject()">+ 新建项目</button>
          </div>
          <input type="text" class="search-box" placeholder="搜索项目..." oninput="app.searchProjects(this.value)">
          <div id="projects-list" class="loading">加载中...</div>
        </main>
      </div>
    `;
    this.bindNavEvents();
    this.loadProjects();
  }

  async loadProjects() {
    try {
      this.projects = await projectsApi.list();
      this.renderProjectsList(this.projects);
    } catch (err) {
      document.getElementById('projects-list').innerHTML = `<div class="error-msg">加载失败</div>`;
    }
  }

  renderProjectsList(projects) {
    const container = document.getElementById('projects-list');
    if (!projects.length) {
      container.innerHTML = '<div class="empty-state">暂无项目</div>';
      return;
    }

    container.innerHTML = projects.map(p => `
      <div class="project-card" onclick="app.viewProject('${p.id}')">
        <div class="project-header">
          <h3>${p.name}</h3>
          <span class="badge badge-${p.status === '已完成' ? 'success' : 'info'}">${p.status || '待定'}</span>
        </div>
        <div class="project-info">
          <span>📍 ${p.address || '地址待定'}</span>
          <span>💰 ¥${(p.budget || 0).toLocaleString()}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${p.progress || 0}%"></div>
        </div>
        <div class="project-footer">
          <span class="badge badge-${p.risk_level === '高' ? 'danger' : p.risk_level === '中' ? 'warning' : 'success'}">${p.risk_level || '低'}</span>
          <span class="text-muted">📅 ${p.planned_end_date || '待定'}</span>
        </div>
      </div>
    `).join('');
  }

  searchProjects(keyword) {
    if (!keyword) {
      this.renderProjectsList(this.projects);
      return;
    }
    const filtered = this.projects.filter(p => 
      p.name.toLowerCase().includes(keyword.toLowerCase())
    );
    this.renderProjectsList(filtered);
  }

  viewProject(id) {
    router.navigate(`/project/${id}`);
  }

  showAddProject() {
    Modal.form('project', '新建项目', [
      { id: 'name', label: '项目名称 *', type: 'text', required: true },
      { id: 'address', label: '项目地址', type: 'text' },
      { id: 'budget', label: '预算(元)', type: 'number' },
      { id: 'status', label: '状态', type: 'select', options: this.config.status.map(s => ({ value: s, text: s })) },
      { id: 'risk_level', label: '风险等级', type: 'select', options: this.config.risk.map(r => ({ value: r, text: r })) }
    ], async (data) => {
      try {
        await projectsApi.create({
          ...data,
          budget: parseFloat(data.budget) || 0,
          created_at: new Date().toISOString()
        });
        Toast.success('项目创建成功');
        this.loadProjects();
      } catch (err) {
        Toast.error('创建失败: ' + err.message);
      }
    });
  }

  logout() {
    localStorage.removeItem('pm_in');
    router.navigate('/login');
  }

  async renderProjectDetail(id) {
    // 实现项目详情页...
    Toast.info('项目详情: ' + id);
  }

  async renderContracts() { await loadContracts(); }
  async renderExpenses() { await loadExpenses(); }
  async renderRisks() { await loadRisks(); }
}

const app = new App();
