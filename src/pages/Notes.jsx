import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { saveNote, deleteNote, getNotes } from '../lib/storage';

const CATEGORIES = ['Daily Review', 'Strategy', 'Psychology', 'Market Analysis'];
const EMOTIONS = ['Calm', 'Anxious', 'Greedy', 'Fearful', 'Confident', 'Frustrated', 'Neutral'];

export default function Notes() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', category: 'Daily Review', content: '', emotion: 'Neutral', lessons: '' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = useMemo(() => {
    return state.notes.filter(n => {
      if (filterCat !== 'all' && n.category !== filterCat) return false;
      if (search && !n.title?.toLowerCase().includes(search.toLowerCase()) && !n.content?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [state.notes, search, filterCat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const note = { ...form, id: editId };
    await saveNote(note);
    const notes = await getNotes();
    dispatch({ type: 'SET_NOTES', payload: notes });
    setForm({ date: new Date().toISOString().split('T')[0], title: '', category: 'Daily Review', content: '', emotion: 'Neutral', lessons: '' });
    setEditId(null);
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: editId ? 'Note updated!' : 'Note saved!', type: 'success' } });
  };

  const handleEdit = (note) => {
    setForm({ date: note.date, title: note.title, category: note.category, content: note.content, emotion: note.emotion || 'Neutral', lessons: note.lessons || '' });
    setEditId(note.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(id);
    const notes = await getNotes();
    dispatch({ type: 'SET_NOTES', payload: notes });
  };

  return (
    <div className="grid-cols-12" style={{ gap: '20px' }}>
      {/* Form */}
      <div className="card-premium col-span-4">
        <div className="card-title-bar"><h3><i className="fa-solid fa-note-sticky"></i> {editId ? 'Edit Note' : 'New Note'}</h3></div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Date</label>
            <input className="input-control" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Title</label>
            <input className="input-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Note title" required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select className="input-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea className="input-control" rows="6" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your note..." required></textarea>
          </div>
          <div className="form-group">
            <label>Emotion</label>
            <select className="input-control" value={form.emotion} onChange={e => setForm(p => ({ ...p, emotion: e.target.value }))}>
              {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Lessons</label>
            <textarea className="input-control" rows="2" value={form.lessons} onChange={e => setForm(p => ({ ...p, lessons: e.target.value }))} placeholder="Key takeaways..."></textarea>
          </div>
          <button className="btn btn-primary" type="submit"><i className="fa-solid fa-save"></i> {editId ? 'Update' : 'Save'} Note</button>
          {editId && <button className="btn btn-secondary" type="button" onClick={() => { setEditId(null); setForm({ date: new Date().toISOString().split('T')[0], title: '', category: 'Daily Review', content: '', emotion: 'Neutral', lessons: '' }); }}>Cancel</button>}
        </form>
      </div>

      {/* Timeline */}
      <div className="card-premium col-span-8">
        <div className="card-title-bar">
          <h3><i className="fa-solid fa-clock"></i> Notes Timeline</h3>
          <div className="flex gap-2">
            <input className="input-control" placeholder="Search..." style={{ maxWidth: '160px' }} value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-control" style={{ maxWidth: '140px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-muted p-4">No notes found.</p>
        ) : filtered.map(note => (
          <div key={note.id} className="mb-4" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div className="flex justify-between align-center">
              <div>
                <strong className="text-accent">{note.title}</strong>
                <span className="text-xs text-muted ml-2">{note.date}</span>
                <span className="badge badge-win text-xs ml-2">{note.category}</span>
                {note.emotion && <span className="text-xs text-muted ml-2">{note.emotion}</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(note)}><i className="fa fa-edit"></i></button>
                <button className="btn btn-sm btn-secondary text-danger" onClick={() => handleDelete(note.id)}><i className="fa fa-trash-can"></i></button>
              </div>
            </div>
            <p className="text-sm text-light mt-2" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p>
            {note.lessons && <p className="text-xs text-muted mt-1"><strong>Lessons:</strong> {note.lessons}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
