document.addEventListener("DOMContentLoaded", async () => {
  const messagesList = document.getElementById("messages-list");
  
  try {
    const response = await fetch("/api/messages");
    if (!response.ok) throw new Error("Failed to fetch messages");
    
    const messages = await response.json();
    
    if (messages.length === 0) {
      messagesList.innerHTML = "<p>No messages received yet.</p>";
      return;
    }
    
    messagesList.innerHTML = messages.map(msg => `
      <div class="message-card">
        <div class="message-header">
          <div>
            <div class="message-sender">${escapeHTML(msg.name)}</div>
            <div class="message-email"><a href="mailto:${escapeHTML(msg.email)}">${escapeHTML(msg.email)}</a></div>
          </div>
          <div class="message-date">
            <div>${new Date(msg.created_at).toLocaleDateString()}</div>
            <div style="margin-top: 4px">${new Date(msg.created_at).toLocaleTimeString()}</div>
          </div>
        </div>
        <div class="message-body">${escapeHTML(msg.message)}</div>
      </div>
    `).join("");
    
  } catch (err) {
    messagesList.innerHTML = `<p style="color: var(--coral)">Error loading messages: ${err.message}</p>`;
  }
});

function escapeHTML(str) {
  if (!str) return "";
  return str.toString().replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
