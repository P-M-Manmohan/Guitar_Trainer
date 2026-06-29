import { create } from "zustand";

type ProgressStore = {
  completedLessons: number[];
  practiceMinutes: number;
  currentStreak: number;

  completeLesson: (lessonId: number) => void;
  addPracticeMinutes: (minutes: number) => void;
};

export const useProgressStore = create<ProgressStore>((set) => ({
  completedLessons: [],
  practiceMinutes: 0,
  currentStreak: 1,

  completeLesson: (lessonId) =>
    set((state) => ({
      completedLessons: state.completedLessons.includes(lessonId)
        ? state.completedLessons
        : [...state.completedLessons, lessonId],
    })),

  addPracticeMinutes: (minutes) =>
    set((state) => ({
      practiceMinutes: state.practiceMinutes + minutes,
    })),
}));