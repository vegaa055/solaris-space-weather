import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────
const NOAA_BASE = "https://services.swpc.noaa.gov";
const ENDPOINTS = {
  kpIndex: `${NOAA_BASE}/products/noaa-planetary-k-index.json`,
  kpForecast: `${NOAA_BASE}/products/noaa-planetary-k-index-forecast.json`,
  scales: `${NOAA_BASE}/products/noaa-scales.json`,
  alerts: `${NOAA_BASE}/products/alerts.json`,
  solarFlux: `${NOAA_BASE}/json/f107_cm_flux.json`,
  sunspots: `${NOAA_BASE}/json/sunspot_report.json`,
  solarRegions: `${NOAA_BASE}/json/solar_regions.json`,
  solarProbs: `${NOAA_BASE}/json/solar_probabilities.json`,
  xray: `${NOAA_BASE}/json/goes/primary/xray-flares-latest.json`,
  dst: `${NOAA_BASE}/products/kyoto-dst.json`,
  flux30: `${NOAA_BASE}/products/10cm-flux-30-day.json`,
};

const KP_COLORS = [
  "#2ecc71", "#2ecc71", "#2ecc71", "#2ecc71",  // 0-3: green (quiet)
  "#f1c40f",  // 4: yellow (unsettled)
  "#e67e22",  // 5: orange (storm)
  "#e74c3c",  // 6: red (strong storm)
  "#c0392b",  // 7: dark red (severe)
  "#8e44ad",  // 8: purple (extreme)
  "#6c3483",  // 9: dark purple (extreme)
];

const SCALE_COLORS = {
  "0": "#2ecc71", "1": "#f1c40f", "2": "#e67e22",
  "3": "#e74c3c", "4": "#c0392b", "5": "#8e44ad",
};

const SCALE_LABELS = {
  R: "Radio Blackout", S: "Solar Radiation", G: "Geomagnetic Storm",
};

// ─── Utility ─────────────────────────────────────────────────────────
const fetchJSON = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.warn(`Fetch failed: ${url}`, e);
    return null;
  }
};

const formatTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso.includes("Z") || iso.includes("+") ? iso : iso + "Z");
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return iso; }
};

const timeAgo = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso.includes("Z") || iso.includes("+") ? iso : iso + "Z");
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  } catch { return ""; }
};

// ─── Components ──────────────────────────────────────────────────────

function ScanLine() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: "none", zIndex: 9999,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.3), transparent)",
        animation: "scanMove 4s linear infinite",
      }} />
    </div>
  );
}

function StatusPill({ level, type }) {
  const num = parseInt(level) || 0;
  const color = SCALE_COLORS[String(num)] || SCALE_COLORS["0"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 12px", borderRadius: "4px",
      background: `${color}15`, border: `1px solid ${color}40`,
    }}>
      <span style={{
        fontFamily: "'Courier New', monospace", fontWeight: 700,
        fontSize: "18px", color,
      }}>{type}{num}</span>
      <span style={{
        fontSize: "11px", color: "#8899aa", fontFamily: "'Courier New', monospace",
      }}>{SCALE_LABELS[type]}</span>
    </div>
  );
}

function KpBar({ value, time }) {
  const kp = Math.round(parseFloat(value) || 0);
  const color = KP_COLORS[Math.min(kp, 9)];
  const height = Math.max(8, (kp / 9) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flex: 1 }}>
      <span style={{ fontSize: "10px", fontFamily: "'Courier New', monospace", color }}>{kp}</span>
      <div style={{
        width: "100%", maxWidth: "28px", height: "80px",
        background: "#0a1520", borderRadius: "2px", position: "relative",
        display: "flex", alignItems: "flex-end", border: "1px solid #1a2a3a",
      }}>
        <div style={{
          width: "100%", height: `${height}%`, background: color,
          borderRadius: "1px", transition: "height 0.6s ease",
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
      <span style={{
        fontSize: "8px", color: "#556677", fontFamily: "'Courier New', monospace",
        writingMode: "horizontal-tb", textAlign: "center", maxWidth: "32px",
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>
        {time ? new Date(time.includes("Z") ? time : time + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
      </span>
    </div>
  );
}

function GlowCard({ title, children, color = "#00ff88", span = 1 }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0a1a2e 0%, #0d1f35 100%)",
      border: `1px solid ${color}25`,
      borderRadius: "6px", padding: "16px",
      gridColumn: span > 1 ? `span ${span}` : undefined,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
      }} />
      <div style={{
        fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px",
        color: `${color}bb`, marginBottom: "12px",
        fontFamily: "'Courier New', monospace", fontWeight: 700,
      }}>{title}</div>
      {children}
    </div>
  );
}

function BigNumber({ value, unit, sub, color = "#00ff88" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: "36px", fontWeight: 700, color,
        fontFamily: "'Courier New', monospace",
        textShadow: `0 0 20px ${color}40`,
        lineHeight: 1.1,
      }}>
        {value}<span style={{ fontSize: "14px", opacity: 0.6 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: "11px", color: "#667788", marginTop: "4px", fontFamily: "'Courier New', monospace" }}>{sub}</div>}
    </div>
  );
}

function AlertItem({ alert }) {
  const isWarning = (alert.message || "").toLowerCase().includes("warning");
  const isWatch = (alert.message || "").toLowerCase().includes("watch");
  const accentColor = isWarning ? "#e74c3c" : isWatch ? "#f39c12" : "#00ff88";
  return (
    <div style={{
      padding: "10px 12px", borderLeft: `3px solid ${accentColor}`,
      background: `${accentColor}08`, marginBottom: "8px", borderRadius: "0 4px 4px 0",
    }}>
      <div style={{
        fontSize: "11px", fontWeight: 700, color: accentColor,
        fontFamily: "'Courier New', monospace", marginBottom: "4px",
      }}>
        {(alert.message || "Alert").substring(0, 80)}
      </div>
      <div style={{ fontSize: "10px", color: "#556677", fontFamily: "'Courier New', monospace" }}>
        {formatTime(alert.issue_datetime)} — {timeAgo(alert.issue_datetime)}
      </div>
    </div>
  );
}

function SolarProbRow({ label, prob1, prob2, prob3 }) {
  const barColor = (val) => {
    const n = parseInt(val) || 0;
    if (n >= 50) return "#e74c3c";
    if (n >= 25) return "#f39c12";
    if (n >= 10) return "#f1c40f";
    return "#2ecc71";
  };
  const ProbBar = ({ val }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{
        height: "6px", background: "#0a1520", borderRadius: "3px",
        overflow: "hidden", marginBottom: "3px",
      }}>
        <div style={{
          width: `${Math.min(parseInt(val) || 0, 100)}%`,
          height: "100%", background: barColor(val), borderRadius: "3px",
          transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: "11px", fontFamily: "'Courier New', monospace", color: barColor(val) }}>
        {val}%
      </span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{
        width: "40px", fontSize: "11px", color: "#8899aa",
        fontFamily: "'Courier New', monospace", fontWeight: 700,
      }}>{label}</span>
      <ProbBar val={prob1} />
      <ProbBar val={prob2} />
      <ProbBar val={prob3} />
    </div>
  );
}

function MiniSparkline({ data, color = "#00ff88", height = 40 }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => parseFloat(d) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const points = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height: `${height}px` }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#grad-${color.replace("#","")})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Main App ────────────────────────────────────────────────────────
export default function SpaceWeatherDashboard() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState("overview");
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    const results = {};
    const fetches = Object.entries(ENDPOINTS).map(async ([key, url]) => {
      results[key] = await fetchJSON(url);
    });
    await Promise.all(fetches);
    setData(results);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 300000); // 5 min
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // Parse data
  const scales = data.scales || {};
  const scaleR = scales["0"]?.R?.Scale ?? "0";
  const scaleS = scales["0"]?.S?.Scale ?? "0";
  const scaleG = scales["0"]?.G?.Scale ?? "0";

  const kpData = Array.isArray(data.kpIndex) ? data.kpIndex : [];
  const kpRecent = kpData.slice(-8);
  const latestKp = kpData.length > 0 ? kpData[kpData.length - 1] : null;

  const alerts = Array.isArray(data.alerts)
    ? data.alerts.slice(0, 8)
    : [];

  const solarFlux = Array.isArray(data.solarFlux) ? data.solarFlux : [];
  const latestFlux = solarFlux.length > 0 ? solarFlux[solarFlux.length - 1] : null;
  const fluxValues = solarFlux.slice(-30).map(d => d?.flux || d?.adjusted_flux || 0);

  const sunspots = Array.isArray(data.sunspots) ? data.sunspots : [];
  const latestSunspot = sunspots.length > 0 ? sunspots[sunspots.length - 1] : null;

  const regions = Array.isArray(data.solarRegions) ? data.solarRegions : [];
  const uniqueRegions = [];
  const seenRegions = new Set();
  for (const r of regions) {
    const num = r.Region || r.region;
    if (num && !seenRegions.has(num)) {
      seenRegions.add(num);
      uniqueRegions.push(r);
    }
  }

  const probs = Array.isArray(data.solarProbs) ? data.solarProbs : [];
  const latestProb = probs.length > 0 ? probs[0] : null;

  const dst = Array.isArray(data.dst) ? data.dst : [];
  const dstValues = dst.slice(-24).map(d => {
    if (Array.isArray(d)) return parseFloat(d[1]) || 0;
    return parseFloat(d?.dst) || 0;
  });

  const xrayFlares = Array.isArray(data.xray) ? data.xray.slice(0, 5) : [];

  const kpForecast = Array.isArray(data.kpForecast) ? data.kpForecast : [];

  // Determine overall status
  const maxScale = Math.max(parseInt(scaleR) || 0, parseInt(scaleS) || 0, parseInt(scaleG) || 0);
  const statusText = maxScale === 0 ? "ALL QUIET" : maxScale <= 2 ? "MINOR ACTIVITY" : maxScale <= 3 ? "MODERATE STORM" : "SEVERE CONDITIONS";
  const statusColor = maxScale === 0 ? "#2ecc71" : maxScale <= 2 ? "#f1c40f" : maxScale <= 3 ? "#e67e22" : "#e74c3c";

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#060e18",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "16px",
      }}>
        <div style={{
          fontSize: "14px", color: "#00ff88", fontFamily: "'Courier New', monospace",
          animation: "pulse 1.5s ease infinite",
        }}>
          ⟨ ESTABLISHING UPLINK TO NOAA/SWPC ⟩
        </div>
        <div style={{
          width: "200px", height: "2px", background: "#0a1a2e", borderRadius: "1px",
          overflow: "hidden",
        }}>
          <div style={{
            width: "40%", height: "100%", background: "#00ff88",
            animation: "loadSlide 1.2s ease infinite",
          }} />
        </div>
        <style>{`
          @keyframes pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
          @keyframes loadSlide { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%, #0a1a2e 0%, #060e18 50%, #030810 100%)",
      color: "#c0d0e0", fontFamily: "'Courier New', monospace",
      padding: "0",
    }}>
      <ScanLine />

      <style>{`
        @keyframes scanMove {
          0% { transform: translateY(0) }
          100% { transform: translateY(100vh) }
        }
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a1520; }
        ::-webkit-scrollbar-thumb { background: #1a3a5a; border-radius: 3px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "20px 24px 12px",
        borderBottom: "1px solid #0f2035",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "10px", color: statusColor, animation: "blink 2s ease infinite" }}>●</div>
            <h1 style={{
              margin: 0, fontSize: "18px", fontWeight: 700,
              letterSpacing: "3px", textTransform: "uppercase",
              background: "linear-gradient(90deg, #00ff88, #00aaff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              SOLARIS — Space Weather Monitor
            </h1>
          </div>
          <div style={{
            fontSize: "10px", color: "#445566", marginTop: "6px", letterSpacing: "1px",
          }}>
            NOAA/SWPC LIVE DATA FEED — {lastUpdate?.toLocaleTimeString() ?? ""}
            <span style={{ marginLeft: "16px", color: statusColor, fontWeight: 700 }}>
              STATUS: {statusText}
            </span>
          </div>
        </div>
        <button onClick={fetchAll} style={{
          background: "#00ff8815", border: "1px solid #00ff8840",
          color: "#00ff88", padding: "6px 16px", borderRadius: "4px",
          cursor: "pointer", fontFamily: "'Courier New', monospace",
          fontSize: "10px", letterSpacing: "1px",
        }}>↻ REFRESH</button>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: "0", borderBottom: "1px solid #0f2035",
        padding: "0 24px",
      }}>
        {["overview", "solar", "alerts"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "#00ff8812" : "transparent",
            border: "none", borderBottom: tab === t ? "2px solid #00ff88" : "2px solid transparent",
            color: tab === t ? "#00ff88" : "#445566",
            padding: "10px 20px", cursor: "pointer",
            fontFamily: "'Courier New', monospace", fontSize: "11px",
            letterSpacing: "2px", textTransform: "uppercase",
            transition: "all 0.2s",
          }}>{t}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "16px 24px 32px", animation: "fadeIn 0.4s ease" }}>

        {tab === "overview" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}>
            {/* NOAA Scales */}
            <GlowCard title="NOAA Space Weather Scales" color="#00aaff">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <StatusPill level={scaleR} type="R" />
                <StatusPill level={scaleS} type="S" />
                <StatusPill level={scaleG} type="G" />
              </div>
              <div style={{ fontSize: "10px", color: "#445566", marginTop: "10px" }}>
                R = Radio Blackouts · S = Solar Radiation · G = Geomagnetic Storms
              </div>
            </GlowCard>

            {/* Kp Index */}
            <GlowCard title="Planetary Kp Index — Recent 24h" color="#00ff88" span={2}>
              <div style={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
                {kpRecent.map((kp, i) => (
                  <KpBar
                    key={i}
                    value={kp?.Kp ?? kp?.kp_index ?? kp?.kp ?? 0}
                    time={kp?.time_tag ?? kp?.date ?? ""}
                  />
                ))}
              </div>
              {latestKp && (
                <div style={{ marginTop: "8px", fontSize: "10px", color: "#556677" }}>
                  Latest: Kp {latestKp?.Kp ?? latestKp?.kp_index ?? "?"} at {formatTime(latestKp?.time_tag ?? latestKp?.date)}
                </div>
              )}
            </GlowCard>

            {/* Solar Flux */}
            <GlowCard title="10.7cm Solar Radio Flux" color="#ff6b35">
              <BigNumber
                value={latestFlux?.flux ?? latestFlux?.adjusted_flux ?? "—"}
                unit=" SFU"
                sub={latestFlux?.time_tag ? formatTime(latestFlux.time_tag) : ""}
                color="#ff6b35"
              />
              <div style={{ marginTop: "10px" }}>
                <MiniSparkline data={fluxValues} color="#ff6b35" />
              </div>
              <div style={{ fontSize: "10px", color: "#556677", marginTop: "4px" }}>Last 30 readings</div>
            </GlowCard>

            {/* Sunspot Number */}
            <GlowCard title="Sunspot Activity" color="#ffd700">
              <BigNumber
                value={latestSunspot?.Sunspot_Number ?? latestSunspot?.ssn ?? latestSunspot?.number ?? "—"}
                unit=""
                sub={`Active Regions: ${uniqueRegions.length}`}
                color="#ffd700"
              />
              {latestSunspot && (
                <div style={{ fontSize: "10px", color: "#556677", marginTop: "8px" }}>
                  Date: {latestSunspot?.Date || latestSunspot?.time_tag || latestSunspot?.Obsdate || "—"}
                </div>
              )}
            </GlowCard>

            {/* Dst Index */}
            <GlowCard title="Dst Index (Disturbance Storm Time)" color="#aa88ff">
              {dstValues.length > 0 ? (
                <>
                  <BigNumber
                    value={dstValues[dstValues.length - 1] || "—"}
                    unit=" nT"
                    sub="Latest hourly value"
                    color="#aa88ff"
                  />
                  <div style={{ marginTop: "10px" }}>
                    <MiniSparkline data={dstValues} color="#aa88ff" />
                  </div>
                </>
              ) : (
                <div style={{ color: "#445566", fontSize: "12px" }}>No Dst data available</div>
              )}
            </GlowCard>

            {/* Kp Forecast */}
            <GlowCard title="Kp Index Forecast" color="#00ccff" span={2}>
              {kpForecast.length > 0 ? (
                <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  {kpForecast.slice(0, 16).map((kp, i) => (
                    <KpBar
                      key={i}
                      value={kp?.kp ?? kp?.Kp ?? kp?.noaa_scale ?? 0}
                      time={kp?.time_tag ?? kp?.date ?? ""}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ color: "#445566", fontSize: "12px" }}>No forecast data</div>
              )}
              <div style={{ fontSize: "10px", color: "#445566", marginTop: "8px" }}>
                3-day forecast from NOAA/SWPC
              </div>
            </GlowCard>
          </div>
        )}

        {tab === "solar" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}>
            {/* Solar Flare Probabilities */}
            <GlowCard title="Solar Flare Probabilities" color="#ff6b35" span={2}>
              {latestProb ? (
                <>
                  <div style={{
                    display: "flex", gap: "8px", marginBottom: "8px",
                    paddingLeft: "48px",
                  }}>
                    {["Day 1", "Day 2", "Day 3"].map(d => (
                      <div key={d} style={{
                        flex: 1, textAlign: "center", fontSize: "10px",
                        color: "#667788", fontWeight: 700,
                      }}>{d}</div>
                    ))}
                  </div>
                  <SolarProbRow label="C" prob1={latestProb.C_1 ?? "?"} prob2={latestProb.C_2 ?? "?"} prob3={latestProb.C_3 ?? "?"} />
                  <SolarProbRow label="M" prob1={latestProb.M_1 ?? "?"} prob2={latestProb.M_2 ?? "?"} prob3={latestProb.M_3 ?? "?"} />
                  <SolarProbRow label="X" prob1={latestProb.X_1 ?? "?"} prob2={latestProb.X_2 ?? "?"} prob3={latestProb.X_3 ?? "?"} />
                  <SolarProbRow label="Prot." prob1={latestProb.Proton_1 ?? "?"} prob2={latestProb.Proton_2 ?? "?"} prob3={latestProb.Proton_3 ?? "?"} />
                </>
              ) : (
                <div style={{ color: "#445566", fontSize: "12px" }}>No probability data</div>
              )}
            </GlowCard>

            {/* X-Ray Flares */}
            <GlowCard title="Recent X-Ray Flares" color="#e74c3c">
              {xrayFlares.length > 0 ? (
                <div>
                  {xrayFlares.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "6px 0", borderBottom: "1px solid #0f2035",
                      fontSize: "11px",
                    }}>
                      <span style={{
                        color: (f.classtype || "").startsWith("X") ? "#e74c3c" :
                               (f.classtype || "").startsWith("M") ? "#e67e22" : "#f1c40f",
                        fontWeight: 700,
                      }}>
                        {f.classtype || "?"}
                      </span>
                      <span style={{ color: "#667788" }}>{formatTime(f.begin_time || f.max_time)}</span>
                      <span style={{ color: "#556677" }}>AR {f.active_region || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#445566", fontSize: "12px" }}>No recent flares</div>
              )}
            </GlowCard>

            {/* Active Regions */}
            <GlowCard title="Active Solar Regions" color="#ffd700" span={2}>
              {uniqueRegions.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%", fontSize: "11px", borderCollapse: "collapse",
                    fontFamily: "'Courier New', monospace",
                  }}>
                    <thead>
                      <tr style={{ color: "#667788", borderBottom: "1px solid #1a2a3a" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Region</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Location</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Class</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Spots</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueRegions.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #0f2035" }}>
                          <td style={{ padding: "6px 8px", color: "#ffd700", fontWeight: 700 }}>
                            {r.Region || r.region || "—"}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            {r.Location || r.latitude && r.longitude ? `${r.latitude || ""}${r.longitude || ""}` : "—"}
                          </td>
                          <td style={{ padding: "6px 8px" }}>{r.MagType || r["Mag Type"] || r.mag_type || "—"}</td>
                          <td style={{ padding: "6px 8px" }}>{r.Nmbr_Spots || r["Number Spots"] || r.spot_count || "—"}</td>
                          <td style={{ padding: "6px 8px" }}>{r.Area || r.area || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "#445566", fontSize: "12px" }}>No active region data</div>
              )}
            </GlowCard>

            {/* 30-day flux */}
            <GlowCard title="30-Day Solar Flux Trend" color="#ff6b35">
              <MiniSparkline data={fluxValues} color="#ff6b35" height={60} />
              <div style={{ fontSize: "10px", color: "#556677", marginTop: "4px" }}>
                10.7cm radio flux over time
              </div>
            </GlowCard>
          </div>
        )}

        {tab === "alerts" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}>
            <GlowCard title="Recent SWPC Alerts & Warnings" color="#e74c3c" span={2}>
              {alerts.length > 0 ? (
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
                </div>
              ) : (
                <div style={{
                  padding: "24px", textAlign: "center", color: "#2ecc71",
                  fontSize: "13px",
                }}>
                  ✓ No recent alerts — space weather is quiet
                </div>
              )}
            </GlowCard>

            <GlowCard title="Understanding NOAA Scales" color="#00aaff">
              <div style={{ fontSize: "11px", lineHeight: 1.8 }}>
                {[
                  { scale: "G1–G5", label: "Geomagnetic Storms", desc: "Power grid & satellite impact" },
                  { scale: "S1–S5", label: "Solar Radiation Storms", desc: "High-energy particle events" },
                  { scale: "R1–R5", label: "Radio Blackouts", desc: "HF radio & navigation disruption" },
                ].map(item => (
                  <div key={item.scale} style={{ marginBottom: "10px" }}>
                    <span style={{ color: "#00aaff", fontWeight: 700 }}>{item.scale}</span>
                    <span style={{ color: "#8899aa" }}> — {item.label}</span>
                    <div style={{ color: "#556677", fontSize: "10px", paddingLeft: "4px" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard title="Data Sources" color="#667788">
              <div style={{ fontSize: "11px", color: "#667788", lineHeight: 1.8 }}>
                <div>NOAA Space Weather Prediction Center</div>
                <div>DSCOVR & ACE Spacecraft (L1 point)</div>
                <div>GOES Satellite X-Ray Sensors</div>
                <div>Global Magnetometer Network</div>
                <div>Kyoto Dst Index Service</div>
                <div style={{ marginTop: "8px", color: "#445566", fontSize: "10px" }}>
                  Auto-refresh: 5 minutes
                </div>
              </div>
            </GlowCard>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "12px 24px", borderTop: "1px solid #0f2035",
        fontSize: "9px", color: "#334455", letterSpacing: "1px",
        textAlign: "center",
      }}>
        SOLARIS v1.0 — LIVE NOAA/SWPC DATA — NOT FOR OPERATIONAL USE — REFRESH INTERVAL 5M
      </div>
    </div>
  );
}
