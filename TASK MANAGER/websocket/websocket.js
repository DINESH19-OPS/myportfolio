const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_123!';

// Map of userId -> Set of WebSocket connections
const userConnections = new Map();

function init(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade manually to authorize clients before connecting
  server.on('upgrade', (request, socket, head) => {
    // Parse cookies from headers
    const cookieHeader = request.headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach(str => {
      const parts = str.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });

    const token = cookies.token;
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = decoded; // Attach user info to request
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const userId = request.user.id;
    console.log(`WebSocket connected for user: ${userId}`);

    // Store connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);

    // Keep connection alive with ping/pong
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'IDENTIFY') {
          ws.clientId = data.clientId; // Set tab client ID
        }
      } catch (err) {
        console.error('WebSocket received invalid JSON:', err);
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket disconnected for user: ${userId}`);
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
    });
  });

  // Ping intervals to clear dead sockets
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

// Send dynamic update notice to all sockets belonging to a user ID
function notifyUser(userId, payload) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const dataStr = JSON.stringify(payload);
  connections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Exclude sender tab connection if specified
      if (payload.senderId && client.clientId === payload.senderId) {
        return;
      }
      client.send(dataStr);
    }
  });
}

module.exports = {
  init,
  notifyUser
};
