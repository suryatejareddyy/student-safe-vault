import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface AdminDashboardStats {
  total_students: number;
  total_verified: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  active_accounts: number;
  disabled_accounts: number;
  daily_trends: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  recent_signups: Array<{
    id: string;
    full_name: string;
    email: string;
    college_name?: string | null;
    created_at: string;
    is_verified: boolean;
    status: 'active' | 'disabled';
  }>;
  generated_at?: string;
}

export interface RegisteredStudent {
  id: string;
  full_name: string;
  email: string;
  college_name?: string | null;
  student_id?: string | null;
  created_at: string;
  is_verified: boolean;
  status: 'active' | 'disabled';
  disabled_at?: string | null;
  disabled_reason?: string | null;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  target_user_id?: string | null;
  target_user_email?: string | null;
  action: string;
  reason?: string | null;
  details?: any;
  created_at: string;
}

interface AdminContextType {
  stats: AdminDashboardStats | null;
  students: RegisteredStudent[];
  totalStudentsCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  statusFilter: 'All' | 'active' | 'disabled';
  verificationFilter: 'All' | 'Verified' | 'Unverified';
  dateRangeFilter: 'All' | 'today' | 'this_week' | 'this_month';
  sortBy: 'created_at' | 'full_name' | 'email';
  sortDir: 'asc' | 'desc';
  auditLogs: AdminAuditLog[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: 'All' | 'active' | 'disabled') => void;
  setVerificationFilter: (v: 'All' | 'Verified' | 'Unverified') => void;
  setDateRangeFilter: (d: 'All' | 'today' | 'this_week' | 'this_month') => void;
  setSort: (by: 'created_at' | 'full_name' | 'email', dir: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  refreshStats: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  toggleAccountStatus: (
    studentId: string,
    status: 'active' | 'disabled',
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Local fallback data for offline / prototype demonstrations
const INITIAL_DEMO_STUDENTS: RegisteredStudent[] = [
  {
    id: 'demo-stu-1',
    full_name: 'Alex Chen',
    email: 'alex.chen@university.edu',
    college_name: 'Global Institute of Technology',
    student_id: 'STU-2026-9042',
    created_at: '2026-09-01T10:30:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-2',
    full_name: 'Sophia Martinez',
    email: 'sophia.martinez@stanford.edu',
    college_name: 'Stanford University',
    student_id: 'STAN-CS-2026-11',
    created_at: '2026-09-28T14:15:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-3',
    full_name: 'Liam Patel',
    email: 'liam.patel@cambridge.ac.uk',
    college_name: 'University of Cambridge',
    student_id: 'CAM-ENG-491',
    created_at: '2026-10-02T09:40:00Z',
    is_verified: false,
    status: 'active',
  },
  {
    id: 'demo-stu-4',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@mit.edu',
    college_name: 'Massachusetts Inst. of Technology',
    student_id: 'MIT-PHD-8802',
    created_at: '2026-08-14T11:00:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-5',
    full_name: 'Marcus Vance',
    email: 'marcus.vance@berkeley.edu',
    college_name: 'UC Berkeley',
    student_id: 'UCB-BIO-3310',
    created_at: '2026-10-01T16:20:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-6',
    full_name: 'Hannah Schmidt',
    email: 'hannah.schmidt@ethz.ch',
    college_name: 'ETH Zurich',
    student_id: 'ETH-MEC-709',
    created_at: '2026-09-12T08:00:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-7',
    full_name: 'Jordan Miller',
    email: 'flagged.user@unverified.org',
    college_name: 'Unverified Domain',
    student_id: 'UNV-000-000',
    created_at: '2026-09-05T18:45:00Z',
    is_verified: false,
    status: 'disabled',
    disabled_at: '2026-09-10T12:00:00Z',
    disabled_reason: 'Unverified institutional affiliation credentials',
  },
  {
    id: 'demo-stu-8',
    full_name: 'Priya Sharma',
    email: 'priya.sharma@iitd.ac.in',
    college_name: 'Indian Institute of Technology Delhi',
    student_id: 'IITD-2026-004',
    created_at: '2026-10-03T07:15:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-9',
    full_name: 'Carlos Mendez',
    email: 'carlos.mendez@unam.mx',
    college_name: 'UNAM Mexico',
    student_id: 'UNAM-8912',
    created_at: '2026-09-29T13:10:00Z',
    is_verified: true,
    status: 'active',
  },
  {
    id: 'demo-stu-10',
    full_name: 'Aisha Al-Mansoor',
    email: 'aisha.m@aus.edu',
    college_name: 'American University of Sharjah',
    student_id: 'AUS-4491-CS',
    created_at: '2026-10-03T11:50:00Z',
    is_verified: false,
    status: 'active',
  },
];

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(8);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'disabled'>('All');
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Verified' | 'Unverified'>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'All' | 'today' | 'this_week' | 'this_month'>('All');
  const [sortBy, setSortBy] = useState<'created_at' | 'full_name' | 'email'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback demo state in localStorage
  const getLocalStudents = useCallback((): RegisteredStudent[] => {
    const raw = localStorage.getItem('admin_demo_students');
    if (!raw) {
      localStorage.setItem('admin_demo_students', JSON.stringify(INITIAL_DEMO_STUDENTS));
      return INITIAL_DEMO_STUDENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DEMO_STUDENTS;
    }
  }, []);

  const getLocalLogs = useCallback((): AdminAuditLog[] => {
    const raw = localStorage.getItem('admin_demo_logs');
    if (!raw) {
      const initialLogs: AdminAuditLog[] = [
        {
          id: 'log-1',
          admin_id: 'admin-001',
          admin_email: 'ksuryatejareddy0309@gmail.com',
          target_user_id: 'demo-stu-7',
          target_user_email: 'flagged.user@unverified.org',
          action: 'disable_account',
          reason: 'Unverified institutional affiliation credentials',
          created_at: '2026-09-10T12:00:00Z',
        },
      ];
      localStorage.setItem('admin_demo_logs', JSON.stringify(initialLogs));
      return initialLogs;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, []);

  // 1. Fetch Real Stats
  const refreshStats = useCallback(async () => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured) {
      // Calculate real stats from local demo store
      const list = getLocalStudents();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const total_students = list.length;
      const total_verified = list.filter((s) => s.is_verified).length;
      const new_today = list.filter((s) => s.created_at.startsWith(todayStr)).length;
      const new_this_week = list.filter((s) => new Date(s.created_at) >= oneWeekAgo).length;
      const new_this_month = list.filter((s) => new Date(s.created_at) >= oneMonthAgo).length;
      const active_accounts = list.filter((s) => s.status === 'active').length;
      const disabled_accounts = list.filter((s) => s.status === 'disabled').length;

      // 14 day trends
      const daily_trends: AdminDashboardStats['daily_trends'] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const count = list.filter((s) => s.created_at.startsWith(dStr)).length;
        daily_trends.push({ date: dStr, label, count });
      }

      const recent_signups = [...list]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          college_name: s.college_name,
          created_at: s.created_at,
          is_verified: s.is_verified,
          status: s.status,
        }));

      setStats({
        total_students,
        total_verified,
        new_today,
        new_this_week,
        new_this_month,
        active_accounts,
        disabled_accounts,
        daily_trends,
        recent_signups,
        generated_at: new Date().toISOString(),
      });
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');
      if (rpcError) {
        console.warn('RPC get_admin_dashboard_stats failed, querying profiles fallback:', rpcError.message);
        // Fallback: Query profiles table directly
        const { data: profs, count } = await supabase
          .from('profiles')
          .select('id, full_name, email, college_name, created_at, status', { count: 'exact' });

        if (profs) {
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const studentList = profs.filter((p: any) => p.email !== user?.email);
          const total_students = studentList.length;
          const new_today = studentList.filter((s) => s.created_at?.startsWith(todayStr)).length;
          const new_this_week = studentList.filter((s) => new Date(s.created_at) >= oneWeekAgo).length;
          const new_this_month = studentList.filter((s) => new Date(s.created_at) >= oneMonthAgo).length;
          const active_accounts = studentList.filter((s) => s.status !== 'disabled').length;
          const disabled_accounts = studentList.filter((s) => s.status === 'disabled').length;

          setStats({
            total_students,
            total_verified: Math.max(0, total_students - 1),
            new_today,
            new_this_week,
            new_this_month,
            active_accounts,
            disabled_accounts,
            daily_trends: [],
            recent_signups: studentList.slice(0, 5).map((s: any) => ({
              id: s.id,
              full_name: s.full_name,
              email: s.email,
              college_name: s.college_name,
              created_at: s.created_at,
              is_verified: true,
              status: s.status || 'active',
            })),
          });
        }
        return;
      }

      if (data) {
        setStats(data as AdminDashboardStats);
      }
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
    }
  }, [isAdmin, isSupabaseConfigured, getLocalStudents, user?.email]);

  // 2. Fetch Paginated Registered Students
  const refreshStudents = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);

    const offset = (currentPage - 1) * pageSize;

    if (!isSupabaseConfigured) {
      let filtered = getLocalStudents();

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.full_name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.college_name && s.college_name.toLowerCase().includes(q))
        );
      }

      // Status filter
      if (statusFilter !== 'All') {
        filtered = filtered.filter((s) => s.status === statusFilter);
      }

      // Verification filter
      if (verificationFilter !== 'All') {
        filtered = filtered.filter((s) =>
          verificationFilter === 'Verified' ? s.is_verified : !s.is_verified
        );
      }

      // Date range filter
      if (dateRangeFilter !== 'All') {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        filtered = filtered.filter((s) => {
          if (dateRangeFilter === 'today') return s.created_at.startsWith(todayStr);
          if (dateRangeFilter === 'this_week') return new Date(s.created_at) >= weekAgo;
          if (dateRangeFilter === 'this_month') return new Date(s.created_at) >= monthAgo;
          return true;
        });
      }

      // Sorting
      filtered.sort((a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';
        if (sortBy === 'created_at') {
          return sortDir === 'asc'
            ? new Date(valA).getTime() - new Date(valB).getTime()
            : new Date(valB).getTime() - new Date(valA).getTime();
        }
        return sortDir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });

      setTotalStudentsCount(filtered.length);
      setStudents(filtered.slice(offset, offset + pageSize));
      setLoading(false);
      return;
    }

    try {
      // Calculate date filters
      let dateFrom: string | null = null;
      let dateTo: string | null = null;
      const now = new Date();

      if (dateRangeFilter === 'today') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (dateRangeFilter === 'this_week') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRangeFilter === 'this_month') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error: rpcError } = await supabase.rpc('get_registered_students', {
        p_search: searchQuery.trim() || null,
        p_status: statusFilter,
        p_verified: verificationFilter,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
        p_limit: pageSize,
        p_offset: offset,
      });

      if (rpcError) {
        console.warn('RPC get_registered_students failed, falling back to direct query:', rpcError.message);
        // Fallback: Query profiles table
        let query = supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'student');
        if (searchQuery.trim()) {
          query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        if (statusFilter !== 'All') {
          query = query.eq('status', statusFilter);
        }
        query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(offset, offset + pageSize - 1);

        const { data: fbData, count } = await query;
        if (fbData) {
          setTotalStudentsCount(count || fbData.length);
          setStudents(
            fbData.map((d: any) => ({
              id: d.id,
              full_name: d.full_name,
              email: d.email,
              college_name: d.college_name,
              student_id: d.student_id,
              created_at: d.created_at,
              is_verified: true,
              status: d.status || 'active',
              disabled_at: d.disabled_at,
              disabled_reason: d.disabled_reason,
            }))
          );
        }
      } else if (data) {
        setTotalStudentsCount(data.total_count || 0);
        setStudents(data.students || []);
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    isSupabaseConfigured,
    currentPage,
    pageSize,
    searchQuery,
    statusFilter,
    verificationFilter,
    dateRangeFilter,
    sortBy,
    sortDir,
    getLocalStudents,
  ]);

  // 3. Fetch Audit Logs
  const refreshAuditLogs = useCallback(async () => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured) {
      setAuditLogs(getLocalLogs());
      return;
    }

    try {
      const { data, error: logError } = await supabase.rpc('get_admin_audit_logs', {
        p_limit: 20,
        p_offset: 0,
      });

      if (!logError && data?.logs) {
        setAuditLogs(data.logs);
      } else {
        // Fallback direct table query
        const { data: rawLogs } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (rawLogs) {
          setAuditLogs(rawLogs as AdminAuditLog[]);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch audit logs:', err.message);
    }
  }, [isAdmin, isSupabaseConfigured, getLocalLogs]);

  // 4. Toggle Account Status (Disable / Enable)
  const toggleAccountStatus = async (
    studentId: string,
    nextStatus: 'active' | 'disabled',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Administrator privileges required.' };
    }

    setActionLoading(true);

    if (!isSupabaseConfigured) {
      // Update local storage
      const list = getLocalStudents();
      const updated = list.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            status: nextStatus,
            disabled_at: nextStatus === 'disabled' ? new Date().toISOString() : null,
            disabled_reason: nextStatus === 'disabled' ? reason || 'Administrative suspension' : null,
          };
        }
        return s;
      });
      localStorage.setItem('admin_demo_students', JSON.stringify(updated));

      // Append to local audit logs
      const target = list.find((s) => s.id === studentId);
      const logs = getLocalLogs();
      const newLog: AdminAuditLog = {
        id: 'log-' + Date.now(),
        admin_id: user?.id || 'admin-001',
        admin_email: profile?.email || user?.email || 'ksuryatejareddy0309@gmail.com',
        target_user_id: studentId,
        target_user_email: target?.email || 'student@vault.edu',
        action: nextStatus === 'disabled' ? 'disable_account' : 'enable_account',
        reason: reason || null,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('admin_demo_logs', JSON.stringify([newLog, ...logs]));

      await refreshStats();
      await refreshStudents();
      await refreshAuditLogs();
      setActionLoading(false);
      return { success: true };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('toggle_student_account_status', {
        p_student_id: studentId,
        p_status: nextStatus,
        p_reason: reason || (nextStatus === 'disabled' ? 'Administrative suspension' : 'Reactivated by admin'),
      });

      if (rpcError) {
        // Fallback: direct update
        const { error: updError } = await supabase
          .from('profiles')
          .update({
            status: nextStatus,
            disabled_at: nextStatus === 'disabled' ? new Date().toISOString() : null,
            disabled_reason: nextStatus === 'disabled' ? reason || 'Administrative suspension' : null,
          })
          .eq('id', studentId);

        if (updError) {
          setActionLoading(false);
          return { success: false, error: updError.message };
        }
      }

      await refreshStats();
      await refreshStudents();
      await refreshAuditLogs();
      setActionLoading(false);
      return { success: true };
    } catch (err: any) {
      setActionLoading(false);
      return { success: false, error: err.message };
    }
  };

  const setSort = (by: 'created_at' | 'full_name' | 'email', dir: 'asc' | 'desc') => {
    setSortBy(by);
    setSortDir(dir);
    setCurrentPage(1);
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      refreshStats();
      refreshStudents();
      refreshAuditLogs();
    }
  }, [isAdmin, refreshStats, refreshStudents, refreshAuditLogs]);

  const totalPages = Math.max(1, Math.ceil(totalStudentsCount / pageSize));

  const value = {
    stats,
    students,
    totalStudentsCount,
    currentPage,
    pageSize,
    totalPages,
    searchQuery,
    statusFilter,
    verificationFilter,
    dateRangeFilter,
    sortBy,
    sortDir,
    auditLogs,
    loading,
    actionLoading,
    error,
    setSearchQuery: (q: string) => {
      setSearchQuery(q);
      setCurrentPage(1);
    },
    setStatusFilter: (s: 'All' | 'active' | 'disabled') => {
      setStatusFilter(s);
      setCurrentPage(1);
    },
    setVerificationFilter: (v: 'All' | 'Verified' | 'Unverified') => {
      setVerificationFilter(v);
      setCurrentPage(1);
    },
    setDateRangeFilter: (d: 'All' | 'today' | 'this_week' | 'this_month') => {
      setDateRangeFilter(d);
      setCurrentPage(1);
    },
    setSort,
    setCurrentPage,
    refreshStats,
    refreshStudents,
    refreshAuditLogs,
    toggleAccountStatus,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
