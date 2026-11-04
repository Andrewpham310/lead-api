const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
];

export default function LeadTable({ leads, onStatusChange, onDelete }) {
  if (!leads.length) {
    return (
      <div className="empty-state">
        <h3>No messages yet</h3>
        <p>Share your contact link so customers can reach you. New messages will appear here.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Message</th>
            <th>Source</th>
            <th>Status</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id}>
              <td>
                <strong>{lead.name}</strong>
              </td>
              <td>
                <div className="contact-cell">
                  {lead.email && <span>{lead.email}</span>}
                  {lead.phone && <span>{lead.phone}</span>}
                </div>
              </td>
              <td className="message-cell">{lead.message}</td>
              <td>{lead.source}</td>
              <td>
                <select
                  className={`status-select status-${lead.status}`}
                  value={lead.status}
                  onChange={(e) => onStatusChange(lead._id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => onDelete(lead._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
