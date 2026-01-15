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
  Shield,
  Music,
  ChevronDown,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '@/lib/feedback';

type Tab = 'overview' | 'feedback' | 'users' | 'analytics';

type UserItem = {
  id: string;
  email: string;
  isAdmin: boolean;
  status: string;
  createdAt: string;
};

type UserStats = {
  total: number;
  active: number;
  newThisWeek: number;
  adminCount: number;
};

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

const userStatusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/50',
  suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  deleted: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const formatEventName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/\./g, ' › ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackLimit] = useState(25);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackStatsLoading, setFeedbackStatsLoading] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total: 0, active: 0, newThisWeek: 0, adminCount: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(20);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  const [analytics, setAnalytics] = useState<{
    totalEvents: number;
    uniqueUsers: number;
    eventCounts: Record<string, number>;
    recentEvents: Array<{ eventName: string; createdAt: string; userId?: string }>;
  } | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/feedback?page=${feedbackPage}&limit=${feedbackLimit}`);
      const data = await response.json();

      if (data.success) {
        setFeedback(data.feedback);
        const nextTotalPages = data.totalPages ?? 1;
        setFeedbackTotal(data.total ?? data.feedback.length);
        setFeedbackTotalPages(nextTotalPages);
        if (feedbackPage > nextTotalPages) {
          setFeedbackPage(nextTotalPages);
        }

        if (selectedFeedback) {
          const stillVisible = (data.feedback as FeedbackItem[]).some((item) => item.id === selectedFeedback.id);
          if (!stillVisible) {
            setSelectedFeedback(null);
          }
        }
      }
    } catch (error) {
      logger.error('[Admin] Failed to fetch feedback', { error: toErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, [feedbackPage, feedbackLimit, selectedFeedback]);

  const fetchFeedbackStats = useCallback(async () => {
    setFeedbackStatsLoading(true);
    try {
      const response = await fetch('/api/admin/feedback/stats');
      const data = await response.json();

      if (data.success) {
        setStats({
          total: data.stats.total ?? 0,
          new: data.stats.byStatus?.new ?? 0,
          inProgress: data.stats.byStatus?.['in-progress'] ?? 0,
          resolved: data.stats.byStatus?.resolved ?? 0,
          byType: {
            bug: data.stats.byType?.bug ?? 0,
            feature: data.stats.byType?.feature ?? 0,
            idea: data.stats.byType?.idea ?? 0,
            feedback: data.stats.byType?.feedback ?? 0,
          },
        });
      }
    } catch (error) {
      logger.error('[Admin] Failed to fetch feedback stats', { error: toErrorMessage(error) });
    } finally {
      setFeedbackStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/users?page=${userPage}&limit=${userLimit}`),
        fetch('/api/admin/users/stats'),
      ]);

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      if (usersData.success) {
        const nextTotalPages = usersData.totalPages ?? 1;
        setUsers(usersData.users);
        setUserTotal(usersData.total ?? usersData.users.length);
        setUserTotalPages(nextTotalPages);
        if (userPage > nextTotalPages) {
          setUserPage(nextTotalPages);
        }
      }

      if (statsData.success) {
        setUserStats(statsData.stats);
      }
    } catch (error) {
      logger.error('[Admin] Failed to fetch users', { error: toErrorMessage(error) });
    } finally {
      setUsersLoading(false);
    }
  }, [userLimit, userPage]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?days=${analyticsDays}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.summary);
      }
    } catch (error) {
      logger.error('[Admin] Failed to fetch analytics', { error: toErrorMessage(error) });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    if (activeTab === 'overview') {
      if (feedbackPage !== 1) {
        setFeedbackPage(1);
      } else {
        fetchFeedback();
      }
      fetchFeedbackStats();
      return;
    }

    if (activeTab === 'users') {
      fetchUsers();
      return;
    }

    if (activeTab === 'analytics') {
      fetchAnalytics();
      return;
    }

    if (activeTab === 'feedback') {
      fetchFeedback();
    }
  }, [activeTab, fetchUsers, fetchAnalytics, fetchFeedback, fetchFeedbackStats, feedbackPage]);

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchFeedback();
        fetchFeedbackStats();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback((prev) => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      logger.error('[Admin] Failed to update feedback', { error: toErrorMessage(error) });
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
        fetchFeedbackStats();
      }
    } catch (error) {
      logger.error('[Admin] Failed to delete feedback', { error: toErrorMessage(error) });
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
            
            {/* Navigation Switcher */}
            <div className="relative ml-4">
              <button
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors text-sm"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${navDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {navDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setNavDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-purple-500/20 text-purple-400 border-l-2 border-purple-500"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Admin Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setNavDropdownOpen(false);
                      router.push('/app');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Music className="w-4 h-4" />
                    <span className="text-sm font-medium">Experience App</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'users') {
                  fetchUsers();
                } else if (activeTab === 'analytics') {
                  fetchAnalytics();
                } else {
                  fetchFeedback();
                  fetchFeedbackStats();
                }
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-white/70 ${isLoading || usersLoading || analyticsLoading ? 'animate-spin' : ''}`} />
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
            { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
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
                <p className="text-3xl font-bold text-white">{feedbackStatsLoading ? '...' : stats.total}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-sm">New</span>
                </div>
                <p className="text-3xl font-bold text-white">{feedbackStatsLoading ? '...' : stats.new}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-sm">In Progress</span>
                </div>
                <p className="text-3xl font-bold text-white">{feedbackStatsLoading ? '...' : stats.inProgress}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/60 text-sm">Resolved</span>
                </div>
                <p className="text-3xl font-bold text-white">{feedbackStatsLoading ? '...' : stats.resolved}</p>
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
                        <p className="text-white/50 text-sm">
                          {feedbackStatsLoading ? '...' : `${stats.byType[type]} items`}
                        </p>
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
              <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">All Feedback</h3>
                  <p className="text-xs text-white/50 mt-1">{feedbackTotal} total</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFeedbackPage((prev) => Math.max(1, prev - 1))}
                    disabled={feedbackPage <= 1}
                    className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-40 disabled:hover:text-white/60"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-white/50">
                    Page {feedbackPage} of {feedbackTotalPages}
                  </span>
                  <button
                    onClick={() => setFeedbackPage((prev) => Math.min(feedbackTotalPages, prev + 1))}
                    disabled={feedbackPage >= feedbackTotalPages}
                    className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-40 disabled:hover:text-white/60"
                  >
                    Next
                  </button>
                </div>
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
          <div className="space-y-8">
            {/* User Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/60 text-sm">Total Users</span>
                </div>
                <p className="text-3xl font-bold text-white">{userStats.total}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <UserCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/60 text-sm">Active Users</span>
                </div>
                <p className="text-3xl font-bold text-white">{userStats.active}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-sm">New This Week</span>
                </div>
                <p className="text-3xl font-bold text-white">{userStats.newThisWeek}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-sm">Admins</span>
                </div>
                <p className="text-3xl font-bold text-white">{userStats.adminCount}</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">All Users</h3>
                  <p className="text-xs text-white/50 mt-1">{userTotal} total</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                    disabled={userPage <= 1}
                    className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-40 disabled:hover:text-white/60"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-white/50">
                    Page {userPage} of {userTotalPages}
                  </span>
                  <button
                    onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
                    disabled={userPage >= userTotalPages}
                    className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-40 disabled:hover:text-white/60"
                  >
                    Next
                  </button>
                </div>
              </div>
              {usersLoading ? (
                <div className="text-center py-8 text-white/50">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-white/50">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left text-white/70 text-sm font-medium px-6 py-3">Email</th>
                        <th className="text-left text-white/70 text-sm font-medium px-6 py-3">Status</th>
                        <th className="text-left text-white/70 text-sm font-medium px-6 py-3">Admin</th>
                        <th className="text-left text-white/70 text-sm font-medium px-6 py-3">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-white text-sm">{user.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs border ${userStatusColors[user.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.isAdmin ? (
                              <span className="flex items-center gap-1.5 text-purple-400 text-sm">
                                <Shield className="w-3.5 h-3.5" />
                                Admin
                              </span>
                            ) : (
                              <span className="text-white/50 text-sm">User</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white/50 text-sm">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Analytics Summary</h3>
                <p className="text-xs text-white/50">Last {analyticsDays} days</p>
              </div>
              <label className="text-xs text-white/60 flex items-center gap-2">
                Range
                <select
                  value={analyticsDays}
                  onChange={(event) => setAnalyticsDays(Number(event.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white"
                >
                  {[7, 30, 90, 180, 365].map((days) => (
                    <option key={days} value={days} className="bg-[#0a0a0a]">
                      {days} days
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {/* Analytics Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-sm">Total Events</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {analyticsLoading ? '...' : (analytics?.totalEvents ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/60 text-sm">Unique Users</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {analyticsLoading ? '...' : (analytics?.uniqueUsers ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/60 text-sm">Events/Day</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {analyticsLoading ? '...' : Math.round((analytics?.totalEvents ?? 0) / analyticsDays).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-sm">Event Types</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {analyticsLoading ? '...' : Object.keys(analytics?.eventCounts ?? {}).length}
                </p>
              </div>
            </div>

            {/* Event Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Event Breakdown</h3>
              {analyticsLoading ? (
                <div className="text-center py-8 text-white/50">Loading analytics...</div>
              ) : !analytics || Object.keys(analytics.eventCounts).length === 0 ? (
                <div className="text-center py-8 text-white/50">No analytics data yet</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.eventCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([eventName, count]) => {
                      const percentage = analytics.totalEvents > 0 
                        ? Math.round((count / analytics.totalEvents) * 100) 
                        : 0;
                      return (
                        <div key={eventName} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-purple-500/20 rounded">
                                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                              </div>
                              <span className="text-white font-medium text-sm">{formatEventName(eventName)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-white/50">{count.toLocaleString()} events</span>
                              <span className="text-purple-400 font-medium w-12 text-right">{percentage}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Recent Events */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Events</h3>
              {analyticsLoading ? (
                <div className="text-center py-8 text-white/50">Loading events...</div>
              ) : !analytics || analytics.recentEvents.length === 0 ? (
                <div className="text-center py-8 text-white/50">No analytics data yet</div>
              ) : (
                <div className="space-y-2">
                  {analytics.recentEvents.map((event, index) => (
                    <div
                      key={`${event.eventName}-${event.createdAt}-${index}`}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-purple-500/20 rounded">
                          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{formatEventName(event.eventName)}</p>
                          <p className="text-white/50 text-xs">
                            {event.userId ? `User: ${event.userId.slice(0, 8)}...` : 'Anonymous'}
                          </p>
                        </div>
                      </div>
                      <span className="text-white/40 text-xs">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
