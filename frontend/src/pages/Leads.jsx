import { useEffect, useState } from 'react';
import { deleteLead, getLeads, updateLeadStatus } from '../api/leads';
import { useAuth } from '../context/AuthContext';
import LeadTable from '../components/LeadTable';

export default function Leads() {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    try {
      const data = await getLeads(token);
      setLeads(data);
    } catch (err) {
      if (err.status === 404) {
        setLeads([]);
      } else {
        setError(err.message || 'Failed to load leads');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [token]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateLeadStatus(token, id, status);
      setLeads((prev) => prev.map((lead) => (lead._id === id ? updated : lead)));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;

    try {
      await deleteLead(token, id);
      setLeads((prev) => prev.filter((lead) => lead._id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete lead');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p className="muted">Manage inquiries from your website</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadLeads}>
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading leads...</p>
      ) : (
        <LeadTable
          leads={leads}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
