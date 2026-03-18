import { useState, useEffect } from 'react';
import { blocklistStorage } from '../../../utils/storage';
import { Trash2, Plus } from 'lucide-react';

export default function Blocklist() {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    (async () => {
      const data = await blocklistStorage.getValue();
      setList(data);
    })();
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
        <h2 className="text-lg font-bold mb-1">차단 목록</h2>
        <p className="text-xs text-gray-400 mb-4">
          공부 시간(타이머) 측정 중에 접속이 제한될 웹사이트를 관리하세요.
        </p>
        
        <form onSubmit={addDomain} className="flex space-x-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예) youtube.com"
            className="flex-1 bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
          <button type="submit" className="bg-primary-600 hover:bg-primary-500 p-2 rounded-xl transition-colors shrink-0">
            <Plus className="text-white" size={20} />
          </button>
        </form>

        <div className="space-y-2 max-h-[250px] overflow-y-auto hide-scrollbar">
          {list.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm bg-dark-bg/30 rounded-xl border border-dark-border border-dashed">
              차단 목록이 비어 있습니다.
            </div>
          ) : (
            list.map(domain => (
              <div key={domain} className="flex justify-between items-center bg-dark-bg/50 p-3 rounded-xl border border-dark-border group">
                <span className="text-sm font-medium">{domain}</span>
                <button 
                  onClick={() => removeDomain(domain)}
                  className="text-gray-500 hover:text-red-400 p-1 opacity-50 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
