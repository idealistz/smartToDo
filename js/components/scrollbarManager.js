document.addEventListener('DOMContentLoaded', function() {
  const body = document.body;
  let scrollTimer = null;
  let fadeTimer = null;
  
  // 检测是否为触控设备
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 监听所有可滚动区域
  const scrollableAreas = [
    '.main-content',
    '.task-list',
    '.quadrant-task-list', 
    '.sidebar'
  ];
  
  // 初始化时添加滚动条，然后淡出
  body.classList.add('is-scrolling');
  setTimeout(() => {
    scrollbarFadeOut();
  }, 1500);
  
  // 平滑淡出滚动条
  function scrollbarFadeOut() {
    // 首先添加淡出动画类
    body.classList.add('scrollbar-fade-out');
    
    // 动画完成后移除所有滚动条相关类
    setTimeout(() => {
      body.classList.remove('is-scrolling');
      body.classList.remove('scrollbar-fade-out');
    }, 800); // 与动画持续时间匹配
  }
  
  // 检测任何滚动行为
  function detectScrolling() {
    // 移除淡出动画类
    body.classList.remove('scrollbar-fade-out');
    
    // 清除之前的计时器
    if (scrollTimer) clearTimeout(scrollTimer);
    if (fadeTimer) clearTimeout(fadeTimer);
    
    // 添加滚动中类
    body.classList.add('is-scrolling');
    body.classList.add('is-actively-scrolling');
    
    // 设置活动滚动计时器：150ms无滚动则认为滚动结束
    scrollTimer = setTimeout(() => {
      // 滚动结束，移除活动滚动类
      body.classList.remove('is-actively-scrolling');
      
      // 设置淡出计时器：滚动停止800ms后开始淡出滚动条
      fadeTimer = setTimeout(() => {
        scrollbarFadeOut();
      }, 800);
      
      scrollTimer = null;
    }, 150);
  }
  
  // 为每个可滚动区域添加事件监听
  scrollableAreas.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (!el) return;
      
      // 鼠标移入时立即显示滚动条，但不会阻止自动淡出
      el.addEventListener('mouseenter', () => {
        body.classList.remove('scrollbar-fade-out');
        // 只有当没有活动滚动时才会显示滚动条
        if (!scrollTimer) {
          body.classList.add('is-scrolling');
        }
      });
      
      // 监听滚动事件
      el.addEventListener('scroll', detectScrolling);
      
      // 触摸设备支持
      if (isTouchDevice) {
        el.addEventListener('touchstart', () => {
          body.classList.remove('scrollbar-fade-out');
          if (fadeTimer) clearTimeout(fadeTimer);
          body.classList.add('is-scrolling');
        }, { passive: true });
        
        el.addEventListener('touchmove', detectScrolling, { passive: true });
      }
    });
  });
  
  // 全局滚动监听
  window.addEventListener('scroll', detectScrolling);
  
  // 当窗口失去焦点时，隐藏滚动条
  window.addEventListener('blur', () => {
    scrollbarFadeOut();
  });
  
  // 当文档不可见时，隐藏滚动条
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      scrollbarFadeOut();
    }
  });
}); 