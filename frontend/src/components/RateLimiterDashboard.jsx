import React, { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js core components register kar rahe hain
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function RateLimiterDashboard() {
  const [userId, setUserId] = useState('priyanka');
  const [capacity, setCapacity] = useState(5);
  const [loopCount, setLoopCount] = useState(15);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Real-time metrics values
  const [metrics, setMetrics] = useState({ allowed: 0, blocked: 0 });

  // Graph timeline data tracking streams
  const [chartTimeline, setChartTimeline] = useState({ labels: [], allowedData: [], blockedData: [] });

  const consoleEndRef = useRef(null);
  const baseUrl = "https://distributed-rate-limiter-8yg9.onrender.com";

  // 🔄 Function: Live server metrics stream read karna
  const fetchCloudMetrics = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        const currentAllowed = data.allowed || 0;
        const currentBlocked = data.blocked || 0;

        setMetrics({ allowed: currentAllowed, blocked: currentBlocked });

        // Update timeline tracking metrics arrays (Max 15 coordinates on screen)
        setChartTimeline(prev => {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const updatedLabels = [...prev.labels, now].slice(-15);
          const updatedAllowed = [...prev.allowedData, currentAllowed].slice(-15);
          const updatedBlocked = [...prev.blockedData, currentBlocked].slice(-15);

          return {
            labels: updatedLabels,
            allowedData: updatedAllowed,
            blockedData: updatedBlocked
          };
        });
      }
    } catch (err) {
      console.log("Telemetry analytics sync active waiting...");
    }
  };

  // Background live sync auto poll every 2 seconds
  useEffect(() => {
    fetchCloudMetrics();
    const interval = setInterval(fetchCloudMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs terminal
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ⚡ Load Simulation Trigger
  const fireBurstTraffic = async () => {
    setIsRunning(true);
    setLogs([{ type: 'system', text: `[SYSTEM] Initializing structural async loop for ${loopCount} hits...` }]);

    for (let i = 1; i <= loopCount; i++) {
      const targetUrl = `${baseUrl}/api/hello?userId=${userId}&capacity=${capacity}`;

      try {
        const response = await fetch(targetUrl);
        const dataText = await response.text();

        if (response.status === 200) {
          setLogs(prev => [...prev, { type: 'success', text: `✔ Success (${i}): ${dataText}` }]);
        } else if (response.status === 429) {
          setLogs(prev => [...prev, { type: 'blocked', text: `❌ Blocked Cloud (${i}): [Status 429] Rate Limit Exceeded!` }]);
        } else {
          setLogs(prev => [...prev, { type: 'error', text: `⚠ Error (${i}): [Status ${response.status}] ${dataText}` }]);
        }
      } catch (err) {
        setLogs(prev => [...prev, { type: 'error', text: `💥 Connection Failure (${i}): Check network pipelines.` }]);
      }

      await fetchCloudMetrics();
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    setLogs(prev => [...prev, { type: 'system', text: '[SYSTEM] Simulation completed. Telemetry pipeline synced.' }]);
    setIsRunning(false);
  };

  // --- 🔥 Grafana Dark Theme Visual Configuration ---
  const chartData = {
    labels: chartTimeline.labels,
    datasets: [
      {
        label: 'Allowed Requests (200 OK)',
        data: chartTimeline.allowedData,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Blocked Requests (429 Limited)',
        data: chartTimeline.blockedData,
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', stepSize: 5 } }
    }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', gap: '24px', padding: '20px', background: '#020617', minHeight: '100vh', fontFamily: 'monospace', color: '#cbd5e1' }}>

      {/* LEFT PANEL: TRAFFIC CONSOLE */}
      <div className="card" style={{ flex: 1, background: '#0f172a', borderRadius: '12px', padding: '24px', border: '1px solid #1e293b' }}>
        <div className="title-cyan" style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold' }}>Distributed Rate Limiter Console</div>
        <div className="subtitle" style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', marginBottom: '20px' }}>Simulate immediate dynamic traffic loads to audit the multi-node Token Bucket execution engine.</div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="label" style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>User Identity Key</label>
          <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', padding: '10px', borderRadius: '6px', color: '#fff', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Burst Capacity</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', padding: '10px', borderRadius: '6px', color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Loop Count Hits</label>
            <input type="number" value={loopCount} onChange={(e) => setLoopCount(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', padding: '10px', borderRadius: '6px', color: '#fff' }} />
          </div>
        </div>

        <button onClick={fireBurstTraffic} disabled={isRunning} style={{ width: '100%', padding: '12px', background: isRunning ? '#334155' : '#06b6d4', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isRunning ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
          {isRunning ? '🚀 Processing Cloud Streams...' : '⚡ Fire Traffic Simulation'}
        </button>

        {/* TERMINAL LOGS */}
        <div style={{ marginTop: '24px' }}>
          <label className="label" style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Live Terminal Logs:</label>
          <div className="terminal-box" style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', height: '180px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.6' }}>
            {logs.length === 0 && <span style={{ color: '#475569' }}>// Standing by. Configure parameters and click fire.</span>}
            {logs.map((log, idx) => (
              <div key={idx} style={{ color: log.type === 'success' ? '#4ade80' : log.type === 'blocked' ? '#f87171' : log.type === 'system' ? '#38bdf8' : '#ef4444', marginBottom: '4px' }}>
                {log.text}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: REAL-TIME GRAPH (GRAFANA BYPASS) */}
      <div className="card" style={{ flex: 1, background: '#0f172a', borderRadius: '12px', padding: '24px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div className="title-purple" style={{ color: '#c084fc', fontSize: '20px', fontWeight: 'bold' }}>📈 Live Time-Series Telemetry</div>
          <div className="subtitle" style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Dynamic time-series analysis rendering live data packets directly streamed from memory nodes.</div>
        </div>

        {/* GRAFANA STYLE CHART WRAPPER */}
        <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', height: '240px', position: 'relative' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* CORE ANALYTICAL COUNTERS PANEL */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, background: '#020617', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #4ade80', border: '1px solid #1e293b', borderLeftWidth: '4px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ALLOWED COUNT</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#4ade80', marginTop: '4px' }}>{metrics.allowed}</div>
          </div>
          <div style={{ flex: 1, background: '#020617', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #f87171', border: '1px solid #1e293b', borderLeftWidth: '4px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>LIMITED (429) COUNT</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f87171', marginTop: '4px' }}>{metrics.blocked}</div>
          </div>
        </div>

        {/* INFRASTRUCTURE HARDWARE MAP STATUS */}
        <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
            <span>Metrics Engine: <strong style={{ color: '#22d3ee' }}>Internal TimeSeries</strong></span>
            <span>Sync Connection: <strong style={{ color: '#4ade80' }}>Active Stream</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
}