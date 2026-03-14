/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { COURSES, type Course } from '../data/courses';

interface AnalysisResult {
  totalScore: number;
  passF: number;
  gradeF: number;
  typeF: number;
  creditF: number;
  recommendations: string[];
}

interface ScheduleContextValue {
  selectedCourses: Course[];
  toggleCourse: (code: string) => void;
  analyzeSchedule: () => void;
  analysisResult: AnalysisResult | null;
  clearSchedule: () => void;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const toggleCourse = useCallback((code: string) => {
    setSelectedCourses((prev) => {
      const exists = prev.find((c) => c.code === code);
      if (exists) return prev.filter((c) => c.code !== code);
      const course = COURSES.find((c) => c.code === code);
      return course ? [...prev, course] : prev;
    });
    setAnalysisResult(null);
  }, []);

  const analyzeSchedule = useCallback(() => {
    if (selectedCourses.length === 0) return;

    const totalCredits = selectedCourses.reduce((s, c) => s + c.credits, 0);
    const totalScore =
      selectedCourses.reduce((s, c) => s + c.diffScore, 0) / selectedCourses.length;
    const passF =
      selectedCourses.reduce((s, c) => s + (100 - c.passRate), 0) / selectedCourses.length;
    const gradeF =
      selectedCourses.reduce((s, c) => s + (100 - c.avgGrade), 0) / selectedCourses.length;
    const nonPractical = selectedCourses.filter((c) => c.type !== 'practical').length;
    const typeF = (nonPractical / selectedCourses.length) * 70;
    const creditF = Math.min((totalCredits / 18) * 80, 80);

    const recommendations: string[] = [];
    if (totalScore >= 65) {
      recommendations.push(
        'Consider swapping one hard course for an easier elective to balance your workload.'
      );
      if (totalCredits > 15) {
        recommendations.push(
          'Reducing your credit load to 15 or fewer credits could improve your performance.'
        );
      }
      if (nonPractical >= selectedCourses.length - 1) {
        recommendations.push(
          'Adding a practical or project-based course may reduce your overall difficulty.'
        );
      }
      recommendations.push(
        'Spread difficult courses across semesters rather than clustering them together.'
      );
    }

    setAnalysisResult({
      totalScore: Math.round(totalScore),
      passF: Math.round(passF),
      gradeF: Math.round(gradeF),
      typeF: Math.round(typeF),
      creditF: Math.round(creditF),
      recommendations,
    });
  }, [selectedCourses]);

  const clearSchedule = useCallback(() => {
    setSelectedCourses([]);
    setAnalysisResult(null);
  }, []);

  return (
    <ScheduleContext.Provider
      value={{ selectedCourses, toggleCourse, analyzeSchedule, analysisResult, clearSchedule }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within a ScheduleProvider');
  return ctx;
}

