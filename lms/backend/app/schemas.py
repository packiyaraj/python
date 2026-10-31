from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class StudentCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    phone: str | None = None
    department: str
    student_id: str


class StudentLogin(BaseModel):
    email: EmailStr
    password: str


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminPublic(BaseModel):
    email: EmailStr
    name: str
    role: Literal["admin"] = "admin"


class AdminOverview(BaseModel):
    students: int
    courses: int
    enrollments: int
    assignments: int
    submissions: int
    attendance_records: int
    class_sessions: int


class AdminCourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1)
    instructor: str = Field(min_length=1, max_length=150)
    duration: str = Field(min_length=1, max_length=50)
    thumbnail_url: str = Field(min_length=1, max_length=255)
    modules_count: int = Field(default=0, ge=0)
    lessons_count: int = Field(default=0, ge=0)
    next_lesson: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Core", min_length=1, max_length=80)


class AdminCourseOut(BaseModel):
    id: int
    title: str
    code: str
    description: str
    instructor: str
    duration: str
    thumbnail_url: str
    modules_count: int
    lessons_count: int
    next_lesson: str
    category: str

    class Config:
        from_attributes = True


class StudentPublic(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    department: str
    student_id: str
    avatar_url: str | None = None
    status: str = "active"
    role: Literal["student"] = "student"

    class Config:
        from_attributes = True


class CourseOut(BaseModel):
    id: int
    title: str
    code: str
    description: str
    instructor: str
    duration: str
    thumbnail_url: str
    modules_count: int
    lessons_count: int
    next_lesson: str
    category: str
    progress: int = 0
    completed_lessons: int = 0
    total_lessons: int = 0
    status: str = "In Progress"
    last_accessed: str | None = None

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: str
    assigned_date: date
    due_date: date
    status: str
    marks: str | None = None
    feedback: str | None = None
    course_name: str | None = None

    class Config:
        from_attributes = True


class AttendanceItem(BaseModel):
    date: date
    course: str
    instructor: str
    status: str
    remarks: str | None = None


class DashboardMetrics(BaseModel):
    total_enrolled_courses: int
    active_courses: int
    completed_courses: int
    pending_assignments: int
    attendance_percentage: int
    overall_progress: int
    total_learning_hours: int
    upcoming_classes: int


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
