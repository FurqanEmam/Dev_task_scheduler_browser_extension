// DevTask — Background Service Worker

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('task-reminder-')) {
    const taskId = alarm.name.replace('task-reminder-', '');
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== 'done') {
        chrome.notifications.create(`notif-${taskId}`, {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: `DevTask Reminder`,
          message: task.title,
          contextMessage: `[${task.category.toUpperCase()}] · ${task.priority}`,
          priority: 2
        });
      }
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['tasks'], (result) => {
    if (!result.tasks) {
      chrome.storage.local.set({ tasks: [] });
    }
  });
});
