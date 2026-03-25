// 合同管理页面

async function renderContracts() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="nav-brand">🏗️ 项目管理</div>
        <div class="nav-item" data-page="dashboard">📊 数据概览</div>
        <div class="nav-item" data-page="projects">📁 项目</div>
        <div class="nav-item active" data-page="contracts">📄 合同</div>
        <div class="nav-item" data-page="expenses">💰 费用</div>
        <div class="nav-item" data-page="risks">⚠️ 风险</div>
        <div class="nav-item" onclick="app.logout()">🚪 退出</div>
      </nav>
      <main class="main-content">
        <div class="page-header">
          <h2>📄 合同管理</h2>
          <button class="btn btn-primary" onclick="showAddContract()">+ 添加合同</button>
        </div>
        <div id="contracts-stats" class="stats-row mb-3"></div>
        <div class="card">
          <input type="text" class="search-box" placeholder="搜索合同..." oninput="searchContracts(this.value)">
          <div id="contracts-list"><div class="loading">加载中...</div></div>
        </div>
      </main>
    </div>
  `;
  bindNavEvents();
  await loadContracts();
}

async function loadContracts() {
  try {
    const [contracts, projects] = await Promise.all([
      contractsApi.list(),
      projectsApi.list()
    ]);

    window.allContracts = contracts;
    window.projectMap = {};
    projects.forEach(p => window.projectMap[p.id] = p.name);

    // 统计
    const totalAmount = contracts.reduce((s, c) => s + (c.contract_amount || 0), 0);
    const draftCount = contracts.filter(c => c.status === '草稿').length;
    const activeCount = contracts.filter(c => c.status === '执行中').length;
    const doneCount = contracts.filter(c => c.status === '已完成').length;

    document.getElementById('contracts-stats').innerHTML = `
      <div class="stat-mini"><div class="stat-mini-value">¥${(totalAmount / 10000).toFixed(2)}万</div><div class="stat-mini-label">合同总额</div></div>
      <div class="stat-mini"><div class="stat-mini-value">${draftCount}</div><div class="stat-mini-label">草稿</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-info">${activeCount}</div><div class="stat-mini-label">执行中</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-success">${doneCount}</div><div class="stat-mini-label">已完成</div></div>
    `;

    renderContractsList(contracts);
  } catch (err) {
    document.getElementById('contracts-list').innerHTML = `<div class="error-msg">加载失败: ${err.message}</div>`;
  }
}

function renderContractsList(contracts) {
  const container = document.getElementById('contracts-list');
  if (!contracts.length) {
    container.innerHTML = '<div class="empty-state">暂无合同</div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>合同名称</th>
          <th>所属项目</th>
          <th>类型</th>
          <th>金额</th>
          <th>甲方</th>
          <th>签订日期</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${contracts.map(c => `
          <tr>
            <td><strong>${c.contract_name}</strong></td>
            <td>${window.projectMap[c.project_id] || '-'}</td>
            <td>${c.contract_type || '-'}</td>
            <td class="amount">¥${(c.contract_amount || 0).toLocaleString()}</td>
            <td>${c.party_a || '-'}</td>
            <td>${c.sign_date || '-'}</td>
            <td><span class="badge badge-${c.status === '已完成' ? 'success' : c.status === '执行中' ? 'info' : 'secondary'}">${c.status || '草稿'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="editContract('${c.id}')">编辑</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteContract('${c.id}')">删除</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function searchContracts(keyword) {
  if (!keyword) {
    renderContractsList(window.allContracts);
    return;
  }
  const filtered = window.allContracts.filter(c => 
    c.contract_name.toLowerCase().includes(keyword.toLowerCase()) ||
    (window.projectMap[c.project_id] || '').toLowerCase().includes(keyword.toLowerCase())
  );
  renderContractsList(filtered);
}

function showAddContract() {
  const projectOptions = Object.entries(window.projectMap || {}).map(([id, name]) => 
    ({ value: id, text: name })
  );

  Modal.form('contract', '添加合同', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'contract_name', label: '合同名称 *', type: 'text', required: true },
    { id: 'contract_type', label: '类型', type: 'select', options: [
      { value: '设计', text: '设计' },
      { value: '施工', text: '施工' },
      { value: '监理', text: '监理' },
      { value: '材料', text: '材料' },
      { value: '其他', text: '其他' }
    ]},
    { id: 'contract_amount', label: '合同金额', type: 'number' },
    { id: 'party_a', label: '甲方', type: 'text' },
    { id: 'party_b', label: '乙方', type: 'text' },
    { id: 'sign_date', label: '签订日期', type: 'date' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '草稿', text: '草稿' },
      { value: '执行中', text: '执行中' },
      { value: '已完成', text: '已完成' }
    ]}
  ], async (data) => {
    try {
      await contractsApi.create({
        ...data,
        contract_amount: parseFloat(data.contract_amount) || 0,
        created_at: new Date().toISOString()
      });
      Toast.success('合同添加成功');
      loadContracts();
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

async function editContract(id) {
  const contract = window.allContracts.find(c => c.id === id);
  if (!contract) return;

  const projectOptions = Object.entries(window.projectMap || {}).map(([pid, name]) => 
    ({ value: pid, text: name })
  );

  Modal.form('contract', '编辑合同', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'contract_name', label: '合同名称 *', type: 'text', required: true, value: contract.contract_name },
    { id: 'contract_type', label: '类型', type: 'select', options: [
      { value: '设计', text: '设计' },
      { value: '施工', text: '施工' },
      { value: '监理', text: '监理' },
      { value: '材料', text: '材料' }
    ]},
    { id: 'contract_amount', label: '金额', type: 'number', value: contract.contract_amount || '' },
    { id: 'party_a', label: '甲方', type: 'text', value: contract.party_a || '' },
    { id: 'party_b', label: '乙方', type: 'text', value: contract.party_b || '' },
    { id: 'sign_date', label: '签订日期', type: 'date', value: contract.sign_date || '' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: '草稿', text: '草稿' },
      { value: '执行中', text: '执行中' },
      { value: '已完成', text: '已完成' }
    ]}
  ], async (data) => {
    try {
      await contractsApi.update(id, {
        ...data,
        contract_amount: parseFloat(data.contract_amount) || 0
      });
      Toast.success('合同更新成功');
      loadContracts();
    } catch (err) {
      Toast.error('更新失败: ' + err.message);
    }
  });
}

async function deleteContract(id) {
  if (!confirm('确定删除此合同？')) return;
  try {
    await contractsApi.delete(id);
    Toast.success('合同已删除');
    loadContracts();
  } catch (err) {
    Toast.error('删除失败: ' + err.message);
  }
}
