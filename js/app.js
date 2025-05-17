/**
 * 应用程序主文件
 * 初始化和管理应用程序
 */

// 检测是否在Electron环境中运行
const isElectron = () => {
    return window && window.electronAPI;
};

// 应用程序初始化
function initApp() {
    
    // ADDED: AuthManager init will be moved into DOMContentLoaded
    
    // 添加DOM加载事件监听器
    document.addEventListener('DOMContentLoaded', () => {
        // 如果在Electron环境中运行，设置Electron相关功能
        if (isElectron()) {
            setupElectronFeatures();
        }
        
        // MOVED AuthManager initialization here
        if (window.AuthManager && typeof window.AuthManager.init === 'function') {
            window.AuthManager.init();
        } else {
            console.error("AuthManager not found or init function is missing.");
            const appContainer = document.querySelector('.app-container');
            if (appContainer) appContainer.style.display = 'none'; 
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                // Attempt to make login modal visible directly if AuthManager failed
                loginModal.style.display = 'flex'; // Or use a class like 'visible'
                loginModal.classList.add('visible'); // Assuming 'visible' class handles appearance
            } else {
                document.body.innerHTML = '<p style="color:red;text-align:center;padding-top:50px;">关键认证模块加载失败，应用无法启动。</p>';
            }
            return; // Stop further app initialization if auth is critical and failed to load
        }
        
        // 习惯功能已移除

        // Only proceed with other initializations if AuthManager indicates user is logged in,
        // or if parts of the app can run without login (which is not the case here for most features).
        // The AuthManager.init() itself will handle showing the login modal if not logged in.
        // We can assume if we reach here and AuthManager is properly loaded, it will manage visibility.
        // If not logged in, AuthManager.init() would have shown the modal and hidden appContainer,
        // so further UI setup for the main app might not be necessary or should be conditional.

        // If, after AuthManager.init(), the user is not logged in (login modal is shown),
        // we might not want to proceed with the rest of the app setup for the main content area.
        if (window.AuthManager && !window.AuthManager.isLoggedIn()) {
            console.log("User is not logged in. Halting further main app UI setup.");
            // The login modal is already visible thanks to AuthManager.init()
            // No need to run setupGlobalEvents, setupTabNavigation etc. for the main app yet.
            // These should run after successful login.
            // However, some global event listeners (like Esc for modals) might still be useful.
            // For now, let's only run minimal setup or defer full setup.
            // A simple approach: return here, and trigger full setup after login. 
            // Or, make setupGlobalEvents and setupTabNavigation safe to run.
            // Let's assume for now that AuthManager.updateUIAfterLogin will trigger necessary setups.
            return; 
        }

        setupGlobalEvents();
        
        // 添加已完成页面的主题切换支持
        const themeToggleCompleted = document.getElementById('themeToggleCompleted');
        if (themeToggleCompleted && window.ThemeManager) {
            themeToggleCompleted.addEventListener('click', () => {
                window.ThemeManager.toggleTheme();
            });
        }
        
        // 设置导航选项卡中的快速搜索按钮
        setupTabNavigation();
        
        // 在各组件初始化完成后，设置初始视图
        setTimeout(() => {
            // 默认显示今天视图
            const todayNavItem = document.querySelector('.menu-item:first-child');
            if (todayNavItem) todayNavItem.click();
        }, 100);
    });
}

// 设置Electron特性
function setupElectronFeatures() {
    console.log('Running in Electron environment');
    
    // 添加应用菜单中"新建任务"的处理
    window.electronAPI.onNewTask(() => {
        if (window.QuickCapture && typeof window.QuickCapture.show === 'function') {
            window.QuickCapture.show();
        } else {
            console.warn('QuickCapture功能不可用');
        }
    });
    
    // 添加从托盘"快速添加任务"的处理
    window.electronAPI.onTrayNewTask(() => {
        if (window.QuickCapture && typeof window.QuickCapture.show === 'function') {
            window.QuickCapture.show();
        } else {
            console.warn('QuickCapture功能不可用');
        }
    });
    
    // 添加导入/导出功能到现有菜单
    const settingsMenu = document.querySelector('#settings-dropdown');
    if (settingsMenu) {
        // 检查是否已存在导出/导入选项
        if (!settingsMenu.querySelector('.export-tasks')) {
            // 创建导出按钮
            const exportItem = document.createElement('div');
            exportItem.className = 'dropdown-item export-tasks';
            exportItem.innerHTML = '<i class="fas fa-file-export"></i> 导出任务';
            exportItem.addEventListener('click', exportTasks);
            
            // 创建导入按钮
            const importItem = document.createElement('div');
            importItem.className = 'dropdown-item import-tasks';
            importItem.innerHTML = '<i class="fas fa-file-import"></i> 导入任务';
            importItem.addEventListener('click', importTasks);
            
            // 添加到菜单
            const separator = document.createElement('div');
            separator.className = 'dropdown-divider';
            
            settingsMenu.appendChild(separator);
            settingsMenu.appendChild(exportItem);
            settingsMenu.appendChild(importItem);
        }
    }
    
    // 修改所有外部链接，使其使用默认浏览器打开
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.electronAPI.openExternalLink(link.href);
        });
    });
}

// 导出任务数据
async function exportTasks() {
    if (!isElectron()) return;
    
    try {
        // 收集任务数据
        let tasksData;
        if (window.TaskManager && typeof window.TaskManager.getAllTasks === 'function') {
            tasksData = window.TaskManager.getAllTasks();
        } else {
            console.error('无法获取任务数据');
            return;
        }
        
        const result = await window.electronAPI.exportTasks(tasksData);
        if (result.success) {
            alert(`任务数据已成功导出到: ${result.filePath}`);
        } else {
            alert(`导出失败: ${result.error}`);
        }
    } catch (error) {
        console.error('导出任务时出错:', error);
        alert('导出任务时出错，请查看控制台了解详情。');
    }
}

// 导入任务数据
async function importTasks() {
    if (!isElectron()) return;
    
    try {
        const result = await window.electronAPI.importTasks();
        if (result.success) {
            if (window.TaskManager && typeof window.TaskManager.importTasks === 'function') {
                window.TaskManager.importTasks(result.data);
                alert('任务数据已成功导入');
            } else {
                console.error('无法导入任务数据，TaskManager功能不可用');
                alert('导入失败：无法处理任务数据');
            }
        } else {
            alert(`导入失败: ${result.error}`);
        }
    } catch (error) {
        console.error('导入任务时出错:', error);
        alert('导入任务时出错，请查看控制台了解详情。');
    }
}

// 设置导航选项卡
function setupTabNavigation() {
    // 不再阻止搜索选项卡的默认行为，允许侧边栏正常显示
    
    // 设置快速搜索按钮点击事件
    const quickSearchBtn = document.querySelector('.tab-item[data-tab="quick-search"]');
    if (quickSearchBtn) {
        // 使用事件捕获阶段拦截点击事件，确保它不会传播
        quickSearchBtn.addEventListener('click', (e) => {
            // 阻止默认行为和事件冒泡
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // 阻止其他事件监听器执行
            
            // 直接显示快速搜索弹窗
            if (window.QuickSearch) {
                window.QuickSearch.show();
            }
        }, true); // 使用捕获阶段
    }
}

// 设置全局事件
function setupGlobalEvents() {
    // 设置点击外部区域关闭所有下拉菜单
    document.addEventListener('click', (e) => {
        closeDropdowns(e);
    });
    
    // 设置键盘事件
    document.addEventListener('keydown', (e) => {
        // Esc键关闭所有下拉菜单
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });
    
    // 在侧边栏菜单项点击时关闭所有下拉菜单
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            closeAllDropdowns();
        });
    });
    
    // 在选项卡切换时关闭所有下拉菜单
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            closeAllDropdowns();
        });
    });
}

// 关闭下拉菜单
function closeDropdowns(event) {
    // 关闭任务菜单
    const taskMenus = document.querySelectorAll('.task-menu-dropdown');
    taskMenus.forEach(menu => {
        if (menu.style.display === 'block' && !menu.parentElement.contains(event.target)) {
            menu.style.display = 'none';
        }
    });
    
    // 关闭其他下拉菜单
    const otherDropdowns = document.querySelectorAll('.priority-dropdown, .tag-dropdown');
    otherDropdowns.forEach(dropdown => {
        if (dropdown.style.display === 'block' && !dropdown.parentElement.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// 关闭所有下拉菜单
function closeAllDropdowns() {
    const allDropdowns = document.querySelectorAll('.task-menu-dropdown, .priority-dropdown, .tag-dropdown, .date-dropdown');
    
    allDropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
        
        // 处理日期下拉菜单
        if (dropdown.classList.contains('date-dropdown')) {
            dropdown.classList.remove('dropdown-active');
            
            // 同时隐藏自定义日期输入框
            const customInput = dropdown.querySelector('.custom-date-input');
            if (customInput) {
                customInput.style.display = 'none';
            }
            
            // 如果有DateSelector实例，使用其方法进行关闭
            const dateSelector = dropdown.closest('.task-date-selector');
            if (dateSelector && dateSelector._dateSelector instanceof DateSelector) {
                dateSelector._dateSelector.hideDropdown();
            }
        }
    });
}

// 新增：全局任务导航函数
window.navigateToTask = function(taskId) {
    if (!taskId) {
        console.warn('navigateToTask: taskId is required.');
        return;
    }



    const quadrantContainer = document.getElementById('quadrant-container');
    const quadrantTab = document.querySelector('.tab-item[data-tab="quadrant"]');

    // 检查四象限视图是否处于活动状态
    // 条件：四象限容器可见，或者其对应的导航选项卡是激活的
    const isQuadrantViewActive = (quadrantContainer && quadrantContainer.style.display !== 'none') || 
                               (quadrantTab && quadrantTab.classList.contains('active'));

    if (isQuadrantViewActive) {
        if (window.QuadrantManager && typeof window.QuadrantManager.highlightTaskInQuadrant === 'function') {
            // 确保在调用高亮之前，四象限视图本身是完全可见和就绪的。
            // 如果快速搜索是模态的，它关闭后四象限视图应该已经是主要视图。
            // 如果不是，可能需要确保四象限视图被激活（虽然这里的检查已经做了）
            window.QuadrantManager.highlightTaskInQuadrant(taskId);
        } else {
            console.error('QuadrantManager.highlightTaskInQuadrant is not available.');
        }
    } else {
        // TODO: 实现导航到其他视图中的任务，例如任务列表视图
        // Example for future: if (window.TaskManager && typeof window.TaskManager.highlightTaskInList === 'function') {
        //     window.TaskManager.highlightTaskInList(taskId);
        // }
    }
};

// 初始化应用程序
initApp(); 