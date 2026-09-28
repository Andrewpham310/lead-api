import { useEffect, useState } from 'react';
import {
  createLeadAsOwner,
  deleteLead,
  getLeadById,
  getLeads,
  updateLead,
  updateLeadStatus,
} from '../api/leads';
import { useAuth } from '../context/AuthContext';
import LeadTable from '../components/LeadTable';
import LeadForm from '../components/LeadForm';
import LeadDetail from '../components/LeadDetail';

export default function Leads() {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('');
  const [uniqueSources, setUniqueSources] = useState([]);

  const loadLeads = async (source = '') => {
    try {
      const url = source ? `/api/leads?source=${encodeURIComponent(source)}` : '/api/leads';
      const data = await getLeads(token, url);
      setLeads(data);
      
      if (!source) {
        setAllLeads(data);
        const sources = [...new Set(data.map((lead) => lead.source))].sort();
        setUniqueSources(sources);
      }
    } catch (err) {
      if (err.status === 404) {
        setLeads([]);
        if (!source) {
          setAllLeads([]);
          setUniqueSources([]);
        }
      } else {
        setError(err.message || 'Failed to load leads');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSourceFilter = (source) => {
    setSourceFilter(source);
    setLoading(true);
    loadLeads(source);
  };

  useEffect(() => {
    loadLeads();
  }, [token]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateLeadStatus(token, id, status);
      setLeads((prev) => prev.map((lead) => (lead._id === id ? updated : lead)));
      if (viewingLead?._id === id) {
        setViewingLead(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;

    try {
      await deleteLead(token, id);
      setLeads((prev) => prev.filter((lead) => lead._id !== id));
      if (viewingLead?._id === id) {
        setViewingLead(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete lead');
    }
  };

  const handleAddLead = async (data) => {
    const created = await createLeadAsOwner(token, data);
    setLeads((prev) => [created, ...prev]);
    setShowAddForm(false);
  };

  const handleUpdateLead = async (data) => {
    const updated = await updateLead(token, editingLead._id, data);
    setLeads((prev) => prev.map((lead) => (lead._id === updated._id ? updated : lead)));
    setEditingLead(null);
    if (viewingLead?._id === updated._id) {
      setViewingLead(updated);
    }
  };

  const handleViewLead = async (id) => {
    try {
      const lead = await getLeadById(token, id);
      setViewingLead(lead);
    } catch (err) {
      setError(err.message || 'Failed to load lead');
    }
  };

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((lead) => (lead._id === updated._id ? updated : lead)));
    setViewingLead(updated);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p className="muted">Manage all your leads and follow-ups</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            Add Lead
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => loadLeads()}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {uniqueSources.length > 0 && (
        <div className="filter-bar">
          <label className="filter-label">
            Filter by source:
            <select value={sourceFilter} onChange={(e) => handleSourceFilter(e.target.value)}>
              <option value="">All sources ({allLeads.length})</option>
              {uniqueSources.map((source) => {
                const count = allLeads.filter((lead) => lead.source === source).length;
                return (
                  <option key={source} value={source}>
                    {source} ({count})
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading leads...</p>
      ) : (
        <LeadTable
          leads={leads}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onView={handleViewLead}
        />
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Add Lead</h2>
            <LeadForm onSubmit={handleAddLead} onCancel={() => setShowAddForm(false)} />
          </div>
        </div>
      )}

      {editingLead && (
        <div className="modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Lead</h2>
            <LeadForm
              lead={editingLead}
              onSubmit={handleUpdateLead}
              onCancel={() => setEditingLead(null)}
            />
          </div>
        </div>
      )}

      {viewingLead && (
        <LeadDetail
          lead={viewingLead}
          token={token}
          onUpdate={handleLeadUpdate}
          onEdit={() => {
            setEditingLead(viewingLead);
            setViewingLead(null);
          }}
          onClose={() => setViewingLead(null)}
        />
      )}
    </div>
  );
}
