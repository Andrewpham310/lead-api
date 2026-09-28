import { useState } from 'react';
import { addNote, deleteNote } from '../api/leads';

export default function LeadDetail({ lead, token, onUpdate, onEdit, onClose }) {
  const [noteText, setNoteText] = useState('');
  const [updateLastContacted, setUpdateLastContacted] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setError('');
    setLoading(true);

    try {
      const updated = await addNote(token, lead._id, noteText, updateLastContacted);
      onUpdate(updated);
      setNoteText('');
      setUpdateLastContacted(true);
    } catch (err) {
      setError(err.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const updated = await deleteNote(token, lead._id, noteId);
      onUpdate(updated);
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="lead-detail-overlay" onClick={onClose}>
      <div className="lead-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lead-detail-header">
          <div>
            <h2>{lead.name}</h2>
            <span className={`status-badge status-${lead.status}`}>{lead.status}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="lead-detail-body">
          <div className="lead-detail-section">
            <h3>Details</h3>
            <div className="lead-info-grid">
              {lead.email && (
                <div>
                  <span className="label">Email</span>
                  <p>{lead.email}</p>
                </div>
              )}
              {lead.phone && (
                <div>
                  <span className="label">Phone</span>
                  <p>{lead.phone}</p>
                </div>
              )}
              <div>
                <span className="label">Source</span>
                <p>{lead.source}</p>
              </div>
              <div>
                <span className="label">Created</span>
                <p>{formatDate(lead.createdAt)}</p>
              </div>
              {lead.lastContactedAt && (
                <div>
                  <span className="label">Last Contacted</span>
                  <p>{formatDate(lead.lastContactedAt)}</p>
                </div>
              )}
              {lead.nextFollowUpDate && (
                <div>
                  <span className="label">Next Follow-up</span>
                  <p>{formatDate(lead.nextFollowUpDate)}</p>
                </div>
              )}
            </div>
            {lead.message && (
              <div>
                <span className="label">Message</span>
                <p className="lead-message">{lead.message}</p>
              </div>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
              Edit Lead
            </button>
          </div>

          <div className="lead-detail-section">
            <h3>Follow-up Notes</h3>

            {error && <div className="alert alert-error">{error}</div>}

            <form className="note-form" onSubmit={handleAddNote}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note (e.g., Called, left voicemail)"
                rows="3"
                required
              />
              <div className="note-form-actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={updateLastContacted}
                    onChange={(e) => setUpdateLastContacted(e.target.checked)}
                  />
                  <span>Update last contacted date</span>
                </label>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </form>

            <div className="notes-timeline">
              {lead.followUpNotes && lead.followUpNotes.length > 0 ? (
                [...lead.followUpNotes]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((note) => (
                    <div key={note._id} className="note-item">
                      <div className="note-header">
                        <span className="note-date">{formatDate(note.createdAt)}</span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          Delete
                        </button>
                      </div>
                      <p className="note-text">{note.text}</p>
                    </div>
                  ))
              ) : (
                <p className="muted">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
