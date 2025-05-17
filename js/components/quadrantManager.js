/**
 * 四象限管理器组件
 * 管理四象限任务视图和交互
 */

// 初始化四象限管理器
function initQuadrantManager() {
    console.log('初始化四象限管理器...');
    
    // 设置菜单项点击事件
    setupNavigation();
    
    // 设置四象限任务添加功能
    setupQuadrantTaskAddition();
    
    // 设置四象限任务点击事件
    setupQuadrantTaskActions();
    
    // 为每个象限添加示例任务（仅当象限为空时）
    setTimeout(() => {
        addExampleTasksIfEmpty();
    }, 100);
}

// 设置导航 (已被大幅简化，因为主导航逻辑已移至 index.html 和 taskManager.js)
function setupNavigation() {
    console.log('quadrantManager.js: setupNavigation() called, but its core logic is now handled externally.');
    

}

// 为每个象限添加示例任务（仅当象限为空时）
function addExampleTasksIfEmpty() {
    console.log('检查并添加示例任务...');
    const q1List = document.querySelector('.q1 .quadrant-task-list');
    const q2List = document.querySelector('.q2 .quadrant-task-list');
    const q3List = document.querySelector('.q3 .quadrant-task-list');
    const q4List = document.querySelector('.q4 .quadrant-task-list');
    
    if (!q1List || !q2List || !q3List || !q4List) {
        console.error('找不到四象限任务列表元素');
        return;
    }
    
    // 只有当所有象限都为空时才添加示例任务
    if (q1List.children.length === 0 &&
        q2List.children.length === 0 &&
        q3List.children.length === 0 &&
        q4List.children.length === 0) {
        
        console.log('添加示例任务...');
        
        // 第一象限：重要且紧急
        const q1Task = createQuadrantTask('准备明天的项目演示');
        q1List.appendChild(q1Task);
        
        // 第二象限：重要不紧急
        const q2Task = createQuadrantTask('学习新技能提升自我');
        q2List.appendChild(q2Task);
        
        // 第三象限：不重要但紧急
        const q3Task = createQuadrantTask('回复工作邮件');
        q3List.appendChild(q3Task);
        
        // 第四象限：不重要不紧急
        const q4Task = createQuadrantTask('整理数字照片');
        q4List.appendChild(q4Task);
    }
}

// 设置四象限任务添加功能
function setupQuadrantTaskAddition() {
    const addTaskBtns = document.querySelectorAll('.quadrant-add-task');
    
    addTaskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const quadrant = btn.closest('.quadrant');
            const taskList = quadrant.querySelector('.quadrant-task-list');
            
            // 创建输入框
            const inputContainer = document.createElement('li');
            inputContainer.className = 'quadrant-task'; // 保持与普通任务项相似的类，方便可能的样式复用
            inputContainer.innerHTML = `
                <div class="task-checkbox" style="visibility: hidden;"></div> <!-- 占位，但不显示实际复选框 -->
                <div class="quadrant-task-content">
                    <input type="text" class="task-input" placeholder="输入任务内容..." style="width:100%;border:none;outline:none;background:transparent;color:var(--text-color);">
                </div>
            `;
            
            // 添加到任务列表
            taskList.appendChild(inputContainer);
            
            // 自动聚焦
            const input = inputContainer.querySelector('input');
            input.focus();
            
            // 处理输入事件
            setupQuadrantTaskInput(input, inputContainer, quadrant);
        });
    });
}

// 设置四象限任务输入
function setupQuadrantTaskInput(input, inputContainer, quadrant) {
    const processTaskCreation = (inputValue) => {
        // 1. 清理监听器，防止重复执行
        input.removeEventListener('keypress', handleKeyPress);
        input.removeEventListener('blur', handleBlur);
        // console.log('Listeners removed, processing task creation.'); 
            
        // 2. 再次检查 inputContainer 是否还在有效的父节点下
        if (!inputContainer.parentNode || !document.body.contains(inputContainer)) {
            // console.warn('Input container no longer valid or already processed.'); 
            return; 
        }

        const trimmedValue = inputValue.trim(); // Trim value here for consistent checks

        if (trimmedValue === '') {
            // console.log('Input is empty, removing container.'); 
            inputContainer.remove();
        } else {
            // console.log(`Input value: "${trimmedValue}", creating task.`); 
            const quadrantTask = createQuadrantTask(trimmedValue);
            inputContainer.parentNode.replaceChild(quadrantTask, inputContainer);
            
            // 确定任务优先级并添加到今天视图
            let priority = '';
            if (quadrant.classList.contains('q1')) priority = 'high';
            else if (quadrant.classList.contains('q2')) priority = 'medium';
            else if (quadrant.classList.contains('q3')) priority = 'medium';
            else if (quadrant.classList.contains('q4')) priority = 'low';
            
            if (window.TaskManager) {
                // console.log(`Adding task to Today view: ${trimmedValue}, Prio: ${priority}`);
                addToTodayView(trimmedValue, priority); 
            }
        }
    };

    const handleKeyPress = (e) => {
        // console.log(`KeyPress: ${e.key}`);
        if (e.key === 'Enter') {
            // console.log('Enter pressed');
            e.preventDefault(); 
            processTaskCreation(input.value); // 传递当前值
        }
    };

    const handleBlur = () => {
        // console.log('Blur event triggered.'); 
        processTaskCreation(input.value); // 传递input的当前值
    };

    input.addEventListener('keypress', handleKeyPress);
    input.addEventListener('blur', handleBlur);
    // console.log('Event listeners added for new task input.');
}

// 创建四象限任务元素
function createQuadrantTask(text) {
    const task = document.createElement('li');
    task.className = 'quadrant-task';
    task.setAttribute('data-text', text);
    
    task.innerHTML = `
        <div class="task-checkbox"></div>
        <div class="quadrant-task-content">
            <div class="quadrant-task-title">${text}</div>
            <div class="quadrant-task-due">添加时间：${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    
    return task;
}

// 添加到今天视图
function addToTodayView(text, priority) {
    // 如果TaskManager存在，使用它添加任务
    if (window.TaskManager) {
        window.TaskManager.addTask(text, '今天', priority, []);
        
        // 延迟切换到今天视图 (现在注释掉这部分)
        /*
        setTimeout(() => {
            // 切换到今天视图
            const todayNavItem = document.querySelector('.menu-item:first-child');
            if (todayNavItem) {
            todayNavItem.click();
            }
        }, 1000);
        */
    }
}

// 设置四象限任务点击事件
function setupQuadrantTaskActions() {
    // 使用事件委托处理复选框点击
    document.addEventListener('click', (e) => {
        // 处理四象限任务复选框
        if (e.target.classList.contains('task-checkbox') && 
            e.target.closest('.quadrant-task')) {
            
            toggleQuadrantTaskCompleted(e.target);
        }
    });
    
    // 新增：设置任务拖拽功能
    setupQuadrantTaskDrag();
}

// 新增：设置任务拖拽功能
function setupQuadrantTaskDrag() {
    // 获取所有象限任务列表
    const q1List = document.querySelector('.q1 .quadrant-task-list');
    const q2List = document.querySelector('.q2 .quadrant-task-list');
    const q3List = document.querySelector('.q3 .quadrant-task-list');
    const q4List = document.querySelector('.q4 .quadrant-task-list');
    
    if (!q1List || !q2List || !q3List || !q4List) {
        console.error('找不到四象限任务列表元素，无法设置拖拽功能');
        return;
    }
    
    // 设置四个象限的放置区域
    [q1List, q2List, q3List, q4List].forEach(list => {
        // 允许放置
        list.addEventListener('dragover', (e) => {
            e.preventDefault(); // 允许放置
            list.classList.add('quadrant-drag-over');
        });
        
        // 离开放置区域
        list.addEventListener('dragleave', () => {
            list.classList.remove('quadrant-drag-over');
        });
        
        // 放置事件
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('quadrant-drag-over');
            
            // 获取拖拽的任务ID
            const taskId = e.dataTransfer.getData('text/plain');
            if (!taskId) return;
            
            // 获取目标象限的优先级
            let newPriority = 'medium'; // 默认
            const quadrant = list.closest('.quadrant');
            if (quadrant) {
                if (quadrant.classList.contains('q1')) newPriority = 'high';
                else if (quadrant.classList.contains('q2')) newPriority = 'medium';
                else if (quadrant.classList.contains('q3')) newPriority = 'medium';
                else if (quadrant.classList.contains('q4')) newPriority = 'low';
            }
            
            // 更新任务优先级
            updateTaskPriority(taskId, newPriority, list);
        });
    });
    
    // 使用事件委托为所有任务添加拖拽能力
    document.addEventListener('mousedown', (e) => {
        // 找到被点击的任务元素（如果有）
        const taskElement = e.target.closest('.quadrant-task');
        if (!taskElement) return;
        
        // 跳过如果点击在复选框上
        if (e.target.classList.contains('task-checkbox')) return;
        
        // 设置任务为可拖拽
        taskElement.setAttribute('draggable', 'true');
        
        // 设置拖拽开始事件
        taskElement.addEventListener('dragstart', (dragEvent) => {
            // 存储任务ID
            const taskId = taskElement.getAttribute('data-id');
            if (taskId) {
                dragEvent.dataTransfer.setData('text/plain', taskId);
                
                // 添加拖拽样式
                taskElement.classList.add('quadrant-task-dragging');
                setTimeout(() => {
                    taskElement.style.opacity = '0.4';
                }, 0);
            }
        });
        
        // 设置拖拽结束事件
        taskElement.addEventListener('dragend', () => {
            // 移除拖拽样式
            taskElement.classList.remove('quadrant-task-dragging');
            taskElement.style.opacity = '';
            
            // 设置为不可拖拽（防止持久拖拽状态）
            setTimeout(() => {
                taskElement.setAttribute('draggable', 'false');
            }, 0);
        });
    });
    
    // 添加CSS样式
    addDragStyles();
}

// 新增：更新任务优先级
function updateTaskPriority(taskId, newPriority, targetList) {
    if (!taskId || !newPriority || !targetList) return;
    
    const taskIdInt = parseInt(taskId);
    
    // 两种情况：任务在tasks数组中，或仅在DOM中存在
    
    // 1. 检查任务是否在tasks数组中
    if (window.TaskManager && window.TaskManager.getTasks) {
        const allTasks = window.TaskManager.getTasks();
        const taskIndex = allTasks.findIndex(t => t.id === taskIdInt);
        
        if (taskIndex !== -1) {
            // 任务在数组中，更新优先级
            const task = allTasks[taskIndex];
            task.priority = newPriority;
            
            // 保存更新后的任务
            if (window.TaskManager.saveTasks) {
                window.TaskManager.saveTasks();
            } else if (window.saveTasks) {
                window.saveTasks();
            }
            
            // 刷新四象限视图
            refreshQuadrantTasks();
            return;
        }
    }
    
    // 2. 如果任务不在数组中，则创建一个新任务
    const taskElement = document.querySelector(`.quadrant-task[data-id="${taskIdInt}"]`);
    if (taskElement) {
        // 获取任务文本
        const titleElement = taskElement.querySelector('.quadrant-task-title');
        if (!titleElement) return;
        
        const taskText = titleElement.textContent;
        
        // 从DOM中删除原始任务元素
        taskElement.remove();
        
        // 创建新任务元素
        const newTask = {
            id: taskIdInt,
            text: taskText,
            priority: newPriority,
            status: 'active',
            dueDate: '',
            tags: []
        };
        
        // 添加到数组中
        if (window.TaskManager && window.TaskManager.addTask) {
            window.TaskManager.addTask(taskText, '', newPriority, []);
        } else if (window.tasks) {
            window.tasks.push(newTask);
            if (window.saveTasks) {
                window.saveTasks();
            }
        }
        
        // 创建新任务元素
        const newTaskElement = createQuadrantTaskFromData(newTask);
        targetList.appendChild(newTaskElement);
    }
}

// 新增：添加拖拽样式
function addDragStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .quadrant-task-dragging {
            cursor: grabbing;
        }
        
        .quadrant-task-list.quadrant-drag-over {
            background-color: var(--hover-bg);
            box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
}

// 切换四象限任务完成状态
function toggleQuadrantTaskCompleted(checkbox) {
    const taskItem = checkbox.closest('.quadrant-task');
    const taskTitle = taskItem.querySelector('.quadrant-task-title');
    
    // 更新复选框状态
    checkbox.classList.toggle('checked');
    
    // 更新任务文本样式
    if (checkbox.classList.contains('checked')) {
        taskTitle.style.textDecoration = 'line-through';
        taskTitle.style.color = 'var(--text-muted)';
        
        // 添加晃动动画效果并在完成后从列表中移除
        taskItem.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => {
            taskItem.remove();
        }, 500);
    } else {
        taskTitle.style.textDecoration = 'none';
        taskTitle.style.color = 'var(--text-color)';
    }
}

// 刷新四象限任务
function refreshQuadrantTasks() {
    // 如果没有TaskManager，直接返回
    if (!window.TaskManager) return;
    
    // 获取所有任务
    const allTasks = window.TaskManager.getTasks();
    if (!allTasks || !allTasks.length) return;
    
    // 清空四象限任务列表
    clearQuadrantTasks();
    
    // 按优先级分类任务
    const highPriorityTasks = allTasks.filter(task => task.priority === 'high' && !task.completed);
    const mediumPriorityTasks = allTasks.filter(task => task.priority === 'medium' && !task.completed);
    const lowPriorityTasks = allTasks.filter(task => task.priority === 'low' && !task.completed);
    const noPriorityTasks = allTasks.filter(task => !task.priority && !task.completed);
    
    // 添加高优先级任务到第一象限
    const q1List = document.querySelector('.q1 .quadrant-task-list');
    if (q1List) {
        highPriorityTasks.forEach(task => {
            q1List.appendChild(createQuadrantTaskFromData(task));
        });
    }
    
    // 添加中优先级任务到第二、三象限
    const q2List = document.querySelector('.q2 .quadrant-task-list');
    const q3List = document.querySelector('.q3 .quadrant-task-list');
    if (q2List && q3List) {
        // 按照任务的创建时间分配到不同象限
        mediumPriorityTasks.forEach((task, index) => {
            if (index % 2 === 0) {
                q2List.appendChild(createQuadrantTaskFromData(task));
            } else {
                q3List.appendChild(createQuadrantTaskFromData(task));
            }
        });
    }
    
    // 添加低优先级和无优先级任务到第四象限
    const q4List = document.querySelector('.q4 .quadrant-task-list');
    if (q4List) {
        lowPriorityTasks.forEach(task => {
            q4List.appendChild(createQuadrantTaskFromData(task));
        });
        
        noPriorityTasks.forEach(task => {
            q4List.appendChild(createQuadrantTaskFromData(task));
        });
    }
}

// 从任务数据创建四象限任务元素
function createQuadrantTaskFromData(taskData) {
    const task = document.createElement('li');
    task.className = 'quadrant-task';
    task.setAttribute('data-id', taskData.id);
    
    let dateText = '';
    if (taskData.dueDate) {
        const date = new Date(taskData.dueDate);
        dateText = `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    
    task.innerHTML = `
        <div class="task-checkbox ${taskData.completed ? 'checked' : ''}"></div>
        <div class="quadrant-task-content">
            <div class="quadrant-task-title" style="${taskData.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${taskData.text}</div>
            <div class="quadrant-task-due">${dateText}</div>
        </div>
    `;
    
    // 添加右键菜单支持
    task.addEventListener('contextmenu', (event) => {
        // 阻止默认的右键菜单
        event.preventDefault();
        
        // 调用任务管理器的上下文菜单函数
        if (window.TaskManager && typeof window.TaskManager.showTaskContextMenu === 'function') {
            // 根据任务的完成状态传递相应的状态
            const status = taskData.completed ? 'completed' : 'active';
            window.TaskManager.showTaskContextMenu(event, taskData.id, status);
        } else {
            console.error('TaskManager.showTaskContextMenu is not available.');
        }
    });
    
    return task;
}

// 清空四象限任务列表
function clearQuadrantTasks() {
    const taskLists = document.querySelectorAll('.quadrant-task-list');
    taskLists.forEach(list => {
        list.innerHTML = '';
    });
}

// 高亮任务
function highlightTaskInQuadrant(taskId) {
    focusTaskOnPage(taskId);
}

// 添加模糊效果为未聚焦的任务准备的CSS类
function addAnimationStyles() {
    // Fade-Out animation for removed tasks
    const style = document.createElement('style');
    style.textContent = `
            @keyframes fadeOut {
            0% {
                opacity: 1;
                max-height: 300px;
            }
            50% {
                opacity: 0.5;
                max-height: 150px;
            }
            100% {
                opacity: 0;
                max-height: 0;
                padding: 0;
                margin: 0;
                border: none;
            }
        }
        
        @keyframes highlight {
            0% {
                background-color: transparent;
            }
            50% {
                background-color: var(--highlight-bg, rgba(255, 153, 0, 0.3));
                transform: translateY(-2px);
            }
            100% {
                background-color: transparent;
            }
            }
        `;
    document.head.appendChild(style);
}

// 在页面上聚焦任务
function focusTaskOnPage(taskId) {
    if (taskId === undefined || taskId === null) {
        console.warn('QuadrantManager: focusTaskOnPage called with invalid taskId.');
        return;
    }
    const taskElement = document.querySelector(`#quadrant-container .quadrant-task[data-id="${taskId}"]`);

    if (taskElement) {
        console.log(`QuadrantManager: Focusing on task ${taskId}`);
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.style.transition = 'background-color 0.3s ease'; // 平滑过渡
        taskElement.style.backgroundColor = 'var(--task-focus-highlight-bg)';
        
        setTimeout(() => {
            taskElement.style.backgroundColor = '';
        }, 2000);
    } else {
        console.warn(`QuadrantManager: Task with ID ${taskId} not found in quadrant view for focusing.`);
    }
}

// 暴露公共方法
window.refreshQuadrantTasks = refreshQuadrantTasks;
window.highlightTaskInQuadrant = highlightTaskInQuadrant;

// 添加动画样式
addAnimationStyles();

// 初始化四象限管理器
document.addEventListener('DOMContentLoaded', function() {
    initQuadrantManager();
});

// 导出API
window.QuadrantManager = {
    init: initQuadrantManager,
    refresh: refreshQuadrantTasks,
    addExampleTasks: addExampleTasksIfEmpty,
    focusTaskOnPage: focusTaskOnPage
}; 