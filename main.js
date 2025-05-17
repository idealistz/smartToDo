const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对窗口对象的全局引用，避免JavaScript对象被垃圾回收时窗口关闭
let mainWindow;
let tray = null;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: '智能待办清单',
    icon: path.join(__dirname, 'images', 'app-icon.png'),
    webPreferences: {
      nodeIntegration: false, // 不直接集成Node.js
      contextIsolation: true, // 隔离上下文
      preload: path.join(__dirname, 'preload.js') // 使用预加载脚本
    },
    show: false, // 先不显示窗口，等待内容加载完成
    backgroundColor: '#f5f5f5' // 设置背景色，优化加载体验
  });

  // 加载应用的index.html
  mainWindow.loadFile('index.html');
  
  // 当内容加载完成后再显示窗口，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    // 如果不是退出应用，则最小化到系统托盘
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // 当窗口关闭时，清除窗口对象
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 配置应用菜单
  setupMenu();
  
  // 创建系统托盘
  setupTray();
}

// 配置应用菜单
function setupMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建任务',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-task');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于智能待办清单',
              message: '智能待办清单 v1.0.0',
              detail: '一个现代化的待办事项管理应用\n基于Electron和Web技术构建',
              buttons: ['确定'],
              icon: path.join(__dirname, 'images', 'app-icon.png')
            });
          }
        },
        {
          label: '查看文档',
          click: () => {
            shell.openExternal('https://github.com/yourusername/smart-todo-list/wiki');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 设置系统托盘
function setupTray() {
  // 托盘图标路径 - 需确保此图标存在
  const iconPath = path.join(__dirname, 'images', 'tray-icon.png');
  
  // 创建托盘
  tray = new Tray(iconPath);
  
  // 设置托盘提示
  tray.setToolTip('智能待办清单');
  
  // 托盘上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示应用',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: '快速添加任务',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('tray-new-task');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  // 设置托盘上下文菜单
  tray.setContextMenu(contextMenu);
  
  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    // 在macOS上，当点击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用，除了在macOS上
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
});

// 使用IPC处理渲染进程的请求
ipcMain.on('show-context-menu', (event) => {
  // 示例：响应渲染进程请求，显示上下文菜单
  const template = [
    { label: '菜单项 1', click: () => { event.sender.send('context-menu-command', 1); } },
    { label: '菜单项 2', click: () => { event.sender.send('context-menu-command', 2); } }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

// 导出任务数据
ipcMain.handle('export-tasks', async (event, tasksData) => {
  const { filePath } = await dialog.showSaveDialog({
    title: '导出任务',
    defaultPath: path.join(app.getPath('documents'), '待办任务.json'),
    filters: [
      { name: 'JSON文件', extensions: ['json'] }
    ]
  });
  
  if (filePath) {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(tasksData, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: '未选择文件' };
});

// 导入任务数据
ipcMain.handle('import-tasks', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: '导入任务',
    properties: ['openFile'],
    filters: [
      { name: 'JSON文件', extensions: ['json'] }
    ]
  });
  
  if (filePaths && filePaths.length > 0) {
    try {
      const data = await fs.promises.readFile(filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: '未选择文件' };
});

// 处理打开外部链接的请求
ipcMain.on('open-external-link', async (event, url) => {
  try {
    if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
    } else {
      console.warn('尝试打开无效URL:', url);
    }
  } catch (error) {
    console.error('打开外部链接时出错:', error);
  }
}); 