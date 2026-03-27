import { format } from 'date-fns';
import { studyDataStorage } from './storage';

export async function saveStudyTimeToPlanner(startMs: number, endMs: number, subjectId: string) {
  // A logical day starts at 05:00
  const logicalStartMs = startMs - 5 * 3600 * 1000;
  const dateStr = format(new Date(logicalStartMs), 'yyyy-MM-dd');
  const allData = await studyDataStorage.getValue();
  let todayData = allData.find(d => d.date === dateStr);
  
  if (!todayData) {
    todayData = { date: dateStr, blocks: [], totalSeconds: 0 };
    allData.push(todayData);
  }
  
  const addSeconds = Math.floor((endMs - startMs) / 1000);
  todayData.totalSeconds += addSeconds;

  let currentMs = startMs;
  while (currentMs < endMs) {
    const d = new Date(currentMs);
    const hour = d.getHours();
    const minute = d.getMinutes();
    
    // Day starts at 05:00. 05:XX -> hour 0, 04:XX -> hour 23
    const adjustedHour = (hour + 19) % 24;
    
    // Block index (0 to 143)
    const blockIndex = (adjustedHour * 6) + Math.floor(minute / 10);
    
    // Nearest next 10-minute boundary or end of session
    const endOfMinuteMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, 59, 999).getTime() + 1;
    const nextMs = Math.min(endOfMinuteMs, endMs);
    const overlapSeconds = (nextMs - currentMs) / 1000;
    
    let block = todayData.blocks.find(b => b.blockIndex === blockIndex);
    if (!block) {
      block = { date: dateStr, blockIndex, parts: [] };
      todayData.blocks.push(block);
    }
    
    // Calculate fraction (600 seconds = 10 mins = 1.0 ratio capacity)
    const ratioToAdd = overlapSeconds / 600;
    
    // Calculate the start offset relative to the block start
    // A block starts at minute * 10
    const blockStartMinute = Math.floor(minute / 10) * 10;
    const blockStartMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, blockStartMinute, 0, 0).getTime();
    const offsetRatio = (currentMs - blockStartMs) / (600 * 1000);
    
    // Instead of accumulating into the same part and merging them,
    // we push a new part each time to represent this specific contiguous study chunk.
    const part = { 
      subjectId, 
      fillRatio: Math.min(ratioToAdd, 1.0), 
      offsetRatio: Math.max(0, Math.min(offsetRatio, 1.0)) 
    };
    block.parts.push(part);
    
    currentMs = nextMs;
  }
  
  await studyDataStorage.setValue(allData);
}

export interface StudySession {
  id: string;
  subjectId: string;
  startMs: number;
  endMs: number;
}

export function blocksToSessions(dateStr: string, blocks: any[]): StudySession[] {
  const logicalStart = new Date(`${dateStr}T05:00:00`).getTime();
  const sessions: StudySession[] = [];
  const sortedBlocks = [...blocks].sort((a,b) => a.blockIndex - b.blockIndex);
  
  for (const block of sortedBlocks) {
    const blockStartMs = logicalStart + (block.blockIndex * 600 * 1000);
    let currentProgressiveOffset = 0;
    
    for (const part of block.parts) {
      const hasOffset = part.offsetRatio !== undefined;
      const leftOffset = hasOffset ? part.offsetRatio! : currentProgressiveOffset;
      if (!hasOffset) {
        currentProgressiveOffset += part.fillRatio;
      }
      
      const partStartMs = blockStartMs + leftOffset * 600 * 1000;
      const partEndMs = partStartMs + part.fillRatio * 600 * 1000;
      
      const lastSession = sessions[sessions.length - 1];
      if (lastSession && lastSession.subjectId === part.subjectId && Math.abs(lastSession.endMs - partStartMs) < 1000) {
        lastSession.endMs = partEndMs;
      } else {
        sessions.push({
          id: `${partStartMs}-${part.subjectId}`,
          subjectId: part.subjectId,
          startMs: partStartMs,
          endMs: partEndMs
        });
      }
    }
  }
  return sessions;
}

export async function rebuildDayBlocks(dateStr: string, sessions: StudySession[]) {
  const allData = await studyDataStorage.getValue();
  let todayData = allData.find(d => d.date === dateStr);
  
  if (!todayData) {
    todayData = { date: dateStr, blocks: [], totalSeconds: 0 };
    allData.push(todayData);
  }
  
  todayData.blocks = [];
  todayData.totalSeconds = 0;
  
  const sorted = [...sessions].sort((a,b) => a.startMs - b.startMs);
  
  for (const session of sorted) {
    const startMs = session.startMs;
    const endMs = session.endMs;
    const subjectId = session.subjectId;
    
    todayData.totalSeconds += Math.floor((endMs - startMs) / 1000);
    
    let currentMs = startMs;
    while (currentMs < endMs) {
      const d = new Date(currentMs);
      const hour = d.getHours();
      const minute = d.getMinutes();
      
      const adjustedHour = (hour + 19) % 24;
      const blockIndex = (adjustedHour * 6) + Math.floor(minute / 10);
      
      const blockStartMinute = Math.floor(minute / 10) * 10;
      const blockStartMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, blockStartMinute, 0, 0).getTime();
      const nextBoundary = blockStartMs + 600 * 1000;
      const nextMs = Math.min(nextBoundary, endMs);
      const overlapSeconds = (nextMs - currentMs) / 1000;
      
      let block = todayData.blocks.find(b => b.blockIndex === blockIndex);
      if (!block) {
        block = { date: dateStr, blockIndex, parts: [] };
        todayData.blocks.push(block);
      }
      
      const ratioToAdd = overlapSeconds / 600;
      const offsetRatio = (currentMs - blockStartMs) / (600 * 1000);
      
      block.parts.push({ 
        subjectId, 
        fillRatio: Math.min(ratioToAdd, 1.0), 
        offsetRatio: Math.max(0, Math.min(offsetRatio, 1.0)) 
      });
      
      currentMs = nextMs;
    }
  }
  
  await studyDataStorage.setValue(allData);
}
