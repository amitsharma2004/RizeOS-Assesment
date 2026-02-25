import React, { useState, useEffect } from 'react';
import { getAiInsights, getProductivityRankings, recalculateAllScores } from '../services/api';

const ScoreBar = ({ score }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all ${
        score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
      }`}
      style={{ width: `${score}%` }}
    />
  </div>
);

const AiInsights = () => {
  const [insights, setInsights] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const [insRes, rankRes] = await Promise.all([getAiInsights(), getProductivityRankings()]);
      setInsights(insRes.data.insights);
      setRankings(rankRes.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecalc = async () => {
    setRecalcLoading(true);
    setMessage('');
    try {
      const res = await recalculateAllScores();
      setMessage(res.data.message);
      fetchData();
    } catch (err) {
      setMessage('Recalculation failed');
    } finally {
      setRecalcLoading(false);
    }
  };

  const trendIcon = (t) => t === 'improving' ? '📈' : t === 'declining' ? '📉' : '➡️';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 AI Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Rule-based workforce intelligence</p>
        </div>
        <button
          onClick={handleRecalc}
          disabled={recalcLoading}
          className="btn-primary flex items-center gap-2"
        >
          {recalcLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : '🔄'}
          Recalculate All
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Performers */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performers</h2>
            {insights.topPerformers.length === 0 ? (
              <p className="text-gray-500 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {insights.topPerformers.map((emp, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                        <span className="text-sm font-bold text-green-600">
                          {emp.productivity_score}/100
                        </span>
                      </div>
                      <ScoreBar score={emp.productivity_score} />
                      {emp.department && (
                        <p className="text-xs text-gray-400 mt-0.5">{emp.department}</p>
                      )}
                    </div>
                    <span>{trendIcon(emp.performance_trend)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs Attention */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Needs Attention</h2>
            {insights.needsAttention.length === 0 ? (
              <p className="text-gray-500 text-sm">All employees performing well!</p>
            ) : (
              <div className="space-y-3">
                {insights.needsAttention.map((emp, i) => (
                  <div key={i} className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                      <span className="text-sm font-bold text-yellow-600">
                        {emp.productivity_score}/100
                      </span>
                    </div>
                    <ScoreBar score={emp.productivity_score} />
                    {emp.recommendations?.[0] && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        💡 {emp.recommendations[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend Distribution */}
      {insights?.trendDistribution?.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Trends</h2>
          <div className="flex gap-6 flex-wrap">
            {insights.trendDistribution.map((t) => (
              <div key={t.performance_trend} className="flex items-center gap-2">
                <span className="text-2xl">{trendIcon(t.performance_trend)}</span>
                <div>
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {t.performance_trend.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500">{t.count} employees</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Full Productivity Rankings</h2>
        {rankings.length === 0 ? (
          <p className="text-gray-500 text-sm">No employee data yet. Approve employees and assign tasks to generate scores.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">#</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Employee</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium hidden sm:table-cell">Dept</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Score</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium hidden md:table-cell">Completion</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium hidden md:table-cell">On-time</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((emp, i) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-400">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        {emp.position && <p className="text-xs text-gray-400">{emp.position}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-500 hidden sm:table-cell">
                      {emp.department || '-'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          emp.productivity_score >= 70 ? 'text-green-600' :
                          emp.productivity_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {emp.productivity_score}
                        </span>
                        <div className="w-16 hidden sm:block">
                          <ScoreBar score={emp.productivity_score} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-500 hidden md:table-cell">
                      {emp.task_completion_rate}%
                    </td>
                    <td className="py-3 px-2 text-gray-500 hidden md:table-cell">
                      {emp.on_time_rate}%
                    </td>
                    <td className="py-3 px-2">{trendIcon(emp.performance_trend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiInsights;