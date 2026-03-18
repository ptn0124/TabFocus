import { ShieldAlert } from 'lucide-react';
import { browser } from 'wxt/browser';

export default function App() {
  useEffect(() => {
    // Optionally close the tab after a timeout
    // const timer = setTimeout(() => window.close(), 5000);
    // return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-center w-screen h-screen bg-dark-bg">
      <div className="glass-panel p-10 rounded-2xl flex flex-col items-center max-w-sm text-center animate-slide-up">
        <div className="bg-red-500/20 p-4 rounded-full mb-6">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-white">접근이 제한되었습니다</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          현재 집중 모드가 실행 중입니다. <br/>
          설정된 차단 목록의 웹사이트에는<br/>접근할 수 없습니다.
        </p>
        <button 
          onClick={async () => {
            try {
              const currentTab = await browser.tabs.getCurrent();
              if (currentTab?.id) {
                await browser.tabs.remove(currentTab.id);
              } else {
                window.close();
              }
            } catch (e) {
              window.close();
            }
          }}
          className="bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 px-8 rounded-xl transition-colors duration-200"
        >
          탭 닫기
        </button>
      </div>
    </div>
  );
}
