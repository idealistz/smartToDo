function showQuickCaptureModal() {
    // 确保任务编辑器模态框是关闭的
    if (typeof closeProcessTaskModal === 'function') {
        closeProcessTaskModal();
    }

    const modal = document.getElementById('quick-capture-modal');
    const input = document.getElementById('quick-capture-input');
    if (modal) {
        modal.classList.add('visible');
        if (input) {
            input.value = ''; // 清空输入框
            input.focus();
        }
    }
}

function hideQuickCaptureModal() {
    const modal = document.getElementById('quick-capture-modal');
    const input = document.getElementById('quick-capture-input');
    if (modal) {
        modal.classList.remove('visible');
        if (input) {
            input.value = ''; // 清空输入框
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('quick-capture-modal'); // Re-declare for this scope if needed, or pass as arg
    const input = document.getElementById('quick-capture-input');
    const saveBtn = document.getElementById('quick-capture-save-btn');
    const cancelBtn = document.getElementById('quick-capture-cancel-btn');

    // 修改：保存逻辑，使用本地存储
    function saveQuickCaptureTask() {
        const taskText = input.value.trim();
        if (taskText) {
            // 显示加载状态
            if(saveBtn) saveBtn.disabled = true;
            if(saveBtn) saveBtn.textContent = '保存中...';
            if(input) input.disabled = true;

            try {
                // 使用TaskManager模块的addIdea函数（如果可用）
                if (window.TaskManager && typeof window.TaskManager.addIdea === 'function') {
                    window.TaskManager.addIdea(taskText);
                    console.log('Quick capture idea saved to local storage:', taskText);
                } else {
                    // 如果TaskManager不可用，则直接使用本地存储
                    const storedIdeas = localStorage.getItem('ideas');
                    const ideas = storedIdeas ? JSON.parse(storedIdeas) : [];
                    
                    // 创建新的想法对象
                    const newIdea = {
                        id: Date.now(),
                        title: taskText,
                        description: '',
                        tags: [],
                        subTasks: [],
                        createdAt: new Date().toISOString(),
                        status: 'active'
                    };
                    
                    // 添加到想法列表
                    ideas.push(newIdea);
                    
                    // 保存到本地存储
                    localStorage.setItem('ideas', JSON.stringify(ideas));
                    console.log('Quick capture idea saved directly to local storage:', taskText);
                }
                
                // 成功后关闭模态框
                hideQuickCaptureModal();
                
                // 触发自定义事件，通知系统刷新数据
                document.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: 'idea' } }));
                
            } catch (error) {
                console.error('Failed to save quick capture idea:', error);
                alert(`保存失败: ${error.message || '请稍后重试'}`);
            } finally {
                // 恢复按钮和输入框状态
                if(saveBtn) saveBtn.disabled = false;
                if(saveBtn) saveBtn.textContent = '保存';
                if(input) input.disabled = false;
            }
        } else {
            if(input) {
                input.classList.add('input-error-shake');
                setTimeout(() => input.classList.remove('input-error-shake'), 500);
            }
        }
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveQuickCaptureTask);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideQuickCaptureModal);
    }

    if (input) {
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveQuickCaptureTask();
            }
        });
    }

    // 点击模态框外部（遮罩层）关闭
    if (modal) { // modal is defined in the outer scope of DOMContentLoaded
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideQuickCaptureModal();
            }
        });
    }

    // Esc键关闭模态框 (全局监听，但仅当模态框可见时操作)
    document.addEventListener('keydown', function(event) {
        const quickCaptureModal = document.getElementById('quick-capture-modal'); // Check visibility on the current modal state
        if (event.key === 'Escape' && quickCaptureModal && quickCaptureModal.classList.contains('visible')) {
            hideQuickCaptureModal();
        }

        // 全局快捷键 (Ctrl+Shift+I or Cmd+Shift+I)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'I' || event.key === 'i')) {
            // 检查当前焦点是否在输入框、文本区域或可编辑内容，避免冲突
            const activeElement = document.activeElement;
            const isSafeToTrigger = 
                activeElement.tagName !== 'INPUT' && 
                activeElement.tagName !== 'TEXTAREA' && 
                !activeElement.isContentEditable;

            if (isSafeToTrigger) {
                event.preventDefault();
                showQuickCaptureModal();
            }
        }
    });

    // 其他初始化代码 (如快捷键) 将后续添加
});

// 初始化代码将后续添加 