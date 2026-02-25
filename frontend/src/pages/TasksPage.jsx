import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getEmployees, getTaskSuggestions } from '../services/api';
import { getUserBlockchainActivity, getOrgBlockchainLogs } from '../services/web3Service';
import { useAuth } from '../context/AuthContext';

const priorityColor = (p) => {
  if (p === 'high') return 'bg-red-100 text-red-700';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
};

const statusColor = (s) => {
  if (s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
};

const TasksPage = () => {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [blockchainTxMap, setBlockchainTxMap] = useState({}); // taskId -> txHash
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });

  const fetchTasks = async () => {
    try {
      const res = await getTasks(statusFilter ? { status: statusFilter } : {});
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch blockchain logs to show on-chain badges
  useEffect(() => {
    const fetchChainLogs = async () => {
      try {
        if (isAdmin) {
          const res = await getOrgBlockchainLogs();
          // Build map of activity_hash -> txHash for task display
          const map = {};
          res.data.logs.forEach((log) => {
            if (log.event_type === 'task_completion') {
              map[log.activity_hash] = log.transaction_hash;
            }
          });
          setBlockchainTxMap(map);
        } else {
          const res = await getUserBlockchainActivity(user.id);
          const map = {};
          (res.data.dbLogs || []).forEach((log) => {
            if (log.event_type === 'task_completion') {
              map[log.activity_hash] = log.transaction_hash;
            }
          });
          setBlockchainTxMap(map);
        }
      } catch {}
    };
    if (user?.id) fetchChainLogs();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      getEmployees().then((r) => setEmployees(r.data.employees)).catch(() => {});
    }
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTask(form);
      setMessage('Task created successfully');
      setShowCreate(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      fetchTasks();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      // Show blockchain confirmation if available
      if (newStatus === 'completed' && res.data.blockchain?.status === 'pending') {
        setMessage('✅ Task completed! ⛓️ Blockchain log submitted to Polygon...');
      } else if (newStatus === 'completed') {
        setMessage('✅ Task marked as completed');
      }
      fetchTasks();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDelete = async (taskId, title) => {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      await deleteTask(taskId);
      setMessage('Task deleted');
      fetchTasks();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await getTaskSuggestions();
      setSuggestions(res.data.suggestions);
    } catch (err) {}
  };

  const isOverdue = (task) =>
    task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Task Management' : 'My Tasks'}</h1>
          <p className="text-gray-500 text-sm mt-1">{tasks.length} tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {isAdmin && (
            <button
              onClick={() => { setShowCreate(true); fetchSuggestions(); }}
              className="btn-primary whitespace-nowrap"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card ${isOverdue(task) ? 'border-red-200 bg-red-50' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {isOverdue(task) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-medium">
                        ⚠️ Overdue
                      </span>
                    )}
                    {/* Blockchain verified badge */}
                    {task.status === 'completed' && Object.keys(blockchainTxMap).length > 0 && (
                      <span
                        title="Verified on Polygon blockchain"
                        className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex items-center gap-1"
                      >
                        ⛓️ On-chain
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 truncate mb-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {task.assigned_to_name && (
                      <span>👤 {task.assigned_to_name}</span>
                    )}
                    {task.assigned_by_name && (
                      <span>From: {task.assigned_by_name}</span>
                    )}
                    {task.due_date && (
                      <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                    {task.completed_at && (
                      <span>✅ {new Date(task.completed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status update dropdown */}
                  {task.status !== 'completed' && (
                    <select
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                    >
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                  {task.status === 'completed' && (
                    <button
                      onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                      className="text-xs text-gray-500 hover:text-blue-600 border border-gray-300 rounded-lg px-2 py-1.5"
                    >
                      Reopen
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(task.id, task.title)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Task</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Task title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Task details..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To * {suggestions.length > 0 && '(AI suggestions below)'}
                  </label>
                  <select
                    className="input-field"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.filter((e) => e.is_active).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.department ? ` (${e.department})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* AI Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs font-medium text-purple-700 mb-2">🤖 AI Recommendations</p>
                      <div className="space-y-1">
                        {suggestions.slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setForm({ ...form, assignedTo: s.id })}
                            className={`w-full text-left text-xs p-2 rounded-md transition-colors ${
                              form.assignedTo === s.id
                                ? 'bg-purple-200 text-purple-900'
                                : 'bg-white hover:bg-purple-100 text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{s.name}</span>
                            {s.department && <span className="text-gray-400"> · {s.department}</span>}
                            <span className="text-purple-600 ml-2">Score: {s.recommendationScore}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="input-field"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">Create Task</button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;