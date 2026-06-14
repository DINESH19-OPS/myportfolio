const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'users.json');
const tasksPath = path.join(__dirname, 'tasks.json');

// Ensure database files exist
function initDb() {
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(tasksPath)) {
    fs.writeFileSync(tasksPath, JSON.stringify([], null, 2), 'utf8');
  }
}

initDb();

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    return false;
  }
}

// User CRUD operations
const users = {
  getAll: () => readJsonFile(usersPath),
  findByEmail: (email) => {
    const list = readJsonFile(usersPath);
    return list.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findById: (id) => {
    const list = readJsonFile(usersPath);
    return list.find(u => u.id === id);
  },
  create: (user) => {
    const list = readJsonFile(usersPath);
    list.push(user);
    writeJsonFile(usersPath, list);
    return user;
  }
};

// Tasks CRUD operations
const tasks = {
  getAll: () => readJsonFile(tasksPath),
  getForUser: (userId) => {
    const list = readJsonFile(tasksPath);
    return list.filter(t => t.userId === userId);
  },
  getById: (id) => {
    const list = readJsonFile(tasksPath);
    return list.find(t => t.id === id);
  },
  create: (task) => {
    const list = readJsonFile(tasksPath);
    list.push(task);
    writeJsonFile(tasksPath, list);
    return task;
  },
  update: (id, updatedData) => {
    const list = readJsonFile(tasksPath);
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Maintain userId and id, update others
    list[index] = {
      ...list[index],
      ...updatedData,
      id: list[index].id,
      userId: list[index].userId
    };
    writeJsonFile(tasksPath, list);
    return list[index];
  },
  delete: (id) => {
    const list = readJsonFile(tasksPath);
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    list.splice(index, 1);
    writeJsonFile(tasksPath, list);
    return true;
  }
};

module.exports = {
  users,
  tasks
};
