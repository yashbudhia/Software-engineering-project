/************************************************
 * script.js (Fully Optimized + AI Feature)
 ************************************************/

// ----------------------
// GLOBAL VARIABLES
// ----------------------
let selectedText = '';
let highlightColor = '';

const annotationModal = document.getElementById('annotation-modal');
const annotationTitleInput = document.getElementById('annotation-title');
const annotationTextInput = document.getElementById('annotation-text');
const saveAnnotationBtn = document.getElementById('save-annotation');
const closeModalBtn = document.getElementById('close-modal');
const selectionToolbar = document.getElementById('selection-toolbar');
const mainContent = document.getElementById('content');
const transcriptContent = document.getElementById('transcript');
const annotationsList = document.getElementById('annotations-list');

// Create AI annotation container below manual annotations
const aiAnnotationsContainer = document.createElement('div');
aiAnnotationsContainer.id = 'ai-annotations-container';
aiAnnotationsContainer.innerHTML = `<h3>AI-Generated Annotations</h3>`;
annotationsList.parentElement.appendChild(aiAnnotationsContainer);

// AI Explanation Modal
const aiExplanationModal = document.createElement('div');
aiExplanationModal.id = 'ai-explanation-modal';
aiExplanationModal.innerHTML = `
  <button class="close-modal" id="close-ai-modal" aria-label="Close">&times;</button>
  <h2>AI Explanation</h2>
  <div id="ai-explanation-content">Loading...</div>
  <button id="save-ai-annotation">Save as Annotation</button>
`;
document.body.appendChild(aiExplanationModal);
aiExplanationModal.style.display = 'none';

// -------------------------------------------------------------------
// 1. SHOW/HIDE SELECTION TOOLBAR ON MOUSEUP
// -------------------------------------------------------------------
document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
    selectedText = sel.toString();

    // Position the selection toolbar near cursor
    const rangeRect = sel.getRangeAt(0).getBoundingClientRect();
    selectionToolbar.style.top = `${rangeRect.top + window.scrollY - 40}px`;
    selectionToolbar.style.left = `${rangeRect.left + window.scrollX}px`;
    selectionToolbar.style.display = 'block';
  } else {
    selectionToolbar.style.display = 'none';
  }
});

// Prevent losing selection when clicking inside the toolbar
selectionToolbar.addEventListener('mousedown', (e) => {
  e.preventDefault();
});

// -------------------------------------------------------------------
// 2. ADD EVENT LISTENERS FOR HIGHLIGHT COLOR BUTTONS
// -------------------------------------------------------------------
document.querySelectorAll('#selection-toolbar button[data-color]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      highlightColor = button.getAttribute('data-color');
      const range = sel.getRangeAt(0);

      // Create highlight span
      const span = document.createElement('span');
      span.className = `highlight-${highlightColor}`;
      span.style.backgroundColor = highlightColor;

      try {
        range.surroundContents(span);
      } catch (e) {
        alert('Error: Complex selections may not highlight properly.');
        return;
      }

      sel.removeAllRanges();
      selectionToolbar.style.display = 'none';
      openAnnotationModal();
    });
  });

// -------------------------------------------------------------------
// 3. AI EXPLAIN BUTTON (Within Selection Toolbar)
// -------------------------------------------------------------------
const aiExplainBtn = document.createElement('button');
aiExplainBtn.textContent = "Explain with AI";
aiExplainBtn.id = "ai-explain-btn";
selectionToolbar.appendChild(aiExplainBtn);

aiExplainBtn.addEventListener('click', async () => {
  if (!selectedText) return;
  aiExplanationModal.style.display = 'block';
  document.getElementById('ai-explanation-content').innerHTML = "Generating explanation...";

  try {
    const response = await fetch('/ai-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedText }),
    });
    const data = await response.json();
    document.getElementById('ai-explanation-content').innerHTML = 
      `<strong>Explanation:</strong> ${data.explanation || 'No explanation available.'}`;
  } catch (error) {
    console.error('Error fetching AI explanation:', error);
    document.getElementById('ai-explanation-content').innerHTML = 'Error fetching explanation.';
  }

  selectionToolbar.style.display = 'none';
});

// Close AI modal
document.getElementById('close-ai-modal').addEventListener('click', () => {
  aiExplanationModal.style.display = 'none';
});

// Save AI-generated explanation as an annotation
document.getElementById('save-ai-annotation').addEventListener('click', () => {
  const explanationText = document.getElementById('ai-explanation-content').innerText;
  if (!explanationText || explanationText === "Generating explanation...") return;

  const aiAnnotationData = {
    title: "AI Explanation",
    text: selectedText,
    color: "gray",
    comment: explanationText,
    timestamp: new Date().toISOString()
  };

  addAIAnnotationToSidebar(aiAnnotationData);
  aiExplanationModal.style.display = 'none';
});

// -------------------------------------------------------------------
// 4. FUNCTION TO ADD AI ANNOTATION TO SIDEBAR
// -------------------------------------------------------------------
function addAIAnnotationToSidebar(annotation) {
  const item = document.createElement('div');
  item.classList.add('ai-annotation-item');
  item.innerHTML = `
    <strong>${annotation.title}</strong><br/>
    <span class="highlight-gray" style="background-color:lightgray; padding: 2px;">[AI]</span>
    <em>${annotation.text}</em> - ${annotation.comment}
    <small>(${new Date(annotation.timestamp).toLocaleString()})</small>
  `;
  aiAnnotationsContainer.appendChild(item);
}

// -------------------------------------------------------------------
// 5. RE-HIGHLIGHT TEXT FUNCTION (Fixed)
// -------------------------------------------------------------------
function reHighlightText(searchText, color) {
  const containers = [mainContent, transcriptContent];

  containers.forEach((container) => {
    if (!container) return;

    const safeSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeSearch})`, 'gi');

    container.innerHTML = container.innerHTML.replace(regex, `<span class="highlight-${color}">$1</span>`);
  });
}

// -------------------------------------------------------------------
// 6. FETCH AND DISPLAY ANNOTATIONS
// -------------------------------------------------------------------
async function fetchAnnotations() {
  try {
    const res = await fetch('/annotations');
    const annotations = await res.json();
    annotationsList.innerHTML = '';

    annotations.forEach((anno) => {
      reHighlightText(anno.text, anno.color);

      const item = document.createElement('div');
      item.classList.add('annotation-item');
      item.innerHTML = `
        <strong>${anno.title || '(No Title)'}</strong><br/>
        <span class="highlight-${anno.color}" style="background-color:${anno.color}; padding: 2px;">
          [${anno.color}]
        </span>
        <em>${anno.text}</em> - ${anno.comment || 'No comment'}
        <small>(${new Date(anno.timestamp).toLocaleString()})</small>
      `;
      annotationsList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
  }
}

// -------------------------------------------------------------------
// 7. OPEN/CLOSE MODAL FUNCTIONS
// -------------------------------------------------------------------
function openAnnotationModal() {
  annotationModal.style.display = 'block';
  annotationTitleInput.focus();
}

function closeAnnotationModal() {
  annotationModal.style.display = 'none';
  annotationTitleInput.value = '';
  annotationTextInput.value = '';
}

closeModalBtn.addEventListener('click', closeAnnotationModal);

// -------------------------------------------------------------------
// 8. SAVE MANUAL ANNOTATIONS
// -------------------------------------------------------------------
saveAnnotationBtn.addEventListener('click', async () => {
  if (!selectedText) return;
  const annotationData = {
    title: annotationTitleInput.value || "Untitled",
    text: selectedText,
    color: highlightColor || "yellow",
    comment: annotationTextInput.value || "No comment",
    timestamp: new Date().toISOString()
  };

  await fetch('/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(annotationData),
  });

  fetchAnnotations();
  closeAnnotationModal();
});

// -------------------------------------------------------------------
// 9. ON PAGE LOAD, FETCH ANNOTATIONS
// -------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', fetchAnnotations);
