/**
 * 主题切换功能
 * 管理明暗两种主题模式的切换
 */

// 主题状态
let currentTheme = localStorage.getItem('theme') || 'light';

// 初始化主题
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeToggleQuadrant = document.getElementById('themeToggleQuadrant');
    const themeToggleCompleted = document.getElementById('themeToggleCompleted');
    
    // 如果之前设置了暗色主题，应用它
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcons('dark');
    }
    
    // 绑定主题切换事件
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    if (themeToggleQuadrant) {
        themeToggleQuadrant.addEventListener('click', toggleTheme);
    }
    
    if (themeToggleCompleted) {
        themeToggleCompleted.addEventListener('click', toggleTheme);
    }
    
    // 监听DOM变化，为动态添加的主题按钮绑定事件
    observeThemeButtons();
}

// 观察DOM变化，为新添加的主题按钮绑定事件
function observeThemeButtons() {
    // 创建 MutationObserver 实例
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // 检查是否有新增节点
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    // 检查是否是元素节点且是主题切换按钮
                    if (node.nodeType === 1 && node.classList && 
                        node.classList.contains('theme-toggle') && 
                        !node.hasAttribute('data-theme-bound')) {
                        // 绑定事件
                        node.addEventListener('click', toggleTheme);
                        // 添加标记，避免重复绑定
                        node.setAttribute('data-theme-bound', 'true');
                        // 确保图标状态正确
                        const icon = node.querySelector('i');
                        if (icon) {
                            if (currentTheme === 'dark') {
                                icon.classList.remove('fa-moon');
                                icon.classList.add('fa-sun');
                            } else {
                                icon.classList.remove('fa-sun');
                                icon.classList.add('fa-moon');
                            }
                        }
                    }
                });
            }
        });
    });
    
    // 配置 observer 监听整个document，检查所有子节点变化
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

// 切换主题
function toggleTheme() {
    if (currentTheme === 'light') {
        // 切换到暗色主题
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        currentTheme = 'dark';
    } else {
        // 切换到亮色主题
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        currentTheme = 'light';
    }
    
    // 更新所有主题图标
    updateThemeIcons(currentTheme);
}

// 更新主题图标状态
function updateThemeIcons(theme) {
    const themeIcons = document.querySelectorAll('.theme-toggle i');
    
    themeIcons.forEach(icon => {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
}

// 获取当前主题
function getCurrentTheme() {
    return currentTheme;
}

// 当DOM内容加载完成时初始化主题
document.addEventListener('DOMContentLoaded', initTheme);

// 导出主题管理API
window.ThemeManager = {
    init: initTheme,
    toggleTheme: toggleTheme,
    getCurrentTheme: getCurrentTheme
}; 