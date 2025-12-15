import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Play, Pause, RotateCcw, RefreshCw, BarChart2, Clock, Cpu, Zap, Activity, FastForward, Layout, Layers } from 'lucide-react';

// --- Constants & Types ---
const ALGORITHMS = {
  FCFS: 'First Come First Serve (FCFS)',
  SJF: 'Shortest Job First (SJF)',
  PRIORITY: 'Priority (Non-Preemptive)',
  RR: 'Round Robin (RR)',
};

const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];

const INITIAL_PROCESSES = [
  { id: 1, pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 1 },
  { id: 2, pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 2 },
  { id: 3, pid: 'P3', arrivalTime: 2, burstTime: 1, priority: 3 },
  { id: 4, pid: 'P4', arrivalTime: 3, burstTime: 2, priority: 4 },
  { id: 5, pid: 'P5', arrivalTime: 4, burstTime: 5, priority: 5 },
];

// --- Helper Functions ---

const calculateMetrics = (completed, schedule) => {
  const totalWT = completed.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTAT = completed.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const avgWT = completed.length ? (totalWT / completed.length).toFixed(2) : 0;
  const avgTAT = completed.length ? (totalTAT / completed.length).toFixed(2) : 0;
  
  const totalDuration = schedule.length > 0 ? schedule[schedule.length - 1].end : 0;
  const busyTime = schedule.reduce((acc, item) => item.type === 'PROCESS' ? acc + item.duration : acc, 0);
  const utilization = totalDuration > 0 ? ((busyTime / totalDuration) * 100).toFixed(2) : 0;

  return { avgWT, avgTAT, utilization, totalDuration };
};

const solveFCFS = (processes) => {
  let currentTime = 0;
  const schedule = [];
  const completed = [];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  sorted.forEach((process) => {
    if (currentTime < process.arrivalTime) {
      schedule.push({ type: 'IDLE', start: currentTime, end: process.arrivalTime, duration: process.arrivalTime - currentTime });
      currentTime = process.arrivalTime;
    }
    const start = currentTime;
    const end = start + process.burstTime;
    schedule.push({ ...process, type: 'PROCESS', start, end, duration: process.burstTime });
    completed.push({
      ...process,
      completionTime: end,
      turnaroundTime: end - process.arrivalTime,
      waitingTime: end - process.arrivalTime - process.burstTime
    });
    currentTime = end;
  });
  return { schedule, completed, ...calculateMetrics(completed, schedule) };
};

const solveSJF = (processes) => {
  let currentTime = 0;
  let completedCount = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const schedule = [];
  const completed = [];
  
  while (completedCount < n) {
    const available = processes
      .map((p, i) => ({ ...p, originalIndex: i }))
      .filter((p, i) => p.arrivalTime <= currentTime && !isCompleted[i]);

    if (available.length === 0) {
      const nextArrival = Math.min(...processes.filter((p, i) => !isCompleted[i]).map(p => p.arrivalTime));
      schedule.push({ type: 'IDLE', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
      currentTime = nextArrival;
      continue;
    }

    available.sort((a, b) => {
      if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
      return a.arrivalTime - b.arrivalTime;
    });

    const process = available[0];
    const start = currentTime;
    const end = start + process.burstTime;
    schedule.push({ ...process, type: 'PROCESS', start, end, duration: process.burstTime });
    completed.push({
      ...process,
      completionTime: end,
      turnaroundTime: end - process.arrivalTime,
      waitingTime: end - process.arrivalTime - process.burstTime
    });

    isCompleted[process.originalIndex] = true;
    completedCount++;
    currentTime = end;
  }
  return { schedule, completed, ...calculateMetrics(completed, schedule) };
};

const solvePriority = (processes) => {
  let currentTime = 0;
  let completedCount = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const schedule = [];
  const completed = [];

  while (completedCount < n) {
    const available = processes
      .map((p, i) => ({ ...p, originalIndex: i }))
      .filter((p, i) => p.arrivalTime <= currentTime && !isCompleted[i]);

    if (available.length === 0) {
      const nextArrival = Math.min(...processes.filter((p, i) => !isCompleted[i]).map(p => p.arrivalTime));
      schedule.push({ type: 'IDLE', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
      currentTime = nextArrival;
      continue;
    }

    available.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.arrivalTime - b.arrivalTime;
    });

    const process = available[0];
    const start = currentTime;
    const end = start + process.burstTime;
    schedule.push({ ...process, type: 'PROCESS', start, end, duration: process.burstTime });
    completed.push({
      ...process,
      completionTime: end,
      turnaroundTime: end - process.arrivalTime,
      waitingTime: end - process.arrivalTime - process.burstTime
    });

    isCompleted[process.originalIndex] = true;
    completedCount++;
    currentTime = end;
  }
  return { schedule, completed, ...calculateMetrics(completed, schedule) };
};

const solveRR = (processes, quantum) => {
  let currentTime = 0;
  const schedule = [];
  const completed = [];
  let remProcesses = processes
    .map(p => ({ ...p, remainingTime: p.burstTime, startTime: -1 }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  const queue = [];
  let i = 0;
  while(i < remProcesses.length && remProcesses[i].arrivalTime <= currentTime) {
    queue.push(remProcesses[i]);
    i++;
  }

  while (queue.length > 0 || i < remProcesses.length) {
    if (queue.length === 0) {
       const nextArrival = remProcesses[i].arrivalTime;
       schedule.push({ type: 'IDLE', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
       currentTime = nextArrival;
       
       while(i < remProcesses.length && remProcesses[i].arrivalTime <= currentTime) {
        queue.push(remProcesses[i]);
        i++;
       }
    }

    const currentProcess = queue.shift();
    const executeTime = Math.min(currentProcess.remainingTime, quantum);
    const start = currentTime;
    const end = currentTime + executeTime;

    schedule.push({ ...currentProcess, type: 'PROCESS', start, end, duration: executeTime });
    currentProcess.remainingTime -= executeTime;
    currentTime = end;

    while(i < remProcesses.length && remProcesses[i].arrivalTime <= currentTime) {
        queue.push(remProcesses[i]);
        i++;
    }

    if (currentProcess.remainingTime > 0) {
      queue.push(currentProcess);
    } else {
      completed.push({
        ...currentProcess,
        completionTime: end,
        turnaroundTime: end - currentProcess.arrivalTime,
        waitingTime: end - currentProcess.arrivalTime - currentProcess.burstTime
      });
    }
  }
  return { schedule, completed, ...calculateMetrics(completed, schedule) };
};

// --- Sub-Components ---

const GanttChart = ({ schedule, totalDuration, currentTick, label }) => {
  const getColor = (pid) => {
    const num = parseInt(pid.replace(/\D/g, '')) || 0;
    return COLORS[num % COLORS.length];
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-700 text-sm">{label}</h3>
        <span className="text-xs text-gray-400 font-mono">Total Time: {totalDuration}ms</span>
      </div>
      <div className="relative pt-2 pb-2 select-none">
        <div className="flex h-10 w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
          {schedule.map((item, index) => {
            const width = (item.duration / totalDuration) * 100;
            return (
              <div 
                key={index}
                style={{ width: `${width}%` }}
                className={`h-full flex flex-col items-center justify-center border-r border-white/20 relative
                  ${item.type === 'IDLE' ? 'bg-gray-100 pattern-diagonal-lines' : getColor(item.pid)}
                `}
                title={`${item.type === 'IDLE' ? 'Idle' : item.pid} (${item.duration}ms)`}
              >
                {item.type !== 'IDLE' && (
                  <span className="text-white font-bold text-xs truncate w-full text-center px-1">
                    {item.pid}
                  </span>
                )}
              </div>
            )
          })}
          {/* Time Progress Overlay */}
          <div 
            className="absolute top-0 right-0 h-full bg-white/70 backdrop-blur-[1px] transition-all duration-300 border-l-2 border-red-500 z-10"
            style={{ width: `${Math.max(0, 100 - ((currentTick / totalDuration) * 100))}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const ComparisonBarChart = ({ data }) => {
  // Ensure maxVal is at least 1 to prevent division by zero or NaN errors if data is empty/zero
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.avgWT, d.avgTAT)));
  
  return (
    <div className="h-64 flex items-end justify-between gap-4 pt-8 pb-2 px-2">
      {data.map((item) => (
        <div key={item.name} className="flex-1 flex flex-col items-center h-full justify-end gap-2 group">
           {/* Chart Area: Uses flex-1 to fill the remaining height above the label */}
           <div className="w-full flex justify-center items-end gap-1 flex-1 relative border-b border-gray-100 pb-1">
              {/* Waiting Time Bar */}
              <div 
                style={{ height: `${(item.avgWT / maxVal) * 100}%` }}
                className="w-full max-w-[40px] bg-blue-500 rounded-t-sm relative transition-all duration-500 opacity-90 hover:opacity-100 hover:shadow-md"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                   WT: {item.avgWT}ms
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
              
              {/* TAT Bar */}
              <div 
                style={{ height: `${(item.avgTAT / maxVal) * 100}%` }}
                className="w-full max-w-[40px] bg-purple-500 rounded-t-sm relative transition-all duration-500 opacity-90 hover:opacity-100 hover:shadow-md"
              >
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                   TAT: {item.avgTAT}ms
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
           </div>
           <span className="text-xs font-semibold text-gray-500 mt-2">{item.name}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---

export default function App() {
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'compare'
  const [processes, setProcesses] = useState(INITIAL_PROCESSES);
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [quantum, setQuantum] = useState(2);
  
  // Simulation State
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); 

  // Input State
  const [newPid, setNewPid] = useState('');
  const [newAt, setNewAt] = useState(0);
  const [newBt, setNewBt] = useState(1);
  const [newPriority, setNewPriority] = useState(1);

  // Derived Results
  const results = useMemo(() => {
    const procList = [...processes];
    
    if (viewMode === 'compare') {
      const fcfs = solveFCFS(procList);
      const sjf = solveSJF(procList);
      const priority = solvePriority(procList);
      const rr = solveRR(procList, parseInt(quantum) || 1);
      
      const maxDuration = Math.max(fcfs.totalDuration, sjf.totalDuration, priority.totalDuration, rr.totalDuration);

      return {
        mode: 'compare',
        data: { FCFS: fcfs, SJF: sjf, PRIORITY: priority, RR: rr },
        maxDuration,
        comparisonData: [
          { name: 'FCFS', avgWT: Number(fcfs.avgWT), avgTAT: Number(fcfs.avgTAT) },
          { name: 'SJF', avgWT: Number(sjf.avgWT), avgTAT: Number(sjf.avgTAT) },
          { name: 'Priority', avgWT: Number(priority.avgWT), avgTAT: Number(priority.avgTAT) },
          { name: 'RR', avgWT: Number(rr.avgWT), avgTAT: Number(rr.avgTAT) },
        ]
      };
    }

    // Single Mode Calculation
    let res;
    switch (algorithm) {
      case 'FCFS': res = solveFCFS(procList); break;
      case 'SJF': res = solveSJF(procList); break;
      case 'PRIORITY': res = solvePriority(procList); break;
      case 'RR': res = solveRR(procList, parseInt(quantum) || 1); break;
      default: res = solveFCFS(procList);
    }
    
    const metricsMap = {};
    res.completed.forEach(p => { metricsMap[p.id] = p; });
    const tableData = processes.map(p => ({ ...p, ...metricsMap[p.id] }));

    return { mode: 'single', ...res, tableData };
  }, [processes, algorithm, quantum, viewMode]);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (isPlaying) {
      const maxTime = viewMode === 'compare' ? results.maxDuration : results.totalDuration;
      interval = setInterval(() => {
        setCurrentTick(prev => {
          if (prev >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, results, speed, viewMode]);

  useEffect(() => {
    setCurrentTick(0);
    setIsPlaying(false);
  }, [processes, algorithm, quantum, viewMode]);

  const addProcess = () => {
    const nextId = processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1;
    const pid = newPid || `P${nextId}`;
    setProcesses([...processes, { id: nextId, pid, arrivalTime: Number(newAt), burstTime: Number(newBt), priority: Number(newPriority) }]);
    setNewPid(''); setNewAt(0); setNewBt(1);
  };

  const generateRandom = () => {
    const count = 5;
    const newProcs = [];
    for(let i=0; i<count; i++) {
        newProcs.push({
            id: i+1,
            pid: `P${i+1}`,
            arrivalTime: Math.floor(Math.random() * 5),
            burstTime: Math.floor(Math.random() * 8) + 1,
            priority: Math.floor(Math.random() * 5) + 1
        });
    }
    setProcesses(newProcs);
  };

  const getColor = (pid) => {
    const num = parseInt(pid.replace(/\D/g, '')) || 0;
    return COLORS[num % COLORS.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Mode Switcher */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <Cpu className="w-8 h-8 text-blue-600" />
              CPU Scheduling Simulator
            </h1>
            <p className="text-gray-500 mt-1">Visualize and compare OS scheduling algorithms</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg mt-4 md:mt-0">
             <button 
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Layout size={16} /> Single Algorithm
             </button>
             <button 
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'compare' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Layers size={16} /> Compare All
             </button>
          </div>
        </header>

        {/* Global Controls Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-2 z-20">
            <div className="flex items-center gap-4 w-full lg:w-auto">
               <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className={`p-3 rounded-full transition-all ${isPlaying ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => { setCurrentTick(0); setIsPlaying(false); }}
                  className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase text-gray-500">Current Time</span>
                  <span className="text-2xl font-mono font-bold text-blue-600">
                    {currentTick} 
                    <span className="text-sm text-gray-400">
                         / {viewMode === 'compare' ? results.maxDuration : results.totalDuration}
                    </span>
                  </span>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
               <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                 <span className="text-xs font-bold text-gray-400 uppercase">Speed</span>
                 <input 
                   type="range" min="100" max="2000" step="100"
                   value={2100 - speed} 
                   onChange={(e) => setSpeed(2100 - Number(e.target.value))}
                   className="w-24 accent-blue-600"
                 />
               </div>
               
               {viewMode === 'compare' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-xs font-bold text-purple-600 uppercase">RR Quantum</span>
                    <input 
                      type="number" min="1" value={quantum} 
                      onChange={(e) => setQuantum(e.target.value)}
                      className="w-12 p-1 text-center bg-white border border-purple-200 rounded text-sm font-bold text-purple-700"
                    />
                  </div>
               )}

               <button onClick={generateRandom} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm">
                 <RefreshCw size={16} /> Random Data
               </button>
            </div>
        </div>

        {viewMode === 'single' ? (
          // --- SINGLE VIEW MODE ---
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
              {/* Algorithm Config */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" /> Configuration
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                    <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      {Object.entries(ALGORITHMS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {algorithm === 'RR' && (
                    <div className="animate-fade-in">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Quantum</label>
                      <input type="number" min="1" value={quantum} onChange={(e) => setQuantum(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Process */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-green-500" /> Add Process</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 uppercase">PID</label><input type="text" placeholder="Auto" value={newPid} onChange={e => setNewPid(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg" /></div>
                    <div><label className="text-xs font-semibold text-gray-500 uppercase">Arrival</label><input type="number" min="0" value={newAt} onChange={e => setNewAt(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 uppercase">Burst</label><input type="number" min="1" value={newBt} onChange={e => setNewBt(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg" /></div>
                    <div><label className="text-xs font-semibold text-gray-500 uppercase">Priority</label><input type="number" min="1" value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg" /></div>
                  </div>
                  <button onClick={addProcess} className="w-full mt-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Process</button>
                </div>
              </div>
              
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <span className="text-xs font-semibold uppercase text-gray-500">Avg Wait</span>
                      <div className="text-2xl font-bold text-gray-800">{results.avgWT}ms</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <span className="text-xs font-semibold uppercase text-gray-500">Avg TAT</span>
                      <div className="text-2xl font-bold text-gray-800">{results.avgTAT}ms</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <span className="text-xs font-semibold uppercase text-gray-500">Usage</span>
                      <div className="text-2xl font-bold text-gray-800">{results.utilization}%</div>
                  </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <GanttChart schedule={results.schedule} totalDuration={results.totalDuration} currentTick={currentTick} label="Gantt Visualization" />
              
              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">PID</th>
                        <th className="p-4 font-semibold">Arrival</th>
                        <th className="p-4 font-semibold">Burst</th>
                        <th className="p-4 font-semibold text-blue-600">Finish</th>
                        <th className="p-4 font-semibold text-blue-600">TAT</th>
                        <th className="p-4 font-semibold text-blue-600">WT</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {results.tableData.map((p) => (
                        <tr key={p.id}>
                          <td className="p-4 font-medium flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${getColor(p.pid)}`}></span>{p.pid}</td>
                          <td className="p-4">{p.arrivalTime}</td>
                          <td className="p-4">{p.burstTime}</td>
                          <td className="p-4 font-mono text-blue-700">{p.completionTime ?? '-'}</td>
                          <td className="p-4 font-mono text-blue-700">{p.turnaroundTime ?? '-'}</td>
                          <td className="p-4 font-mono text-blue-700">{p.waitingTime ?? '-'}</td>
                          <td className="p-4 text-center"><button onClick={() => setProcesses(processes.filter(x => x.id !== p.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // --- COMPARE ALL MODE ---
          <div className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <GanttChart label="FCFS" schedule={results.data.FCFS.schedule} totalDuration={results.maxDuration} currentTick={currentTick} />
                  <GanttChart label="Priority (Non-P)" schedule={results.data.PRIORITY.schedule} totalDuration={results.maxDuration} currentTick={currentTick} />
                </div>
                <div className="space-y-4">
                  <GanttChart label="SJF (Non-P)" schedule={results.data.SJF.schedule} totalDuration={results.maxDuration} currentTick={currentTick} />
                  <GanttChart label={`Round Robin (Q=${quantum})`} schedule={results.data.RR.schedule} totalDuration={results.maxDuration} currentTick={currentTick} />
                </div>
             </div>
             
             {/* Performance Comparison */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-orange-500" /> Performance Comparison
                   </h2>
                   <div className="flex items-center gap-4 mb-4 text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Waiting Time (Lower is Better)</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div> Turnaround Time (Lower is Better)</div>
                   </div>
                   <ComparisonBarChart data={results.comparisonData} />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" /> Stats Summary
                    </h2>
                    <div className="space-y-4">
                        {results.comparisonData.map(d => (
                            <div key={d.name} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                <span className="font-medium text-gray-700">{d.name}</span>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 uppercase">Avg Wait</div>
                                    <div className="font-bold text-blue-600">{d.avgWT}ms</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}