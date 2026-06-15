import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Layers, 
  BarChart3, 
  RefreshCw, 
  Cpu, 
  Sparkles, 
  Search, 
  Database,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Mail,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const generateMockCustomers = () => {
  const names = [
    "Aarav Sharma", "Priya Patel", "John Doe", "Jane Smith", "Kabir Singh", 
    "Sarah Connor", "Rohan Verma", "Emily Watson", "Arjun Mehta", "Ananya Reddy",
    "Michael Brown", "David Miller", "Sophia Davis", "Daniel Wilson", "Olivia Taylor",
    "Emma Thomas", "Liam Martinez", "Noah Anderson", "Lucas Garcia", "Mia Robinson",
    "Aditya Joshi", "Ishaan Kapoor", "Diya Sen", "Sneha Nair", "Vikram Malhotra",
    "Neha Gupta", "Rahul Bose", "Siddharth Roy", "Kiara Advani", "Varun Dhawan"
  ];
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com", "hotmail.com"];

  const customers = [];
  for (let i = 1; i <= 120; i++) {
    const name = names[i % names.length] + " " + String.fromCharCode(65 + (i % 26)) + ".";
    const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}${i}@${domains[i % domains.length]}`;
    const phone = `+${i % 2 === 0 ? '91' : '1'}${Math.floor(6000000000 + Math.random() * 4000000000)}`;
    
    // Generate random orders
    const orderCount = Math.floor(Math.random() * 6); // 0 to 5 orders
    const orders = [];
    for (let o = 1; o <= orderCount; o++) {
      orders.push({
        orderId: `ORD-${i}-${o}`,
        amount: Math.floor(15 + Math.random() * 250), // $15 to $265
        date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    customers.push({
      name,
      email,
      phone,
      orders
    });
  }
  return customers;
};

const MOCK_CUSTOMERS = generateMockCustomers();

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States for Shoppers tab
  const [selectedFilterCampaign, setSelectedFilterCampaign] = useState('');
  const [selectedFilterSegment, setSelectedFilterSegment] = useState('');

  // Ingestion state
  const [ingesting, setIngesting] = useState(false);

  // AI Segment Builder State
  const [segmentPrompt, setSegmentPrompt] = useState('Shoppers who spent more than 100 dollars and visited more than 1 time');
  const [aiSegmentResult, setAiSegmentResult] = useState(null);
  const [segmenting, setSegmenting] = useState(false);

  // Campaign Creator State
  const [campaignName, setCampaignName] = useState('');
  const [chosenSegment, setChosenSegment] = useState(null);
  const [channel, setChannel] = useState('Email');
  const [aiMessagePrompt, setAiMessagePrompt] = useState('Write an offer copy giving a 20% loyalty discount');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Selected Campaign Logs
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchCustomers();
    fetchCampaigns();
  }, []);

  // Poll for campaign stats updating automatically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCampaigns();
      fetchDashboardStats();
      if (selectedCampaign) {
        fetchCampaignLogs(selectedCampaign._id);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedCampaign]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      const data = await res.json();
      setDashboardStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async (filter = null, campaignId = '') => {
    try {
      let url = `${API_BASE}/customers`;
      const queryParams = [];
      if (filter) {
        queryParams.push(`filter=${encodeURIComponent(JSON.stringify(filter))}`);
      }
      if (campaignId) {
        queryParams.push(`campaignId=${campaignId}`);
      }
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterCampaignChange = (campaignId) => {
    setSelectedFilterCampaign(campaignId);
    setSelectedFilterSegment(''); // reset other filter
    if (campaignId) {
      fetchCustomers(null, campaignId);
    } else {
      fetchCustomers();
    }
  };

  const handleFilterSegmentChange = (segmentQueryStr) => {
    setSelectedFilterSegment(segmentQueryStr);
    setSelectedFilterCampaign(''); // reset other filter
    if (segmentQueryStr) {
      try {
        const query = JSON.parse(segmentQueryStr);
        fetchCustomers(query);
      } catch (err) {
        console.error(err);
      }
    } else {
      fetchCustomers();
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`);
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCampaignLogs = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/logs`);
      const data = await res.json();
      setCampaignLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIngestData = async () => {
    setIngesting(true);
    try {
      const res = await fetch(`${API_BASE}/customers/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(MOCK_CUSTOMERS)
      });
      const data = await res.json();
      alert(data.message);
      fetchCustomers();
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      alert('Ingestion failed.');
    } finally {
      setIngesting(false);
    }
  };

  const handleBuildSegment = async () => {
    if (!segmentPrompt) return;
    setSegmenting(true);
    try {
      const res = await fetch(`${API_BASE}/segments/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: segmentPrompt })
      });
      const data = await res.json();
      setAiSegmentResult(data);
      // Fetch customers matching this query
      fetchCustomers(data.query);
    } catch (err) {
      console.error(err);
      alert('Failed to build segment.');
    } finally {
      setSegmenting(false);
    }
  };

  const handleDraftMessage = async () => {
    if (!aiMessagePrompt) return;
    setDrafting(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiMessagePrompt, channel })
      });
      const data = await res.json();
      setMessageTemplate(data.template);
    } catch (err) {
      console.error(err);
      alert('Failed to draft template.');
    } finally {
      setDrafting(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignName || !messageTemplate || !chosenSegment) {
      alert("Please enter Campaign Name, select/build a segment, and draft a message template.");
      return;
    }
    setLaunching(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          filterDescription: chosenSegment.explanation,
          mongoQuery: chosenSegment.query,
          messageTemplate,
          channel
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert("Campaign launched successfully!");
        setCampaignName('');
        setMessageTemplate('');
        fetchCampaigns();
        fetchDashboardStats();
        setActiveTab('campaigns');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to launch campaign.");
    } finally {
      setLaunching(false);
    }
  };

  // Select campaign to view detailed logs
  const handleSelectCampaign = (camp) => {
    setSelectedCampaign(camp);
    fetchCampaignLogs(camp._id);
  };

  // Color mappings for recharts (monochrome)
  const COLORS = ['#ffffff', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#3f3f46'];

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand">
          <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />
          <span>Xeno CRM</span>
        </div>
        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('customers');
              setSelectedFilterCampaign('');
              setSelectedFilterSegment('');
              fetchCustomers(); // clear filters
            }}
          >
            <Users size={20} />
            <span>Shoppers</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'segment' ? 'active' : ''}`}
            onClick={() => setActiveTab('segment')}
          >
            <Layers size={20} />
            <span>AI Segments</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            <Send size={20} />
            <span>Campaign Center</span>
          </div>
        </nav>
        
        {/* Connection status indicator */}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></span>
            <span>CRM API Online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></span>
            <span>Channel Service Online</span>
          </div>
        </div>
      </aside>

      {/* Main content viewport */}
      <main className="main-content">
        <header className="header-bar">
          <div className="header-title">
            {activeTab === 'dashboard' && (
              <>
                <h1>Brand Performance Dashboard</h1>
                <p>Track real-time shopper engagement metrics and sales performance</p>
              </>
            )}
            {activeTab === 'customers' && (
              <>
                <h1>Shopper Directory</h1>
                <p>Manage and ingest your DTC customer profiles and purchase behaviors</p>
              </>
            )}
            {activeTab === 'segment' && (
              <>
                <h1>AI-Powered Audience Segmentation</h1>
                <p>Use natural language to carve out highly targeted customer segments</p>
              </>
            )}
            {activeTab === 'campaigns' && (
              <>
                <h1>Campaign & Copywriter Center</h1>
                <p>Draft personalized marketing messages and launch communication campaigns</p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleIngestData} disabled={ingesting}>
              <Database size={16} />
              {ingesting ? 'Ingesting...' : 'Ingest Mock Shoppers'}
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab('campaigns')}>
              <Sparkles size={16} />
              New Campaign
            </button>
          </div>
        </header>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {dashboardStats ? (
              <>
                <div className="metrics-grid">
                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{ color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)' }}>
                      <Users size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Total Shoppers</span>
                      <span className="metric-value">{dashboardStats.totalCustomers}</span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>
                      <TrendingUp size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Total Brand Revenue</span>
                      <span className="metric-value">${dashboardStats.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{ color: 'var(--accent-secondary)', background: 'rgba(168, 85, 247, 0.1)' }}>
                      <Send size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Campaigns Run</span>
                      <span className="metric-value">{dashboardStats.totalCampaigns}</span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
                      <CheckCircle size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Conversion Rate</span>
                      <span className="metric-value">
                        {dashboardStats.statusMap.sent > 0 
                          ? `${((dashboardStats.statusMap.conversion / dashboardStats.statusMap.sent) * 100).toFixed(1)}%` 
                          : '0.0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {/* Performance Funnel */}
                  <div className="glass-card">
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Communication Funnel</h2>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Dispatched', count: dashboardStats.statusMap.sent },
                            { name: 'Delivered', count: dashboardStats.statusMap.delivered },
                            { name: 'Opened', count: dashboardStats.statusMap.opened },
                            { name: 'Clicked', count: dashboardStats.statusMap.clicked },
                            { name: 'Purchased', count: dashboardStats.statusMap.conversion },
                          ]}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                            labelStyle={{ color: 'var(--text-main)' }}
                          />
                          <Bar dataKey="count" fill="url(#funnelGrad)" radius={[4, 4, 0, 0]}>
                            <defs>
                              <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent-primary)" />
                                <stop offset="100%" stopColor="var(--accent-secondary)" />
                              </linearGradient>
                            </defs>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Campaign comparison */}
                  <div className="glass-card">
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Recent Campaign Metrics</h2>
                    {campaigns.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No campaigns launched yet.</p>
                    ) : (
                      <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={campaigns.slice(0, 5)}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                            />
                            <Bar dataKey="stats.sent" name="Sent" fill="#ffffff" />
                            <Bar dataKey="stats.opened" name="Opened" fill="#a1a1aa" />
                            <Bar dataKey="stats.conversion" name="Conversions" fill="#3f3f46" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} size={32} />
                <p>Loading analytics...</p>
              </div>
            )}
          </div>
        )}

        {/* 2. CUSTOMERS TAB */}
        {activeTab === 'customers' && (() => {
          const segmentsMap = new Map();
          campaigns.forEach(c => {
            if (c.filterDescription && c.mongoQuery) {
              segmentsMap.set(c.filterDescription, JSON.stringify(c.mongoQuery));
            }
          });
          const segmentsFromCampaigns = Array.from(segmentsMap.entries());

          return (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Customer Base ({customers.length})</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing first 100 customer entries.
                </div>
              </div>

              {/* Filter Bar */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Filter by Campaign</label>
                  <select 
                    className="form-select" 
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                    value={selectedFilterCampaign}
                    onChange={(e) => handleFilterCampaignChange(e.target.value)}
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.channel})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Filter by Audience Segment</label>
                  <select 
                    className="form-select" 
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                    value={selectedFilterSegment}
                    onChange={(e) => handleFilterSegmentChange(e.target.value)}
                  >
                    <option value="">All Segments</option>
                    {segmentsFromCampaigns.map(([desc, queryStr], idx) => (
                      <option key={idx} value={queryStr}>{desc}</option>
                    ))}
                  </select>
                </div>

                {(selectedFilterCampaign || selectedFilterSegment) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', height: '38px' }}
                      onClick={() => {
                        setSelectedFilterCampaign('');
                        setSelectedFilterSegment('');
                        fetchCustomers();
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Shopper Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Visits</th>
                    <th>Total Spend</th>
                    <th>Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: '600', color: 'white' }}>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.visits}</td>
                      <td style={{ color: 'var(--success)' }}>${c.totalSpend.toFixed(2)}</td>
                      <td>{new Date(c.lastVisitDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No customers found. Click "Ingest Mock Shoppers" to initialize mock DTC brand database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* 3. AI SEGMENT BUILDER TAB */}
        {activeTab === 'segment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} style={{ color: 'var(--accent-secondary)' }} />
                Natural Language Segment Translation
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Type a natural segment description (e.g. "Customers who spent &gt; $100" or "Shoppers who haven't ordered recently but have a phone number"). Our AI will translate it into a structured database query.
              </p>

              <div className="ai-input-wrapper">
                <input 
                  type="text" 
                  className="ai-input"
                  placeholder="Describe your audience segment..."
                  value={segmentPrompt}
                  onChange={(e) => setSegmentPrompt(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleBuildSegment} disabled={segmenting}>
                  {segmenting ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
                  Segment with AI
                </button>
              </div>
            </div>

            {aiSegmentResult && (
              <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                  Segment Resolved Successfully
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI ENGISH EXPLANATION</label>
                    <p style={{ fontSize: '1.05rem', marginTop: '0.25rem', color: 'var(--text-main)', fontWeight: '500' }}>
                      {aiSegmentResult.explanation}
                    </p>
                    <div style={{ marginTop: '1rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                        {aiSegmentResult.matchedCount} Match(es) Found
                      </span>
                    </div>
                    
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginTop: '1.5rem' }}
                      onClick={() => {
                        setChosenSegment(aiSegmentResult);
                        setCampaignName(`Campaign for ${aiSegmentResult.explanation.slice(0, 30)}...`);
                        setActiveTab('campaigns');
                      }}
                    >
                      Use Segment in Campaign
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>COMPILED MONGODB QUERY</label>
                    <pre style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: '#38bdf8', fontSize: '0.85rem', overflowX: 'auto', marginTop: '0.25rem' }}>
                      {JSON.stringify(aiSegmentResult.query, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {customers.length > 0 && aiSegmentResult && (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Matching Shoppers Live Preview</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Shopper Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Visits</th>
                        <th>Total Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c._id}>
                          <td style={{ fontWeight: '600', color: 'white' }}>{c.name}</td>
                          <td>{c.email}</td>
                          <td>{c.phone}</td>
                          <td>{c.visits}</td>
                          <td style={{ color: 'var(--success)' }}>${c.totalSpend.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. CAMPAIGNS & COPYWRITER TAB */}
        {activeTab === 'campaigns' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={20} style={{ color: 'var(--accent-primary)' }} />
                Create New Campaign
              </h2>

              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. June Summer Sale Anniversary"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Segment</label>
                {chosenSegment ? (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{chosenSegment.explanation}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {JSON.stringify(chosenSegment.query)}
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('segment')}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>No segment selected yet.</p>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => setActiveTab('segment')}>
                      Build Segment with AI First
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Channel</label>
                <select 
                  className="form-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="Email">📧 Email</option>
                  <option value="SMS">💬 SMS</option>
                  <option value="WhatsApp">🟢 WhatsApp</option>
                  <option value="RCS">🔵 RCS</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">AI Copywriting Prompt</label>
                <div className="ai-input-wrapper" style={{ borderRadius: 'var(--radius-md)' }}>
                  <input 
                    type="text" 
                    className="ai-input" 
                    style={{ fontSize: '0.95rem' }}
                    placeholder="Describe tone or offer (e.g. 'Draft a fun, short message offering 15% off for regular visitors')..."
                    value={aiMessagePrompt}
                    onChange={(e) => setAiMessagePrompt(e.target.value)}
                  />
                  <button className="btn btn-secondary" onClick={handleDraftMessage} disabled={drafting}>
                    {drafting ? <RefreshCw className="spin" size={14} /> : <Cpu size={14} />}
                    Draft Copy
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Message Template</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Draft your campaign message. Use placeholders like [Name], [TotalSpend], [Visits]."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.9rem' }}
                onClick={handleLaunchCampaign}
                disabled={launching}
              >
                {launching ? 'Launching Campaign...' : 'Launch Campaign & Dispatch'}
              </button>
            </div>

            {/* Campaign analytics and logs list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card">
                <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: '600' }}>Recent Campaigns</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {campaigns.map((camp) => (
                    <div 
                      key={camp._id} 
                      className={`glass-card ${selectedCampaign?._id === camp._id ? 'active' : ''}`}
                      style={{ 
                        padding: '1rem', 
                        cursor: 'pointer', 
                        borderColor: selectedCampaign?._id === camp._id ? 'var(--accent-primary)' : 'var(--border-color)',
                        background: selectedCampaign?._id === camp._id ? 'rgba(99,102,241,0.05)' : 'rgba(19, 23, 34, 0.2)'
                      }}
                      onClick={() => handleSelectCampaign(camp)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>{camp.name}</h4>
                        <span className="badge badge-purple">{camp.channel}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {camp.filterDescription}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                        <span>Sent: <strong>{camp.stats.sent}</strong></span>
                        <span>Delivered: <strong style={{ color: '#60a5fa' }}>{camp.stats.delivered || 0}</strong></span>
                        <span>Opened: <strong style={{ color: '#c084fc' }}>{camp.stats.opened || 0}</strong></span>
                        <span>Purchased: <strong style={{ color: '#34d399' }}>{camp.stats.conversion || 0}</strong></span>
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No campaigns run yet.</p>
                  )}
                </div>
              </div>

              {/* Dynamic callback logger */}
              {selectedCampaign && (
                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Live Logs: {selectedCampaign.name}</h3>
                    <RefreshCw className="spin" size={16} style={{ color: 'var(--accent-secondary)' }} />
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {campaignLogs.map((log) => {
                      let badgeClass = 'badge-info';
                      if (log.status === 'delivered') badgeClass = 'badge-info';
                      if (log.status === 'opened') badgeClass = 'badge-purple';
                      if (log.status === 'clicked') badgeClass = 'badge-warning';
                      if (log.status === 'conversion') badgeClass = 'badge-success';
                      if (log.status === 'failed') badgeClass = 'badge-error';

                      return (
                        <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <span style={{ color: 'white', fontWeight: '600' }}>{log.customerId?.name || 'Customer'}</span>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                              {log.recipient}
                            </p>
                          </div>
                          <span className={`badge ${badgeClass}`}>{log.status}</span>
                        </div>
                      );
                    })}
                    {campaignLogs.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No logs generated yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
