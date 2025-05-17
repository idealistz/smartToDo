/**
 * 下拉菜单组件
 * 处理所有下拉菜单的智能定位和交互
 */

// 智能定位下拉菜单 - 恢复之前的版本或一个更健壮的版本
// (这里假设恢复到一个可以处理绝对定位的版本)
/**
 * 下拉菜单组件
 * 处理所有下拉菜单的智能定位和交互
 */

// 智能定位下拉菜单 - 恢复之前的版本或一个更健壮的版本
// (这里假设恢复到一个可以处理绝对定位的版本)
function positionDropdown(dropdown, parent) {
    dropdown.style.visibility = 'hidden'; // 初始隐藏
    dropdown.style.display = 'block';    // 设为块级元素以便测量
    dropdown.style.position = 'absolute'; // 确保绝对定位
    dropdown.style.left = '0px';         // 重置位置
    dropdown.style.top = '0px';
    dropdown.classList.remove('flip-x', 'flip-y');

    const dropdownRect = dropdown.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 5; // 小缓冲区

    // 计算期望位置(在父元素下方，左对齐)
    let desiredTop = parent.offsetHeight + buffer;
    let desiredLeft = 0;

    // 检查水平溢出
    if (parentRect.left + desiredLeft + dropdownRect.width > viewportWidth - buffer) {
        // 水平翻转：右边缘对齐
        desiredLeft = parent.offsetWidth - dropdownRect.width;
        dropdown.classList.add('flip-x');
    }

    // 检查垂直溢出
    if (parentRect.top + desiredTop + dropdownRect.height > viewportHeight - buffer) {
        // 垂直翻转：定位到父元素上方
        desiredTop = -dropdownRect.height - buffer;
        dropdown.classList.add('flip-y');
    }
    
    // 确保下拉菜单在垂直翻转时不会超出屏幕顶部
    if (parentRect.top + desiredTop < buffer) {
        desiredTop = buffer - parentRect.top; // 调整顶部以适应
    }

    // 应用最终位置
    dropdown.style.top = `${desiredTop}px`;
    dropdown.style.left = `${desiredLeft}px`;

    // 如果需要限制最大高度
    const maxHeight = Math.min(300, viewportHeight - (parentRect.top + desiredTop) - buffer*2); 
    dropdown.style.maxHeight = `${maxHeight}px`;
    
    dropdown.style.visibility = 'visible'; // 设为可见
}

// 关闭所有活动下拉菜单的辅助函数
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-active').forEach(dropdown => {
        // 我们只在这里处理非分离的下拉菜单
        // 分离的菜单(.task-menu-dropdown.detached)由taskManager.js的全局点击监听器处理
        if (!dropdown.classList.contains('detached')) { 
            dropdown.style.display = 'none';
            dropdown.classList.remove('dropdown-active');
        }
    });
}

// 设置下拉菜单的点击切换显示
function setupDropdownToggle(selector, dropdownSelector) {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = element.querySelector(dropdownSelector);
            
            console.log(`下拉菜单切换被点击，选择器: ${selector}`, { element, dropdown }); // 保留日志

            if (!dropdown) {
                console.error('未找到下拉菜单元素，选择器:', dropdownSelector, '在元素内:', element);
                return;
            }
            
            const isActive = dropdown.classList.contains('dropdown-active');

            // 在切换当前下拉菜单之前关闭所有其他下拉菜单
            closeAllDropdowns();
            
            // 切换当前下拉菜单
            if (!isActive) { // 只有在关闭其他菜单前它不是活动的才显示
                dropdown.style.display = 'block'; // 在定位前显示
                dropdown.classList.add('dropdown-active');
                // 调用健壮的定位函数
                positionDropdown(dropdown, element);
            } // 如果它之前是活动的，closeAllDropdowns已经处理了隐藏它
        });
    });
}

// 初始化所有下拉菜单
function initDropdowns() {
    console.log('正在初始化下拉菜单...'); // 添加日志
    // 设置优先级和标签下拉菜单
    setupDropdownToggle('.task-priority-selector', '.priority-dropdown');
    setupDropdownToggle('.task-tag-selector', '.tag-dropdown');
    // 任务菜单由 taskManager.js 处理
    
    // 点击页面其他地方关闭所有下拉菜单
    document.addEventListener('click', (e) => {
        // 我们需要确保点击不是在下拉菜单内部或其切换按钮上
        let clickedInsideToggleOrDropdown = false;
        // 检查标准下拉菜单切换器
        const toggles = document.querySelectorAll('.task-priority-selector, .task-tag-selector');
        toggles.forEach(toggle => {
            if (toggle.contains(e.target)) {
                clickedInsideToggleOrDropdown = true;
            }
        });
        // 检查活动的标准下拉菜单
        document.querySelectorAll('.dropdown-active').forEach(dropdown => {
            if (dropdown.contains(e.target)) {
                clickedInsideToggleOrDropdown = true;
            }
        });
        // 检查日期选择器切换器
        const dateToggle = document.querySelector('.task-date-selector');
        if (dateToggle && dateToggle.contains(e.target)) {
             clickedInsideToggleOrDropdown = true;
            }
        // 检查日期下拉菜单本身(现在使用.dropdown-active)
        const dateDropdown = document.querySelector('.date-dropdown.dropdown-active');
        if (dateDropdown && dateDropdown.contains(e.target)) {
            clickedInsideToggleOrDropdown = true;
        }
        // 任务菜单下拉菜单(.detached)由taskManager.js处理

        if (!clickedInsideToggleOrDropdown) {
            closeAllDropdowns();
        }
    });
    
    // 窗口大小改变时重新定位活动的下拉菜单
    window.addEventListener('resize', () => {
        document.querySelectorAll('.dropdown-active').forEach(dropdown => {
            // 正确找到父切换元素
            const parent = dropdown.closest('.task-priority-selector, .task-tag-selector');
            if (parent && dropdown.style.display === 'block') {
                positionDropdown(dropdown, parent);
            }
        });
    });
}

// 当DOM内容加载完成时初始化下拉菜单
document.addEventListener('DOMContentLoaded', initDropdowns);

// 导出API
window.DropdownManager = {
    init: initDropdowns,
    position: positionDropdown,
    closeAll: closeAllDropdowns // 导出closeAll函数
}; 