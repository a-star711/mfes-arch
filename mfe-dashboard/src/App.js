import React, { useState, useEffect } from 'react';

const STATUS_CLASS = {
  'Resolved': 'resolved',
  'New': 'new',
  'In Progress': 'in-progress',
};

function StatCard({ title, value, subtitle, delay }) {
  return (
    <div className="fade-in stat-card" style={{ animationDelay: delay }}>
      <div className="stat-card-bar" />
      <p className="stat-card-title">{title}</p>
      <p className="stat-card-value">{value}</p>
      {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);

  useEffect(() => {
    import('shell/store').then(module => {
      const useUserStore = module.default;

      const current = useUserStore.getState();
      if (current.isAuthenticated) {
        setUser(current.user);
        setRoles(current.roles);
        setActiveTenant(current.activeTenant);
      }

      const unsubscribe = useUserStore.subscribe((state) => {
        setUser(state.user);
        setRoles(state.roles);
        setActiveTenant(state.activeTenant);
      });

      return unsubscribe;
    });
  }, []);

  if (!user) return null;

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">

        <div className="fade-in dashboard-header" style={{ animationDelay: '0.05s' }}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="dashboard-avatar-img" />
          ) : (
            <div className="dashboard-avatar-placeholder">
              <span>
                {user.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="dashboard-greeting">
              {greeting}, {user.name?.split(' ')[0]}
            </h1>
            <p className="dashboard-greeting-sub">
              Here is what is happening across your workspace today.
            </p>
          </div>
          <div className="dashboard-badges">
            <span className="dashboard-badge">
              {activeTenant ?? 'No tenant'}
            </span>
            <span className="dashboard-badge">
              {roles.length ? roles.join(', ') : 'No roles'}
            </span>
          </div>
        </div>

        <div className="dashboard-stats">
          <StatCard title="Active Claims" value="24" subtitle="+3 this week" delay="0.1s" />
          <StatCard title="Pending Review" value="8" subtitle="2 require attention" delay="0.15s" />
          <StatCard title="Resolved" value="156" subtitle="This quarter" delay="0.2s" />
          <StatCard title="Avg. Resolution" value="4.2d" subtitle="-0.5d vs last month" delay="0.25s" />
        </div>

        <div className="fade-in dashboard-card dashboard-card--activity" style={{ animationDelay: '0.3s' }}>
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Recent Activity</h2>
            <span className="dashboard-card-link">View all</span>
          </div>
          {[
            { id: 'CLM-1024', action: 'New claim submitted by Maria Petrova', time: '2 hours ago', status: 'New' },
            { id: 'CLM-1023', action: 'Review completed — approved for processing', time: '5 hours ago', status: 'Resolved' },
            { id: 'CLM-1022', action: 'Supporting documents uploaded by client', time: '1 day ago', status: 'In Progress' },
            { id: 'CLM-1021', action: 'Assigned to regional assessment team', time: '1 day ago', status: 'In Progress' },
            { id: 'CLM-1020', action: 'Final approval — payout initiated', time: '2 days ago', status: 'Resolved' },
          ].map((item, i) => (
            <div key={i} className="activity-row">
              <div className={`activity-dot activity-dot--${STATUS_CLASS[item.status]}`} />
              <span className="activity-id">{item.id}</span>
              <span className="activity-action">{item.action}</span>
              <span className="activity-time">{item.time}</span>
              <span className={`activity-status activity-status--${STATUS_CLASS[item.status]}`}>{item.status}</span>
            </div>
          ))}
        </div>

        <div className="fade-in dashboard-card" style={{ animationDelay: '0.35s' }}>
          <h2 className="dashboard-card-title" style={{ marginBottom: '1rem' }}>Quick Actions</h2>
          <div className="quick-actions">
            {[
              { label: 'New Claim', icon: '+' },
              { label: 'Run Assessment', icon: '>' },
              { label: 'Generate Report', icon: '#' },
              { label: 'Team Overview', icon: '@' },
            ].map((action, i) => (
              <button key={i} className="action-btn">
                <span className="action-btn-icon">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
