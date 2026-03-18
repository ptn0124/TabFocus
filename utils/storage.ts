// storage is auto-imported by wxt

export interface StudyBlock {
  // ISO date string 'YYYY-MM-DD'
  date: string;
  // Index of 10-minute block (0 to 143)
  blockIndex: number;
  // Details tracking proportional time spent on subjects within this 10 min.
  // We store array of parts to render left-to-right correctly.
  parts: {
    subjectId: string;
    // The fraction (0.0 to 1.0) of 10-minutes that was spent on this subject
    fillRatio: number;
    // The offset fraction (0.0 to 1.0) relative to the start of this 10-minute block
    // Allows us to position the record exactly within the block timeline
    offsetRatio?: number;
  }[];
}

export interface DailyStudyData {
  date: string; // 'YYYY-MM-DD'
  blocks: StudyBlock[];
  totalSeconds: number;
}

export interface FocusState {
  isStudying: boolean;
  startTime: number | null; // Timestamp
  // "stopwatch" or "timer" or "none"
  mode: 'stopwatch' | 'timer' | 'none';
  // Target duration if timer
  targetSeconds: number | null;
  // Currently accumulated seconds for this session
  elapsedSeconds: number;
  // New field for tracking which subject is being studied
  currentSubjectId: string | null;
}

export interface Subject {
  id: string; // e.g. timestamp or UUID
  name: string;
  color: string; // Tailwind hex color
}

export interface DDay {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isPinned?: boolean;
}

// Storage items
export const studyDataStorage = storage.defineItem<DailyStudyData[]>('local:studyData', {
  fallback: [],
});

export const focusStateStorage = storage.defineItem<FocusState>('local:focusState', {
  fallback: {
    isStudying: false,
    startTime: null,
    mode: 'none',
    targetSeconds: null,
    elapsedSeconds: 0,
    currentSubjectId: null,
  },
});

export const subjectsStorage = storage.defineItem<Subject[]>('local:subjects', {
  fallback: [],
});

export const ddayStorage = storage.defineItem<DDay[]>('local:ddays', {
  fallback: [],
});

export const blocklistStorage = storage.defineItem<string[]>('local:blocklist', {
  fallback: [], // Array of hostnames or keywords
});

export interface StandaloneStopwatchState {
  isRunning: boolean;
  startTime: number | null;
  elapsedSeconds: number;
}

export const standaloneStopwatchStorage = storage.defineItem<StandaloneStopwatchState>('local:standaloneStopwatch', {
  fallback: {
    isRunning: false,
    startTime: null,
    elapsedSeconds: 0,
  },
});

export interface StandaloneTimerState {
  isRunning: boolean;
  endTime: number | null; // The exact timestamp the timer reaches 0
  remainingSeconds: number; // For paused state
}

export const standaloneTimerStorage = storage.defineItem<StandaloneTimerState>('local:standaloneTimer', {
  fallback: {
    isRunning: false,
    endTime: null,
    remainingSeconds: 30 * 60,
  },
});
