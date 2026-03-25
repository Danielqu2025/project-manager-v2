// 风险管理页面

async function renderRisks() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="nav-brand">🏗️ 项目管理</div>
        <div class="nav-item" data-page="dashboard">📊 数据概览</div>
        <div class="nav-item" data-page="projects">📁 项目</div>
        <div class="nav-item" data-page="contracts">📄 合同</div>
        <div class="nav-item" data-page="expenses">💰 费用</div>
        <div class="nav-item active" data-page="risks">⚠️ 风险</div>
        <div class="nav-item" onclick="app.logout()">🚪 退出</div>
      </nav>
      <main class="main-content">
        <div class="page-header">
          <h2>⚠️ 风险管理</h2>
          <button class="btn btn-primary" onclick="showAddRisk()">+ 添加风险</button>
        </div>
        <div id="risks-stats" class="stats-row mb-3"></div>
        <div class="row mb-3">
          <div class="col-md-12">
            <div class="card">
              <h4>📊 风险等级分布</h4>
              <div id="risk-distribution" class="risk-dist"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <input type="text" class="search-box" placeholder="搜索风险..." oninput="searchRisks(this.value)">
          <div id="risks-list"><div class="loading">加载中...</div></div>
        </div>
      </main>
    </div>
  `;
  bindNavEvents();
  await loadRisks();
}

async function loadRisks() {
  try {
    const [risks, projects] = await Promise.all([
      risksApi.list(),
      projectsApi.list()
    ]);

    window.allRisks = risks;
    window.projectMap = {};
    projects.forEach(p => window.projectMap[p.id] = p.name);

    // 统计
    const highCount = risks.filter(r => r.risk_level === '高').length;
    const mediumCount = risks.filter(r => r.risk_level === '中').length;
    const lowCount = risks.filter(r => r.risk_level === '低').length;
    const pendingCount = risks.filter(r => r.status === '待处理').length;
    const handlingCount = risks.filter(r => r.status === '处理中').length;
    const resolvedCount = risks.filter(r => r.status === '已解决').length;

    document.getElementById('risks-stats').innerHTML = `
      <div class="stat-mini"><div class="stat-mini-value text-danger">${highCount}</div><div class="stat-mini-label">高风险</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-warning">${mediumCount}</div><div class="stat-mini-label">中风险</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-success">${lowCount}</div><div class="stat-mini-label">低风险</div></div>
      <div class="stat-mini"><div class="stat-mini-value">${pendingCount}</div><div class="stat-mini-label">待处理</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-info">${handlingCount}</div><div class="stat-mini-label">处理中</div></div>
      <div class="stat-mini"><div class="stat-mini-value">${resolvedCount}</div><div class="stat-mini-label">已解决</div></div>
    `;

    // 风险分布图
    const total = risks.length || 1;
    document.getElementById('risk-distribution').innerHTML = `
      <div class="risk-bar-item">
        <span class="risk-label">高</span>
        <div class="risk-bar"><div class="risk-bar-fill danger" style="width: ${(highCount/total*100).toFixed(1)}%"></div></div>
        <span class="risk-count">${highCount} (${(highCount/total*100).toFixed(1)}%)</span>
      </div>
      <div class="risk-bar-item">
        <span class="risk-label">中</span>
        <div class="risk-bar"><div class="risk-bar-fill warning" style="width: ${(mediumCount/total*100).toFixed(1)}%"></div></div>
        <span class="risk-count">${mediumCount} (${(mediumCount/total*100).toFixed(1)}%)</span>
      </div>
      <div class="risk-bar-item">
        <span class="risk-label">低</span>
        <div class="risk-bar"><div class="risk-bar-fill success" style="width: ${(lowCount/total*100).toFixed(1)}%"></div></div>
        <span class="risk-count">${lowCount} (${(lowCount/total*100).toFixed(1)}%)</span>
      </div>
    `;

    renderRisksList(risks);
  } catch (err) {
    document.getElementById('risks-list').innerHTML = `<div class="error-msg">加载失败: ${err.message}</div>`;
  }
}

function renderRisksList(risks) {
  const container = document.getElementById('risks-list');
  if (!risks.length) {
    container.innerHTML = '<div class="empty-state">暂无风险记录</div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>风险名称</th>
          <th>所属项目</th>
          <th>等级</th>
          <th>状态</th>
          <th>描述</th>
          <th>应对措施</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(r => `
          <tr>
            <td><strong>${r.risk_name}</strong></td>
            <td>${window.projectMap[r.project_id] || '-'}</td>
            <td><span class="badge badge-${r.risk_level === '高' ? 'danger' : r.risk_level === '中' ? 'warning' : 'success'}">${r.risk_level || '低'}</span></td>
            <td><span class="badge badge-${r.status === '已解决' ? 'success' : r.status === '处理中' ? 'info' : 'secondary'}">${r.status || '待处理'}</span></td>
            <td class="text-muted">${r.risk_description || '-'}</td>
            <td class="text-muted">${r.mitigation || '-'}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="editRisk('${r.id}')">编辑</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteRisk('${r.id}')">删除</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function searchRisks(keyword) {
  if (!keyword) {
    renderRisksList(window.allRisks);
    return;
  }
  const filtered = window.allRisks.filter(r => 
    r.risk_name.toLowerCase().includes(keyword.toLowerCase()) ||
    (window.projectMap[r.project_id] || '').toLowerCase().includes(keyword.toLowerCase())
  );
  renderRisksList(filtered);
}

function showAddRisk() {
  const projectOptions = Object.entries(window.projectMap || {}).map(([id, name]) => 
    ({ value: id, text: name })
  );

  Modal.form('risk', '添加风险', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'risk_name', label: '风险名称 *', type: 'text', required: true },
    { id: 'risk_level', label: '风险等级', type: 'select', options: [
      { value: '低', text: '低' },
      { value: '中', text: '中' },
      { value: '高', text: '高' }
    ]},
    { id: 'risk_description', label: '风险描述', type: 'textarea' },
    { id: 'mitigation', label: '应对措施', type: 'textarea' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '待处理', text: '待处理' },
      { value: '处理中', text: '处理中' },
      { value: '已解决', text: '已解决' }
    ]}
  ], async (data) => {
    try {
      await risksApi.create({
        ...data,
        created_at: new Date().toISOString()
      });
      Toast.success('风险添加成功');
      loadRisks();
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

async function editRisk(id) {
  const risk = window.allRisks.find(r => r.id === id);
  if (!risk) return;

  const projectOptions = Object.entries(window.projectMap || {}).map(([pid, name]) => 
    ({ value: pid, text: name })
  );

  Modal.form('risk', '编辑风险', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'risk_name', label: '风险名称 *', type: 'text', required: true, value: risk.risk_name },
    { id: 'risk_level', label: '等级', type: 'select', options: [
      { value: '低', text: '低' },
      { value: '中', text: '中' },
      { value: '高', text: '高' }
    ]},
    { id: 'risk_description', label: '描述', type: 'textarea', value: risk.risk_description || '' },
    { id: 'mitigation', label: '措施', type: 'textarea', value: risk.mitigation || '' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '待处理', text: '待处理' },
      { value: '处理中', text: '处理中' },
      { value: '已解决', text: '已解决' }
    ]}
  ], async (data) => {
    try {
      await risksApi.update(id, data);
      Toast.success('风险更新成功');
      loadRisks();
    } catch (err) {
      Toast.error('更新失败: ' + err.message);
    }
  });
}

async function deleteRisk(id) {
  if (!confirm('确定删除此风险？')) return;
  try {
    await risksApi.delete(id);
    Toast.success('风险已删除');
    loadRisks();
  } catch (err) {
    Toast.error('删除失败: ' + err.message);
  }
}
