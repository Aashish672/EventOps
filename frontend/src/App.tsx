import React, { useState, useEffect } from "react";
import {
  Shield,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  Terminal,
} from "lucide-react";
import { fetchHealthCheck, HealthCheckResponse } from "./api/client";

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealthCheck();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <main className="container">
      {/* Top Banner / Header */}
      <header style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <span className="badge">Foundation Scaffolding Ready</span>
          <span className="badge badge-success">Local Dev Active</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
          Event<span style={{ background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ops</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", maxWidth: "700px" }}>
          AI-powered, multi-tenant event operations platform. Governed by five specialized LangGraph agents with single-write-path human verification.
        </p>
      </header>

      {/* Live System Health Status Card */}
      <section className="card" style={{ marginBottom: "2rem", borderLeft: "4px solid var(--accent-primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Activity size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Backend Connectivity & Health Check</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Verifies endpoint <code style={{ color: "#e2e8f0" }}>/api/health/</code>, PostgreSQL readiness, and Redis cache availability.
            </p>
          </div>
          <button
            id="refresh-health-btn"
            onClick={checkHealth}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Checking..." : "Refresh Status"}
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-subtle)" }}>
          {loading && !health ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Pinging backend service...</div>
          ) : error ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--warning)" }}>
              <AlertTriangle size={20} />
              <div>
                <p style={{ fontWeight: "600" }}>Backend currently unreachable ({error})</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Ensure the Django backend is running on port 8000 (<code style={{ color: "#e2e8f0" }}>python manage.py runserver</code>).
                </p>
              </div>
            </div>
          ) : health ? (
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service Status</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span style={{ fontWeight: "700", color: "var(--success)" }}>{health.status.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service ID</div>
                <div style={{ fontWeight: "600", marginTop: "0.25rem" }}>{health.service}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Database</div>
                <div style={{ fontWeight: "600", marginTop: "0.25rem", color: health.database === "connected" ? "var(--success)" : "var(--warning)" }}>
                  {health.database}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cache / Redis</div>
                <div style={{ fontWeight: "600", marginTop: "0.25rem", color: health.cache === "connected" ? "var(--success)" : "var(--warning)" }}>
                  {health.cache}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Server Time</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Architecture Highlights */}
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem" }}>Core Architectural Guarantees</h2>
      <div className="grid">
        <div className="card">
          <Shield size={28} color="var(--accent-primary)" style={{ marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem" }}>Multi-Tenant Isolation</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem" }}>
            Postgres Row-Level Security (RLS) keyed strictly on <code style={{ color: "#e2e8f0" }}>organization_id</code>. Never relies on client-provided tenant headers.
          </p>
        </div>

        <div className="card">
          <Cpu size={28} color="var(--accent-secondary)" style={{ marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem" }}>Governed AI Agents</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem" }}>
            Five LangGraph agents (Document Intelligence, Event Planning, Budget, Vendor, Risk). Agents propose structured diffs; zero direct DB mutations.
          </p>
        </div>

        <div className="card">
          <Layers size={28} color="var(--success)" style={{ marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem" }}>Single Write-Path & Audit</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem" }}>
            All agent changes flow through <code style={{ color: "#e2e8f0" }}>apply_agent_proposal()</code> with complete before/after snapshots recorded in <code style={{ color: "#e2e8f0" }}>ChangeLogEntry</code>.
          </p>
        </div>
      </div>

      {/* Git & Local Workflow Reference */}
      <section className="card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <GitBranch size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Git Workflow & Quickstart</h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
          Branch strategy: <code style={{ color: "#e2e8f0" }}>feature/*</code> &rarr; Pull Request to <code style={{ color: "#e2e8f0" }}>test</code> (integration) &rarr; Pull Request to <code style={{ color: "#e2e8f0" }}>main</code> (deployment).
        </p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              <Terminal size={14} /> Backing Services (Docker)
            </div>
            <pre><code>docker compose up -d</code></pre>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              <Terminal size={14} /> Backend Server (Django)
            </div>
            <pre><code>python manage.py runserver</code></pre>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              <Terminal size={14} /> Frontend Dev Server (Vite)
            </div>
            <pre><code>npm run dev</code></pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: "3.5rem", paddingBottom: "2rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>EventOps Architecture Foundation &copy; 2026. Built for $0 on free-tier infrastructure.</div>
        <div>See <code style={{ color: "#cbd5e1" }}>docs/PRD.md</code> for full domain specifications.</div>
      </footer>
    </main>
  );
};
