const { contextBridge, ipcRenderer } = require('electron');

// 在window对象上暴露一个名为electronAPI的对象
// 这个对象将允许渲染进程与主进程进行通信
contextBridge.exposeInMainWorld('electronAPI', {
  // 新建任务
  onNewTask: (callback) => ipcRenderer.on('menu-new-task', callback),
  // 从托盘快速添加任务
  onTrayNewTask: (callback) => ipcRenderer.on('tray-new-task', callback),
  // 显示上下文菜单
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  // 接收上下文菜单命令
  onContextMenuCommand: (callback) => ipcRenderer.on('context-menu-command', callback),
  // 导出任务数据
  exportTasks: (tasksData) => ipcRenderer.invoke('export-tasks', tasksData),
  // 导入任务数据
  importTasks: () => ipcRenderer.invoke('import-tasks'),
  // 处理应用外部链接
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url)
});

// 将操作系统信息暴露给渲染进程
contextBridge.exposeInMainWorld('platform', {
  // 获取操作系统平台名称
  os: process.platform
});

// 在页面加载完成后通知主进程
window.addEventListener('DOMContentLoaded', () => {
  // DOM完全加载后，我们可以修改渲染进程中的内容
  // 例如：替换应用版本号
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  // 这里可以注入一些动态内容
  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
}); 