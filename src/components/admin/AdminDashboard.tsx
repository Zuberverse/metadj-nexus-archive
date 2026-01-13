'use client';

/**
 * Admin Dashboard Component
 *
 * Main admin interface for managing feedback, users, and viewing analytics.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Users,
  BarChart3,
  Bug,
  Lightbulb,
  Sparkles,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '@/lib/feedback';

type Tab = 'overview' | 'feedback' | 'users';

const typeIcons: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  feature: Sparkles,
  idea: Lightbulb,
  feedback: MessageSquare,
};

const statusColors: Record<FeedbackStatus, string> = {
  new: 'bg-blue-500',
  reviewed: 'bg-yellow-500',
  'in-progress': 'bg-purple-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    byType: { bug: 0, feature: 0, idea: 0, feedback: 0 },
  });

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feedback');
      const data = await response.json();

      if (data.success) {
        setFeedback(data.feedback);

        // Calculate stats
        const items = data.feedback as FeedbackItem[];
        setStats({
          total: items.length,
          new: items.filter((f) => f.status === 'new').length,
          inProgress: items.filter((f) => f.status === 'in-progress').length,
          resolved: items.filter((f) => f.status === 'resolved').length,
          byType: {
            bug: items.filter((f) => f.type === 'bug').length,
            feature: items.filter((f) => f.type === 'feature').length,
            idea: items.filter((f) => f.type === 'idea').length,
            feedback: items.filter((f) => f.type === 'feedback').length,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchFeedback();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback((prev) => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const deleteFeedbackItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFeedback();
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/app')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFeedback}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-white/70 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
            { id: 'feedback' as Tab, label: 'Feedback', icon: MessageSquare },
            { id: 'users' as Tab, label: 'Users', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/60 text-sm">Total Feedback</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-sm">New</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.new}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-sm">In Progress</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.inProgress}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/60 text-sm">Resolved</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.resolved}</p>
              </div>
            </div>

            {/* Feedback by Type */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Feedback by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['bug', 'feature', 'idea', 'feedback'] as FeedbackType[]).map((type) => {
                  const Icon = typeIcons[type];
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium capitalize">{type}</p>
                        <p className="text-white/50 text-sm">{stats.byType[type]} items</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Feedback</h3>
              {isLoading ? (
                <div className="text-center py-8 text-white/50">Loading...</div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-8 text-white/50">No feedback yet</div>
              ) : (
                <div className="space-y-3">
                  {feedback.slice(0, 5).map((item) => {
                    const Icon = typeIcons[item.type];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedFeedback(item);
                          setActiveTab('feedback');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-white/50" />
                          <div>
                            <p className="text-white text-sm font-medium">{item.title}</p>
                            <p className="text-white/50 text-xs">
                              {item.userEmail || 'Anonymous'} • {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[item.status]} bg-opacity-20 text-white`}>
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Feedback List */}
            <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">All Feedback</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-white/50">Loading...</div>
                ) : feedback.length === 0 ? (
                  <div className="text-center py-8 text-white/50">No feedback yet</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {feedback.map((item) => {
                      const Icon = typeIcons[item.type];
                      return (
                        <div
                          key={item.id}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedFeedback?.id === item.id
                              ? 'bg-purple-500/20'
                              : 'hover:bg-white/5'
                          }`}
                          onClick={() => setSelectedFeedback(item)}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="w-4 h-4 text-white/50 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{item.title}</p>
                              <p className="text-white/50 text-xs mt-1">
                                {item.userEmail || 'Anonymous'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
                                <span className="text-white/40 text-xs capitalize">{item.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Detail */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {selectedFeedback ? (
                <>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Feedback Detail</h3>
                    <button
                      onClick={() => deleteFeedbackItem(selectedFeedback.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-xl font-semibold text-white mb-2">{selectedFeedback.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span className="capitalize">{selectedFeedback.type}</span>
                        <span>•</span>
                        <span>{selectedFeedback.userEmail || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{new Date(selectedFeedback.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {(['new', 'reviewed', 'in-progress', 'resolved', 'closed'] as FeedbackStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              onClick={() => updateFeedbackStatus(selectedFeedback.id, status)}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                selectedFeedback.status === status
                                  ? `${statusColors[status]} text-white`
                                  : 'bg-white/5 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {status}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {selectedFeedback.severity && (
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Severity</label>
                        <span className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white capitalize">
                          {selectedFeedback.severity}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                      <div className="p-4 bg-white/5 rounded-xl text-white/80 whitespace-pre-wrap">
                        {selectedFeedback.description}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full py-16 text-white/50">
                  Select a feedback item to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">User Management</h3>
            <p className="text-white/50">
              User management is available after database integration.
              See docs/AUTH-SYSTEM.md for setup instructions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
