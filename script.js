// script.js

// Initialize Variables
let annotations = JSON.parse(localStorage.getItem('annotations')) || [];
let points = parseInt(localStorage.getItem('points')) || 0;
let badges = JSON.parse(localStorage.getItem('badges')) || [];
let selectedTextGlobal = '';

// DOM Elements
const content = document.getElementById('content');
const annotationPanel = document.getElementById('annotations-list');
const annotationModal = document.getElementById('annotation-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveAnnotationBtn = document.getElementById('save-annotation');
const annotationText = document.getElementById('annotation-text');
const annotationTags = document.getElementById('annotation-tags');
const pointsDisplay = document.getElementById('points');
const badgesDisplay = document.getElementById('badges');
const searchInput = document.getElementById('search-input');
const addVideoAnnotationBtn = document.getElementById('add-video-annotation');
const videoElement = document.getElementById('educational-video');
const aiSuggestBtn = document.getElementById('ai-suggest');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Update Points and Badges
function updateUserInfo() {
    pointsDisplay.textContent = `Points: ${points}`;
    badgesDisplay.textContent = `Badges: ${badges.length > 0 ? badges.join(', ') : 'None'}`;
}

// Save Annotations to Local Storage
function saveAnnotations() {
    localStorage.setItem('annotations', JSON.stringify(annotations));
    localStorage.setItem('points', points);
    localStorage.setItem('badges', JSON.stringify(badges));
}

// Render Annotations in Sidebar
function renderAnnotations(filter = '') {
    annotationPanel.innerHTML = '';

    let filteredAnnotations = annotations;
    if (filter) {
        const lowerFilter = filter.toLowerCase();
        filteredAnnotations = annotations.filter(ann => 
            ann.text.toLowerCase().includes(lowerFilter) ||
            ann.tags.some(tag => tag.toLowerCase().includes(lowerFilter))
        );
    }

    filteredAnnotations.forEach((ann, index) => {
        const annotationItem = document.createElement('div');
        annotationItem.classList.add('annotation-item');

        const annotationHeader = document.createElement('strong');
        annotationHeader.textContent = `Annotation ${index + 1}:`;

        const annotationBody = document.createElement('span');
        annotationBody.textContent = ann.text;

        const annotationTagsDiv = document.createElement('div');
        annotationTagsDiv.classList.add('annotation-tags');
        ann.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.textContent = tag;
            annotationTagsDiv.appendChild(tagSpan);
        });

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.setAttribute('aria-label', 'Delete Annotation');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this annotation?')) {
                annotations.splice(index, 1);
                if (ann.type === 'text') {
                    points = Math.max(points - 10, 0); // Deduct points
                } else if (ann.type === 'video') {
                    points = Math.max(points - 20, 0); // Deduct points
                }
                saveAnnotations();
                renderAnnotations(searchInput.value);
                highlightText();
                updateUserInfo();
            }
        });

        annotationItem.appendChild(annotationHeader);
        annotationItem.appendChild(annotationBody);
        annotationItem.appendChild(annotationTagsDiv);
        annotationItem.appendChild(deleteBtn);

        annotationPanel.appendChild(annotationItem);
    });
}

// Highlight Text in Content
function highlightText() {
    // Remove existing highlights
    const highlights = content.querySelectorAll('.highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize(); // Merge adjacent text nodes
    });

    annotations.forEach((ann, index) => {
        if (ann.type === 'text') {
            const regex = new RegExp(`(${escapeRegExp(ann.selectedText)})`, 'g');
            replaceTextWithHighlight(content, regex, index, ann.text);
        }
    });
}

// Replace Text with Highlight Span
function replaceTextWithHighlight(element, regex, index, title) {
    if (element.hasChildNodes()) {
        element.childNodes.forEach(child => replaceTextWithHighlight(child, regex, index, title));
    } else if (element.nodeType === Node.TEXT_NODE) {
        const matches = element.textContent.match(regex);
        if (matches) {
            const newHTML = element.textContent.replace(regex, `<span class="highlight" data-index="${index}" title="${title}">$1</span>`);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHTML;
            while (tempDiv.firstChild) {
                element.parentNode.insertBefore(tempDiv.firstChild, element);
            }
            element.parentNode.removeChild(element);
        }
    }
}

// Escape RegExp Special Characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Open Annotation Modal
function openModal(selectedText) {
    annotationModal.style.display = 'block';
    annotationModal.setAttribute('aria-hidden', 'false');
    annotationText.focus();
    annotationText.value = `Selected Text: "${selectedText}"\n\n`;
}

// Close Annotation Modal
function closeModal() {
    annotationModal.style.display = 'none';
    annotationModal.setAttribute('aria-hidden', 'true');
    annotationText.value = '';
    annotationTags.value = '';
    selectedTextGlobal = '';
}

// Handle Text Selection
content.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        selectedTextGlobal = selectedText;
        openModal(selectedText);
    }
});

// Save Annotation
saveAnnotationBtn.addEventListener('click', () => {
    const text = annotationText.value.trim();
    const tags = annotationTags.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    if (text.length === 0) {
        alert('Annotation text cannot be empty.');
        return;
    }

    if (selectedTextGlobal.length === 0) {
        alert('No text selected.');
        closeModal();
        return;
    }

    // Add Annotation
    const newAnnotation = {
        id: Date.now(),
        type: 'text',
        selectedText: selectedTextGlobal,
        text,
        tags,
    };
    annotations.push(newAnnotation);
    points += 10; // Earn points for creating an annotation

    // Check for Badges
    if (points >= 100 && !badges.includes('Centurion Annotator')) {
        badges.push('Centurion Annotator');
        alert('Congratulations! You earned the "Centurion Annotator" badge.');
    }
    if (points >= 200 && !badges.includes('Master Annotator')) {
        badges.push('Master Annotator');
        alert('Amazing! You earned the "Master Annotator" badge.');
    }

    saveAnnotations();
    renderAnnotations(searchInput.value);
    highlightText();
    updateUserInfo();
    closeModal();
});

// Close Modal on Click
closeModalBtn.addEventListener('click', closeModal);

// Close Modal on Outside Click
window.addEventListener('click', (e) => {
    if (e.target == annotationModal) {
        closeModal();
    }
});

// Initialize Annotations and User Info on Load
window.addEventListener('load', () => {
    renderAnnotations();
    highlightText();
    updateUserInfo();

    // Load Dark Mode Preference
    const darkMode = JSON.parse(localStorage.getItem('darkMode'));
    if (darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
});

// Search Annotations
searchInput.addEventListener('input', (e) => {
    const filter = e.target.value.trim();
    renderAnnotations(filter);
});

// Video Annotation Feature

addVideoAnnotationBtn.addEventListener('click', () => {
    const currentTime = videoElement.currentTime.toFixed(2);
    const comment = prompt('Enter your video annotation:');
    const tagsInput = prompt('Enter tags for this annotation (comma separated):');
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];

    if (comment) {
        const videoAnnotation = {
            id: Date.now(),
            type: 'video',
            timestamp: currentTime,
            text: comment,
            tags,
        };
        annotations.push(videoAnnotation);
        points += 20; // Earn more points for video annotations

        // Check for Badges
        if (points >= 100 && !badges.includes('Centurion Annotator')) {
            badges.push('Centurion Annotator');
            alert('Congratulations! You earned the "Centurion Annotator" badge.');
        }
        if (points >= 200 && !badges.includes('Master Annotator')) {
            badges.push('Master Annotator');
            alert('Amazing! You earned the "Master Annotator" badge.');
        }

        saveAnnotations();
        renderAnnotations(searchInput.value);
        updateUserInfo();
        alert(`Annotation added at ${formatTime(currentTime)}.`);
    }
});

// Function to Format Time in Video
function formatTime(timeInSeconds) {
    const sec_num = parseInt(timeInSeconds, 10);
    const hours   = Math.floor(sec_num / 3600);
    const minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    const seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));

    let time = '';
    if (hours > 0) time += `${hours}:`;
    time += `${minutes < 10 ? '0' + minutes : minutes}:`;
    time += `${seconds < 10 ? '0' + seconds : seconds}`;
    return time;
}

// Jump to Video Annotation on Highlight Click
content.addEventListener('click', (e) => {
    if (e.target.classList.contains('highlight')) {
        const index = e.target.getAttribute('data-index');
        const annotation = annotations[index];
        if (annotation.type === 'video' && annotation.timestamp) {
            videoElement.currentTime = annotation.timestamp;
            videoElement.play();
        }
    }
});

// AI-Driven Suggestions (Simulated)
aiSuggestBtn.addEventListener('click', () => {
    const suggestions = [
        'Consider exploring this concept further.',
        'This section is crucial for understanding the topic.',
        'Great point! Have you thought about...',
        'This could be linked to previous material on...',
        'Interesting perspective. It might help to add...'
    ];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    annotationText.value += `\nAI Suggestion: ${randomSuggestion}`;
});

// Dark Mode Toggle
darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    localStorage.setItem('darkMode', darkModeToggle.checked);
});
