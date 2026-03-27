import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, Plus, Trash2, Clock } from 'lucide-react';
import { blocksToSessions, rebuildDayBlocks, StudySession } from '../../../utils/studyStorage';
import { DailyStudyData, Subject, studyDataStorage } from '../../../utils/storage';

interface RecordEditorProps {
  selectedDate: Date;
  todayData: DailyStudyData | null;
  subjects: Subject[];
  onBack: () => void;
  onDataChanged: () => void; // To tell parent to reload
}

export default function RecordEditor({ selectedDate, todayData, subjects, onBack, onDataChanged }: RecordEditorProps) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const blocks = todayData?.blocks || [];
  const sessions = blocksToSessions(dateStr, blocks);
  
  const logicalStart = new Date(`${dateStr}T05:00:00`).getTime();
  const logicalEnd = logicalStart + 24 * 3600 * 1000;
  
  const displayItems: Array<
    | { type: 'empty'; startMs: number; endMs: number }
    | { type: 'session'; session: StudySession }
  > = [];
  
  let currentMs = logicalStart;
  for (const session of sessions) {
    if (session.startMs > currentMs) {
      displayItems.push({ type: 'empty', startMs: currentMs, endMs: session.startMs });
    }
    displayItems.push({ type: 'session', session });
    currentMs = session.endMs;
  }
  if (currentMs < logicalEnd) {
    // If the last session ends at 05:00 next day, this just evaluates to 0 length which we don't render.
    if (logicalEnd - currentMs > 1000) {
      displayItems.push({ type: 'empty', startMs: currentMs, endMs: logicalEnd });
    }
  }

  const formatMs = (ms: number) => format(new Date(ms), 'HH:mm');

  // Modal State
  const [editingEmpty, setEditingEmpty] = useState<{ startMs: number; endMs: number } | null>(null);
  const [addStartStr, setAddStartStr] = useState('');
  const [addEndStr, setAddEndStr] = useState('');
  const [addSubjectId, setAddSubjectId] = useState<string>('');

  const parseTimeInput = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const adjustedH = h < 5 ? h + 24 : h; 
    return logicalStart + ((adjustedH - 5) * 3600 + m * 60) * 1000;
  };

  const openAddModal = (emptyStart: number, emptyEnd: number) => {
    setEditingEmpty({ startMs: emptyStart, endMs: emptyEnd });
    setAddStartStr(formatMs(emptyStart));
    setAddEndStr(formatMs(emptyEnd));
    if (subjects.length > 0) setAddSubjectId(subjects[0].id);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpty || !addSubjectId) return;

    let sMs = parseTimeInput(addStartStr);
    let eMs = parseTimeInput(addEndStr);
    
    // If user enters '00:00' the next day relative to 05:00 start, parseTimeInput handles it.
    if (eMs <= sMs) {
      alert('종료 시간이 시작 시간보다 앞서거나 같을 수 없습니다.');
      return;
    }
    if (sMs < editingEmpty.startMs || eMs > editingEmpty.endMs) {
      alert('선택한 빈 시간대 밖으로 지정할 수 없습니다.');
      return;
    }

    const newSession: StudySession = {
      id: `new-${Date.now()}`,
      subjectId: addSubjectId,
      startMs: sMs,
      endMs: eMs
    };
    
    const updatedSessions = [...sessions, newSession];
    await rebuildDayBlocks(dateStr, updatedSessions);
    setEditingEmpty(null);
    onDataChanged();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('해당 기록을 삭제하시겠습니까?')) return;
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    await rebuildDayBlocks(dateStr, updatedSessions);
    onDataChanged();
  };

  return (
    <div className="glass-panel p-5 rounded-2xl animate-slide-up flex flex-col h-[400px]">
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center text-sm font-medium transition-colors">
          <ChevronLeft size={16} className="mr-1" /> 돌아가기
        </button>
        <span className="font-bold text-gray-200 text-sm">상세 기록 편집</span>
        <div className="w-[80px]" /> {/* Spacer */}
      </div>

      <div className="overflow-y-auto hide-scrollbar flex-1 space-y-2 pr-1">
        {displayItems.map((item, idx) => {
          if (item.type === 'empty') {
            return (
              <div 
                key={`empty-${idx}`} 
                onClick={() => openAddModal(item.startMs, item.endMs)}
                className="group flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-dark-border bg-dark-bg/20 hover:bg-dark-bg/50 cursor-pointer transition-colors"
              >
                <span className="text-xs text-gray-500 group-hover:text-primary-400 flex items-center font-medium">
                  <Plus size={12} className="mr-1" />
                  빈 시간대 ({formatMs(item.startMs)} ~ {formatMs(item.endMs)})
                </span>
                <span className="text-[10px] text-gray-600 mt-0.5 group-hover:opacity-100 opacity-0 transition-opacity">클릭하여 기록 추가</span>
              </div>
            );
          } else {
            const s = item.session;
            const sub = subjects.find(sub => sub.id === s.subjectId);
            const durationMins = Math.floor((s.endMs - s.startMs)/60000);
            
            return (
              <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-dark-bg/50 border border-dark-border group">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: sub?.color || '#22c55e' }} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{sub?.name || '알 수 없음'}</span>
                    <span className="text-xs text-gray-400 flex items-center font-medium mt-0.5">
                      <Clock size={10} className="mr-1" /> {formatMs(s.startMs)} ~ {formatMs(s.endMs)} ({durationMins}분)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSession(s.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          }
        })}
      </div>

      {editingEmpty && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-panel p-5 rounded-2xl w-full border border-primary-500/30 animate-scale-up">
            <h3 className="font-bold text-white mb-4 text-center">기록 수동 추가</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 ml-1 text-left">과목 선택</label>
                <select 
                  value={addSubjectId} 
                  onChange={e => setAddSubjectId(e.target.value)}
                  className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1 ml-1 text-left">시작 시간</label>
                  <input 
                    type="time" 
                    value={addStartStr}
                    onChange={e => setAddStartStr(e.target.value)}
                    className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1 ml-1 text-left">종료 시간</label>
                  <input 
                    type="time" 
                    value={addEndStr}
                    onChange={e => setAddEndStr(e.target.value)}
                    className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="button" onClick={() => setEditingEmpty(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-400 bg-dark-bg/50 rounded-xl hover:bg-dark-bg transition-colors">취소</button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-bold text-dark-bg bg-primary-500 rounded-xl hover:bg-primary-400 transition-colors">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
