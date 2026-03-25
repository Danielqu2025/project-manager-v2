// 简单路由系统
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = path;
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, query] = hash.split('?');
    
    // 权限检查
    if (path !== '/login' && !localStorage.getItem('pm_in')) {
      this.navigate('/login');
      return;
    }

    // 路由匹配
    let handler = this.routes[path];
    
    // 带参数的路由匹配
    if (!handler) {
      for (const route of Object.keys(this.routes)) {
        const paramMatch = route.match(/^([^:]+):(\w+)$/);
        if (paramMatch && path.startsWith(paramMatch[1])) {
          const param = path.slice(paramMatch[1].length);
          const params = {};
          params[paramMatch[2]] = param;
          handler = this.routes[route];
          if (handler) {
            handler(params);
            return;
          }
        }
      }
    }

    if (handler) {
      handler();
    } else {
      this.navigate('/dashboard');
    }
  }
}

const router = new Router();
