# 智能任务管理系统 (Smart ToDo)

<div align="center">
  <p>一个使用 HTML, CSS, JavaScript 和 Electron 构建的智能任务管理系统</p>
  <p><strong>✅ 桌面应用版本已成功构建</strong></p>
  
  <p>
    <a href="https://github.com/idealistz/smartToDo"><img src="https://img.shields.io/badge/GitHub-仓库-blue?style=flat-square&logo=github" alt="GitHub仓库"></a>
    <img src="https://img.shields.io/badge/版本-1.0.0-success?style=flat-square" alt="版本">
    <img src="https://img.shields.io/badge/许可证-MIT-green?style=flat-square" alt="许可证">
  </p>
</div>

## 📝 项目概述

智能任务管理系统是一个旨在帮助用户高效管理日常任务、项目和目标的应用程序。本项目基于 HTML5, CSS3, 原生 JavaScript 和 Electron 实现，可同时作为网页应用和跨平台桌面应用使用，专注于提供清晰、易用的任务管理体验。

系统特别引入了四象限任务管理法（艾森豪威尔矩阵），帮助用户根据任务的重要性和紧急性进行分类管理，科学地规划时间和提高工作效率。


## ✨ 已实现功能

### 核心任务管理
- **任务管理**：创建、编辑（通过模态框）、标记完成/未完成、删除（移至垃圾桶）、从垃圾桶恢复、永久删除任务。支持为任务设置到期日、优先级和多个标签。通过右键上下文菜单可进行快捷操作，并提供浮动标签编辑器。
- **想法盒子 (Ideas Collection / Inbox)**：
  - 集中收集和管理零散的想法、笔记或初步任务
  - 支持添加和删除"想法"条目
  - 每个"想法"条目下可以创建、编辑、删除和标记完成/未完成的子任务
  - 子任务支持设置优先级和标签
  - 子任务可转换为独立任务
- **四象限视图**：根据艾森豪威尔矩阵将任务分为四类 (重要且紧急, 重要不紧急, 不重要但紧急, 不重要不紧急)
- **今天视图**：集中展示当天需要完成的任务，包括无截止日期任务分类
- **任务排序与分类**：按优先级和日期排序，已过期任务、无DDL任务等分类
- **快速搜索**：通过键盘快捷键 (`Ctrl+K` 或 `Cmd+K`) 激活浮动搜索框，在任务和标签中搜索
- **标签管理**：创建、编辑、删除标签，并基于标签筛选任务

### 用户账户与界面
- **用户认证**：支持用户注册和登录功能
- **个人资料管理**：用户头像上传、个人信息编辑
- **主题切换**：支持亮色/暗色模式切换
- **响应式设计**：适配PC和移动设备浏览器

### 桌面应用功能（Electron）✅
- **系统托盘**：最小化到系统托盘，快速访问应用功能
- **桌面通知**：任务截止日期提醒
- **数据导入导出**：支持导入/导出任务数据到本地JSON文件
- **自定义应用菜单**：包含常用功能的应用菜单
- **系统集成**：外部链接处理
- **应用打包**：已成功构建Windows安装程序

### 用户体验增强
- **现代UI设计**：卡片式设计、渐变色、动态背景
- **平滑过渡动画**：任务操作、界面切换时的平滑动画效果
- **自定义上下文菜单**：右键弹出自定义操作菜单
- **即时反馈**：操作后的状态提示与动态反馈
- **本地数据持久化**：任务、用户数据和偏好保存在 localStorage 中
- **自定义滚动条**：美观、自动隐藏的自定义滚动条
- **侧边栏宽度调整**：可拖拽调整侧边栏宽度，支持双击重置

## 🛠️ 技术栈

- **核心**: HTML5, CSS3, JavaScript (ES6+)
- **桌面应用**: Electron 36.x
- **图标**: Font Awesome 6.4.0
- **用户界面**: 自定义CSS动画和过渡效果，响应式设计
- **数据存储**: 浏览器 localStorage, 文件系统导入/导出 (Electron)
- **组件架构**: 模块化JavaScript，基于组件的前端架构
- **用户体验**: 平滑动画、渐变背景、自定义滚动条等现代UI元素
- **应用打包**: electron-builder 24.13.3

## 📊 项目结构

```
project-root/
├── main.js              # Electron主进程入口
├── preload.js           # Electron预加载脚本
├── index.html           # 主页面，包含今天和四象限视图
├── login.html           # 用户登录页面
├── register.html        # 用户注册页面
├── css/                 # CSS样式文件
│   ├── styles.css       # 主样式文件
│   ├── components.css   # 组件样式
│   ├── resizer.css      # 侧边栏调整样式
│   └── themes/          # 主题样式
│       ├── light.css    # 亮色主题
│       └── dark.css     # 暗色主题
├── js/                  # JavaScript文件
│   ├── app.js           # 主应用逻辑
│   ├── utils/           # 工具函数
│   └── components/      # UI组件和业务逻辑模块
│       ├── taskManager.js         # 任务管理核心功能
│       ├── quadrantManager.js     # 四象限视图管理
│       ├── authManager.js         # 用户认证管理
│       ├── quickSearch.js         # 快速搜索功能
│       ├── quickCapture.js        # 快速捕获功能
│       ├── theme.js               # 主题切换
│       ├── dateSelector.js        # 日期选择器
│       └── scrollbarManager.js    # 自定义滚动条管理
├── images/              # 图片和图标资源
├── docs/                # 项目文档
├── README.md            # 项目说明
├── package.json         # 项目元数据和依赖管理
└── .gitignore           # Git忽略配置
```

## 🚀 如何开始

### 获取代码

```bash
# 克隆仓库
git clone https://github.com/idealistz/smartToDo.git

# 进入项目目录
cd smartToDo
```

### 作为网页应用运行

1. **直接在浏览器打开**：
   - 在现代浏览器中打开 `index.html` 文件即可使用应用
   - 也可以打开 `login.html` 或 `register.html` 体验用户认证功能

2. **使用HTTP服务器**（可选但推荐）：
   ```bash
   # 安装http-server (如果尚未安装)
   npm install -g http-server
   
   # 启动HTTP服务器
   http-server . -p 8080
   ```
   - 然后访问 http://localhost:8080

### 作为桌面应用运行 ✅

1. **安装依赖**：
   ```bash
   # 安装项目依赖
   npm install
   ```

2. **开发模式运行**：
   ```bash
   # 以开发模式运行应用
   npm run dev:electron
   ```

3. **构建桌面应用**：
   ```bash
   # 打包应用为可分发版本
   npm run dist
   ```
   完成后，可在 `build` 目录找到对应平台的安装程序。

4. **安装和运行应用**：
   - 在Windows上，运行 `build\智能待办清单 Setup 1.0.0.exe`
   - 安装完成后，可从开始菜单启动应用
   - 应用支持最小化到系统托盘

## 📱 支持平台

- **网页版**：Chrome、Firefox、Safari、Edge等现代浏览器
- **桌面版**：
  - ✅ Windows 10/11（已测试）
  - ⏳ macOS 10.13+（待测试）
  - ⏳ 主流Linux发行版（待测试）
- **推荐分辨率**：最小宽度 320px，最佳体验 1024px 及以上

## 🔐 账户与数据

- 所有数据存储于浏览器的localStorage中，不会上传到服务器
- 在Electron桌面版中，支持导入/导出任务数据到本地JSON文件
- 示例账户（可选）：
  - 用户名: demo
  - 密码: password
- 也可以自行创建新账户进行测试

## 📚 完成度与未来优化方向

项目当前完成状态：

- **基础功能** ✅：任务管理、四象限视图、标签管理、用户账户等所有基本功能均已实现
- **Electron桌面应用** ✅：已成功构建Windows版本安装包
- **数据导入/导出** ✅：已在Electron版本中实现
- **GitHub仓库** ✅：已成功上传至GitHub，地址：https://github.com/idealistz/smartToDo

未来优化方向：

- **性能优化**：
  - [ ] 实现任务懒加载，提高大量任务时的性能
  - [ ] 更加高效的DOM操作和事件处理
  - [ ] 实现Service Workers离线功能

- **功能增强**：
  - [x] 任务导入/导出功能 (Electron版已实现)
  - [ ] 拖放排序功能的进一步完善
  - [ ] 更丰富的任务统计和报表功能
  - [ ] 数据同步功能，支持多设备同步

- **桌面应用优化**：
  - [ ] 自动更新功能
  - [ ] 深度系统集成
  - [ ] 多窗口支持
  - [ ] 更丰富的快捷键支持
  - [x] 应用打包与分发

- **用户体验**：
  - [ ] 更多自定义主题选项
  - [ ] 自定义键盘快捷键
  - [ ] 优化移动端体验

## 💡 贡献指南

欢迎对本项目进行贡献！以下是参与贡献的步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m '添加某功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

### 贡献原则
- 保持代码风格一致
- 添加必要的注释和文档
- 确保新代码不破坏现有功能
- 如有重大更改，请先讨论再实现

## 👨‍💻 作者

本项目是 [idealistz](https://github.com/idealistz) 的毕业设计作品。

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源资源和技术的支持：
- Electron 提供的桌面应用开发框架
- electron-builder 提供的应用打包工具
- Font Awesome 提供的图标资源
- Google Fonts 提供的字体支持
- 现代浏览器的localStorage API

---

*最后更新: 2024年6月20日*
