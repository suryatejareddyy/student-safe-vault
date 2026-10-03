import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  MapPin,
  Mail,
  Bell,
  BellOff,
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Settings,
  Globe,
  Tag,
  BookOpen,
  FileCheck,
  CreditCard,
  Cake,
  User,
  ShieldCheck,
  CalendarDays,
  List as ListIcon,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  useImportantDates,
  EventItem,
  EventCategory,
  EVENT_CATEGORIES,
  ReminderType,
} from '../context/ImportantDatesContext';
import { useAuth } from '../context/AuthContext';

export const ImportantDatesView: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    events,
    preferences,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleComplete,
    updatePreferences,
  } = useImportantDates();

  // Layout & Navigation State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'today' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'soonest' | 'latest' | 'title-asc'>('soonest');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<EventItem | null>(null);

  // Form State for Add / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('Exams');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formLocation, setFormLocation] = useState('');
  const [formTimezone, setFormTimezone] = useState(preferences.preferred_timezone || 'UTC');
  const [formEmailEnabled, setFormEmailEnabled] = useState(true);
  const [formReminderTypes, setFormReminderTypes] = useState<ReminderType[]>(['1_day', 'on_date']);
  const [formCustomHours, setFormCustomHours] = useState<number>(2);

  // Preferences Form State
  const [prefEmailEnabled, setPrefEmailEnabled] = useState(preferences.email_notifications_enabled);
  const [prefDefaultTypes, setPrefDefaultTypes] = useState<ReminderType[]>(preferences.default_reminder_types);
  const [prefTimezone, setPrefTimezone] = useState(preferences.preferred_timezone);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const studentEmail = profile?.email || user?.email || 'student@university.edu';

  // Category Icon & Color Mapping
  const getCategoryTheme = (cat: EventCategory) => {
    switch (cat) {
      case 'Exams':
        return {
          icon: BookOpen,
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
          badge: 'bg-rose-100 text-rose-800',
        };
      case 'Assignments':
        return {
          icon: Tag,
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
          badge: 'bg-amber-100 text-amber-800',
        };
      case 'Project Deadlines':
        return {
          icon: CalendarIcon,
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          dot: 'bg-purple-500',
          badge: 'bg-purple-100 text-purple-800',
        };
      case 'Certificate Renewals':
        return {
          icon: FileCheck,
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-100 text-emerald-800',
        };
      case 'Fees':
        return {
          icon: CreditCard,
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-800',
        };
      case 'Birthdays':
        return {
          icon: Cake,
          bg: 'bg-pink-50',
          text: 'text-pink-700',
          border: 'border-pink-200',
          dot: 'bg-pink-500',
          badge: 'bg-pink-100 text-pink-800',
        };
      case 'Personal Events':
      default:
        return {
          icon: User,
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-500',
          badge: 'bg-slate-100 text-slate-800',
        };
    }
  };

  // Helper to open Add modal
  const handleOpenAddModal = (presetDate?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Exams');
    setFormDate(presetDate || new Date().toISOString().split('T')[0]);
    setFormTime('09:00');
    setFormLocation('');
    setFormTimezone(preferences.preferred_timezone || 'UTC');
    setFormEmailEnabled(preferences.email_notifications_enabled);
    setFormReminderTypes(preferences.default_reminder_types.length > 0 ? preferences.default_reminder_types : ['1_day', 'on_date']);
    setFormCustomHours(2);
    setShowAddModal(true);
  };

  // Helper to open Edit modal
  const handleOpenEditModal = (evt: EventItem) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDescription(evt.description || '');
    setFormCategory(evt.category);
    setFormDate(evt.event_date);
    setFormTime(evt.event_time.substring(0, 5));
    setFormLocation(evt.location || '');
    setFormTimezone(evt.timezone || 'UTC');
    setFormEmailEnabled(evt.email_reminders_enabled);

    const activeReminderTypes: ReminderType[] = evt.reminders
      ? (evt.reminders.map((r) => r.reminder_type) as ReminderType[])
      : ['1_day', 'on_date'];
    setFormReminderTypes(activeReminderTypes.length > 0 ? activeReminderTypes : ['1_day']);

    const customRem = evt.reminders?.find((r) => r.reminder_type === 'custom');
    setFormCustomHours(customRem?.custom_hours_before || 2);
    setShowAddModal(true);
  };

  // Save Event Handler (Add or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    if (editingEvent) {
      await updateEvent(
        editingEvent.id,
        {
          title: formTitle,
          description: formDescription,
          category: formCategory,
          event_date: formDate,
          event_time: formTime.length === 5 ? `${formTime}:00` : formTime,
          location: formLocation,
          timezone: formTimezone,
          email_reminders_enabled: formEmailEnabled,
        },
        formEmailEnabled ? formReminderTypes : [],
        formCustomHours
      );
      showToast(`Updated "${formTitle}" successfully.`);
    } else {
      await addEvent(
        {
          title: formTitle,
          description: formDescription,
          category: formCategory,
          event_date: formDate,
          event_time: formTime.length === 5 ? `${formTime}:00` : formTime,
          location: formLocation,
          timezone: formTimezone,
          email_reminders_enabled: formEmailEnabled,
        },
        formEmailEnabled ? formReminderTypes : [],
        formCustomHours
      );
      showToast(`Added event "${formTitle}" with scheduled email reminders.`);
    }

    setShowAddModal(false);
  };

  // Save Preferences Handler
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePreferences({
      email_notifications_enabled: prefEmailEnabled,
      default_reminder_types: prefDefaultTypes,
      preferred_timezone: prefTimezone,
    });
    showToast('Email reminder preferences saved.');
    setShowPrefsModal(false);
  };

  // Toggle Reminder Type checkbox
  const toggleReminderType = (type: ReminderType) => {
    if (formReminderTypes.includes(type)) {
      setFormReminderTypes(formReminderTypes.filter((t) => t !== type));
    } else {
      setFormReminderTypes([...formReminderTypes, type]);
    }
  };

  const togglePrefReminderType = (type: ReminderType) => {
    if (prefDefaultTypes.includes(type)) {
      setPrefDefaultTypes(prefDefaultTypes.filter((t) => t !== type));
    } else {
      setPrefDefaultTypes([...prefDefaultTypes, type]);
    }
  };

  // Relative Date Calculator
  const getRelativeDateInfo = (eventDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = eventDateStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);

    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false, isSoon: false };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', isOverdue: false, isToday: true, isSoon: true };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', isOverdue: false, isToday: false, isSoon: true };
    }
    if (diffDays <= 7) {
      return { text: `In ${diffDays} days`, isOverdue: false, isToday: false, isSoon: true };
    }
    return { text: `In ${diffDays} days`, isOverdue: false, isToday: false, isSoon: false };
  };

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return events
      .filter((evt) => {
        // Category
        if (selectedCategory !== 'All' && evt.category !== selectedCategory) return false;

        // Status
        if (statusFilter === 'completed' && !evt.is_completed) return false;
        if (statusFilter === 'today' && evt.event_date !== todayStr) return false;
        if (statusFilter === 'upcoming') {
          if (evt.is_completed || evt.event_date < todayStr) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = evt.title.toLowerCase().includes(q);
          const matchDesc = evt.description?.toLowerCase().includes(q) || false;
          const matchLoc = evt.location?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchDesc && !matchLoc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'soonest') {
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        }
        if (sortBy === 'latest') {
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        }
        if (sortBy === 'title-asc') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [events, selectedCategory, statusFilter, searchQuery, sortBy]);

  // Calendar Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: EventItem[];
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: events.filter((e) => e.event_date === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: events.filter((e) => e.event_date === dateStr),
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells && days.length < 42; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: events.filter((e) => e.event_date === dateStr),
      });
    }

    return days;
  }, [currentMonth, events]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white border border-royal-500/60 shadow-2xl rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-royal-50 text-royal-600 rounded-xl border border-royal-100">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">
                  Important Dates & Email Reminders
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-royal-100 text-royal-800 border border-royal-200">
                  {events.filter((e) => !e.is_completed).length} Pending
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Track examination dates, deadlines, and receive automated email reminders to your verified inbox.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
          {/* Reminder Preferences Button */}
          <button
            onClick={() => {
              setPrefEmailEnabled(preferences.email_notifications_enabled);
              setPrefDefaultTypes(preferences.default_reminder_types);
              setPrefTimezone(preferences.preferred_timezone);
              setShowPrefsModal(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 border border-slate-200"
            title="Configure Email Reminder Preferences"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Email Preferences</span>
          </button>

          {/* Add Date Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-royal-600 hover:bg-royal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Important Date</span>
          </button>
        </div>
      </div>

      {/* 2. REAL EMAIL NOTIFICATION BADGE & TIMEZONE BANNER */}
      <div className="bg-gradient-to-r from-royal-950 via-slate-900 to-navy-950 text-white rounded-2xl p-5 border border-royal-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-royal-500/20 text-royal-400 border border-royal-500/30 flex-shrink-0 mt-0.5 md:mt-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white">
                Automated Email Reminder Service
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active for {studentEmail}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Dispatches multi-interval reminder emails (7 days, 3 days, 1 day, or on event day) via Supabase Edge Function & Resend scheduler.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 whitespace-nowrap self-start md:self-center font-mono">
          <Globe className="w-3.5 h-3.5 text-royal-400" />
          <span>{preferences.preferred_timezone || 'UTC'}</span>
        </div>
      </div>

      {/* 3. CONTROLS: SEARCH, CATEGORIES, STATUS, SORT, AND VIEW TOGGLE */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dates by title, location, or notes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & View Layout Toggles */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Status Pills */}
            <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'upcoming' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('today')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'today' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'completed' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none font-medium cursor-pointer"
              >
                <option value="soonest">Due Date (Soonest)</option>
                <option value="latest">Due Date (Furthest)</option>
                <option value="title-asc">Title (A - Z)</option>
              </select>
            </div>

            {/* Calendar vs List Mode */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white shadow-xs text-royal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white shadow-xs text-royal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Calendar View"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none border-t border-slate-100 pt-3">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === 'All'
                ? 'bg-navy-950 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {events.length}
            </span>
          </button>

          {EVENT_CATEGORIES.map((cat) => {
            const count = events.filter((e) => e.category === cat).length;
            const theme = getCategoryTheme(cat);
            const Icon = theme.icon;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-royal-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA: CALENDAR OR LIST VIEW */}
      {viewMode === 'calendar' ? (
        /* ========================================================================= */
        /* CALENDAR VIEW */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-950">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Today
              </button>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={prevMonth}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 hover:bg-slate-100 text-slate-600"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 7 Days of Week Header */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 text-center font-bold text-xs text-slate-600 uppercase tracking-wider py-2 rounded-t-xl overflow-hidden">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenAddModal(day.dateStr)}
                className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group hover:border-royal-400 hover:shadow-xs ${
                  day.isToday
                    ? 'border-royal-500 bg-royal-50/30'
                    : day.isCurrentMonth
                    ? 'border-slate-200 bg-white hover:bg-slate-50/60'
                    : 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      day.isToday
                        ? 'bg-royal-600 text-white shadow-xs'
                        : 'text-slate-700 group-hover:text-royal-600'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Day's Event Badges */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {day.events.slice(0, 2).map((evt) => {
                    const theme = getCategoryTheme(evt.category);
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(evt);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 ${
                          evt.is_completed
                            ? 'line-through opacity-60 bg-slate-100 text-slate-500'
                            : `${theme.bg} ${theme.text} border ${theme.border}`
                        }`}
                        title={`${evt.title} (${evt.event_time})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} flex-shrink-0`}></span>
                        <span className="truncate">{evt.title}</span>
                      </div>
                    );
                  })}
                  {day.events.length > 2 && (
                    <div className="text-[9px] font-bold text-slate-400 pl-1">
                      +{day.events.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* LIST / CARD VIEW */
        /* ========================================================================= */
        filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const theme = getCategoryTheme(evt.category);
              const Icon = theme.icon;
              const rel = getRelativeDateInfo(evt.event_date);
              const hasReminders = evt.email_reminders_enabled && (evt.reminders?.length || 0) > 0;

              return (
                <div
                  key={evt.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    evt.is_completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-royal-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Completion Checkbox */}
                    <button
                      onClick={() => toggleComplete(evt.id)}
                      className="mt-1 text-slate-400 hover:text-royal-600 transition-colors flex-shrink-0"
                      title={evt.is_completed ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {evt.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-royal-500" />
                      )}
                    </button>

                    {/* Category Icon */}
                    <div className={`p-3 rounded-xl flex-shrink-0 ${theme.bg} ${theme.text} border ${theme.border}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}>
                          {evt.category}
                        </span>

                        {/* Relative Due Tag */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            evt.is_completed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : rel.isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : rel.isToday
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {evt.is_completed ? 'Completed' : rel.text}
                        </span>

                        {/* Email Reminder Indicator */}
                        {hasReminders ? (
                          <span className="text-[10px] text-royal-700 font-semibold flex items-center gap-1 bg-royal-50 border border-royal-200 px-2 py-0.5 rounded-full">
                            <Bell className="w-3 h-3 text-royal-600" />
                            <span>
                              {evt.reminders?.length} reminder{evt.reminders?.length === 1 ? '' : 's'} scheduled
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <BellOff className="w-3 h-3 text-slate-400" />
                            <span>Reminders off</span>
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm sm:text-base font-bold text-navy-950 truncate ${
                          evt.is_completed ? 'line-through text-slate-500' : ''
                        }`}
                        title={evt.title}
                      >
                        {evt.title}
                      </h3>

                      {evt.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      )}

                      {/* Date, Time & Location Metadata */}
                      <div className="pt-1 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">
                            {new Date(evt.event_date + 'T00:00:00Z').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.event_time.substring(0, 5)}</span>
                        </div>

                        {evt.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[200px]">{evt.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                    <button
                      onClick={() => handleOpenEditModal(evt)}
                      className="p-2 text-slate-400 hover:text-royal-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Event & Reminders"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmEvent(evt)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-royal-50 flex items-center justify-center text-royal-600">
              <CalendarDays className="w-8 h-8 text-royal-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-navy-950">
                {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
                  ? 'No Matching Events Found'
                  : 'No Important Dates Scheduled'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
                  ? 'Try clearing search keywords or resetting your category/status filters.'
                  : 'Stay ahead of your academic deadlines, examination periods, and scholarship dates with automated email reminders.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Important Date</span>
            </button>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EVENT MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 text-slate-800 shadow-2xl relative space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-royal-50 text-royal-600">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">
                  {editingEvent ? 'Edit Important Date' : 'Add New Important Date'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure event details and multi-interval email reminders.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Final Examination"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EventCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                  >
                    {EVENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location (Optional)</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Room 302, North Campus"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Notes</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Required documents, admit card, preparation notes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {/* EMAIL REMINDERS SECTION */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-royal-600" />
                    <span className="font-bold text-navy-950 text-xs">Email Reminders to Verified Address</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEmailEnabled}
                      onChange={(e) => setFormEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-royal-600"></div>
                  </label>
                </div>

                {formEmailEnabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500">
                      Select notifications to send to <strong>{studentEmail}</strong>:
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formReminderTypes.includes('7_days')}
                          onChange={() => toggleReminderType('7_days')}
                          className="rounded text-royal-600 focus:ring-royal-500"
                        />
                        <span className="font-medium text-slate-700">7 Days Before</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formReminderTypes.includes('3_days')}
                          onChange={() => toggleReminderType('3_days')}
                          className="rounded text-royal-600 focus:ring-royal-500"
                        />
                        <span className="font-medium text-slate-700">3 Days Before</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formReminderTypes.includes('1_day')}
                          onChange={() => toggleReminderType('1_day')}
                          className="rounded text-royal-600 focus:ring-royal-500"
                        />
                        <span className="font-medium text-slate-700">1 Day Before</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formReminderTypes.includes('on_date')}
                          onChange={() => toggleReminderType('on_date')}
                          className="rounded text-royal-600 focus:ring-royal-500"
                        />
                        <span className="font-medium text-slate-700">On Event Date (8 AM)</span>
                      </label>
                    </div>

                    <div className="pt-1 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formReminderTypes.includes('custom')}
                          onChange={() => toggleReminderType('custom')}
                          className="rounded text-royal-600 focus:ring-royal-500"
                        />
                        <span className="text-slate-700 font-medium">Custom Hours Before:</span>
                      </label>
                      {formReminderTypes.includes('custom') && (
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={formCustomHours}
                          onChange={(e) => setFormCustomHours(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-md transition-colors"
                >
                  {editingEvent ? 'Save Changes' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EMAIL PREFERENCES MODAL */}
      {/* ========================================================================= */}
      {showPrefsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-5 animate-scale-up">
            <button
              onClick={() => setShowPrefsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-royal-50 text-royal-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-950">Email Reminder Settings</h3>
                <p className="text-xs text-slate-500">Configure global dispatch preferences.</p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-950">Enable Email Reminders</p>
                  <p className="text-[11px] text-slate-500">Receive alerts at {studentEmail}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefEmailEnabled}
                    onChange={(e) => setPrefEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-royal-600"></div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Timezone</label>
                <select
                  value={prefTimezone}
                  onChange={(e) => setPrefTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London (GMT / BST)</option>
                  <option value="Europe/Paris">Paris, Berlin, Rome (CET)</option>
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="Asia/Singapore">Singapore, Hong Kong (SGT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Default Reminder Intervals</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={prefDefaultTypes.includes('7_days')}
                      onChange={() => togglePrefReminderType('7_days')}
                      className="rounded text-royal-600 focus:ring-royal-500"
                    />
                    <span className="text-slate-700 font-medium">7 Days Before Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={prefDefaultTypes.includes('3_days')}
                      onChange={() => togglePrefReminderType('3_days')}
                      className="rounded text-royal-600 focus:ring-royal-500"
                    />
                    <span className="text-slate-700 font-medium">3 Days Before Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={prefDefaultTypes.includes('1_day')}
                      onChange={() => togglePrefReminderType('1_day')}
                      className="rounded text-royal-600 focus:ring-royal-500"
                    />
                    <span className="text-slate-700 font-medium">1 Day Before Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={prefDefaultTypes.includes('on_date')}
                      onChange={() => togglePrefReminderType('on_date')}
                      className="rounded text-royal-600 focus:ring-royal-500"
                    />
                    <span className="text-slate-700 font-medium">On Event Date (08:00 AM)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrefsModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-md transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteConfirmEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Delete Important Date?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteConfirmEvent.title}"</strong>? Any scheduled email reminders for this date will be cancelled.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmEvent(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Keep Event
              </button>
              <button
                onClick={async () => {
                  await deleteEvent(deleteConfirmEvent.id);
                  showToast(`Deleted "${deleteConfirmEvent.title}".`);
                  setDeleteConfirmEvent(null);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportantDatesView;
