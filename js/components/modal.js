// Modal 组件
class Modal {
  static templates = {};

  static show(options) {
    const { id, title, content, buttons = [], onClose = null } = options;
    
    // 创建 overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = `modal-${id}`;
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="Modal.hide('${id}')">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
        ${buttons.length ? `<div class="modal-footer">${buttons.map(b => 
          `<button class="btn ${b.class || ''}" onclick="${b.onclick}">${b.text}</button>`
        ).join('')}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
    
    if (onClose) {
      overlay.dataset.onClose = onClose;
    }
    
    return id;
  }

  static hide(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  static confirm(message, onConfirm) {
    const id = 'confirm-' + Date.now();
    this.show({
      id,
      title: '确认',
      content: `<p>${message}</p>`,
      buttons: [
        { text: '取消', class: 'btn-secondary', onclick: `Modal.hide('${id}')` },
        { text: '确定', class: 'btn-primary', onclick: `Modal.doConfirm('${id}', '${onConfirm}')` }
      ]
    });
  }

  static doConfirm(id, callbackName) {
    this.hide(id);
    if (typeof window[callbackName] === 'function') {
      window[callbackName]();
    }
  }

  static form(id, title, fields, onSubmit) {
    const content = fields.map(f => `
      <div class="form-group">
        <label>${f.label}</label>
        ${f.type === 'select' 
          ? `<select id="${f.id}" class="form-control">${f.options.map(o => `<option value="${o.value}">${o.text}</option>`).join('')}</select>`
          : f.type === 'textarea'
          ? `<textarea id="${f.id}" class="form-control" rows="3"></textarea>`
          : `<input type="${f.type || 'text'}" id="${f.id}" class="form-control" ${f.required ? 'required' : ''} ${f.value ? `value="${f.value}"` : ''}>`
        }
      </div>
    `).join('');

    const submitId = 'submit-' + Date.now();
    const modalId = 'form-' + Date.now();
    
    window[submitId] = () => {
      const data = {};
      fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) data[f.id] = el.value;
      });
      this.hide(modalId);
      if (typeof onSubmit === 'function') onSubmit(data);
    };

    this.show({
      id: modalId,
      title,
      content,
      buttons: [
        { text: '取消', class: 'btn-secondary', onclick: `Modal.hide('${modalId}')` },
        { text: '保存', class: 'btn-primary', onclick: submitId }
      ]
    });
  }
}
