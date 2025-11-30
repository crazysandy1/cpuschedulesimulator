import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Play, Pause, RotateCcw, RefreshCw, BarChart2, Clock, Cpu, Zap, Activity, FastForward } from 'lucide-react';

// --- Constants & Types ---
const ALGORITHMS = {
  FCFS: 'First Come First Serve (FCFS)',
  SJF: 'Shortest Job First (SJF - Non Preemptive)',
  PRIORITY: 'Priority (Non Preemptive)',
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

  return { schedule, completed };
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

  return { schedule, completed };
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

  return { schedule, completed };
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

  return { schedule, completed };
};

// --- Main Component ---

export default function App() {
  const [processes, setProcesses] = useState(INITIAL_PROCESSES);
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [quantum, setQuantum] = useState(2);
  
  // Simulation State
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per tick

  // Input State
  const [newPid, setNewPid] = useState('');
  const [newAt, setNewAt] = useState(0);
  const [newBt, setNewBt] = useState(1);
  const [newPriority, setNewPriority] = useState(1);

  // Derived Results
  const results = useMemo(() => {
    const procList = [...processes];
    let res = { schedule: [], completed: [] };
    
    switch (algorithm) {
      case 'FCFS': res = solveFCFS(procList); break;
      case 'SJF': res = solveSJF(procList); break;
      case 'PRIORITY': res = solvePriority(procList); break;
      case 'RR': res = solveRR(procList, parseInt(quantum) || 1); break;
      default: break;
    }

    const totalWT = res.completed.reduce((acc, p) => acc + p.waitingTime, 0);
    const totalTAT = res.completed.reduce((acc, p) => acc + p.turnaroundTime, 0);
    const avgWT = res.completed.length ? (totalWT / res.completed.length).toFixed(2) : 0;
    const avgTAT = res.completed.length ? (totalTAT / res.completed.length).toFixed(2) : 0;

    const totalDuration = res.schedule.length > 0 ? res.schedule[res.schedule.length - 1].end : 0;
    const busyTime = res.schedule.reduce((acc, item) => item.type === 'PROCESS' ? acc + item.duration : acc, 0);
    const utilization = totalDuration > 0 ? ((busyTime / totalDuration) * 100).toFixed(2) : 0;

    const metricsMap = {};
    res.completed.forEach(p => {
        metricsMap[p.id] = p;
    });

    const tableData = processes.map(p => ({
        ...p,
        ...metricsMap[p.id]
    }));

    return { ...res, avgWT, avgTAT, utilization, tableData, totalDuration };
  }, [processes, algorithm, quantum]);

  // Simulation Timer Effect
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTick(prev => {
          if (prev >= results.totalDuration) {
            setIsPlaying(false);
            return results.totalDuration;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, results.totalDuration, speed]);

  // Reset simulation when config changes
  useEffect(() => {
    setCurrentTick(0);
    setIsPlaying(false);
  }, [processes, algorithm, quantum]);

  // Determine active process at currentTick
  const activeProcess = useMemo(() => {
    if (currentTick === 0) return null;
    return results.schedule.find(item => item.start < currentTick && item.end >= currentTick);
  }, [currentTick, results.schedule]);

  // Handlers
  const addProcess = () => {
    const nextId = processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1;
    const pid = newPid || `P${nextId}`;
    setProcesses([...processes, { 
      id: nextId, 
      pid, 
      arrivalTime: Number(newAt), 
      burstTime: Number(newBt), 
      priority: Number(newPriority) 
    }]);
    setNewPid('');
    setNewAt(0);
    setNewBt(1);
  };

  const removeProcess = (id) => {
    setProcesses(processes.filter(p => p.id !== id));
  };

  const clearProcesses = () => {
    setProcesses([]);
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
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <Cpu className="w-8 h-8 text-blue-600" />
              CPU Scheduling Simulator
            </h1>
            <p className="text-gray-500 mt-1">Visualize and compare OS scheduling algorithms</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
             <button onClick={generateRandom} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
               <RefreshCw size={18} /> Random Data
             </button>
             <button onClick={clearProcesses} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
               <Trash2 size={18} /> Clear
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls & Input */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Algorithm Selection */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" /> Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                  <select 
                    value={algorithm} 
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {Object.entries(ALGORITHMS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                {algorithm === 'RR' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Quantum</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantum} 
                      onChange={(e) => setQuantum(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Add Process Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" /> Add Process
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">PID</label>
                    <input type="text" placeholder="Auto" value={newPid} onChange={e => setNewPid(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Arrival</label>
                    <input type="number" min="0" value={newAt} onChange={e => setNewAt(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Burst</label>
                    <input type="number" min="1" value={newBt} onChange={e => setNewBt(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Priority</label>
                    <input type="number" min="1" value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <button onClick={addProcess} className="w-full mt-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex justify-center items-center gap-2">
                  <Plus size={18} /> Add Process
                </button>
              </div>
            </div>
            
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-semibold uppercase">Avg Wait</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{results.avgWT} <span className="text-sm font-normal text-gray-400">ms</span></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Activity size={16} />
                        <span className="text-xs font-semibold uppercase">Avg TA</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{results.avgTAT} <span className="text-sm font-normal text-gray-400">ms</span></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Zap size={16} />
                        <span className="text-xs font-semibold uppercase">Usage</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{results.utilization}%</div>
                </div>
            </div>

          </div>

          {/* Right Column: Visualization & Data */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Simulation Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase text-gray-500">Current Time</span>
                  <span className="text-2xl font-mono font-bold text-blue-600">{currentTick} <span className="text-sm text-gray-400">/ {results.totalDuration}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-xs font-bold text-gray-400 uppercase">Speed</span>
                <input 
                  type="range" 
                  min="100" 
                  max="2000" 
                  step="100"
                  value={2100 - speed} 
                  onChange={(e) => setSpeed(2100 - Number(e.target.value))}
                  className="w-32 accent-blue-600"
                />
                <FastForward size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Gantt Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-orange-500" /> Gantt Chart Visualization
              </h2>
              
              <div className="relative pt-6 pb-2 select-none">
                <div className="flex h-16 w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                    {results.schedule.length === 0 && (
                         <div className="w-full flex items-center justify-center text-gray-400 text-sm">No processes to schedule</div>
                    )}
                    {results.schedule.map((item, index) => {
                        const width = (item.duration / results.totalDuration) * 100;
                        return (
                            <div 
                                key={index}
                                style={{ width: `${width}%` }}
                                className={`h-full flex flex-col items-center justify-center border-r border-white/20 relative
                                    ${item.type === 'IDLE' ? 'bg-gray-100 pattern-diagonal-lines' : getColor(item.pid)}
                                `}
                            >
                                {item.type !== 'IDLE' && (
                                    <span className="text-white font-bold text-sm truncate w-full text-center px-1">
                                        {item.pid}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                    
                    {/* Time Progress Overlay (Curtain) */}
                    <div 
                      className="absolute top-0 right-0 h-full bg-white/70 backdrop-blur-[1px] transition-all duration-300 border-l-2 border-red-500 z-10"
                      style={{ width: `${100 - ((currentTick / results.totalDuration) * 100)}%` }}
                    ></div>
                </div>
                
                {/* Time Markers */}
                <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                    <span>0</span>
                    {results.totalDuration > 0 && <span>{results.totalDuration}</span>}
                </div>
              </div>
            </div>

            {/* Process Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Process Details & Metrics
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">PID</th>
                      <th className="p-4 font-semibold">Arrival</th>
                      <th className="p-4 font-semibold">Burst</th>
                      <th className="p-4 font-semibold">Priority</th>
                      <th className="p-4 font-semibold text-blue-600">Completion</th>
                      <th className="p-4 font-semibold text-blue-600">Turnaround</th>
                      <th className="p-4 font-semibold text-blue-600">Waiting</th>
                      <th className="p-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.tableData.map((p) => {
                      const isActive = activeProcess?.pid === p.pid && activeProcess?.type === 'PROCESS';
                      const isFinished = p.completionTime !== undefined && p.completionTime <= currentTick;

                      return (
                        <tr key={p.id} className={`transition-all duration-300 text-sm 
                          ${isActive ? 'bg-blue-50 scale-[1.01] shadow-sm z-10 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'} 
                          ${isFinished ? 'text-gray-400' : 'text-gray-700'}`
                        }>
                          <td className="p-4 font-medium flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${getColor(p.pid)} ${isActive ? 'animate-pulse ring-2 ring-offset-1 ring-blue-300' : ''}`}></span>
                              {p.pid}
                              {isActive && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Running</span>}
                              {isFinished && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Done</span>}
                          </td>
                          <td className="p-4">{p.arrivalTime}</td>
                          <td className="p-4">{p.burstTime}</td>
                          <td className="p-4">{p.priority}</td>
                          <td className="p-4 font-mono font-medium text-blue-700">
                            {isFinished ? p.completionTime : '-'}
                          </td>
                          <td className="p-4 font-mono font-medium text-blue-700">
                            {isFinished ? p.turnaroundTime : '-'}
                          </td>
                          <td className="p-4 font-mono font-medium text-blue-700">
                            {isFinished ? p.waitingTime : '-'}
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => removeProcess(p.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {processes.length === 0 && (
                        <tr>
                            <td colSpan="8" className="p-8 text-center text-gray-400">
                                No processes added. Add a process or generate random data to begin.
                            </td>
                        </tr>
                    )}
                  </tbody>
                  {processes.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold text-gray-700 text-sm">
                        <tr>
                            <td colSpan="5" className="p-4 text-right uppercase text-xs tracking-wider text-gray-500">Averages</td>
                            <td className="p-4 font-mono text-blue-700">{results.avgTAT}</td>
                            <td className="p-4 font-mono text-blue-700">{results.avgWT}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}