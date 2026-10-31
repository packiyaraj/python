import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  FileText,
  GraduationCap,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Bell,
  TrendingUp,
  Upload,
  Plus,
} from 'lucide-react'
import './App.css'

type Student = {
  role?: 'student'
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  department: string
  student_id: string
  avatar_url?: string | null
  status: string
}

type AdminSession = {
  role: 'admin'
  email: string
  name: string
}

type AdminOverview = {
  students: number
  courses: number
  enrollments: number
  assignments: number
  submissions: number
  attendance_records: number
  class_sessions: number
}

type AdminCourse = {
  id: number
  title: string
  code: string
  description: string
  instructor: string
  duration: string
  thumbnail_url: string
  modules_count: number
  lessons_count: number
  next_lesson: string
  category: string
}

type DashboardResponse = {
  student: {
    name: string
    department: string
    student_id: string
    avatar_url?: string | null
  }
  metrics: {
    total_enrolled_courses: number
    active_courses: number
    completed_courses: number
    pending_assignments: number
    attendance_percentage: number
    overall_progress: number
    total_learning_hours: number
    upcoming_classes: number
  }
}

type Course = {
  id: number
  title: string
  code: string
  description: string
  instructor: string
  duration: string
  thumbnail_url: string
  modules_count: number
  lessons_count: number
  next_lesson: string
  category: string
  progress: number
  completed_lessons: number
  total_lessons: number
  status: string
  last_accessed: string | null
}

type AttendanceData = {
  overall_percentage: number
  summary: {
    total_classes: number
    classes_attended: number
    classes_missed: number
    late_arrivals: number
  }
  history: {
    date: string
    course: string
    instructor: string
    status: string
    remarks: string | null
  }[]
}

type AssignmentItem = {
  id: number
  course_id: number
  course_name: string
  title: string
  description: string
  assigned_date: string
  due_date: string
  status: string
  marks?: string | null
  feedback?: string | null
}

type ProgressData = {
  overall_progress: number
  completed_modules: number
  remaining_lessons: number
  weekly_activity: { day: string; hours: number }[]
  total_learning_hours: number
  course_progress: { name: string; progress: number; completed: number; remaining: number }[]
}

type ClassItem = {
  id: number
  course_name: string
  instructor: string
  date: string
  start_time: string
  duration: string
  class_type: string
  meeting_link: string | null
}

type NotificationItem = {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const API_BASE = 'http://localhost:8000/api'
const DEMO_EMAIL = 'student@lms.com'
const DEMO_PASSWORD = 'Student@123'
type AccountRole = 'student' | 'admin'

const navItems = [
  'dashboard',
  'courses',
  'attendance',
  'assignments',
  'progress',
  'classes',
  'notifications',
] as const

type View = (typeof navItems)[number]

function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('lms-token') ?? '')
  const [userRole, setUserRole] = useState<AccountRole | null>(() => {
    const storedRole = localStorage.getItem('lms-role')
    return storedRole === 'admin' || storedRole === 'student' ? storedRole : null
  })
  const [authMode, setAuthMode] = useState<AccountRole>('student')
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL)
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD)
  const [student, setStudent] = useState<Student | null>(null)
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null)
  const [adminCourses, setAdminCourses] = useState<AdminCourse[]>([])
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [selectedView, setSelectedView] = useState<View>('dashboard')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const fetchStudentData = useCallback(async () => {
    if (!token) return
    const [dashboardData, courseData, attendanceData, assignmentData, progressData, classData, notificationData] = await Promise.all([
      fetchJson<DashboardResponse>(`${API_BASE}/dashboard`, token),
      fetchJson<Course[]>(`${API_BASE}/courses`, token),
      fetchJson<AttendanceData>(`${API_BASE}/attendance`, token),
      fetchJson<AssignmentItem[]>(`${API_BASE}/assignments`, token),
      fetchJson<ProgressData>(`${API_BASE}/progress`, token),
      fetchJson<ClassItem[]>(`${API_BASE}/classes`, token),
      fetchJson<NotificationItem[]>(`${API_BASE}/notifications`, token),
    ])
    setDashboard(dashboardData)
    setCourses(courseData)
    setAttendance(attendanceData)
    setAssignments(assignmentData)
    setProgress(progressData)
    setClasses(classData)
    setNotifications(notificationData)
  }, [token])

  useEffect(() => {
    if (!token) return
    localStorage.setItem('lms-token', token)
    let cancelled = false

    const loadPortalData = async () => {
      try {
        const session = await fetchJson<Student | AdminSession>(`${API_BASE}/auth/me`, token)
        if (cancelled) return

        if (session.role === 'admin') {
          setUserRole('admin')
          setAdmin(session)
          setStudent(null)
          const [overview, courseCatalog] = await Promise.all([
            fetchJson<AdminOverview>(`${API_BASE}/admin/overview`, token),
            fetchJson<AdminCourse[]>(`${API_BASE}/admin/courses`, token),
          ])
          if (cancelled) return
          setAdminOverview(overview)
          setAdminCourses(courseCatalog)
          return
        }

        setUserRole('student')
        setAdmin(null)
        setStudent(session)
        await fetchStudentData()
      } catch (error) {
        if (cancelled) return
        console.error(error)
        setAuthError('Session expired. Please log in again.')
        localStorage.removeItem('lms-token')
        localStorage.removeItem('lms-role')
        setToken('')
        setUserRole(null)
      }
    }

    void loadPortalData()
    return () => {
      cancelled = true
    }
  }, [fetchStudentData, token])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setAuthError('')
    try {
      const endpoint = authMode === 'admin' ? '/auth/admin/login' : '/auth/login'
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Unable to sign in')
      }

      const data = await response.json()
      setToken(data.access_token)
      setUserRole(authMode)
      localStorage.setItem('lms-token', data.access_token)
      localStorage.setItem('lms-role', authMode)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setToken('')
    setUserRole(null)
    setStudent(null)
    setAdmin(null)
    setAdminOverview(null)
    setAdminCourses([])
    setDashboard(null)
    setCourses([])
    setAttendance(null)
    setAssignments([])
    setProgress(null)
    setClasses([])
    setNotifications([])
    localStorage.removeItem('lms-token')
    localStorage.removeItem('lms-role')
  }

  const handleUpload = async (assignmentId: number, file: File) => {
    if (!token) return

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Upload failed')
    }

    await fetchStudentData()
  }

  const markNotificationRead = async (notificationId: number) => {
    if (!token) return
    await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)))
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-badge">L</div>
            <div>
              <p className="eyebrow">Learning System</p>
              <h1>Campus LMS</h1>
            </div>
          </div>
          <div className="auth-surface">
            <div className="auth-copy">
              <p className="eyebrow accent">{authMode === 'admin' ? 'Administrator Portal' : 'Student Portal'}</p>
              <h2>Welcome back</h2>
              <p>
                {authMode === 'admin'
                  ? 'Sign in to view and manage your learning system.'
                  : 'Track courses, assignments, attendance, and learning progress from one dashboard.'}
              </p>
            </div>
            <div className="auth-role-toggle" role="group" aria-label="Choose account type">
              <button
                type="button"
                className={authMode === 'student' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('student')
                  setLoginEmail(DEMO_EMAIL)
                  setLoginPassword(DEMO_PASSWORD)
                  setAuthError('')
                }}
              >
                Student
              </button>
              <button
                type="button"
                className={authMode === 'admin' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('admin')
                  setLoginEmail('')
                  setLoginPassword('')
                  setAuthError('')
                }}
              >
                Admin
              </button>
            </div>
            <form className="auth-form" onSubmit={(event) => void handleLogin(event)}>
              <label>
                Email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {authMode === 'student' ? (
                <div className="demo-box">
                  <p>Demo account</p>
                  <strong>{DEMO_EMAIL}</strong>
                  <span>{DEMO_PASSWORD}</span>
                </div>
              ) : (
                <p className="auth-hint">Admin credentials are configured in the backend environment.</p>
              )}
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : `Sign in as ${authMode}`}
              </button>
            </form>
            {authError ? <div className="error-box">{authError}</div> : null}
          </div>
        </div>
      </div>
    )
  }

  const currentStudent = student ?? {
    first_name: 'Student',
    last_name: 'User',
    department: 'Computer Science',
    student_id: 'CS-2048',
    avatar_url: null,
  }
  const isAdmin = userRole === 'admin'
  const isPortalLoading = Boolean(token && (isAdmin ? !adminOverview : !dashboard))
  const displayedNavItems: readonly View[] = isAdmin ? ['dashboard', 'courses'] : navItems

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-badge large">L</div>
          <div>
            <p className="eyebrow">Learning System</p>
            <h3>Campus LMS</h3>
          </div>
        </div>

        <nav className="nav-menu">
          {displayedNavItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${selectedView === item ? 'active' : ''}`}
              onClick={() => setSelectedView(item)}
            >
              {renderNavIcon(item)}
              <span>{labelize(item)}</span>
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <div className="avatar-ring">
            {!isAdmin && student?.avatar_url ? (
              <img src={student.avatar_url} alt="Student profile" />
            ) : (
              <CircleUserRound size={26} />
            )}
          </div>
          <div>
            <strong>
              {isAdmin ? admin?.name ?? 'Administrator' : `${currentStudent.first_name} ${currentStudent.last_name}`}
            </strong>
            <span>{isAdmin ? 'Administrator' : currentStudent.department}</span>
          </div>
        </div>

        <button className="ghost-button" onClick={handleLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow accent">{isAdmin ? 'Administration' : 'Overview'}</p>
            <h1>{isAdmin ? 'Admin dashboard' : 'Student dashboard'}</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <div className="mini-profile">
              <span>{isAdmin ? admin?.email ?? 'Admin' : currentStudent.student_id}</span>
            </div>
          </div>
        </header>

        {(loading || isPortalLoading) && !dashboard && !adminOverview ? <div className="loading-state">Loading your learning portal...</div> : null}

        {isAdmin ? (
          <>
            {selectedView === 'dashboard' ? <AdminDashboard overview={adminOverview} /> : null}
            {selectedView === 'courses' ? (
              <AdminCoursesView
                courses={adminCourses}
                token={token}
                onCourseCreated={(course) => {
                  setAdminCourses((current) => [course, ...current])
                  setAdminOverview((current) => current ? { ...current, courses: current.courses + 1 } : current)
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            {selectedView === 'dashboard' ? <DashboardView dashboard={dashboard} courses={courses} /> : null}
            {selectedView === 'courses' ? <CoursesView courses={courses} /> : null}
            {selectedView === 'attendance' ? <AttendanceView data={attendance} /> : null}
            {selectedView === 'assignments' ? <AssignmentsView assignments={assignments} token={token} onUpload={handleUpload} /> : null}
            {selectedView === 'progress' ? <ProgressView data={progress} /> : null}
            {selectedView === 'classes' ? <ClassesView items={classes} /> : null}
            {selectedView === 'notifications' ? <NotificationsView items={notifications} onMarkRead={markNotificationRead} /> : null}
          </>
        )}
      </main>
    </div>
  )
}

function AdminDashboard({ overview }: { overview: AdminOverview | null }) {
  if (!overview) return null

  const cards = [
    { label: 'Students', value: overview.students, icon: <GraduationCap size={18} />, tone: 'purple' },
    { label: 'Courses', value: overview.courses, icon: <BookOpen size={18} />, tone: 'blue' },
    { label: 'Enrollments', value: overview.enrollments, icon: <LayoutGrid size={18} />, tone: 'green' },
    { label: 'Assignments', value: overview.assignments, icon: <FileText size={18} />, tone: 'orange' },
    { label: 'Submissions', value: overview.submissions, icon: <Upload size={18} />, tone: 'purple' },
    { label: 'Attendance records', value: overview.attendance_records, icon: <CheckCircle2 size={18} />, tone: 'blue' },
    { label: 'Class sessions', value: overview.class_sessions, icon: <CalendarDays size={18} />, tone: 'green' },
  ]

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div>
          <p className="eyebrow">System overview</p>
          <h2>Welcome, administrator</h2>
          <p>Review the current activity and records across the learning platform.</p>
        </div>
      </section>
      <section className="metrics-grid">
        {cards.map((card) => (
          <div className={`metric-card ${card.tone}`} key={card.label}>
            <div className="metric-icon">{card.icon}</div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

type AdminCourseForm = Omit<AdminCourse, 'id'>

const emptyAdminCourse: AdminCourseForm = {
  title: '',
  code: '',
  description: '',
  instructor: '',
  duration: '',
  thumbnail_url: '',
  modules_count: 0,
  lessons_count: 0,
  next_lesson: '',
  category: 'Core',
}

function AdminCoursesView({
  courses,
  token,
  onCourseCreated,
}: {
  courses: AdminCourse[]
  token: string
  onCourseCreated: (course: AdminCourse) => void
}) {
  const [form, setForm] = useState<AdminCourseForm>(emptyAdminCourse)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const updateField = <K extends keyof AdminCourseForm>(field: K, value: AdminCourseForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submitCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setSuccessMessage('')
    try {
      const response = await fetch(`${API_BASE}/admin/courses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unable to create course.' }))
        throw new Error(error.detail || 'Unable to create course.')
      }

      const createdCourse = (await response.json()) as AdminCourse
      onCourseCreated(createdCourse)
      setForm(emptyAdminCourse)
      setSuccessMessage(`Course ${createdCourse.code} was added.`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create course.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow accent">Course management</p>
            <h2>Add a course</h2>
          </div>
        </div>
        <form className="admin-course-form" onSubmit={(event) => void submitCourse(event)}>
          <label>
            Course title
            <input maxLength={150} required value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label>
            Course code
            <input maxLength={50} required value={form.code} onChange={(event) => updateField('code', event.target.value)} />
          </label>
          <label>
            Instructor
            <input maxLength={150} required value={form.instructor} onChange={(event) => updateField('instructor', event.target.value)} />
          </label>
          <label>
            Duration
            <input maxLength={50} required placeholder="e.g. 8 weeks" value={form.duration} onChange={(event) => updateField('duration', event.target.value)} />
          </label>
          <label>
            Category
            <input maxLength={80} required value={form.category} onChange={(event) => updateField('category', event.target.value)} />
          </label>
          <label>
            Thumbnail image URL
            <input type="url" maxLength={255} required value={form.thumbnail_url} onChange={(event) => updateField('thumbnail_url', event.target.value)} />
          </label>
          <label>
            Number of modules
            <input type="number" min={0} required value={form.modules_count} onChange={(event) => updateField('modules_count', Number(event.target.value))} />
          </label>
          <label>
            Number of lessons
            <input type="number" min={0} required value={form.lessons_count} onChange={(event) => updateField('lessons_count', Number(event.target.value))} />
          </label>
          <label className="admin-course-wide">
            Next lesson
            <input maxLength={200} required value={form.next_lesson} onChange={(event) => updateField('next_lesson', event.target.value)} />
          </label>
          <label className="admin-course-wide">
            Description
            <textarea required rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
          </label>
          {formError ? <div className="error-box admin-course-wide">{formError}</div> : null}
          {successMessage ? <p className="success-message admin-course-wide">{successMessage}</p> : null}
          <button className="primary-button admin-course-wide" type="submit" disabled={saving}>
            <Plus size={16} />
            {saving ? 'Adding course...' : 'Add course'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header inline-header">
          <h2>Course catalog</h2>
          <span>{courses.length} courses</span>
        </div>
        {courses.length ? (
          <div className="admin-course-list">
            {courses.map((course) => (
              <article className="admin-course-item" key={course.id}>
                <div>
                  <strong>{course.title}</strong>
                  <span>{course.code} · {course.category} · {course.duration}</span>
                </div>
                <span>{course.instructor}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="auth-hint">No courses have been added yet.</p>
        )}
      </section>
    </div>
  )
}

function DashboardView({ dashboard, courses }: { dashboard: DashboardResponse | null; courses: Course[] }) {
  if (!dashboard) return null

  const cards = [
    { label: 'Total enrolled courses', value: dashboard.metrics.total_enrolled_courses, icon: <BookOpen size={18} />, tone: 'purple' },
    { label: 'Active courses', value: dashboard.metrics.active_courses, icon: <LayoutGrid size={18} />, tone: 'blue' },
    { label: 'Completed courses', value: dashboard.metrics.completed_courses, icon: <CheckCircle2 size={18} />, tone: 'green' },
    { label: 'Pending assignments', value: dashboard.metrics.pending_assignments, icon: <FileText size={18} />, tone: 'orange' },
  ]

  const trendData = [
    { name: 'Mon', value: 40 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 49 },
    { name: 'Thu', value: 68 },
    { name: 'Fri', value: 81 },
    { name: 'Sat', value: 74 },
    { name: 'Sun', value: 89 },
  ]

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>{dashboard.student.name}</h2>
          <p>
            Your learning momentum is strong this week. {dashboard.metrics.overall_progress}% of your goals are on track.
          </p>
        </div>
        <div className="banner-stat">
          <span>Attendance</span>
          <strong>{dashboard.metrics.attendance_percentage}%</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {cards.map((card) => (
          <div key={card.label} className={`metric-card ${card.tone}`}>
            <div className="metric-icon">{card.icon}</div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="two-column-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Learning progress</h3>
            <span>{dashboard.metrics.overall_progress}%</span>
          </div>
          <div className="progress-bar track">
            <span style={{ width: `${dashboard.metrics.overall_progress}%` }} />
          </div>
          <div className="stat-row">
            <div>
              <strong>{dashboard.metrics.total_learning_hours}h</strong>
              <span>Learning hours</span>
            </div>
            <div>
              <strong>{dashboard.metrics.upcoming_classes}</strong>
              <span>Upcoming classes</span>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fillGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" fill="url(#fillGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Current focus</h3>
            <span>3 courses</span>
          </div>
          <div className="course-list compact">
            {courses.slice(0, 3).map((course) => (
              <div key={course.id} className="course-mini-item">
                <img src={course.thumbnail_url} alt={course.title} />
                <div>
                  <strong>{course.title}</strong>
                  <span>{course.instructor}</span>
                </div>
                <div className="pill-value">{course.progress}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function CoursesView({ courses }: { courses: Course[] }) {
  return (
    <div className="page-stack">
      <div className="panel-header inline-header">
        <h2>My Courses</h2>
        <div className="segmented-control">
          <button type="button" className="selected">All</button>
          <button type="button">In Progress</button>
          <button type="button">Completed</button>
        </div>
      </div>

      <div className="courses-grid">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <img src={course.thumbnail_url} alt={course.title} />
            <div className="course-body">
              <div className="course-meta">
                <span>{course.category}</span>
                <span>{course.duration}</span>
              </div>
              <h3>{course.title}</h3>
              <p>{course.description}</p>

              <div className="info-line">
                <span>{course.instructor}</span>
                <span>{course.modules_count} modules</span>
              </div>

              <div className="lesson-stats">
                <span>{course.completed_lessons}/{course.total_lessons} lessons</span>
                <strong>{course.progress}%</strong>
              </div>
              <div className="progress-bar track small">
                <span style={{ width: `${course.progress}%` }} />
              </div>
              <div className="course-actions">
                <button type="button" className="secondary-button">Continue</button>
                <button type="button" className="text-link">Next lesson <ArrowRight size={16} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function AttendanceView({ data }: { data: AttendanceData | null }) {
  if (!data) return null

  const chartData = [
    { name: 'Present', value: data.summary.classes_attended },
    { name: 'Late', value: data.summary.late_arrivals },
    { name: 'Missed', value: data.summary.classes_missed },
  ]

  return (
    <div className="page-stack">
      <section className="summary-cards attendance-summary">
        <div className="summary-box">
          <span>Overall attendance</span>
          <strong>{data.overall_percentage}%</strong>
        </div>
        <div className="summary-box">
          <span>Total classes</span>
          <strong>{data.summary.total_classes}</strong>
        </div>
        <div className="summary-box">
          <span>Attended</span>
          <strong>{data.summary.classes_attended}</strong>
        </div>
        <div className="summary-box">
          <span>Missed</span>
          <strong>{data.summary.classes_missed}</strong>
        </div>
      </section>

      <div className="two-column-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Attendance trend</h3>
          </div>
          <div className="chart-box small-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Attendance summary</h3>
          </div>
          <ul className="detail-list">
            <li><span>Total classes</span><strong>{data.summary.total_classes}</strong></li>
            <li><span>Classes attended</span><strong>{data.summary.classes_attended}</strong></li>
            <li><span>Classes missed</span><strong>{data.summary.classes_missed}</strong></li>
            <li><span>Late arrivals</span><strong>{data.summary.late_arrivals}</strong></li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Attendance history</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Course</th>
              <th>Instructor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((row) => (
              <tr key={`${row.date}-${row.course}`}>
                <td>{new Date(row.date).toLocaleDateString()}</td>
                <td>{row.course}</td>
                <td>{row.instructor}</td>
                <td><span className={`status-badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssignmentsView({ assignments, token, onUpload }: { assignments: AssignmentItem[]; token: string; onUpload: (assignmentId: number, file: File) => Promise<void> }) {
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const uploadReady = Boolean(token)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, assignmentId: number) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploadingId(assignmentId)
      setError('')
      await onUpload(assignmentId, file)
      event.target.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="page-stack">
      <div className="panel-header inline-header">
        <h2>Assignments</h2>
        <span>{assignments.length} items</span>
      </div>
      {error ? <div className="error-box">{error}</div> : null}

      <div className="assignment-list">
        {assignments.map((assignment) => (
          <article key={assignment.id} className="assignment-card">
            <div className="assignment-head">
              <div>
                <p className="eyebrow">{assignment.course_name}</p>
                <h3>{assignment.title}</h3>
              </div>
              <span className={`status-badge ${assignment.status.toLowerCase()}`}>{assignment.status}</span>
            </div>
            <p>{assignment.description}</p>
            <div className="assignment-meta">
              <span>Assigned {new Date(assignment.assigned_date).toLocaleDateString()}</span>
              <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
            </div>
            {assignment.marks ? <div className="grade-pill">Grade: {assignment.marks}</div> : null}
            {assignment.feedback ? <div className="feedback-box">{assignment.feedback}</div> : null}

            <div className="assignment-footer">
              <label className={`upload-button ${uploadReady ? '' : 'disabled'}`} aria-disabled={!uploadReady}>
                <Upload size={15} />
                <span>{uploadingId === assignment.id ? 'Uploading...' : 'Upload file'}</span>
                <input type="file" onChange={(event) => void handleFileChange(event, assignment.id)} disabled={!uploadReady} />
              </label>
              <button type="button" className="secondary-button">View details</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ProgressView({ data }: { data: ProgressData | null }) {
  if (!data) return null

  return (
    <div className="page-stack">
      <section className="summary-cards progress-summary">
        <div className="summary-box">
          <span>Overall progress</span>
          <strong>{data.overall_progress}%</strong>
        </div>
        <div className="summary-box">
          <span>Completed modules</span>
          <strong>{data.completed_modules}</strong>
        </div>
        <div className="summary-box">
          <span>Remaining lessons</span>
          <strong>{data.remaining_lessons}</strong>
        </div>
        <div className="summary-box">
          <span>Hours learned</span>
          <strong>{data.total_learning_hours}h</strong>
        </div>
      </section>

      <div className="two-column-layout">
        <div className="panel">
          <div className="panel-header">
            <h3>Weekly learning activity</h3>
          </div>
          <div className="chart-box small-chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.weekly_activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fill="#ddd6fe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Course-wise progress</h3>
          </div>
          <div className="progress-list">
            {data.course_progress.map((course) => (
              <div key={course.name} className="progress-row">
                <div className="row-head">
                  <span>{course.name}</span>
                  <strong>{course.progress}%</strong>
                </div>
                <div className="progress-bar track small">
                  <span style={{ width: `${course.progress}%` }} />
                </div>
                <small>{course.completed} completed • {course.remaining} remaining</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClassesView({ items }: { items: ClassItem[] }) {
  return (
    <div className="page-stack">
      <div className="panel-header inline-header">
        <h2>Upcoming Classes</h2>
        <span>{items.length} scheduled</span>
      </div>
      <div className="class-list">
        {items.map((item) => (
          <article key={item.id} className="class-card">
            <div>
              <p className="eyebrow">{item.class_type}</p>
              <h3>{item.course_name}</h3>
            </div>
            <div className="class-meta">
              <span><CalendarDays size={14} /> {new Date(item.date).toLocaleDateString()}</span>
              <span><GraduationCap size={14} /> {item.instructor}</span>
              <span><TrendingUp size={14} /> {item.start_time} • {item.duration}</span>
            </div>
            {item.meeting_link ? (
              <a href={item.meeting_link} className="primary-button compact" target="_blank" rel="noreferrer">
                Join class
              </a>
            ) : (
              <button type="button" className="secondary-button" disabled>Class room only</button>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function NotificationsView({ items, onMarkRead }: { items: NotificationItem[]; onMarkRead: (notificationId: number) => Promise<void> }) {
  return (
    <div className="page-stack">
      <div className="panel-header inline-header">
        <h2>Notifications</h2>
        <span>{items.filter((item) => !item.is_read).length} unread</span>
      </div>
      <div className="notifications-list">
        {items.map((item) => (
          <div key={item.id} className={`notification-item ${item.is_read ? 'read' : 'unread'}`}>
            <div className="notification-icon"><MessageSquareText size={16} /></div>
            <div className="notification-content">
              <div className="row-head">
                <strong>{item.title}</strong>
                {!item.is_read ? <span className="pill-dot" /> : null}
              </div>
              <p>{item.message}</p>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
            {!item.is_read ? (
              <button type="button" className="secondary-button" onClick={() => void onMarkRead(item.id)}>
                Mark read
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function renderNavIcon(item: string) {
  switch (item) {
    case 'dashboard':
      return <LayoutGrid size={16} />
    case 'courses':
      return <BookOpen size={16} />
    case 'attendance':
      return <CheckCircle2 size={16} />
    case 'assignments':
      return <FileText size={16} />
    case 'progress':
      return <TrendingUp size={16} />
    case 'classes':
      return <CalendarDays size={16} />
    case 'notifications':
      return <Bell size={16} />
    default:
      return <LayoutGrid size={16} />
  }
}

function labelize(value: string) {
  return value.replace(/(^\w|[-\s]\w)/g, (part) => part.toUpperCase())
}

export default App
