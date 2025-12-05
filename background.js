// 后台服务 worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('复制助手插件已安装');
});

// 管理标签页状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // 页面刷新时重置状态
    chrome.storage.local.remove([`enabled_${tabId}`]);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // 标签页关闭时清理存储
  chrome.storage.local.remove([`enabled_${tabId}`]);
});

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 可以在这里添加点击图标时的逻辑
  console.log('复制助手图标被点击');
});