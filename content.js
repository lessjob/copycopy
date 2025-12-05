(function() {
  'use strict';
  
  let isEnabled = false;
  let styleObserver = null;
  let overrideStyleElement = null;
  let originalEventHandlers = new Map();

  // 主功能函数
  function enableCopy() {
    if (isEnabled) return;
    
    console.log('🔄 复制助手: 开始解除限制...');
    
    // 1. 解除事件限制（但不阻止默认行为）
    enableEventHandling();
    
    // 2. 解除CSS选择限制
    enableTextSelection();
    
    // 3. 强制修改现有受限元素
    forceEnableSelection();
    
    // 4. 开始监控DOM变化
    startStyleMonitoring();
    
    isEnabled = true;
    console.log('✅ 复制助手: 所有限制已解除');
    
    return { success: true, message: '限制已解除' };
  }

  function disableCopy() {
    if (!isEnabled) return;
    
    console.log('🔄 复制助手: 恢复限制...');
    
    // 1. 恢复事件限制
    disableEventHandling();
    
    // 2. 恢复CSS限制
    disableTextSelection();
    
    // 3. 停止监控
    stopStyleMonitoring();
    
    isEnabled = false;
    console.log('✅ 复制助手: 限制已恢复');
    
    return { success: true, message: '限制已恢复' };
  }

  // 事件处理函数 - 修复版本
  function enableEventHandling() {
    const events = ['selectstart', 'copy', 'cut', 'paste', 'dragstart', 'mousedown'];
    
    events.forEach(event => {
      // 只阻止传播，不阻止默认行为
      document.addEventListener(event, stopPropagationOnly, {
        capture: true,
        passive: false
      });
    });
    
    // 对于contextmenu，我们采用不同的策略：只移除页面的监听器，不添加自己的
    removePageContextMenuHandlers();
  }

  function disableEventHandling() {
    const events = ['selectstart', 'copy', 'cut', 'paste', 'dragstart', 'mousedown'];
    
    events.forEach(event => {
      document.removeEventListener(event, stopPropagationOnly, {
        capture: true
      });
    });
  }

  // 只阻止事件传播，不阻止默认行为
  function stopPropagationOnly(e) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    // 不调用 e.preventDefault() 以保留默认行为
    return true; // 允许默认行为
  }

  // 专门处理右键菜单：移除页面的限制，但不影响浏览器默认菜单
  function removePageContextMenuHandlers() {
    // 保存原始的事件处理器（如果需要恢复）
    originalEventHandlers.set('oncontextmenu', document.oncontextmenu);
    originalEventHandlers.set('bodyOnContextMenu', document.body.oncontextmenu);
    
    // 移除页面的contextmenu事件处理器
    document.oncontextmenu = null;
    document.body.oncontextmenu = null;
    
    // 移除通过addEventListener添加的contextmenu处理器
    document.addEventListener('contextmenu', allowContextMenu, {
      capture: true,
      passive: true
    });
    
    // 遍历所有元素，移除可能的contextmenu限制
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      if (element.oncontextmenu) {
        originalEventHandlers.set(`element_${element.id}_contextmenu`, element.oncontextmenu);
        element.oncontextmenu = null;
      }
    });
  }

  function allowContextMenu(e) {
    // 什么都不做，让浏览器显示默认右键菜单
    // 不调用 stopPropagation 或 preventDefault
    return true;
  }

  // 恢复页面的contextmenu处理器
  function restoreContextMenuHandlers() {
    // 恢复document级别的处理器
    if (originalEventHandlers.has('oncontextmenu')) {
      document.oncontextmenu = originalEventHandlers.get('oncontextmenu');
    }
    if (originalEventHandlers.has('bodyOnContextMenu')) {
      document.body.oncontextmenu = originalEventHandlers.get('bodyOnContextMenu');
    }
    
    // 恢复元素级别的处理器
    originalEventHandlers.forEach((value, key) => {
      if (key.startsWith('element_') && key.endsWith('_contextmenu')) {
        const elementId = key.replace('element_', '').replace('_contextmenu', '');
        const element = document.getElementById(elementId);
        if (element) {
          element.oncontextmenu = value;
        }
      }
    });
    
    // 移除我们添加的contextmenu监听器
    document.removeEventListener('contextmenu', allowContextMenu, {
      capture: true
    });
  }

  // CSS选择限制处理
  function enableTextSelection() {
    // 方法1: 修改根元素和body样式
    document.documentElement.style.userSelect = 'text';
    document.documentElement.style.webkitUserSelect = 'text';
    document.documentElement.style.mozUserSelect = 'text';
    document.documentElement.style.msUserSelect = 'text';
    
    document.body.style.userSelect = 'text';
    document.body.style.webkitUserSelect = 'text';
    document.body.style.mozUserSelect = 'text';
    document.body.style.msUserSelect = 'text';
    
    // 方法2: 注入强力CSS覆盖
    injectOverrideStyles();
    
    // 方法3: 修改所有元素的样式
    setTimeout(forceEnableSelection, 100);
  }

  function disableTextSelection() {
    // 移除注入的样式
    if (overrideStyleElement) {
      overrideStyleElement.remove();
      overrideStyleElement = null;
    }
    
    // 恢复原始样式
    document.documentElement.style.userSelect = '';
    document.documentElement.style.webkitUserSelect = '';
    document.documentElement.style.mozUserSelect = '';
    document.documentElement.style.msUserSelect = '';
    
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.mozUserSelect = '';
    document.body.style.msUserSelect = '';
    
    // 恢复右键菜单处理器
    restoreContextMenuHandlers();
  }

  function injectOverrideStyles() {
    const styleId = 'copy-assistant-css-override';
    
    // 移除已存在的样式
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // 创建新样式
    overrideStyleElement = document.createElement('style');
    overrideStyleElement.id = styleId;
    overrideStyleElement.textContent = `
      /* 最高优先级的选择器覆盖 */
      html body * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
      }
      
      /* 专门针对.prevent-select类 */
      .prevent-select,
      body .prevent-select,
      html body .prevent-select,
      html .prevent-select {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
        pointer-events: auto !important;
      }
      
      /* 覆盖其他常见的选择限制类 */
      .no-select,
      .no-copy,
      .unselectable,
      .noselect,
      .text-unselectable,
      .disable-select,
      .not-selectable,
      [class*="no-select"],
      [class*="prevent-select"],
      [class*="unselectable"],
      [class*="disable-copy"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
      }
      
      /* 覆盖内联样式 */
      [style*="user-select: none"],
      [style*="-webkit-user-select: none"],
      [style*="-moz-user-select: none"],
      [style*="-ms-user-select: none"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    
    // 插入到head的最前面确保最高优先级
    if (document.head) {
      document.head.insertBefore(overrideStyleElement, document.head.firstChild);
      console.log('🎨 复制助手: CSS覆盖样式已注入');
    }
  }

  function forceEnableSelection() {
    console.log('🔧 复制助手: 强制启用文本选择...');
    
    // 特别处理.prevent-select类
    const restrictedSelectors = [
      '.prevent-select',
      '.no-select',
      '.no-copy',
      '.unselectable',
      '.noselect',
      '.disable-select'
    ];
    
    restrictedSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`📝 找到 ${elements.length} 个元素使用选择器: ${selector}`);
        
        elements.forEach((element, index) => {
          // 直接修改内联样式（最高优先级）
          element.style.setProperty('user-select', 'text', 'important');
          element.style.setProperty('-webkit-user-select', 'text', 'important');
          element.style.setProperty('-moz-user-select', 'text', 'important');
          element.style.setProperty('-ms-user-select', 'text', 'important');
          element.style.cursor = 'text';
          element.style.pointerEvents = 'auto';
          
          // 移除可能的事件监听器（除了contextmenu）
          element.onmousedown = null;
          element.onselectstart = null;
        });
      } catch (error) {
        console.warn(`⚠️ 处理选择器 ${selector} 时出错:`, error);
      }
    });
    
    console.log('🎉 复制助手: 强制启用选择完成');
  }

  // DOM监控
  function startStyleMonitoring() {
    if (styleObserver) {
      styleObserver.disconnect();
    }
    
    styleObserver = new MutationObserver(function(mutations) {
      let needsUpdate = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              if (node.classList && (
                node.classList.contains('prevent-select') ||
                node.classList.contains('no-select')
              )) {
                needsUpdate = true;
              }
              
              const restrictedChildren = node.querySelectorAll('.prevent-select, .no-select');
              if (restrictedChildren.length > 0) {
                needsUpdate = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (mutation.attributeName === 'class' && target.classList) {
            if (target.classList.contains('prevent-select') || 
                target.classList.contains('no-select')) {
              needsUpdate = true;
            }
          }
        }
      });
      
      if (needsUpdate) {
        console.log('🔄 复制助手: 检测到DOM变化，重新应用样式');
        setTimeout(() => {
          forceEnableSelection();
        }, 100);
      }
    });
    
    styleObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return styleObserver;
  }

  function stopStyleMonitoring() {
    if (styleObserver) {
      styleObserver.disconnect();
      styleObserver = null;
    }
  }

  // 消息监听
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('📨 复制助手: 收到消息', request);
    
    let response;
    
    switch (request.action) {
      case "enableCopy":
        response = enableCopy();
        sendResponse(response);
        break;
        
      case "disableCopy":
        response = disableCopy();
        sendResponse(response);
        break;
        
      case "debug":
        const preventSelectCount = document.querySelectorAll('.prevent-select').length;
        response = {
          success: true,
          isEnabled: isEnabled,
          preventSelectElements: preventSelectCount,
          bodyUserSelect: document.body.style.userSelect,
          hasOverrideStyle: !!document.getElementById('copy-assistant-css-override')
        };
        sendResponse(response);
        break;
        
      default:
        response = { success: false, message: '未知操作' };
        sendResponse(response);
    }
  });

  // 全局调试接口
  window.copyAssistant = {
    enable: enableCopy,
    disable: disableCopy,
    status: () => isEnabled ? 'enabled' : 'disabled',
    debug: () => {
      const elements = document.querySelectorAll('.prevent-select');
      console.group('🔍 复制助手调试信息');
      console.log('启用状态:', isEnabled);
      console.log('.prevent-select 元素数量:', elements.length);
      console.log('右键菜单状态:', document.oncontextmenu ? '自定义' : '浏览器默认');
      
      elements.forEach((el, i) => {
        const style = window.getComputedStyle(el);
        console.log(`元素 ${i}:`, {
          textContent: el.textContent?.substring(0, 50) + '...',
          userSelect: style.userSelect,
          webkitUserSelect: style.webkitUserSelect,
        });
      });
      console.groupEnd();
    }
  };

  // 页面加载时检查存储状态
  chrome.storage.local.get(null, function(items) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      if (items[`enabled_${tab.id}`]) {
        console.log('🔄 复制助手: 检测到已启用状态，自动解除限制');
        setTimeout(() => enableCopy(), 500);
      }
    });
  });

  console.log('🚀 复制助手 content script 已加载');
})();