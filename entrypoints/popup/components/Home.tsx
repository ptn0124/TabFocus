import { useState, useEffect } from 'react';
import { studyDataStorage, subjectsStorage, focusStateStorage, Subject, DailyStudyData } from '../../../utils/storage';
import { saveStudyTimeToPlanner } from '../../../utils/studyStorage';
import { Play, Plus, Palette, Trash2, StopCircle } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899',
  '#94a3b8', '#14b8a6', '#84cc16', '#f43f5e'
];

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todayData, setTodayData] = useState<DailyStudyData | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isStudying) {
      const updateTimer = async () => {
        const state = await focusStateStorage.getValue();
        if (state.isStudying && state.startTime) {
          const diffStr = Math.floor((Date.now() - state.startTime) / 1000) + state.elapsedSeconds;
          setCurrentSessionSeconds(diffStr);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setCurrentSessionSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    const subs = await subjectsStorage.getValue();
    setSubjects(subs);
    
    const allStudyData = await studyDataStorage.getValue();
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const today = allStudyData.find(d => d.date === dateStr);
    setTodayData(today || null);
    
    const focusState = await focusStateStorage.getValue();
    setIsStudying(focusState.isStudying);
    setCurrentSubjectId(focusState.currentSubjectId);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newSub: Subject = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: newColor,
    };

    const updated = [...subjects, newSub];
    await subjectsStorage.setValue(updated);
    setSubjects(updated);
    setNewName('');
    setIsAdding(false);
  };

  const handleDeleteSubject = async (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    await subjectsStorage.setValue(updated);
    setSubjects(updated);
  };

  const handleStartStudy = async (subjectId: string) => {
    if (isStudying) return;

    await focusStateStorage.setValue({
      isStudying: true,
      startTime: Date.now(),
      mode: 'stopwatch', // Core tracker always acts as continuous stopwatch
      targetSeconds: null,
      elapsedSeconds: 0,
      currentSubjectId: subjectId,
    });
    setIsStudying(true);
    setCurrentSubjectId(subjectId);
  };

  const handleStopStudy = async () => {
    if (!isStudying) return;
    
    const currentState = await focusStateStorage.getValue();
    const endTime = Date.now();
    
    if (currentState.startTime && currentState.currentSubjectId) {
      await saveStudyTimeToPlanner(currentState.startTime, endTime, currentState.currentSubjectId);
    }
    
    await focusStateStorage.setValue({
      isStudying: false,
      startTime: null,
      mode: 'none',
      targetSeconds: null,
      elapsedSeconds: 0,
      currentSubjectId: null,
    });
    
    setIsStudying(false);
    setCurrentSubjectId(null);
    setCurrentSessionSeconds(0);
    // Reload today's data after saving session
    loadData();
  };

  const getSubjectTodaySeconds = (subjectId: string) => {
    let secs = 0;
    if (todayData) {
      todayData.blocks.forEach(b => {
        b.parts.forEach(p => {
          if (p.subjectId === subjectId) {
            secs += p.fillRatio * 600;
          }
        });
      });
    }
    if (isStudying && currentSubjectId === subjectId) {
      secs += currentSessionSeconds;
    }
    return Math.floor(secs);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg text-white col-span-full">과목 관리</h2>
        {!isAdding && !isStudying && (
          <button onClick={() => setIsAdding(true)} className="text-primary-400 p-1 flex items-center text-sm font-medium hover:text-primary-300">
            <Plus size={16} className="mr-1" /> 과목 추가
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubject} className="glass-panel p-4 rounded-xl animate-fade-in border border-primary-500/30">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="과목 이름을 입력하세요"
            className="w-full bg-dark-bg/50 border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors mb-3"
            autoFocus
          />
          <div className="flex items-center mb-4 w-full">
            <Palette size={16} className="text-gray-400 shrink-0 mr-2" />
            <div className="flex flex-wrap gap-2 w-full">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={clsx(
                    "w-6 h-6 rounded-full shrink-0 transition-transform",
                    newColor === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-dark-card" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs font-medium text-gray-400 bg-dark-bg/50 rounded-lg hover:bg-dark-bg transition-colors">
              취소
            </button>
            <button type="submit" className="flex-1 py-2 text-xs font-bold text-dark-bg bg-primary-500 rounded-lg hover:bg-primary-400 transition-colors">
              저장
            </button>
          </div>
        </form>
      )}

      {subjects.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500 text-sm bg-dark-bg/30 rounded-xl border border-dark-border border-dashed">
          등록된 과목이 없습니다.<br/>공부를 시작하려면 과목을 추가하세요.
        </div>
      )}

      {isStudying && currentSubjectId && (
        <div className="glass-panel p-6 rounded-2xl animate-fade-in bg-gradient-to-br from-primary-900/40 to-dark-card border-primary-500/30">
           <div className="flex flex-col items-center justify-center text-center">
             <div className="w-4 h-4 rounded-full animate-pulse mb-3" style={{ backgroundColor: subjects.find(s => s.id === currentSubjectId)?.color || '#22c55e' }} />
             <h3 className="text-lg font-bold text-white mb-2">
               {subjects.find(s => s.id === currentSubjectId)?.name || '과목명'} 공부 중
             </h3>
             <div className="text-5xl font-mono font-bold text-white mb-6 tracking-wide">
               {formatTime(currentSessionSeconds)}
             </div>
             <p className="text-sm text-gray-400 mb-6 font-medium">차단 모드가 활성화되었습니다.</p>
             <button
               onClick={handleStopStudy}
               className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-8 w-full rounded-xl flex-center transition-colors shadow-lg shadow-red-500/20"
             >
               <StopCircle className="mr-2" size={20} /> 공부 종료
             </button>
           </div>
        </div>
      )}

      {!isStudying && (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto hide-scrollbar pb-10">
          {subjects.map(subject => (
            <div key={subject.id} className="glass-panel p-4 rounded-2xl flex flex-col justify-between group h-[120px] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: subject.color }} />
              <div className="flex justify-between items-start mt-1">
                <span className="font-bold text-white truncate text-sm">{subject.name}</span>
                <button 
                  onClick={() => handleDeleteSubject(subject.id)}
                  className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all rounded bg-dark-bg/50"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-xl font-mono font-bold text-gray-300 mt-1 mb-2">
                {formatTime(getSubjectTodaySeconds(subject.id))}
              </div>
              
              <button
                onClick={() => handleStartStudy(subject.id)}
                className="w-full mt-auto bg-dark-bg hover:bg-white/10 text-white py-2 rounded-xl flex items-center justify-center transition-colors border border-white/5"
              >
                <Play size={14} fill="currentColor" className="mr-1.5" style={{ color: subject.color }} /> 
                <span className="text-xs font-medium">시작</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
