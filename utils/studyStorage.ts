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
