import os
import hmac
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import create_access_token, decode_access_token_claims, hash_password, verify_password
from app.database import Base, engine, get_db
from app.models import (
    Assignment,
    AttendanceRecord,
    ClassSession,
    Course,
    Enrollment,
    Notification,
    Student,
    Submission,
)
from app.schemas import AdminCourseCreate, AdminCourseOut, AdminLogin, AdminOverview, AdminPublic, AssignmentOut, AttendanceItem, DashboardMetrics, NotificationOut, StudentCreate, StudentLogin, StudentPublic, TokenResponse

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

Base.metadata.create_all(bind=engine)


def seed_demo_data(db: Session) -> None:
    existing = db.query(Student).filter(Student.email == "student@lms.com").first()
    if existing:
        return

    student = Student(
        email="student@lms.com",
        password_hash=hash_password("Student@123"),
        first_name="Maya",
        last_name="Patel",
        phone="+1 (415) 555-0148",
        department="Computer Science",
        student_id="CS-2048",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    )
    db.add(student)
    db.flush()

    courses = [
        Course(
            title="Web Development Foundations",
            code="WD101",
            description="Build responsive interfaces and modern front-end systems with production-ready patterns.",
            instructor="Prof. Daniel Brooks",
            duration="8 weeks",
            thumbnail_url="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
            modules_count=10,
            lessons_count=26,
            next_lesson="Responsive Layout Lab",
            category="Development",
        ),
        Course(
            title="Data Science Essentials",
            code="DS201",
            description="Learn data exploration, Python automation, analytics, and forecasting techniques for real-world insights.",
            instructor="Dr. Rachel Nguyen",
            duration="10 weeks",
            thumbnail_url="https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80",
            modules_count=12,
            lessons_count=32,
            next_lesson="Feature Engineering Workshop",
            category="Analytics",
        ),
        Course(
            title="UX Research & Design Systems",
            code="UX301",
            description="Design intuitive product experiences through user research, prototyping, and scalable design systems.",
            instructor="Ms. Aisha Morgan",
            duration="6 weeks",
            thumbnail_url="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
            modules_count=8,
            lessons_count=22,
            next_lesson="Accessibility Review",
            category="Design",
        ),
    ]
    db.add_all(courses)
    db.flush()

    enrollments = [
        Enrollment(student_id=student.id, course_id=courses[0].id, progress=82, completed_lessons=21, total_lessons=26, status="In Progress", last_accessed="Today"),
        Enrollment(student_id=student.id, course_id=courses[1].id, progress=67, completed_lessons=22, total_lessons=32, status="In Progress", last_accessed="2 days ago"),
        Enrollment(student_id=student.id, course_id=courses[2].id, progress=100, completed_lessons=22, total_lessons=22, status="Completed", last_accessed="Last week"),
    ]
    db.add_all(enrollments)
    db.flush()

    assignment_dates = [
        (courses[0].id, "Responsive Landing Page", "Create a conversion-ready landing page using modern layout principles and responsive sizing.", "2026-10-01", "2026-10-10", "pending", None, None),
        (courses[1].id, "Predictive Analytics Report", "Analyze the provided dataset and summarize a predictive model with recommendations.", "2026-09-25", "2026-10-08", "submitted", "92/100", "Strong analysis and clean visual storytelling."),
        (courses[2].id, "UX Interview Summary", "Capture findings from the usability interviews and propose a design change list.", "2026-09-28", "2026-10-06", "graded", "88/100", "Excellent synthesis and actionable insight."),
    ]

    for course_id, title, description, assigned_date, due_date, status, marks, feedback in assignment_dates:
        db.add(
            Assignment(
                course_id=course_id,
                title=title,
                description=description,
                assigned_date=datetime.strptime(assigned_date, "%Y-%m-%d").date(),
                due_date=datetime.strptime(due_date, "%Y-%m-%d").date(),
                status=status,
                marks=marks,
                feedback=feedback,
            )
        )
    db.flush()

    attendance_rows = [
        (courses[0].id, "2026-10-04", "Present", "Prof. Daniel Brooks", "On time and engaged."),
        (courses[0].id, "2026-10-06", "Late", "Prof. Daniel Brooks", "Arrived 8 minutes late."),
        (courses[0].id, "2026-10-09", "Present", "Prof. Daniel Brooks", "Completed activity set."),
        (courses[1].id, "2026-10-03", "Present", "Dr. Rachel Nguyen", "Strong participation."),
        (courses[1].id, "2026-10-07", "Absent", "Dr. Rachel Nguyen", "Missed due to illness."),
        (courses[2].id, "2026-09-30", "Present", "Ms. Aisha Morgan", "Excellent feedback during critique."),
    ]

    for course_id, date_value, status, instructor, remarks in attendance_rows:
        db.add(
            AttendanceRecord(
                student_id=student.id,
                course_id=course_id,
                date=datetime.strptime(date_value, "%Y-%m-%d").date(),
                status=status,
                instructor=instructor,
                remarks=remarks,
            )
        )

    class_sessions = [
        ClassSession(
            course_id=courses[0].id,
            title="Frontend Systems Workshop",
            instructor="Prof. Daniel Brooks",
            date=datetime.strptime("2026-11-05", "%Y-%m-%d").date(),
            start_time="09:00 AM",
            duration="90 min",
            session_type="Virtual",
            meeting_link="https://meet.google.com/xyz-abc-def",
            status="scheduled",
        ),
        ClassSession(
            course_id=courses[1].id,
            title="Python Data Lab",
            instructor="Dr. Rachel Nguyen",
            date=datetime.strptime("2026-11-06", "%Y-%m-%d").date(),
            start_time="11:30 AM",
            duration="60 min",
            session_type="Hybrid",
            meeting_link="https://meet.google.com/abc-def-ghi",
            status="scheduled",
        ),
        ClassSession(
            course_id=courses[2].id,
            title="Prototype Critique",
            instructor="Ms. Aisha Morgan",
            date=datetime.strptime("2026-11-07", "%Y-%m-%d").date(),
            start_time="02:00 PM",
            duration="75 min",
            session_type="Live",
            meeting_link=None,
            status="scheduled",
        ),
    ]
    db.add_all(class_sessions)

    db.add_all(
        [
            Notification(
                student_id=student.id,
                title="New assignment released",
                message="A new responsive design challenge was published in Web Development Foundations.",
                type="assignment",
                is_read=False,
                created_at=datetime.utcnow() - timedelta(days=1),
            ),
            Notification(
                student_id=student.id,
                title="Class reminder",
                message="Your Product Design workshop starts tomorrow at 2:00 PM.",
                type="class",
                is_read=False,
                created_at=datetime.utcnow() - timedelta(hours=4),
            ),
            Notification(
                student_id=student.id,
                title="Grade published",
                message="Your UX Interview Summary has been graded and feedback is ready.",
                type="grade",
                is_read=True,
                created_at=datetime.utcnow() - timedelta(days=3),
            ),
        ]
    )

    db.commit()


@app.on_event("startup")
def startup_event() -> None:
    db = SessionLocal = next(get_db())
    try:
        seed_demo_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> Student:
    token = credentials.credentials
    try:
        claims = decode_access_token_claims(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if claims.get("role", "student") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")

    email = claims["sub"]
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found")
    return student


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AdminPublic:
    try:
        claims = decode_access_token_claims(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if claims.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    return AdminPublic(email=claims["sub"], name="LMS Administrator")


@app.post("/api/auth/register", response_model=TokenResponse)
def register_student(payload: StudentCreate, db: Session = Depends(get_db)) -> TokenResponse:
    if db.query(Student).filter(Student.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Student already exists")

    if db.query(Student).filter(Student.student_id == payload.student_id).first():
        raise HTTPException(status_code=400, detail="Student ID already registered")

    student = Student(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        department=payload.department,
        student_id=payload.student_id,
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    token = create_access_token(student.email, role="student")
    return TokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=TokenResponse)
def login_student(payload: StudentLogin, db: Session = Depends(get_db)) -> TokenResponse:
    student = db.query(Student).filter(Student.email == str(payload.email)).first()
    if not student or not verify_password(payload.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(student.email, role="student")
    return TokenResponse(access_token=token)


@app.post("/api/auth/admin/login", response_model=TokenResponse)
def login_admin(payload: AdminLogin) -> TokenResponse:
    if not settings.admin_email or not settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD.",
        )

    email_matches = hmac.compare_digest(
        str(payload.email).lower().encode("utf-8"),
        settings.admin_email.strip().lower().encode("utf-8"),
    )
    password_matches = hmac.compare_digest(
        payload.password.encode("utf-8"),
        settings.admin_password.encode("utf-8"),
    )
    if not (email_matches & password_matches):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return TokenResponse(access_token=create_access_token(str(payload.email), role="admin"))


@app.get("/api/auth/me", response_model=StudentPublic | AdminPublic)
def get_authenticated_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Student | AdminPublic:
    try:
        claims = decode_access_token_claims(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if claims.get("role") == "admin":
        return AdminPublic(email=claims["sub"], name="LMS Administrator")

    if claims.get("role", "student") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unsupported account role")

    current_student = db.query(Student).filter(Student.email == claims["sub"]).first()
    if not current_student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found")
    return current_student


@app.get("/api/admin/overview", response_model=AdminOverview)
def get_admin_overview(
    current_admin: AdminPublic = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOverview:
    return AdminOverview(
        students=db.query(Student).count(),
        courses=db.query(Course).count(),
        enrollments=db.query(Enrollment).count(),
        assignments=db.query(Assignment).count(),
        submissions=db.query(Submission).count(),
        attendance_records=db.query(AttendanceRecord).count(),
        class_sessions=db.query(ClassSession).count(),
    )


@app.get("/api/admin/courses", response_model=list[AdminCourseOut])
def get_admin_courses(
    current_admin: AdminPublic = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Course]:
    return db.query(Course).order_by(Course.id.desc()).all()


@app.post("/api/admin/courses", response_model=AdminCourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: AdminCourseCreate,
    current_admin: AdminPublic = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Course:
    course_code = payload.code.strip()
    if db.query(Course).filter(func.lower(Course.code) == course_code.lower()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A course with this code already exists.")

    course = Course(
        title=payload.title.strip(),
        code=course_code,
        description=payload.description.strip(),
        instructor=payload.instructor.strip(),
        duration=payload.duration.strip(),
        thumbnail_url=payload.thumbnail_url.strip(),
        modules_count=payload.modules_count,
        lessons_count=payload.lessons_count,
        next_lesson=payload.next_lesson.strip(),
        category=payload.category.strip(),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@app.get("/api/dashboard")
def get_dashboard(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> dict:
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_student.id).all()
    assignments = db.query(Assignment).join(Course).filter(Enrollment.student_id == current_student.id).all()
    attendance = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == current_student.id).all()
    attendance_total = len(attendance)
    attendance_present = sum(1 for record in attendance if record.status.lower() == "present")
    attendance_percentage = round((attendance_present / attendance_total) * 100) if attendance_total else 0

    total_enrolled = len(enrollments)
    active_courses = sum(1 for item in enrollments if item.status.lower() == "in progress")
    completed_courses = sum(1 for item in enrollments if item.status.lower() == "completed")
    pending_assignments = sum(1 for item in assignments if item.status.lower() == "pending")
    overall_progress = round(sum(item.progress for item in enrollments) / total_enrolled) if total_enrolled else 0
    training_hours = 28 + (overall_progress * 2)
    upcoming_classes = db.query(ClassSession).join(Course).filter(Enrollment.student_id == current_student.id).count()

    return {
        "student": {
            "name": f"{current_student.first_name} {current_student.last_name}",
            "department": current_student.department,
            "student_id": current_student.student_id,
            "avatar_url": current_student.avatar_url,
        },
        "metrics": {
            "total_enrolled_courses": total_enrolled,
            "active_courses": active_courses,
            "completed_courses": completed_courses,
            "pending_assignments": pending_assignments,
            "attendance_percentage": attendance_percentage,
            "overall_progress": overall_progress,
            "total_learning_hours": training_hours,
            "upcoming_classes": upcoming_classes,
        },
    }


@app.get("/api/courses")
def get_courses(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(Course, Enrollment)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == current_student.id)
        .all()
    )

    data = []
    for course, enrollment in rows:
        data.append(
            {
                "id": course.id,
                "title": course.title,
                "code": course.code,
                "description": course.description,
                "instructor": course.instructor,
                "duration": course.duration,
                "thumbnail_url": course.thumbnail_url,
                "modules_count": course.modules_count,
                "lessons_count": course.lessons_count,
                "next_lesson": course.next_lesson,
                "category": course.category,
                "progress": enrollment.progress,
                "completed_lessons": enrollment.completed_lessons,
                "total_lessons": enrollment.total_lessons or course.lessons_count,
                "status": enrollment.status,
                "last_accessed": enrollment.last_accessed,
            }
        )
    return data


@app.get("/api/attendance")
def get_attendance(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> dict:
    records = db.query(AttendanceRecord, Course).join(Course, Course.id == AttendanceRecord.course_id).filter(AttendanceRecord.student_id == current_student.id).all()
    history = [
        {
            "date": record.date.isoformat(),
            "course": course.title,
            "instructor": record.instructor,
            "status": record.status,
            "remarks": record.remarks,
        }
        for record, course in records
    ]
    total = len(history)
    present = sum(1 for item in history if item["status"].lower() == "present")
    percentage = round((present / total) * 100) if total else 0

    return {
        "overall_percentage": percentage,
        "summary": {
            "total_classes": total,
            "classes_attended": present,
            "classes_missed": sum(1 for item in history if item["status"].lower() in {"absent", "late"}),
            "late_arrivals": sum(1 for item in history if item["status"].lower() == "late"),
        },
        "history": history,
    }


@app.get("/api/assignments")
def get_assignments(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> list[dict]:
    query = (
        db.query(Assignment, Course)
        .join(Course, Course.id == Assignment.course_id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == current_student.id)
        .all()
    )
    items = []
    for assignment, course in query:
        items.append(
            {
                "id": assignment.id,
                "course_id": assignment.course_id,
                "course_name": course.title,
                "title": assignment.title,
                "description": assignment.description,
                "assigned_date": assignment.assigned_date.isoformat(),
                "due_date": assignment.due_date.isoformat(),
                "status": assignment.status,
                "marks": assignment.marks,
                "feedback": assignment.feedback,
            }
        )
    return items


@app.get("/api/progress")
def get_progress(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> dict:
    rows = (
        db.query(Course, Enrollment)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == current_student.id)
        .all()
    )
    weekly_activity = [
        {"day": "Mon", "hours": 2.4},
        {"day": "Tue", "hours": 3.5},
        {"day": "Wed", "hours": 2.8},
        {"day": "Thu", "hours": 4.1},
        {"day": "Fri", "hours": 2.9},
        {"day": "Sat", "hours": 1.8},
        {"day": "Sun", "hours": 3.2},
    ]
    course_progress = [
        {"name": course.title, "progress": enrollment.progress, "completed": enrollment.completed_lessons, "remaining": max(enrollment.total_lessons - enrollment.completed_lessons, 0)}
        for course, enrollment in rows
    ]
    overall_progress = round(sum(item["progress"] for item in course_progress) / len(course_progress)) if course_progress else 0
    return {
        "overall_progress": overall_progress,
        "completed_modules": sum(1 for item in course_progress if item["progress"] >= 100),
        "remaining_lessons": sum(item["remaining"] for item in course_progress),
        "weekly_activity": weekly_activity,
        "total_learning_hours": 28 + (overall_progress * 2),
        "course_progress": course_progress,
    }


@app.get("/api/classes")
def get_classes(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(ClassSession, Course)
        .join(Course, Course.id == ClassSession.course_id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == current_student.id)
        .all()
    )
    return [
        {
            "id": session.id,
            "course_name": course.title,
            "instructor": session.instructor,
            "date": session.date.isoformat(),
            "start_time": session.start_time,
            "duration": session.duration,
            "class_type": session.session_type,
            "meeting_link": session.meeting_link,
        }
        for session, course in rows
    ]


@app.get("/api/notifications", response_model=list[NotificationOut])
def get_notifications(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.student_id == current_student.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)) -> dict:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.student_id == current_student.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"success": True, "message": "Notification marked as read"}


@app.post("/api/assignments/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> dict:
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    allowed_ext = {".pdf", ".doc", ".docx", ".pptx", ".zip"}
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if not file.size or file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be 10MB or smaller")

    upload_dir = Path("uploads/assignments")
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{current_student.id}_{assignment_id}_{file.filename}"
    file_path = upload_dir / safe_name
    contents = await file.read()
    file_path.write_bytes(contents)

    submission = Submission(
        assignment_id=assignment.id,
        student_id=current_student.id,
        file_name=file.filename or "assignment-file",
        file_path=str(file_path),
        status="submitted",
        submitted_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()

    return {"success": True, "message": "Assignment submitted successfully", "file_name": file.filename}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "LMS API is running"}
