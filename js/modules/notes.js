import { state, els, showNotification, loadInitialData } from './core.js';
import { saveNote, deleteNote } from '../storage.js';

export function renderNotesTimeline() {
  const searchVal = els.searchNotes.value.toLowerCase();
  const catVal = els.filterNotesCategory.value;

  const filtered = state.notes.filter(n => {
    const matchesSearch = !searchVal ||
      n.title.toLowerCase().includes(searchVal) ||
      n.content.toLowerCase().includes(searchVal) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(searchVal)));
    const matchesCategory = catVal === "all" || n.category === catVal;

    return matchesSearch && matchesCategory;
  });

  els.notesTimeline.innerHTML = "";
  if (filtered.length === 0) {
    els.notesTimeline.innerHTML = `<span class="text-sm text-muted text-center p-4">No daily logs found. Write your first log today!</span>`;
  } else {
    filtered.forEach(note => {
      let tagsHtml = "";
      if (note.tags) {
        note.tags.forEach(t => {
          tagsHtml += `<span class="text-xs px-2 py-0.5 rounded bg-primary-glow text-accent mr-1 border border-card-border">#${t}</span>`;
        });
      }

      els.notesTimeline.innerHTML += `
        <div class="card-premium">
          <div class="flex justify-between align-center mb-2">
            <div>
              <span class="text-xs text-muted">${note.date}</span>
              <h4 class="text-base font-bold">${note.title}</h4>
              <span class="badge badge-breakeven text-xs mt-1">${note.category}</span>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-icon btn-secondary" onclick="loadNoteIntoForm('${note.id}')" title="Edit"><i class="fa fa-pencil"></i></button>
              <button class="btn btn-sm btn-icon btn-secondary text-danger" onclick="deleteNoteTrigger('${note.id}')" title="Delete"><i class="fa fa-trash-can"></i></button>
            </div>
          </div>
          <p class="text-sm text-light mb-3" style="white-space: pre-line;">${note.content}</p>
          <div class="flex align-center flex-wrap gap-2">
            ${tagsHtml}
          </div>
        </div>
      `;
    });
  }
}

window.loadNoteIntoForm = function(noteId) {
  const note = state.notes.find(n => n.id === noteId);
  if (!note) return;

  els.noteFormTitle.innerHTML = `<i class="fa fa-pencil"></i> Edit Journal Note`;
  els.editNoteId.value = note.id;
  els.noteDate.value = note.date;
  els.noteTitle.value = note.title;
  els.noteCategory.value = note.category;
  els.noteContent.value = note.content;
  els.noteTags.value = note.tags ? note.tags.join(", ") : "";

  els.noteForm.querySelector("button[type='submit']").innerHTML = '<i class="fa fa-save"></i> Update Journal Note';
  showNotification("Loaded note details into editor.", "info");
};

window.deleteNoteTrigger = async function(noteId) {
  if (confirm("Are you sure you want to delete this journal note?")) {
    await deleteNote(noteId);
    showNotification("Journal note deleted.", "warning");
    await loadInitialData();
  }
};

function resetNoteForm() {
  els.noteFormTitle.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Daily Journal Entry`;
  els.editNoteId.value = "";
  els.noteForm.reset();
  els.noteDate.value = new Date().toISOString().split("T")[0];
  els.noteForm.querySelector("button[type='submit']").innerHTML = '<i class="fa fa-save"></i> Save Journal Entry';
}

export function initNotes() {
  const triggerNotesFilter = () => {
    renderNotesTimeline();
  };
  els.searchNotes.addEventListener("input", triggerNotesFilter);
  els.filterNotesCategory.addEventListener("change", triggerNotesFilter);

  els.noteForm.addEventListener("submit", async () => {
    const noteId = els.editNoteId.value || null;
    const tagString = els.noteTags.value;
    const tags = tagString ? tagString.split(",").map(t => t.trim()) : [];

    const noteData = {
      id: noteId,
      date: els.noteDate.value,
      title: els.noteTitle.value,
      category: els.noteCategory.value,
      content: els.noteContent.value,
      tags
    };

    await saveNote(noteData);
    showNotification(`Journal Note ${noteId ? 'updated' : 'saved'}!`, "success");
    resetNoteForm();
    await loadInitialData();
  });

  els.clearNoteFormBtn.addEventListener("click", () => {
    resetNoteForm();
  });
}
