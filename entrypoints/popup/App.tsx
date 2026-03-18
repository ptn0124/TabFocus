import { useState, useEffect } from 'react';
import Home from './components/Home.tsx';
import Record from './components/Record.tsx';
import StudyTools from './components/StudyTools.tsx';
import Blocklist from './components/Blocklist.tsx';
import { Home as HomeIcon, CalendarDays, Timer, ShieldBan } from 'lucide-react';
import { ddayStorage, DDay } from '../../utils/storage';
import clsx from 'clsx';

type Tab = 'home' | 'record' | 'tools' | 'blocklist';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [pinnedDDay, setPinnedDDay] = useState<DDay | null>(null);

  useEffect(() => {
    const loadPinned = async () => {
      const ddays = await ddayStorage.getValue();
      const pinned = ddays.find(d => d.isPinned);
      setPinnedDDay(pinned || null);
    };
    loadPinned();

    const unwatch = ddayStorage.watch((newDdays) => {
      const pinned = newDdays?.find(d => d.isPinned);
      setPinnedDDay(pinned || null);
    });
    return () => unwatch();
  }, []);

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
    <div className="w-[400px] h-[600px] overflow-hidden flex flex-col bg-dark-bg text-gray-100 font-sans">
      <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-20">
        <div className="p-5">
          <header className="mb-4 flex justify-between items-start">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600">
              TabFocus
            </h1>
            {pinnedDDay && (
              <div className="bg-dark-bg/50 border border-primary-500/30 px-3 py-1.5 rounded-full flex items-center shadow-lg shadow-primary-500/10">
                <span className="text-xs font-medium text-gray-300 mr-2">{pinnedDDay.title}</span>
                <span className="text-sm font-bold text-primary-400">{calculateDDay(pinnedDDay.date)}</span>
              </div>
            )}
          </header>

          <main className="relative grid">
            {/* 
              By unmounting/remounting, the animation triggers. 
              But to prevent layout shifting/flashing, we ensure container is stable.
            */}
            {activeTab === 'home' && <Home />}
            {activeTab === 'record' && <Record />}
            {activeTab === 'tools' && <StudyTools />}
            {activeTab === 'blocklist' && <Blocklist />}
          </main>
        </div>
      </div>

      <nav className="absolute bottom-0 left-0 w-full h-16 bg-dark-card/90 backdrop-blur-lg border-t border-dark-border flex items-center justify-around px-2 pb-safe">
        <NavButton tab="home" icon={<HomeIcon size={20} />} label="홈" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavButton tab="record" icon={<CalendarDays size={20} />} label="기록" isActive={activeTab === 'record'} onClick={() => setActiveTab('record')} />
        <NavButton tab="tools" icon={<Timer size={22} />} label="도구" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        <NavButton tab="blocklist" icon={<ShieldBan size={20} />} label="차단" isActive={activeTab === 'blocklist'} onClick={() => setActiveTab('blocklist')} />
      </nav>
    </div>
  );
}

function NavButton({ tab, icon, label, isActive, onClick }: { tab: Tab, icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
        isActive ? "text-primary-400" : "text-gray-500 hover:text-gray-300"
      )}
    >
      <div className={clsx(
        "p-1.5 rounded-xl transition-all duration-300",
        isActive && "bg-primary-400/10"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default App;
