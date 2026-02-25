import React, { useState, useEffect } from 'react';
import { getEmployees, updateEmployee, deactivateEmployee, getAiScore } from '../services/api';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [scoreLoading, setScoreLoading] = useState({});
  const [scores, setScores] = useState({});
  const [editModal, setEditModal] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleFetchScore = async (empId) => {
    setScoreLoading((prev) => ({ ...prev, [empId]: true }));
    try {
      const res = await getAiScore(empId);
      setScores((prev) => ({ ...prev, [empId]: res.data.score }));
    } catch (err) {
      console.error(err);
    } finally {
      setScoreLoading((prev) => ({ ...prev, [empId]: false }));
    }
  };

  const handleDeactivate = async (emp) => {
    if (!confirm(`Deactivate ${emp.name}?`)) return;
    try {
      const res = await deactivateEmployee(emp.id);
      setMessage(res.data.message);
      fetchEmployees();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateEmployee(editModal.id, {
        department: editModal.department,
        position: editModal.position,
        skills: editModal.skills?.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setMessage('Employee updated successfully');
      setEditModal(null);
      fetchEmployees();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const trendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-1">{employees.length} employees in your organization</p>
        </div>
        <input
          type="text"
          className="input-field max-w-xs"
          placeholder="Search by name, email, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className={`card ${!emp.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold">
                      {emp.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                </div>
                {!emp.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-3">
                {emp.department && (
                  <p>🏢 {emp.department}{emp.position ? ` · ${emp.position}` : ''}</p>
                )}
                <p>
                  ✅ {emp.completed_tasks} completed · 📋 {emp.active_tasks} active
                </p>
                <p>
                  🤖 Score: <span className="font-semibold text-purple-700">{emp.productivity_score}</span>
                  {' '}{trendIcon(emp.performance_trend)}
                </p>
              </div>

              {emp.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {emp.skills.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                  {emp.skills.length > 3 && (
                    <span className="text-xs text-gray-400">+{emp.skills.length - 3}</span>
                  )}
                </div>
              )}

              {scores[emp.id] && (
                <div className="bg-purple-50 rounded-lg p-3 mb-3 text-xs">
                  <p className="font-semibold text-purple-700 mb-1">
                    AI Score: {scores[emp.id].score}/100 {trendIcon(scores[emp.id].trend)}
                  </p>
                  <p className="text-gray-600">
                    Completion: {scores[emp.id].taskCompletionRate}% · On-time: {scores[emp.id].onTimeRate}%
                  </p>
                  {scores[emp.id].recommendations?.[0] && (
                    <p className="text-gray-500 mt-1 italic">"{scores[emp.id].recommendations[0]}"</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleFetchScore(emp.id)}
                  disabled={scoreLoading[emp.id]}
                  className="flex-1 text-xs py-1.5 px-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  {scoreLoading[emp.id] ? '...' : '🤖 Score'}
                </button>
                <button
                  onClick={() =>
                    setEditModal({
                      id: emp.id,
                      name: emp.name,
                      department: emp.department || '',
                      position: emp.position || '',
                      skills: emp.skills?.join(', ') || '',
                    })
                  }
                  className="flex-1 text-xs py-1.5 px-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✏️ Edit
                </button>
                {emp.is_active && (
                  <button
                    onClick={() => handleDeactivate(emp)}
                    className="text-xs py-1.5 px-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    🚫
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit {editModal.name}</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editModal.department}
                    onChange={(e) => setEditModal({ ...editModal, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editModal.position}
                    onChange={(e) => setEditModal({ ...editModal, position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skills <span className="text-gray-400">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="JavaScript, React, Node.js"
                    value={editModal.skills}
                    onChange={(e) => setEditModal({ ...editModal, skills: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">Save Changes</button>
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
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

export default EmployeesPage;