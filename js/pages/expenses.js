// 费用管理页面

async function renderExpenses() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="nav-brand">🏗️ 项目管理</div>
        <div class="nav-item" data-page="dashboard">📊 数据概览</div>
        <div class="nav-item" data-page="projects">📁 项目</div>
        <div class="nav-item" data-page="contracts">📄 合同</div>
        <div class="nav-item active" data-page="expenses">💰 费用</div>
        <div class="nav-item" data-page="risks">⚠️ 风险</div>
        <div class="nav-item" onclick="app.logout()">🚪 退出</div>
      </nav>
      <main class="main-content">
        <div class="page-header">
          <h2>💰 费用管理</h2>
          <button class="btn btn-primary" onclick="showAddExpense()">+ 添加费用</button>
        </div>
        <div id="expenses-stats" class="stats-row mb-3"></div>
        <div class="card">
          <input type="text" class="search-box" placeholder="搜索费用..." oninput="searchExpenses(this.value)">
          <div id="expenses-list"><div class="loading">加载中...</div></div>
        </div>
      </main>
    </div>
  `;
  bindNavEvents();
  await loadExpenses();
}

async function loadExpenses() {
  try {
    const [expenses, projects] = await Promise.all([
      expensesApi.list(),
      projectsApi.list()
    ]);

    window.allExpenses = expenses;
    window.projectMap = {};
    projects.forEach(p => window.projectMap[p.id] = p.name);

    // 统计
    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const paidAmount = expenses.filter(e => e.payment_status === '已付清').reduce((s, e) => s + (e.amount || 0), 0);
    const unpaidAmount = expenses.filter(e => e.payment_status !== '已付清').reduce((s, e) => s + (e.amount || 0), 0);
    const noInvoice = expenses.filter(e => e.invoice_status !== '已收到').length;

    document.getElementById('expenses-stats').innerHTML = `
      <div class="stat-mini"><div class="stat-mini-value">¥${(totalAmount / 10000).toFixed(2)}万</div><div class="stat-mini-label">费用总额</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-success">¥${(paidAmount / 10000).toFixed(2)}万</div><div class="stat-mini-label">已付款</div></div>
      <div class="stat-mini"><div class="stat-mini-value text-warning">¥${(unpaidAmount / 10000).toFixed(2)}万</div><div class="stat-mini-label">未付款</div></div>
      <div class="stat-mini"><div class="stat-mini-value">${noInvoice}</div><div class="stat-mini-label">待收发票</div></div>
    `;

    renderExpensesList(expenses);
  } catch (err) {
    document.getElementById('expenses-list').innerHTML = `<div class="error-msg">加载失败: ${err.message}</div>`;
  }
}

function renderExpensesList(expenses) {
  const container = document.getElementById('expenses-list');
  if (!expenses.length) {
    container.innerHTML = '<div class="empty-state">暂无费用记录</div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>费用名称</th>
          <th>所属项目</th>
          <th>类型</th>
          <th>金额</th>
          <th>发票状态</th>
          <th>付款状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.map(e => `
          <tr>
            <td><strong>${e.expense_name}</strong></td>
            <td>${window.projectMap[e.project_id] || '-'}</td>
            <td>${e.expense_type || '-'}</td>
            <td class="amount">¥${(e.amount || 0).toLocaleString()}</td>
            <td><span class="badge badge-${e.invoice_status === '已收到' ? 'success' : e.invoice_status === '已开' ? 'info' : 'warning'}">${e.invoice_status || '未开'}</span></td>
            <td><span class="badge badge-${e.payment_status === '已付清' ? 'success' : e.payment_status === '部分付款' ? 'info' : 'secondary'}">${e.payment_status || '未付'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="editExpense('${e.id}')">编辑</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${e.id}')">删除</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function searchExpenses(keyword) {
  if (!keyword) {
    renderExpensesList(window.allExpenses);
    return;
  }
  const filtered = window.allExpenses.filter(e => 
    e.expense_name.toLowerCase().includes(keyword.toLowerCase()) ||
    (window.projectMap[e.project_id] || '').toLowerCase().includes(keyword.toLowerCase())
  );
  renderExpensesList(filtered);
}

function showAddExpense() {
  const projectOptions = Object.entries(window.projectMap || {}).map(([id, name]) => 
    ({ value: id, text: name })
  );

  Modal.form('expense', '添加费用', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'expense_name', label: '费用名称 *', type: 'text', required: true },
    { id: 'expense_type', label: '费用类型', type: 'select', options: [
      { value: '设计费', text: '设计费' },
      { value: '施工费', text: '施工费' },
      { value: '监理费', text: '监理费' },
      { value: '材料费', text: '材料费' },
      { value: '其他', text: '其他' }
    ]},
    { id: 'amount', label: '金额', type: 'number' },
    { id: 'invoice_status', label: '发票状态', type: 'select', options: [
      { value: '未开', text: '未开' },
      { value: '已开', text: '已开' },
      { value: '已收到', text: '已收到' }
    ]},
    { id: 'payment_status', label: '付款状态', type: 'select', options: [
      { value: '未付', text: '未付' },
      { value: '部分付款', text: '部分付款' },
      { value: '已付清', text: '已付清' }
    ]}
  ], async (data) => {
    try {
      await expensesApi.create({
        ...data,
        amount: parseFloat(data.amount) || 0,
        created_at: new Date().toISOString()
      });
      Toast.success('费用添加成功');
      loadExpenses();
    } catch (err) {
      Toast.error('添加失败: ' + err.message);
    }
  });
}

async function editExpense(id) {
  const expense = window.allExpenses.find(e => e.id === id);
  if (!expense) return;

  const projectOptions = Object.entries(window.projectMap || {}).map(([pid, name]) => 
    ({ value: pid, text: name })
  );

  Modal.form('expense', '编辑费用', [
    { id: 'project_id', label: '所属项目 *', type: 'select', required: true, options: projectOptions },
    { id: 'expense_name', label: '费用名称 *', type: 'text', required: true, value: expense.expense_name },
    { id: 'expense_type', label: '类型', type: 'select', options: [
      { value: '设计费', text: '设计费' },
      { value: '施工费', text: '施工费' },
      { value: '监理费', text: '监理费' },
      { value: '材料费', text: '材料费' }
    ]},
    { id: 'amount', label: '金额', type: 'number', value: expense.amount || '' },
    { id: 'invoice_status', label: '发票', type: 'select', options: [
      { value: '未开', text: '未开' },
      { value: '已开', text: '已开' },
      { value: '已收到', text: '已收到' }
    ]},
    { id: 'payment_status', label: '付款', type: 'select', options: [
      { value: '未付', text: '未付' },
      { value: '部分付款', text: '部分付款' },
      { value: '已付清', text: '已付清' }
    ]}
  ], async (data) => {
    try {
      await expensesApi.update(id, {
        ...data,
        amount: parseFloat(data.amount) || 0
      });
      Toast.success('费用更新成功');
      loadExpenses();
    } catch (err) {
      Toast.error('更新失败: ' + err.message);
    }
  });
}

async function deleteExpense(id) {
  if (!confirm('确定删除此费用？')) return;
  try {
    await expensesApi.delete(id);
    Toast.success('费用已删除');
    loadExpenses();
  } catch (err) {
    Toast.error('删除失败: ' + err.message);
  }
}
