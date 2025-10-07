export function showNotification(options) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    const notification = document.createElement('div');
    notification.className = `notification ${options.type}`;
    const content = document.createElement('div');
    content.className = 'notification-content';
    const message = document.createElement('div');
    message.className = 'notification-message';
    message.innerHTML = options.message.replace(/\n/g, '<br>');
    content.appendChild(message);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeNotification(notification);
    content.appendChild(closeBtn);
    notification.appendChild(content);
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);
    const duration = options.duration || 5000;
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
}
function removeNotification(notification) {
    notification.classList.remove('visible');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}
export function showSuccess(message, duration) {
    showNotification({ message, type: 'success', duration });
}
export function showError(message, duration) {
    showNotification({ message, type: 'error', duration });
}
export function showInfo(message, duration) {
    showNotification({ message, type: 'info', duration });
}
//# sourceMappingURL=notifications.js.map