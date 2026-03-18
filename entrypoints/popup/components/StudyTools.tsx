import { useState, useEffect } from 'react';
import { ddayStorage, standaloneStopwatchStorage, standaloneTimerStorage, DDay } from '../../../utils/storage';
import { Play, Square, Pause, RotateCcw, Plus, Trash2, Pin } from 'lucide-react';

export default function StudyTools() {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'dday'>('stopwatch');

  return (
    <div className="space-y-4">
      {/* Tools Navigation */}
      <div className="flex bg-dark-bg/50 p-1 rounded-xl border border-dark-border mb-4">
        <ToolTab label="스톱워치" active={activeTab === 'stopwatch'} onClick={() => setActiveTab('stopwatch')} />
        <ToolTab label="타이머" active={activeTab === 'timer'} onClick={() => setActiveTab('timer')} />
        <ToolTab label="D-Day" active={activeTab === 'dday'} onClick={() => setActiveTab('dday')} />
      </div>

      {/* Renders logic completely independent of the main app FocusState */}
      {activeTab === 'stopwatch' && <StandaloneStopwatch />}
      {activeTab === 'timer' && <StandaloneTimer />}
      {activeTab === 'dday' && <DDayManager />}
    </div>
  );
}

function ToolTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-primary-500/20 text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
      {label}
    </button>
  );
}

function StandaloneStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const state = await standaloneStopwatchStorage.getValue();
      if (state.isRunning && state.startTime) {
        setIsRunning(true);
        const diff = Math.floor((Date.now() - state.startTime) / 1000);
        setElapsed(state.elapsedSeconds + diff);
      } else {
        setIsRunning(false);
        setElapsed(state.elapsedSeconds);
      }
    })();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRunning) interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleToggle = async () => {
    const currentState = await standaloneStopwatchStorage.getValue();
    if (isRunning) {
      // pause
      const diff = currentState.startTime ? Math.floor((Date.now() - currentState.startTime) / 1000) : 0;
      await standaloneStopwatchStorage.setValue({
        isRunning: false,
        startTime: null,
        elapsedSeconds: currentState.elapsedSeconds + diff
      });
      setIsRunning(false);
    } else {
      // play
      await standaloneStopwatchStorage.setValue({
        isRunning: true,
        startTime: Date.now(),
        elapsedSeconds: elapsed
      });
      setIsRunning(true);
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    setElapsed(0);
    await standaloneStopwatchStorage.setValue({
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0
    });
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-center animate-fade-in border border-dark-border/50">
      <h3 className="text-gray-400 text-sm mb-4">보조 스톱워치</h3>
      <div className="text-5xl font-bold font-mono tracking-wider text-white mb-8">
        {formatTime(elapsed)}
      </div>
      <div className="flex justify-center space-x-4">
        <button onClick={handleToggle} className="bg-primary-500 hover:bg-primary-400 text-dark-bg p-4 rounded-xl transition-colors w-20 flex-center">
          {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button onClick={handleReset} className="bg-dark-bg hover:bg-white/10 text-white p-4 rounded-xl border border-dark-border transition-colors w-20 flex-center">
          <RotateCcw size={24} />
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-6 mt-4">메인 공부 시간 측정과는 별개입니다.</p>
    </div>
  );
}

function StandaloneTimer() {
  const [time, setTime] = useState(30 * 60); // Default 30 min
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputH, setInputH] = useState('00');
  const [inputM, setInputM] = useState('30');
  const [inputS, setInputS] = useState('00');

  useEffect(() => {
    (async () => {
      const state = await standaloneTimerStorage.getValue();
      if (state.isRunning && state.endTime) {
        setIsRunning(true);
        const rem = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
        setTime(rem);
        if (rem === 0) {
          setIsRunning(false);
          await standaloneTimerStorage.setValue({ isRunning: false, endTime: null, remainingSeconds: 0 });
        }
      } else {
        setIsRunning(false);
        setTime(state.remainingSeconds);
      }
    })();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime(t => {
          if (t <= 1) {
            setIsRunning(false);
            standaloneTimerStorage.setValue({ isRunning: false, endTime: null, remainingSeconds: 0 });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveEdit = async () => {
    const h = parseInt(inputH) || 0;
    const m = parseInt(inputM) || 0;
    const s = parseInt(inputS) || 0;
    
    // clamp to 59
    const cm = Math.min(m, 59);
    const cs = Math.min(s, 59);

    const total = h * 3600 + cm * 60 + cs;
    setTime(total);
    setInputM(cm.toString().padStart(2, '0'));
    setInputS(cs.toString().padStart(2, '0'));
    setIsEditing(false);
    
    await standaloneTimerStorage.setValue({
      isRunning: false,
      endTime: null,
      remainingSeconds: total
    });
  };

  const handleToggle = async () => {
    if (isRunning) {
      await standaloneTimerStorage.setValue({
        isRunning: false,
        endTime: null,
        remainingSeconds: time
      });
      setIsRunning(false);
    } else {
      if (time > 0) {
        await standaloneTimerStorage.setValue({
          isRunning: true,
          endTime: Date.now() + time * 1000,
          remainingSeconds: time
        });
        setIsRunning(true);
      }
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    setTime(30 * 60);
    setInputH('00');
    setInputM('30');
    setInputS('00');
    setIsEditing(false);
    await standaloneTimerStorage.setValue({
      isRunning: false,
      endTime: null,
      remainingSeconds: 30 * 60
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-center animate-fade-in border border-dark-border/50">
      <h3 className="text-gray-400 text-sm mb-4">카운트다운 타이머</h3>
      
      <div className="h-[72px] flex items-center justify-center mb-6">
        {!isEditing && !isRunning ? (
          <div 
            onClick={() => setIsEditing(true)} 
            className="text-6xl font-bold font-mono text-white cursor-pointer hover:text-primary-300 transition-colors"
            title="클릭하여 목표 시간 편집"
          >
            {formatTime(time)}
          </div>
        ) : !isEditing && isRunning ? (
          <div className="text-6xl font-bold font-mono text-white">
            {formatTime(time)}
          </div>
        ) : (
          <div className="flex justify-center items-center space-x-1 text-4xl font-mono text-white">
            <input 
              type="number" 
              value={inputH} 
              onChange={e => setInputH(e.target.value)}
              onBlur={() => {
                const val = parseInt(inputH);
                setInputH((isNaN(val) ? 0 : val).toString().padStart(2, '0'));
              }}
              className="w-[60px] bg-dark-bg/50 border border-dark-border rounded-lg px-2 py-2 text-center focus:outline-none focus:border-primary-500 hide-arrows"
              min="0" max="99" placeholder="00"
            />
            <span className="text-gray-400">:</span>
            <input 
              type="number" 
              value={inputM} 
              onChange={e => setInputM(e.target.value)} 
              onBlur={() => {
                const val = parseInt(inputM);
                if (isNaN(val) || val >= 60) setInputM('00');
                else setInputM(val.toString().padStart(2, '0'));
              }}
              className="w-[60px] bg-dark-bg/50 border border-dark-border rounded-lg px-2 py-2 text-center focus:outline-none focus:border-primary-500 hide-arrows"
              min="0" max="59" placeholder="00"
            />
            <span className="text-gray-400">:</span>
            <input 
              type="number" 
              value={inputS} 
              onChange={e => setInputS(e.target.value)} 
              onBlur={() => {
                const val = parseInt(inputS);
                if (isNaN(val) || val >= 60) setInputS('00');
                else setInputS(val.toString().padStart(2, '0'));
              }}
              className="w-[60px] bg-dark-bg/50 border border-dark-border rounded-lg px-2 py-2 text-center focus:outline-none focus:border-primary-500 hide-arrows"
              min="0" max="59" placeholder="00"
            />
            <button onClick={handleSaveEdit} className="text-sm bg-primary-500 hover:bg-primary-400 transition-colors text-dark-bg px-3 py-3 rounded-lg ml-2 font-bold whitespace-nowrap">확인</button>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        <button onClick={() => { if(!isEditing) handleToggle(); }} className="bg-primary-500 hover:bg-primary-400 text-dark-bg p-4 rounded-xl transition-colors w-20 flex-center">
          {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button onClick={handleReset} className="bg-dark-bg hover:bg-white/10 text-white p-4 rounded-xl border border-dark-border transition-colors w-20 flex-center">
          <RotateCcw size={24} />
        </button>
      </div>
      {!isRunning && !isEditing && <p className="text-xs text-gray-400 mt-4">시간을 눌러 직접 변경하세요.</p>}
    </div>
  );
}

function DDayManager() {
  const [ddays, setDdays] = useState<DDay[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    (async () => {
      const stored = await ddayStorage.getValue();
      setDdays(stored);
    })();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    
    const newDDay: DDay = { id: Date.now().toString(), title, date };
    const updated = [...ddays, newDDay];
    
    setDdays(updated);
    await ddayStorage.setValue(updated);
    setTitle('');
    setDate('');
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const updated = ddays.filter(d => d.id !== id);
    setDdays(updated);
    await ddayStorage.setValue(updated);
  };

  const handleTogglePin = async (id: string, currentPinStatus: boolean) => {
    const updated = ddays.map(d => {
      if (d.id === id) return { ...d, isPinned: !currentPinStatus };
      return { ...d, isPinned: false }; // Ensure only one pinned D-Day
    });
    setDdays(updated);
    await ddayStorage.setValue(updated);
  };

  const calculateDDay = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'D-Day';
    return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-between items-center px-1 mb-2">
        <span className="text-sm font-bold text-white">다가오는 일정</span>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="text-primary-400 flex items-center text-xs hover:text-primary-300">
            <Plus size={14} className="mr-1" /> 추가
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="glass-panel p-4 rounded-xl border border-primary-500/30">
           <input 
             type="text" value={title} onChange={e => setTitle(e.target.value)}
             placeholder="일정 이름" required
             className="w-full bg-dark-bg/50 border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-100 mb-2 focus:border-primary-500 outline-none"
           />
           <input 
             type="date" value={date} onChange={e => setDate(e.target.value)} required
             className="w-full bg-dark-bg/50 border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-100 mb-3 focus:border-primary-500 outline-none"
           />
           <div className="flex space-x-2">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs font-medium text-gray-400 bg-dark-bg/50 rounded-lg hover:bg-dark-bg">취소</button>
            <button type="submit" className="flex-1 py-2 text-xs font-bold text-dark-bg bg-primary-500 rounded-lg hover:bg-primary-400">저장</button>
          </div>
        </form>
      )}

      {ddays.length === 0 && !isAdding && (
        <div className="text-center py-6 text-gray-500 text-sm bg-dark-bg/30 rounded-xl border border-dark-border border-dashed">
          등록된 일정이 없습니다.
        </div>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto hide-scrollbar">
        {ddays.map(dday => (
           <div key={dday.id} className="glass-panel p-4 rounded-xl flex justify-between items-center group">
             <div>
               <div className="text-primary-400 font-bold text-lg leading-none mb-1">{calculateDDay(dday.date)}</div>
               <div className="text-sm text-white font-medium">{dday.title} {dday.date}</div>
             </div>
             <div className="flex items-center space-x-1">
               <button onClick={() => handleTogglePin(dday.id, !!dday.isPinned)} className={`p-2 transition-all rounded bg-dark-bg/50 ${dday.isPinned ? 'text-primary-400 opacity-100' : 'text-gray-500 opacity-50 group-hover:opacity-100 hover:text-primary-300'}`} title={dday.isPinned ? "고정 해제" : "상단에 고정"}>
                 <Pin size={16} fill={dday.isPinned ? "currentColor" : "none"} />
               </button>
               <button onClick={() => handleDelete(dday.id)} className="text-gray-500 hover:text-red-400 p-2 opacity-50 group-hover:opacity-100 transition-all rounded bg-dark-bg/50" title="삭제">
                 <Trash2 size={16} />
               </button>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
}
