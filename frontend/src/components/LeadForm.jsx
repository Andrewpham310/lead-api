import { useState } from 'react';

const SOURCE_OPTIONS = [
  'website',
  'instagram',
  'facebook',
  'phone',
  'referral',
  'walk-in',
  'other',
];

export default function LeadForm({ lead, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    message: lead?.message || '',
    source: lead?.source || 'other',
    status: lead?.status || 'new',
  });
  const [customSource, setCustomSource] = useState(
    lead?.source && !SOURCE_OPTIONS.includes(lead.source) ? lead.source : ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = { ...formData };
      if (formData.source === 'other' && customSource.trim()) {
        data.source = customSource.trim();
      }

      await onSubmit(data);
    } catch (err) {
      setError(err.message || 'Failed to save lead');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Name <span className="required">*</span>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Phone
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </label>

      <label>
        Email
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </label>

      <label>
        Message
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows="4"
        />
      </label>

      <label>
        Source
        <select name="source" value={formData.source} onChange={handleChange}>
          {SOURCE_OPTIONS.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </label>

      {formData.source === 'other' && (
        <label>
          Custom Source
          <input
            type="text"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            placeholder="e.g., Google Ads, LinkedIn"
          />
        </label>
      )}

      {lead && (
        <label>
          Status
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="booked">booked</option>
            <option value="lost">lost</option>
          </select>
        </label>
      )}

      <div className="form-link-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
