// 项目详情页

async function renderProjectDetail(id) {
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
          <button class="btn btn-secondary" onclick="router.navigate('/projects')">← 返回</button>
          <h2 id="project-title">项目详情</h2>
          <div>
            <button class="btn btn-primary" onclick="editCurrentProject()">✏️ 编辑</button>
          </div>
        </div>
        <div id="project-detail-content">
          <div class="loading">加载中...</div>
        </div>
      </main>
    </div>
  `;
  
  app.bindNavEvents && app.bindNavEvents();
  bindNavEvents();
  
  await loadProjectDetail(id);
}

async function loadProjectDetail(id) {
  try {
    // 获取项目详情
    const projects = await projectsApi.get(id);
    const project = projects[0];
    if (!project) {
      document.getElementById('project-detail-content').innerHTML = '<div class="error-msg">项目不存在</div>';
      return;
    }

    // 获取关联数据
    const [phases, contracts, expenses, risks] = await Promise.all([
      phasesApi.list(id),
      contractsApi.list(),
      expensesApi.list(),
      risksApi.list()
    ]);

    // 过滤当前项目的关联数据
    const projectContracts = contracts.filter(c => c.project_id === id);
    const projectExpenses = expenses.filter(e => e.project_id === id);
    const projectRisks = risks.filter(r => r.project_id === id);

    document.getElementById('project-title').textContent = project.name;

    // 计算统计数据
    const totalBudget = project.budget || 0;
    const paidAmount = projectExpenses
      .filter(e => e.payment_status === '已付清')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const contractAmount = projectContracts.reduce((s, c) => s + (c.contract_amount || 0), 0);
    const paidPercent = totalBudget > 0 ? ((paidAmount / totalBudget) * 100).toFixed(1) : 0;

    document.getElementById('project-detail-content').innerHTML = `
      <!-- 基本信息卡片 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>📋 基本信息</h3>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <label>项目名称</label>
            <value>${project.name}</value>
          </div>
          <div class="info-item">
            <label>项目地址</label>
            <value>${project.address || '-'}</value>
          </div>
          <div class="info-item">
            <label>项目类型</label>
            <value>${project.project_type || '-'}</value>
          </div>
          <div class="info-item">
            <label>实施方式</label>
            <value>${project.implement_type || '-'}</value>
          </div>
          <div class="info-item">
            <label>状态</label>
            <span class="badge badge-info">${project.status || '待定'}</span>
          </div>
          <div class="info-item">
            <label>风险等级</label>
            <span class="badge badge-${project.risk_level === '高' ? 'danger' : project.risk_level === '中' ? 'warning' : 'success'}">${project.risk_level || '低'}</span>
          </div>
          <div class="info-item">
            <label>计划完工</label>
            <value>${project.planned_end_date || '-'}</value>
          </div>
          <div class="info-item">
            <label>当前进度</label>
            <value>${project.progress || 0}%</value>
          </div>
        </div>
      </div>

      <!-- 预算执行卡片 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>💰 预算执行</h3>
        </div>
        <div class="stats-row">
          <div class="stat-mini">
            <div class="stat-mini-value">¥${(totalBudget / 10000).toFixed(2)}万</div>
            <div class="stat-mini-label">总预算</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-value">¥${(contractAmount / 10000).toFixed(2)}万</div>
            <div class="stat-mini-label">合同金额</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-value text-success">¥${(paidAmount / 10000).toFixed(2)}万</div>
            <div class="stat-mini-label">已付款</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-value">${paidPercent}%</div>
            <div class="stat-mini-label">执行率</div>
          </div>
        </div>
        <div class="progress-bar-container" style="height: 12px;">
          <div class="progress-bar-fill" style="width: ${paidPercent}%"></div>
        </div>
      </div>

      <!-- 项目阶段甘特图 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>📅 项目阶段</h3>
          <button class="btn btn-sm btn-success" onclick="showAddPhase('${id}')">+ 添加阶段</button>
        </div>
        <div id="phases-gantt"></div>
      </div>

      <!-- 合同列表 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>📄 合同 (${projectContracts.length})</h3>
          <button class="btn btn-sm btn-success" onclick="showAddContract('${id}')">+ 添加</button>
        </div>
        ${projectContracts.length ? `
          <table class="data-table">
            <thead><tr><th>合同名称</th><th>类型</th><th>金额</th><th>状态</th></tr></thead>
            <tbody>
              ${projectContracts.map(c => `
                <tr>
                  <td>${c.contract_name}</td>
                  <td>${c.contract_type || '-'}</td>
                  <td class="amount">¥${(c.contract_amount || 0).toLocaleString()}</td>
                  <td>${c.status || '草稿'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state">暂无合同</div>'}
      </div>

      <!-- 费用列表 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>💰 费用明细 (${projectExpenses.length})</h3>
          <button class="btn btn-sm btn-success" onclick="showAddExpense('${id}')">+ 添加</button>
        </div>
        ${projectExpenses.length ? `
          <table class="data-table">
            <thead><tr><th>费用名称</th><th>类型</th><th>金额</th><th>付款状态</th></tr></thead>
            <tbody>
              ${projectExpenses.map(e => `
                <tr>
                  <td>${e.expense_name}</td>
                  <td>${e.expense_type || '-'}</td>
                  <td class="amount">¥${(e.amount || 0).toLocaleString()}</td>
                  <td class="${e.payment_status === '已付清' ? 'text-success' : ''}">${e.payment_status || '未付'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state">暂无费用</div>'}
      </div>

      <!-- 风险列表 -->
      <div class="card mb-3">
        <div class="card-header">
          <h3>⚠️ 风险记录 (${projectRisks.length})</h3>
          <button class="btn btn-sm btn-success" onclick="showAddRisk('${id}')">+ 添加</button>
        </div>
        ${projectRisks.length ? `
          <table class="data-table">
            <thead><tr><th>风险名称</th><th>等级</th><th>状态</th><th>应对措施</th></tr></thead>
            <tbody>
              ${projectRisks.map(r => `
                <tr>
                  <td>${r.risk_name}</td>
                  <td><span class="badge badge-${r.risk_level === '高' ? 'danger' : r.risk_level === '中' ? 'warning' : 'success'}">${r.risk_level || '低'}</span></td>
                  <td>${r.status || '待处理'}</td>
                  <td>${r.mitigation || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state">暂无风险</div>'}
      </div>
    `;

    // 渲染甘特图
    renderGantt(phases);

    // 保存当前项目到全局
    window.currentProject = project;

  } catch (err) {
    console.error('Error loading project:', err);
    document.getElementById('project-detail-content').innerHTML = `
      <div class="error-msg">加载失败: ${err.message}</div>
    `;
  }
}

// 甘特图渲染
function renderGantt(phases) {
  const container = document.getElementById('phases-gantt');
  if (!phases || !phases.length) {
    container.innerHTML = '<div class="empty-state">暂无阶段数据</div>';
    return;
  }

  // 计算时间范围
  const today = new Date();
  const startDates = phases.map(p => p.start_date ? new Date(p.start_date) : today);
  const endDates = phases.map(p => p.end_date ? new Date(p.end_date) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
  
  const minDate = new Date(Math.min(...startDates));
  const maxDate = new Date(Math.max(...endDates));
  const totalDays = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000)) || 90;
  const dayWidth = 100 / totalDays;

  container.innerHTML = `
    <div class="gantt-container">
      <div class="gantt-header">
        <div class="gantt-label">阶段名称</div>
        <div class="gantt-timeline">
          ${renderTimeline(minDate, maxDate)}
        </div>
      </div>
      <div class="gantt-body">
        ${phases.map((phase, i) => {
          const start = phase.start_date ? new Date(phase.start_date) : minDate;
          const end = phase.end_date ? new Date(phase.end_date) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
          const startOffset = Math.max(0, ((start - minDate) / (24 * 60 * 60 * 1000)) * dayWidth);
          const width = Math.min(100 - startOffset, ((end - start) / (24 * 60 * 60 * 1000)) * dayWidth);
          const statusColor = phase.phase_status === '已完成' ? '#10b981' : phase.phase_status === '进行中' ? '#667eea' : '#e5e7eb';
          
          return `
            <div class="gantt-row">
              <div class="gantt-label">${phase.phase_name}</div>
              <div class="gantt-timeline">
                <div class="gantt-bar" style="left: ${startOffset}%; width: ${Math.max(width, 2)}%; background: ${statusColor}">
                  <span class="gantt-bar-text">${phase.progress || 0}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderTimeline(minDate, maxDate) {
  const days = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000));
  const months = [];
  let current = new Date(minDate);
  
  while (current <= maxDate) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    const key = `${year}-${month}`;
    if (!months.find(m => m.key === key)) {
      months.push({ key, label: `${year}/${month}` });
    }
    current.setDate(current.getDate() + 7);
  }
  
  return months.map(m => `<span class="timeline-month">${m.label}</span>`).join('');
}

// 添加阶段弹窗
function showAddPhase(projectId) {
  Modal.form('phase', '添加项目阶段', [
    { id: 'phase_name', label: '阶段名称 *', type: 'text', required: true },
    { id: 'start_date', label: '开始日期', type: 'date' },
    { id: 'end_date', label: '结束日期', type: 'date' },
    { id: 'progress', label: '进度%', type: 'number' },
    { id: 'phase_status', label: '状态', type: 'select', options: [
      { value: '待开始', text: '待开始' },
      { value: '进行中', text: '进行中' },
      { value: '已完成', text: '已完成' }
    ]}
  ], async (data) => {
    try {
      await phasesApi.create({
        project_id: projectId,
        ...data,
        progress: parseInt(data.progress) || 0,
        created_at: new Date().toISOString()
      });
      Toast.success('阶段添加成功');
      loadProjectDetail(projectId);
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

// 添加合同
function showAddContract(projectId) {
  Modal.form('contract', '添加合同', [
    { id: 'contract_name', label: '合同名称 *', type: 'text', required: true },
    { id: 'contract_type', label: '类型', type: 'select', options: [
      { value: '设计', text: '设计' },
      { value: '施工', text: '施工' },
      { value: '监理', text: '监理' },
      { value: '材料', text: '材料' }
    ]},
    { id: 'contract_amount', label: '金额', type: 'number' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '草稿', text: '草稿' },
      { value: '执行中', text: '执行中' },
      { value: '已完成', text: '已完成' }
    ]}
  ], async (data) => {
    try {
      await contractsApi.create({
        project_id: projectId,
        ...data,
        contract_amount: parseFloat(data.contract_amount) || 0,
        created_at: new Date().toISOString()
      });
      Toast.success('合同添加成功');
      loadProjectDetail(projectId);
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

// 添加费用
function showAddExpense(projectId) {
  Modal.form('expense', '添加费用', [
    { id: 'expense_name', label: '费用名称 *', type: 'text', required: true },
    { id: 'expense_type', label: '类型', type: 'select', options: [
      { value: '设计费', text: '设计费' },
      { value: '施工费', text: '施工费' },
      { value: '监理费', text: '监理费' },
      { value: '材料费', text: '材料费' }
    ]},
    { id: 'amount', label: '金额', type: 'number' },
    { id: 'payment_status', label: '付款状态', type: 'select', options: [
      { value: '未付', text: '未付' },
      { value: '部分付款', text: '部分付款' },
      { value: '已付清', text: '已付清' }
    ]}
  ], async (data) => {
    try {
      await expensesApi.create({
        project_id: projectId,
        ...data,
        amount: parseFloat(data.amount) || 0,
        created_at: new Date().toISOString()
      });
      Toast.success('费用添加成功');
      loadProjectDetail(projectId);
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

// 添加风险
function showAddRisk(projectId) {
  Modal.form('risk', '添加风险', [
    { id: 'risk_name', label: '风险名称 *', type: 'text', required: true },
    { id: 'risk_level', label: '等级', type: 'select', options: [
      { value: '低', text: '低' },
      { value: '中', text: '中' },
      { value: '高', text: '高' }
    ]},
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '待处理', text: '待处理' },
      { value: '处理中', text: '处理中' },
      { value: '已解决', text: '已解决' }
    ]},
    { id: 'mitigation', label: '应对措施', type: 'textarea' }
  ], async (data) => {
    try {
      await risksApi.create({
        project_id: projectId,
        ...data,
        created_at: new Date().toISOString()
      });
      Toast.success('风险添加成功');
      loadProjectDetail(projectId);
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

// 编辑当前项目
function editCurrentProject() {
  const p = window.currentProject;
  if (!p) return;
  
  Modal.form('project', '编辑项目', [
    { id: 'name', label: '项目名称 *', type: 'text', required: true, value: p.name },
    { id: 'address', label: '项目地址', type: 'text', value: p.address || '' },
    { id: 'budget', label: '预算(元)', type: 'number', value: p.budget || '' },
    { id: 'progress', label: '进度%', type: 'number', value: p.progress || 0 },
    { id: 'status', label: '状态', type: 'select', options: app.config.status.map(s => ({ value: s, text: s })) },
    { id: 'risk_level', label: '风险等级', type: 'select', options: app.config.risk.map(r => ({ value: r, text: r })) }
  ], async (data) => {
    try {
      await projectsApi.update(p.id, {
        name: data.name,
        address: data.address,
        budget: parseFloat(data.budget) || 0,
        progress: parseInt(data.progress) || 0,
        status: data.status,
        risk_level: data.risk_level
      });
      Toast.success('项目更新成功');
      loadProjectDetail(p.id);
    } catch (err) {
      Toast.error('更新失败: ' + err.message);
    }
  });
}

function bindNavEvents() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      router.navigate(`/${page}`);
    });
  });
}
