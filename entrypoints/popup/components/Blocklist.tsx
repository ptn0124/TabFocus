import { useState, useEffect } from 'react';
import { blocklistStorage, focusStateStorage } from '../../../utils/storage';
import { Trash2, Plus, Lock } from 'lucide-react';

export default function Blocklist() {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isStudying, setIsStudying] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await blocklistStorage.getValue();
      setList(data);
      const fs = await focusStateStorage.getValue();
      setIsStudying(fs.isStudying);
    })();
    
    const unwatch = focusStateStorage.watch((newState) => {
      setIsStudying(newState?.isStudying ?? false);
    });
    return () => unwatch();
  }, []);

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    let domain = input.trim().toLowerCase();
    // basic cleanup, e.g. https://www.youtube.com -> youtube.com
    try {
      if (domain.startsWith('http')) {
        domain = new URL(domain).hostname;
      }
    } catch (e) {}
    
    domain = domain.replace(/^www\./, '');
    
    if (domain && !list.includes(domain)) {
      const newList = [...list, domain];
      setList(newList);
      await blocklistStorage.setValue(newList);
      setInput('');
    }
  };

  const removeDomain = async (domain: string) => {
    const newList = list.filter(d => d !== domain);
    setList(newList);
    await blocklistStorage.setValue(newList);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5 rounded-2xl animate-slide-up">
        <h2 className="text-lg font-bold mb-1 flex items-center">
          차단 목록
          {isStudying && <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center"><Lock size={10} className="mr-1" /> 공부 중 잠김</span>}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          공부 시간(타이머) 측정 중에 접속이 제한될 웹사이트를 관리하세요.
          {isStudying && <span className="block mt-1 text-red-400 font-medium tracking-tight">※ 현재 집중 모드 상태이므로 차단 설정을 변경할 수 없습니다.</span>}
        </p>
        
        <form onSubmit={addDomain} className="flex space-x-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStudying}
            placeholder="예) youtube.com"
            className={`flex-1 bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none transition-colors ${isStudying ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary-500'}`}
          />
          <button type="submit" disabled={isStudying} className={`p-2 rounded-xl transition-colors shrink-0 ${isStudying ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500'}`}>
            <Plus className={isStudying ? "text-gray-400" : "text-white"} size={20} />
          </button>
        </form>

        <div className="space-y-2 max-h-[250px] overflow-y-auto hide-scrollbar">
          {list.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm bg-dark-bg/30 rounded-xl border border-dark-border border-dashed">
              차단 목록이 비어 있습니다.
            </div>
          ) : (
            list.map(domain => (
              <div key={domain} className={`flex justify-between items-center bg-dark-bg/50 p-3 rounded-xl border border-dark-border group ${isStudying ? 'opacity-80' : ''}`}>
                <span className="text-sm font-medium">{domain}</span>
                {!isStudying && (
                <button 
                  onClick={() => removeDomain(domain)}
                  className="text-gray-500 hover:text-red-400 p-1 opacity-50 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
