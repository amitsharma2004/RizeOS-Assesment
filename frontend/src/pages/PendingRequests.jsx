import React, { useState, useEffect } from 'react';
import { getRequests, approveRequest, rejectRequest } from '../services/api';

const PendingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState('');

  const fetchRequests = async (status) => {
    setLoading(true);
    try {
      const res = await getRequests(status);
      setRequests(res.data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter);
  }, [statusFilter]);

  const handleAction = async (requestId, action) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: action }));
    setMessage('');
    try {
      const fn = action === 'approve' ? approveRequest : rejectRequest;
      const res = await fn(requestId);
      setMessage(res.data.message);
      fetchRequests(statusFilter);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Join Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Manage employee access requests</p>
        </div>

        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No {statusFilter} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-lg">
                    {req.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{req.name}</p>
                  <p className="text-sm text-gray-500 truncate">{req.email}</p>
                  {(req.department || req.position) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[req.position, req.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Requested: {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {req.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleAction(req.id, 'approve')}
                      disabled={!!actionLoading[req.id]}
                      className="btn-success text-sm px-4 py-2 flex items-center gap-2"
                    >
                      {actionLoading[req.id] === 'approve' ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : '✓'}{' '}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject')}
                      disabled={!!actionLoading[req.id]}
                      className="btn-danger text-sm px-4 py-2 flex items-center gap-2"
                    >
                      {actionLoading[req.id] === 'reject' ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : '✗'}{' '}
                      Reject
                    </button>
                  </>
                ) : (
                  <span
                    className={req.status === 'approved' ? 'badge-approved' : 'badge-rejected'}
                  >
                    {req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingRequests;