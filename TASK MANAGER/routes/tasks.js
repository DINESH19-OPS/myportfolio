const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { tasks } = require('../database/db');
const authMiddleware = require('../middleware/auth');
const websocketHub = require('../websocket/websocket');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/tasks
router.get('/', (req, res) => {
  try {
    const userTasks = tasks.getForUser(req.user.id);
    res.json({ success: true, tasks: userTasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { title, description, status, priority, dueDate, tags } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const newTask = {
      id: uuidv4(),
      userId: req.user.id,
      title: title.trim(),
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.create(newTask);

    // Notify other client connections for this user
    websocketHub.notifyUser(req.user.id, {
      type: 'TASK_CREATED',
      task: newTask,
      senderId: req.headers['x-client-id'] || null // avoid echoing to same tab if client-id passed
    });

    res.status(201).json({ success: true, task: newTask });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, dueDate, tags } = req.body;

  try {
    const task = tasks.getById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task' });
    }

    const updatedFields = {};
    if (title !== undefined) updatedFields.title = title.trim();
    if (description !== undefined) updatedFields.description = description;
    if (status !== undefined) updatedFields.status = status;
    if (priority !== undefined) updatedFields.priority = priority;
    if (dueDate !== undefined) updatedFields.dueDate = dueDate;
    if (tags !== undefined) updatedFields.tags = Array.isArray(tags) ? tags : [];
    updatedFields.updatedAt = new Date().toISOString();

    const updatedTask = tasks.update(id, updatedFields);

    // Notify other client connections for this user
    websocketHub.notifyUser(req.user.id, {
      type: 'TASK_UPDATED',
      task: updatedTask,
      senderId: req.headers['x-client-id'] || null
    });

    res.json({ success: true, task: updatedTask });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const task = tasks.getById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task' });
    }

    tasks.delete(id);

    // Notify other client connections for this user
    websocketHub.notifyUser(req.user.id, {
      type: 'TASK_DELETED',
      taskId: id,
      senderId: req.headers['x-client-id'] || null
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

module.exports = router;
