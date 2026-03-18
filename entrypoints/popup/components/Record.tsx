import { useState, useEffect } from 'react';
import { studyDataStorage, subjectsStorage, focusStateStorage, DailyStudyData, Subject } from '../../../utils/storage';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Record() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allStudyData, setAllStudyData] = useState<DailyStudyData[]>([]);
  const [todayData, setTodayData] = useState<DailyStudyData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    (async () => {
      const allData = await studyDataStorage.getValue();
      const subs = await subjectsStorage.getValue();
      setAllStudyData(allData);
      setSubjects(subs);
    })();
  }, []);

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dataForDate = allStudyData.find(d => d.date === dateStr);
    setTodayData(dataForDate || null);
  }, [selectedDate, allStudyData]);

  const [activeSessionSeconds, setActiveSessionSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    const checkActiveSession = async () => {
      const state = await focusStateStorage.getValue();
      if (state.isStudying && state.startTime) {
        const diff = Math.floor((Date.now() - state.startTime) / 1000) + state.elapsedSeconds;
        setActiveSessionSeconds(diff);
      } else {
        setActiveSessionSeconds(0);
      }
    };
    checkActiveSession();
    interval = setInterval(checkActiveSession, 1000);
    return () => clearInterval(interval);
  }, []);

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const totalSeconds = (todayData?.totalSeconds || 0) + (isToday ? activeSessionSeconds : 0);

  const formatTotalTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => {
    if (!isToday) {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  // Generate 24 hours * 6 blocks
  const blocks = Array.from({ length: 144 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <button onClick={handlePrevDay} className="p-2 text-gray-400 hover:text-primary-400 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-gray-200">{format(selectedDate, 'yyyy-MM-dd')}</span>
        <button 
          onClick={handleNextDay} 
          disabled={isToday}
          className={`p-2 transition-colors ${isToday ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-primary-400'}`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center animate-slide-up">
        <h2 className="text-gray-400 text-sm font-medium mb-1">총 공부 시간</h2>
        <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600">
          {formatTotalTime(totalSeconds)}
        </div>
      </div>

      <div className="glass-panel-light p-5 rounded-2xl animate-slide-up hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-bold text-lg text-gray-900">Study Record</h3>
          <div className="text-xs text-gray-500 flex items-center mb-1 font-medium">
            <div className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-300 mr-1" />
            <span className="mr-3">0분</span>
            <div className="w-2 h-2 rounded-sm bg-primary-500 mr-1" />
            <span>10분</span>
          </div>
        </div>

        <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="w-10 bg-gray-50 border-r border-gray-200 flex flex-col">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="h-4 text-[9px] text-gray-500 flex items-center justify-center border-b border-gray-200 last:border-0 font-bold">
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-6 pl-[1px]">
            {blocks.map((blockIndex) => {
              const dataBlock = todayData?.blocks.find(b => b.blockIndex === blockIndex);
              const parts = dataBlock?.parts || [];

              // Calculate dynamic progressive offset for backward compatibility
              let currentProgressiveOffset = 0;

              return (
                <div
                  key={blockIndex}
                  className="h-4 border-b border-r border-gray-100 bg-transparent relative overflow-hidden"
                >
                  {parts.map((p, idx) => {
                    const sub = subjects.find(s => s.id === p.subjectId);
                    const color = sub?.color || '#22c55e';
                    
                    // Fallback for older data that doesn't have offsetRatio
                    const hasOffset = p.offsetRatio !== undefined;
                    const leftOffset = hasOffset ? p.offsetRatio! : currentProgressiveOffset;
                    
                    if (!hasOffset) {
                       currentProgressiveOffset += p.fillRatio;
                    }
                    
                    return (
                      <div
                        key={idx}
                        className="h-full absolute top-0 transition-all duration-300"
                        style={{ 
                          width: `${p.fillRatio * 100}%`, 
                          left: `${leftOffset * 100}%`,
                          backgroundColor: color 
                        }}
                        title={sub?.name}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
