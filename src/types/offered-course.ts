export interface OfferedCourse {
  id?: number;
  created_at?: string;
  title: string;
  image?: string;
  lecturers: string[];
  lecturers_details: string[];
  course_details: string[];
  quantity_of_lessons: string;
  quantity_of_students?: string;
  price: number;
  old_price?: number;
  syllabus_title: string[];
  syllabus_content: any; // JSONB type
  courseIcon?: string;
  text?: string;
  course_category: string[];
  discount_percentage?: string;
}

export interface OfferedCourseFormData
  extends Omit<OfferedCourse, "id" | "created_at"> {}
