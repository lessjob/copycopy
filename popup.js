document.addEventListener('DOMContentLoaded', function() {
  const enableBtn = document.getElementById('enableBtn');
  const disableBtn = document.getElementById('disableBtn');
  // const debugBtn = document.getElementById('debugBtn');
  const statusDiv = document.getElementById('status');

  // 获取当前标签页状态
  updateStatus();

  // 解除限制按钮
  enableBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      
      chrome.tabs.sendMessage(tab.id, {action: "enableCopy"}, function(response) {
        if (chrome.runtime.lastError) {
          showError('请刷新页面后重试');
          return;
        }
        
        if (response && response.success) {
          chrome.storage.local.set({[`enabled_${tab.id}`]: true}, function() {
            updateStatus(true);
            showSuccess('限制已解除！现在可以复制内容了。');
          });
        } else {
          showError('解除限制失败');
        }
      });
    });
  });

  // 恢复限制按钮
  disableBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      
      chrome.tabs.sendMessage(tab.id, {action: "disableCopy"}, function(response) {
        if (chrome.runtime.lastError) {
          showError('请刷新页面后重试');
          return;
        }
        
        if (response && response.success) {
          chrome.storage.local.set({[`enabled_${tab.id}`]: false}, function() {
            updateStatus(false);
            showSuccess('限制已恢复');
          });
          disableBtn.hidden = true;
          enableBtn.hidden = false;
        } else {
          showError('恢复限制失败');
        }
      });
    });
  });

  // 调试按钮
  debugBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      
      chrome.tabs.sendMessage(tab.id, {action: "debug"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('调试错误:', chrome.runtime.lastError);
          alert('调试失败：请确保页面已加载完成');
          return;
        }
        
        if (response && response.success) {
          console.log('调试信息:', response);
          alert(`调试信息：
状态: ${response.isEnabled ? '已启用' : '未启用'}
.prevent-select 元素数量: ${response.preventSelectElements}
Body user-select: ${response.bodyUserSelect}
详情请查看控制台`);
        }
      });
    });
  });

  function updateStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      chrome.storage.local.get([`enabled_${tab.id}`], function(result) {
        const isEnabled = result[`enabled_${tab.id}`];
        
        if (isEnabled) {
          statusDiv.textContent = '状态: 已解除限制';
          statusDiv.className = 'status enabled';
          enableBtn.hidden = true;
          disableBtn.hidden = false;
        } else {
          statusDiv.textContent = '状态: 未激活';
          statusDiv.className = 'status disabled';
          disableBtn.hidden = true;
          enableBtn.hidden = false;
        }
      });
    });
  }

  function showSuccess(message) {
    const oldText = statusDiv.textContent;
    statusDiv.textContent = message;
    statusDiv.className = 'status enabled';
    
    setTimeout(() => {
      updateStatus();
    }, 2000);
  }

  function showError(message) {
    const oldText = statusDiv.textContent;
    statusDiv.textContent = message;
    statusDiv.className = 'status disabled';
    
    setTimeout(() => {
      updateStatus();
    }, 2000);
  }
});