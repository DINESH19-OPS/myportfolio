require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const websocketHub = require('./websocket/websocket');

// Routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket sync
websocketHub.init(server);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Page Routing (Direct HTML rendering for cleaner URLs)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback redirect for page refreshes or missing routes
app.get('*', (req, res) => {
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`TaskFlow Server running on port ${PORT}`);
  console.log(`Access locally at http://localhost:${PORT}`);
  console.log(`=========================================`);
});
