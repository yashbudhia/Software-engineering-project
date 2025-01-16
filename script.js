// script.js

// Initialize Variables
let annotations = JSON.parse(localStorage.getItem('annotations')) || [];
let points = parseInt(localStorage.getItem('points')) || 0;
let badges = JSON.parse(localStorage.getItem('badges')) || [];
let selectedTextGlobal = '';
let collaborators = new Set();
let isTyping = false;
let typingTimer;

// DOM Elements
const content = document.getElementById('content');
const annotationsList = document.getElementById('annotations-list');
const annotationModal = document.getElementById('annotation-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveAnnotationBtn = document.getElementById('save-annotation');
const annotationEditor = document.getElementById('annotation-editor');
const annotationTags = document.getElementById('annotation-tags');
const pointsDisplay = document.getElementById('points');
const badgesDisplay = document.getElementById('badges');
const searchInput = document.getElementById('search-input');
const addVideoAnnotationBtn = document.getElementById('add-video-annotation');
const videoElement = document.getElementById('educational-video');
const aiSuggestBtn = document.getElementById('ai-suggest');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const statsBtn = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const onlineUsersDisplay = document.getElementById('online-users');
const collaboratorsDisplay = document.getElementById('collaborators');
const typingStatus = document.getElementById('typing-status');

// Rich Text Formatting
const formatButtons = document.querySelectorAll('[data-format]');
formatButtons.forEach(button => {
    button.addEventListener('click', () => {
        const format = button.dataset.format;
        document.execCommand(format, false, null);
        annotationEditor.focus();
    });
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                document.execCommand('bold', false, null);
                break;
            case 'i':
                e.preventDefault();
                document.execCommand('italic', false, null);
                break;
            case 'u':
                e.preventDefault();
                document.execCommand('underline', false, null);
                break;
            case 'k':
                e.preventDefault();
                document.execCommand('code', false, null);
                break;
            case 'e':
                e.preventDefault();
                exportAnnotations();
                break;
            case 's':
                e.preventDefault();
                openStatsModal();
                break;
        }
    }
});

// Collaboration Features
function updateCollaborators(userId) {
    collaborators.add(userId);
    onlineUsersDisplay.textContent = `Online: ${collaborators.size}`;
    collaboratorsDisplay.textContent = `Collaborators: ${Array.from(collaborators).join(', ')}`;
}

function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        typingStatus.textContent = 'Someone is typing...';
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        typingStatus.textContent = '';
    }, 1000);
}

annotationEditor.addEventListener('input', handleTyping);

// Annotation Storage Module
const AnnotationStorage = {
    // File-based storage configuration
    FILE_PATH: '/annotations.json',
    
    // Cache for annotations to minimize file I/O
    _annotationsCache: null,
    
    // Fetch annotations from server
    async fetchAnnotations() {
        try {
            const response = await fetch(this.FILE_PATH);
            if (!response.ok) {
                throw new Error('Failed to fetch annotations');
            }
            this._annotationsCache = await response.json();
            return this._annotationsCache;
        } catch (error) {
            console.error('Error fetching annotations:', error);
            // Fallback to localStorage
            const localAnnotations = localStorage.getItem('annotations');
            return localAnnotations ? JSON.parse(localAnnotations) : [];
        }
    },
    
    // Save annotations to server and local storage
    async saveAnnotations(annotations) {
        try {
            // Update cache
            this._annotationsCache = annotations;
            
            // Save to localStorage as backup
            localStorage.setItem('annotations', JSON.stringify(annotations));
            
            // Save to server
            const response = await fetch(this.FILE_PATH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(annotations)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save annotations to server');
            }
            
            return true;
        } catch (error) {
            console.error('Error saving annotations:', error);
            return false;
        }
    },
    
    // Add a single annotation
    async addAnnotation(annotation) {
        try {
            // Fetch current annotations
            const annotations = await this.fetchAnnotations() || [];
            
            // Add new annotation
            annotations.push(annotation);
            
            // Save updated annotations
            await this.saveAnnotations(annotations);
            
            return annotations;
        } catch (error) {
            console.error('Error adding annotation:', error);
            return null;
        }
    },
    
    // Remove an annotation by index
    async removeAnnotation(index) {
        try {
            // Fetch current annotations
            const annotations = await this.fetchAnnotations() || [];
            
            // Remove annotation at specified index
            annotations.splice(index, 1);
            
            // Save updated annotations
            await this.saveAnnotations(annotations);
            
            return annotations;
        } catch (error) {
            console.error('Error removing annotation:', error);
            return null;
        }
    },
    
    // Search annotations
    async searchAnnotations(query) {
        try {
            const annotations = await this.fetchAnnotations() || [];
            
            // Flexible search across annotation properties
            return annotations.filter(ann => 
                ann.text.toLowerCase().includes(query.toLowerCase()) ||
                (ann.tags && ann.tags.some(tag => 
                    tag.toLowerCase().includes(query.toLowerCase())
                )) ||
                (ann.fullSentence && ann.fullSentence.toLowerCase().includes(query.toLowerCase()))
            );
        } catch (error) {
            console.error('Error searching annotations:', error);
            return [];
        }
    }
};

// Modify existing annotation-related functions to use AnnotationStorage
async function saveAnnotations() {
    await AnnotationStorage.saveAnnotations(annotations);
}

// Modify save annotation to use new storage
saveAnnotationBtn.addEventListener('click', async () => {
    const annotationText = annotationEditor.innerHTML.trim();
    const tags = annotationTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    // Extract full sentence context
    const sentenceInfo = extractFullSentence(content.innerText, selectedTextGlobal);
    
    const newAnnotation = {
        type: 'text',
        selectedText: selectedTextGlobal,
        fullSentence: sentenceInfo.fullSentence,
        text: annotationText,
        tags,
        timestamp: new Date().toISOString()
    };
    
    // Use new storage method
    const updatedAnnotations = await AnnotationStorage.addAnnotation(newAnnotation);
    
    if (updatedAnnotations) {
        points += 10; // Earn points for creating an annotation
        updateUserInfo();
        renderAnnotations();
        highlightText();
        closeModal();
        
        // Optional: Show success notification
        showNotification('Annotation saved successfully!');
    } else {
        showNotification('Failed to save annotation. Please try again.', 'error');
    }
});

// Modify initialization to use new storage
window.addEventListener('load', async () => {
    // Fetch annotations from storage
    annotations = await AnnotationStorage.fetchAnnotations() || [];
    
    renderAnnotations();
    highlightText();
    updateUserInfo();
});

// Add notification function for user feedback
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Export/Import Functions
function exportAnnotations() {
    const exportData = {
        annotations,
        points,
        badges,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importAnnotations(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);
            annotations = importData.annotations;
            points = importData.points;
            badges = importData.badges;
            saveAnnotations();
            renderAnnotations();
            updateUserInfo();
            alert('Import successful!');
        } catch (error) {
            alert('Error importing file: Invalid format');
        }
    };
    reader.readAsText(file);
}

// Statistics and Analytics
function openStatsModal() {
    const stats = calculateStats();
    const statsContainer = document.getElementById('annotation-stats');
    statsContainer.innerHTML = `
        <p>Total Annotations: ${stats.total}</p>
        <p>Text Annotations: ${stats.text}</p>
        <p>Video Annotations: ${stats.video}</p>
        <p>Most Used Tags: ${stats.topTags.join(', ')}</p>
        <p>Average Length: ${stats.avgLength} characters</p>
    `;
    
    renderTimeline(stats.timeline);
    statsModal.style.display = 'block';
}

function calculateStats() {
    const stats = {
        total: annotations.length,
        text: annotations.filter(a => a.type === 'text').length,
        video: annotations.filter(a => a.type === 'video').length,
        topTags: getTopTags(),
        avgLength: calculateAverageLength(),
        timeline: generateTimeline()
    };
    return stats;
}

function getTopTags() {
    const tagCount = {};
    annotations.forEach(ann => {
        ann.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
    });
    return Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
}

function calculateAverageLength() {
    if (annotations.length === 0) return 0;
    const totalLength = annotations.reduce((sum, ann) => sum + ann.text.length, 0);
    return Math.round(totalLength / annotations.length);
}

function generateTimeline() {
    return annotations
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(ann => ({
            date: new Date(ann.timestamp),
            type: ann.type
        }));
}

function renderTimeline(timeline) {
    const timelineContainer = document.getElementById('activity-timeline');
    // Implementation of timeline visualization would go here
    // For now, just show basic info
    const timelineHTML = timeline.map(entry => 
        `<div class="timeline-entry">
            <span class="date">${entry.date.toLocaleDateString()}</span>
            <span class="type">${entry.type}</span>
        </div>`
    ).join('');
    timelineContainer.innerHTML = timelineHTML;
}

// Update Points and Badges
function updateUserInfo() {
    pointsDisplay.textContent = `Points: ${points}`;
    badgesDisplay.textContent = `Badges: ${badges.length > 0 ? badges.join(', ') : 'None'}`;
}

// Render Annotations in Sidebar
function renderAnnotations(filter = '') {
    const annotationsList = document.getElementById('annotations-list');
    annotationsList.innerHTML = '';

    let filteredAnnotations = annotations;
    if (filter) {
        const lowerFilter = filter.toLowerCase();
        filteredAnnotations = annotations.filter(ann => 
            ann.fullSentence.toLowerCase().includes(lowerFilter) ||
            ann.text.toLowerCase().includes(lowerFilter) ||
            ann.tags.some(tag => tag.toLowerCase().includes(lowerFilter))
        );
    }

    if (filteredAnnotations.length === 0) {
        const noAnnotationsMsg = document.createElement('div');
        noAnnotationsMsg.classList.add('no-annotations');
        noAnnotationsMsg.textContent = 'No annotations found.';
        annotationsList.appendChild(noAnnotationsMsg);
        return;
    }

    filteredAnnotations.forEach((ann, index) => {
        const annotationItem = document.createElement('div');
        annotationItem.classList.add('annotation-item');

        const annotationHeader = document.createElement('strong');
        annotationHeader.textContent = `Annotation ${index + 1}:`;

        const fullSentenceSpan = document.createElement('div');
        fullSentenceSpan.classList.add('annotation-full-sentence');
        fullSentenceSpan.innerHTML = `<em>Sentence:</em> ${ann.fullSentence}`;

        const annotationBody = document.createElement('div');
        annotationBody.classList.add('annotation-text');
        annotationBody.innerHTML = `<em>Note:</em> ${ann.text}`;

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
                points = Math.max(points - 10, 0); // Deduct points
                saveAnnotations();
                renderAnnotations(searchInput.value);
                highlightText();
                updateUserInfo();
            }
        });

        annotationItem.appendChild(annotationHeader);
        annotationItem.appendChild(fullSentenceSpan);
        annotationItem.appendChild(annotationBody);
        annotationItem.appendChild(annotationTagsDiv);
        annotationItem.appendChild(deleteBtn);

        annotationsList.appendChild(annotationItem);
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
    
    // Get AI suggestions
    const suggestions = getAISuggestions(selectedText, annotations);
    
    // Create suggestions display
    const suggestionsDisplay = document.createElement('div');
    suggestionsDisplay.className = 'ai-suggestions';
    suggestionsDisplay.innerHTML = `
        <div class="suggestions-header">AI Suggestions</div>
        ${suggestions.tags.length > 0 ? `
            <div class="suggestion-section">
                <div class="suggestion-title">Suggested Tags:</div>
                <div class="suggested-tags">
                    ${suggestions.tags.map(tag => `
                        <span class="suggested-tag" onclick="addTag('${tag}')">${tag}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${suggestions.category ? `
            <div class="suggestion-section">
                <div class="suggestion-title">Suggested Category:</div>
                <div class="suggested-category">${suggestions.category}</div>
            </div>
        ` : ''}
        ${suggestions.relatedAnnotations.length > 0 ? `
            <div class="suggestion-section">
                <div class="suggestion-title">Related Annotations:</div>
                <div class="related-annotations">
                    ${suggestions.relatedAnnotations.map(ann => `
                        <div class="related-annotation">${ann.text}</div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${suggestions.improvementTips.length > 0 ? `
            <div class="suggestion-section">
                <div class="suggestion-title">Tips:</div>
                <div class="improvement-tips">
                    ${suggestions.improvementTips.map(tip => `
                        <div class="tip">${tip}</div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    // Insert suggestions before annotation editor
    const modalContent = annotationModal.querySelector('.modal-content');
    modalContent.insertBefore(suggestionsDisplay, annotationEditor);
    
    // Create selected text display
    const selectedTextDisplay = document.createElement('div');
    selectedTextDisplay.className = 'selected-text-display';
    selectedTextDisplay.innerHTML = `
        <div class="selected-text-header">Selected Text:</div>
        <div class="selected-text-content">${selectedText}</div>
    `;
    
    modalContent.insertBefore(selectedTextDisplay, annotationEditor);
    
    // Focus on the editor
    annotationEditor.focus();
}

// Function to get AI suggestions for annotation
function getAISuggestions(selectedText, existingAnnotations) {
    const suggestions = {
        tags: [],
        category: null,
        relatedAnnotations: [],
        improvementTips: []
    };

    // Analyze text for keywords and generate tag suggestions
    AI_SUGGESTIONS.keywords.forEach(keyword => {
        if (selectedText.toLowerCase().includes(keyword)) {
            suggestions.tags.push(keyword);
        }
    });

    // Suggest category based on content
    if (selectedText.includes('?')) {
        suggestions.category = 'Question';
    } else if (selectedText.toLowerCase().includes('example') || selectedText.toLowerCase().includes('e.g.')) {
        suggestions.category = 'Example';
    } else if (selectedText.toLowerCase().includes('define') || selectedText.toLowerCase().includes('means')) {
        suggestions.category = 'Definition';
    }

    // Find related annotations
    suggestions.relatedAnnotations = existingAnnotations.filter(ann => 
        ann.text.toLowerCase().includes(selectedText.toLowerCase())
    ).slice(0, 3);

    // Generate improvement tips
    if (selectedText.length < 10) {
        suggestions.improvementTips.push('Consider selecting more context for a more meaningful annotation.');
    }
    if (!selectedText.includes(' ')) {
        suggestions.improvementTips.push('Try selecting complete phrases or sentences for better context.');
    }

    return suggestions;
}

// Function to add suggested tag
function addTag(tag) {
    const currentTags = annotationTags.value.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        annotationTags.value = currentTags.join(', ');
    }
}

// AI Suggestions Configuration
const AI_SUGGESTIONS = {
    keywords: [
        'important', 'note', 'remember', 'key point', 'definition',
        'example', 'reference', 'citation', 'summary', 'conclusion'
    ],
    categories: [
        'Main Idea', 'Supporting Detail', 'Definition', 'Example',
        'Citation', 'Question', 'Summary', 'Analysis', 'Connection'
    ]
};

// Function to save annotations to file
async function saveAnnotationsToFile() {
    try {
        const response = await fetch('annotations.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(annotations)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save annotations');
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('annotations', JSON.stringify(annotations));
        
    } catch (error) {
        console.error('Error saving annotations:', error);
        // Fallback to localStorage if file save fails
        localStorage.setItem('annotations', JSON.stringify(annotations));
    }
}

// Function to load annotations from file
async function loadAnnotationsFromFile() {
    try {
        const response = await fetch('annotations.json');
        if (!response.ok) {
            throw new Error('Failed to load annotations');
        }
        
        const data = await response.json();
        annotations = data;
        
        // Update UI
        renderAnnotations();
        highlightText();
        
    } catch (error) {
        console.error('Error loading annotations:', error);
        // Fallback to localStorage if file load fails
        const savedAnnotations = localStorage.getItem('annotations');
        if (savedAnnotations) {
            annotations = JSON.parse(savedAnnotations);
            renderAnnotations();
            highlightText();
        }
    }
}

// Close Annotation Modal
function closeModal() {
    annotationModal.style.display = 'none';
    annotationModal.setAttribute('aria-hidden', 'true');
    
    // Remove the selected text display
    const selectedTextDisplay = annotationModal.querySelector('.selected-text-display');
    if (selectedTextDisplay) {
        selectedTextDisplay.remove();
    }
    
    annotationEditor.innerHTML = '';
    annotationTags.value = '';
    selectedTextGlobal = '';
}

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
    loadAnnotationsFromFile();
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

        saveAnnotationsToFile();
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
aiSuggestBtn.addEventListener('click', async () => {
    aiSuggestBtn.disabled = true;
    aiSuggestBtn.textContent = 'Generating...';
    
    const context = selectedTextGlobal;
    const existingAnnotations = annotations
        .filter(a => a.type === 'text')
        .map(a => a.text)
        .join('\n');

    try {
        // Simulated AI response with more sophisticated suggestions
        await new Promise(resolve => setTimeout(resolve, 1000));
        const suggestions = [
            {
                type: 'analysis',
                text: `This passage appears to be discussing ${context.substring(0, 30)}... Consider analyzing its relationship with previous concepts.`
            },
            {
                type: 'question',
                text: 'What are the key implications of this point for the broader topic?'
            },
            {
                type: 'connection',
                text: `This connects with similar ideas in ${existingAnnotations.length > 0 ? 'your previous annotations' : 'the earlier sections'}.`
            },
            {
                type: 'improvement',
                text: 'Consider adding specific examples to strengthen this point.'
            }
        ];

        const randomSuggestions = suggestions
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);

        let suggestionHTML = '\n\n💡 AI Suggestions:\n';
        randomSuggestions.forEach(suggestion => {
            suggestionHTML += `\n[${suggestion.type.toUpperCase()}]: ${suggestion.text}\n`;
        });

        annotationEditor.value += suggestionHTML;
    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        alert('Failed to generate AI suggestions. Please try again.');
    } finally {
        aiSuggestBtn.disabled = false;
        aiSuggestBtn.textContent = 'Get AI Suggestion';
    }
});

// Enhanced Video Annotation
addVideoAnnotationBtn.addEventListener('click', () => {
    const currentTime = videoElement.currentTime;
    
    // Create modal for video annotation
    const videoAnnotationModal = document.createElement('div');
    videoAnnotationModal.className = 'video-annotation-modal';
    videoAnnotationModal.innerHTML = `
        <div class="modal-content">
            <h3>Add Video Annotation at ${formatTime(currentTime)}</h3>
            <div class="timestamp-control">
                <button class="time-adjust" data-adjust="-5">-5s</button>
                <span class="current-time">${formatTime(currentTime)}</span>
                <button class="time-adjust" data-adjust="+5">+5s</button>
            </div>
            <textarea id="video-comment" placeholder="Enter your annotation..."></textarea>
            <input type="text" id="video-tags" placeholder="Enter tags (comma separated)">
            <div class="button-group">
                <button id="save-video-annotation">Save</button>
                <button id="cancel-video-annotation">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(videoAnnotationModal);
    
    const saveBtn = videoAnnotationModal.querySelector('#save-video-annotation');
    const cancelBtn = videoAnnotationModal.querySelector('#cancel-video-annotation');
    const timeAdjustBtns = videoAnnotationModal.querySelectorAll('.time-adjust');
    const commentInput = videoAnnotationModal.querySelector('#video-comment');
    const tagsInput = videoAnnotationModal.querySelector('#video-tags');
    
    timeAdjustBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const adjustment = parseInt(btn.dataset.adjust);
            videoElement.currentTime = Math.max(0, currentTime + adjustment);
            videoAnnotationModal.querySelector('.current-time').textContent = 
                formatTime(videoElement.currentTime);
        });
    });
    
    saveBtn.addEventListener('click', () => {
        const comment = commentInput.value.trim();
        const tags = tagsInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');
        
        if (comment) {
            const videoAnnotation = {
                id: Date.now(),
                type: 'video',
                timestamp: videoElement.currentTime,
                text: comment,
                tags,
                created: new Date().toISOString()
            };
            
            annotations.push(videoAnnotation);
            points += 20;
            
            // Check for video annotation achievements
            const videoAnnotationCount = annotations.filter(a => a.type === 'video').length;
            if (videoAnnotationCount === 5 && !badges.includes('Video Explorer')) {
                badges.push('Video Explorer');
                showAchievement('Video Explorer', 'Created 5 video annotations!');
            }
            if (videoAnnotationCount === 10 && !badges.includes('Video Master')) {
                badges.push('Video Master');
                showAchievement('Video Master', 'Created 10 video annotations!');
            }
            
            saveAnnotationsToFile();
            renderAnnotations();
            updateUserInfo();
            
            // Add visual marker on video timeline
            addVideoMarker(videoAnnotation);
        }
        
        document.body.removeChild(videoAnnotationModal);
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(videoAnnotationModal);
    });
});

// Achievement notification system
function showAchievement(title, message) {
    const achievement = document.createElement('div');
    achievement.className = 'achievement-notification';
    achievement.innerHTML = `
        <div class="achievement-content">
            <h4>🏆 ${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(achievement);
    
    setTimeout(() => {
        achievement.classList.add('show');
        setTimeout(() => {
            achievement.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(achievement);
            }, 300);
        }, 3000);
    }, 100);
}

// Video timeline markers
function addVideoMarker(annotation) {
    const timeline = document.createElement('div');
    timeline.className = 'video-timeline';
    const marker = document.createElement('div');
    marker.className = 'video-marker';
    marker.style.left = `${(annotation.timestamp / videoElement.duration) * 100}%`;
    marker.title = annotation.text;
    
    marker.addEventListener('click', () => {
        videoElement.currentTime = annotation.timestamp;
    });
    
    timeline.appendChild(marker);
}

// Enhanced Export functionality
exportBtn.addEventListener('click', () => {
    const exportModal = document.createElement('div');
    exportModal.className = 'export-modal';
    exportModal.innerHTML = `
        <div class="modal-content">
            <h3>Export Options</h3>
            <div class="export-options">
                <label>
                    <input type="checkbox" id="export-annotations" checked>
                    Annotations
                </label>
                <label>
                    <input type="checkbox" id="export-points" checked>
                    Points & Badges
                </label>
                <label>
                    <input type="checkbox" id="export-stats" checked>
                    Statistics
                </label>
            </div>
            <div class="format-options">
                <label>
                    <input type="radio" name="format" value="json" checked>
                    JSON
                </label>
                <label>
                    <input type="radio" name="format" value="txt">
                    Text
                </label>
            </div>
            <div class="button-group">
                <button id="confirm-export">Export</button>
                <button id="cancel-export">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(exportModal);
    
    const confirmBtn = exportModal.querySelector('#confirm-export');
    const cancelBtn = exportModal.querySelector('#cancel-export');
    
    confirmBtn.addEventListener('click', () => {
        const includeAnnotations = exportModal.querySelector('#export-annotations').checked;
        const includePoints = exportModal.querySelector('#export-points').checked;
        const includeStats = exportModal.querySelector('#export-stats').checked;
        const format = exportModal.querySelector('input[name="format"]:checked').value;
        
        const exportData = {};
        if (includeAnnotations) exportData.annotations = annotations;
        if (includePoints) {
            exportData.points = points;
            exportData.badges = badges;
        }
        if (includeStats) exportData.statistics = calculateStats();
        
        const filename = `annotations-export-${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'json') {
            downloadFile(`${filename}.json`, JSON.stringify(exportData, null, 2), 'application/json');
        } else {
            let textContent = '=== Annotations Export ===\n\n';
            if (includeAnnotations) {
                textContent += '--- Annotations ---\n';
                annotations.forEach((ann, i) => {
                    textContent += `\n${i + 1}. ${ann.type.toUpperCase()} Annotation:\n`;
                    textContent += `Text: ${ann.text}\n`;
                    textContent += `Tags: ${ann.tags.join(', ')}\n`;
                    if (ann.type === 'video') {
                        textContent += `Timestamp: ${formatTime(ann.timestamp)}\n`;
                    }
                });
            }
            if (includePoints) {
                textContent += '\n--- Points & Badges ---\n';
                textContent += `Points: ${points}\n`;
                textContent += `Badges: ${badges.join(', ')}\n`;
            }
            if (includeStats) {
                const stats = calculateStats();
                textContent += '\n--- Statistics ---\n';
                textContent += `Total Annotations: ${stats.total}\n`;
                textContent += `Text Annotations: ${stats.text}\n`;
                textContent += `Video Annotations: ${stats.video}\n`;
                textContent += `Most Used Tags: ${stats.topTags.join(', ')}\n`;
            }
            downloadFile(`${filename}.txt`, textContent, 'text/plain');
        }
        
        document.body.removeChild(exportModal);
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(exportModal);
    });
});

// Enhanced Import functionality
importBtn.addEventListener('change', (e) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const importData = JSON.parse(e.target.result);
                    if (importData.annotations) annotations = importData.annotations;
                    if (importData.points) points = importData.points;
                    if (importData.badges) badges = importData.badges;
                } else {
                    // Parse text format
                    const text = e.target.result;
                    const sections = text.split('---');
                    sections.forEach(section => {
                        if (section.includes('Annotations')) {
                            // Parse annotations from text format
                            const annotationMatches = section.matchAll(/\d+\.\s+(\w+)\s+Annotation:\nText:\s+(.*?)\nTags:\s+(.*?)(?:\nTimestamp:\s+(.*?))?\n/g);
                            for (const match of annotationMatches) {
                                annotations.push({
                                    id: Date.now() + Math.random(),
                                    type: match[1].toLowerCase(),
                                    text: match[2],
                                    tags: match[3].split(',').map(t => t.trim()),
                                    ...(match[4] && { timestamp: parseTimeToSeconds(match[4]) })
                                });
                            }
                        }
                    });
                }
                
                saveAnnotationsToFile();
                renderAnnotations();
                updateUserInfo();
                showAchievement('Import Success', 'Annotations imported successfully!');
            } catch (error) {
                console.error('Error importing file:', error);
                alert('Error importing file. Please check the file format.');
            }
        };
        
        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsText(file);
        }
    });
    
    input.click();
});

// Utility function to download files
function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Utility function to parse time string to seconds
function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

// Dark Mode Toggle
darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

// Export Button
exportBtn.addEventListener('click', exportAnnotations);

// Import Button
importBtn.addEventListener('change', (e) => {
    importAnnotations(e.target.files[0]);
});

// Stats Button
statsBtn.addEventListener('click', openStatsModal);

// Add styles for no annotations message
const styleTag = document.createElement('style');
styleTag.textContent = `
.no-annotations {
    text-align: center;
    color: #888;
    padding: 20px;
    font-style: italic;
    background: #f5f5f5;
    border-radius: 8px;
}

.dark-mode .no-annotations {
    background: #2a2a2a;
    color: #aaa;
}
`;
document.head.appendChild(styleTag);
const selectedTextStyleTag = document.createElement('style');
selectedTextStyleTag.textContent = `
.selected-text-display {
    background: #f5f5f5;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 15px;
    border-left: 4px solid #4a90e2;
}

.selected-text-header {
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.selected-text-content {
    font-size: 1em;
    line-height: 1.5;
    color: #333;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 100px;
    overflow-y: auto;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
}

.dark-mode .selected-text-display {
    background: #2a2a2a;
    border-left-color: #6ab0ff;
}

.dark-mode .selected-text-header {
    color: #aaa;
}

.dark-mode .selected-text-content {
    color: #fff;
    background: #3a3a3a;
    border-color: #4a4a4a;
}
`;
document.head.appendChild(selectedTextStyleTag);

const aiSuggestionsStyle = document.createElement('style');
aiSuggestionsStyle.textContent = `
.ai-suggestions {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    border: 1px solid #e0e0e0;
}

.suggestions-header {
    font-weight: 600;
    color: #2196F3;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #2196F3;
}

.suggestion-section {
    margin-bottom: 12px;
}

.suggestion-title {
    font-weight: 500;
    color: #666;
    margin-bottom: 5px;
}

.suggested-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.suggested-tag {
    background: #e3f2fd;
    color: #1976D2;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.9em;
    cursor: pointer;
    transition: background-color 0.2s;
}

.suggested-tag:hover {
    background: #bbdefb;
}

.suggested-category {
    color: #4CAF50;
    font-weight: 500;
}

.related-annotations {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.related-annotation {
    background: white;
    padding: 8px;
    border-radius: 4px;
    border-left: 3px solid #9C27B0;
    font-size: 0.9em;
}

.improvement-tips {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tip {
    color: #F57C00;
    font-size: 0.9em;
    padding-left: 20px;
    position: relative;
}

.tip:before {
    content: "💡";
    position: absolute;
    left: 0;
}

/* Dark Mode Styles */
.dark-mode .ai-suggestions {
    background: #2a2a2a;
    border-color: #404040;
}

.dark-mode .suggestions-header {
    color: #64B5F6;
    border-bottom-color: #64B5F6;
}

.dark-mode .suggestion-title {
    color: #aaa;
}

.dark-mode .suggested-tag {
    background: #1a237e;
    color: #90CAF9;
}

.dark-mode .suggested-tag:hover {
    background: #283593;
}

.dark-mode .suggested-category {
    color: #81C784;
}

.dark-mode .related-annotation {
    background: #3a3a3a;
    border-left-color: #CE93D8;
}

.dark-mode .tip {
    color: #FFB74D;
}
`;
document.head.appendChild(aiSuggestionsStyle);

const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 5px;
    color: white;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
}

.notification.success {
    background-color: #4CAF50;
}

.notification.error {
    background-color: #F44336;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(notificationStyle);

// OpenAI Configuration
const OPENAI_API_KEY =process.env.OPENAI_API_KEY;

// OpenAI Text Summarization Service
class OpenAISummarizer {
    static async summarizeText(text) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system", 
                            content: "You are a helpful assistant that summarizes text concisely."
                        },
                        {
                            role: "user", 
                            content: `Provide a concise, informative summary of the following text. Focus on key points and main ideas:\n\n${text}`
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('OpenAI API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error in OpenAI summarization:', error);
            return null;
        }
    }
}

// Enhanced Text Selection Handler
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        // Create enhanced annotation modal
        const modalHtml = `
            <div id="enhanced-annotation-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Annotation Form</h2>
                    
                    <div class="selected-text-section">
                        <h3>Selected Text:</h3>
                        <div id="selected-text-display" class="text-display">
                            ${selectedText}
                        </div>
                        <div class="text-actions">
                            <button id="save-text-btn">Save Text</button>
                            <button id="copy-text-btn">Copy Text</button>
                        </div>
                    </div>

                    <div id="ai-summary-section" class="ai-summary-section">
                        <h3>AI Summary:</h3>
                        <div id="ai-summary-content" class="loading-placeholder">
                            Generating summary...
                        </div>
                    </div>

                    <div class="annotation-form">
                        <h3>Your Annotation:</h3>
                        <textarea id="annotation-textarea" placeholder="Write your annotation here..."></textarea>
                        
                        <div class="annotation-metadata">
                            <input type="text" id="annotation-tags" placeholder="Add tags (comma-separated)">
                            <select id="annotation-color">
                                <option value="yellow">Yellow</option>
                                <option value="green">Green</option>
                                <option value="blue">Blue</option>
                                <option value="pink">Pink</option>
                                <option value="orange">Orange</option>
                            </select>
                        </div>

                        <div class="modal-actions">
                            <button id="save-annotation-btn">Save Annotation</button>
                            <button id="cancel-annotation-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Create modal element
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Get modal elements
        const modal = document.getElementById('enhanced-annotation-modal');
        const closeBtn = modal.querySelector('.close-modal');
        const saveTextBtn = document.getElementById('save-text-btn');
        const copyTextBtn = document.getElementById('copy-text-btn');
        const aiSummaryContent = document.getElementById('ai-summary-content');
        const annotationTextarea = document.getElementById('annotation-textarea');
        const annotationTags = document.getElementById('annotation-tags');
        const annotationColor = document.getElementById('annotation-color');
        const saveAnnotationBtn = document.getElementById('save-annotation-btn');
        const cancelBtn = document.getElementById('cancel-annotation-btn');

        // Generate AI Summary
        (async () => {
            try {
                const summary = await OpenAISummarizer.summarizeText(selectedText);
                aiSummaryContent.innerHTML = summary || 'Unable to generate summary.';
                aiSummaryContent.classList.remove('loading-placeholder');
            } catch (error) {
                aiSummaryContent.innerHTML = 'Error generating summary.';
                aiSummaryContent.classList.remove('loading-placeholder');
                aiSummaryContent.classList.add('error-placeholder');
            }
        })();

        // Save Selected Text to File
        saveTextBtn.addEventListener('click', async () => {
            try {
                const textFile = new Blob([selectedText], {type: 'text/plain'});
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `selected_text_${timestamp}.txt`;

                // Use Fetch API to save file
                const response = await fetch('/save-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filename: filename,
                        content: selectedText
                    })
                });

                if (response.ok) {
                    showNotification(`Text saved as ${filename}`, 'success');
                } else {
                    showNotification('Failed to save text', 'error');
                }
            } catch (error) {
                console.error('Error saving text:', error);
                showNotification('Error saving text', 'error');
            }
        });

        // Copy Selected Text
        copyTextBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(selectedText).then(() => {
                showNotification('Text copied to clipboard', 'success');
            }).catch(err => {
                console.error('Copy failed:', err);
                showNotification('Failed to copy text', 'error');
            });
        });

        // Save Annotation
        saveAnnotationBtn.addEventListener('click', async () => {
            const annotationText = annotationTextarea.value.trim();
            const tags = annotationTags.value.split(',').map(tag => tag.trim()).filter(Boolean);
            const color = annotationColor.value;

            if (!annotationText) {
                showNotification('Annotation cannot be empty', 'error');
                return;
            }

            const newAnnotation = {
                selectedText,
                annotationText,
                tags,
                color,
                timestamp: new Date().toISOString()
            };

            try {
                await AnnotationStorage.addAnnotation(newAnnotation);
                showNotification('Annotation saved successfully', 'success');
                modal.remove();
            } catch (error) {
                showNotification('Failed to save annotation', 'error');
            }
        });

        // Cancel Annotation
        cancelBtn.addEventListener('click', () => modal.remove());
        closeBtn.addEventListener('click', () => modal.remove());

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Replace existing text selection listener
content.addEventListener('mouseup', handleTextSelection);

// Add styles for enhanced modal
const enhancedModalStyle = document.createElement('style');
enhancedModalStyle.textContent = `
#enhanced-annotation-modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
}

#enhanced-annotation-modal .modal-content {
    background-color: #fefefe;
    padding: 20px;
    border-radius: 10px;
    width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 15px 50px rgba(0,0,0,0.1);
    animation: slideUp 0.4s ease;
}

.close-modal {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.selected-text-section, 
.ai-summary-section, 
.annotation-form {
    margin-bottom: 20px;
}

.text-display {
    background-color: #f4f4f4;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 10px;
}

.text-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.annotation-metadata {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

#annotation-textarea {
    width: 100%;
    min-height: 100px;
    margin-bottom: 10px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.loading-placeholder {
    background-color: #f0f0f0;
    color: #888;
    padding: 10px;
    text-align: center;
}

.error-placeholder {
    background-color: #ffdddd;
    color: #ff0000;
    padding: 10px;
    text-align: center;
}
`;
document.head.appendChild(enhancedModalStyle);

// Video Annotation Module
class VideoAnnotator {
    constructor(videoElement) {
        this.video = videoElement;
        this.annotations = [];
        this.currentAnnotation = null;
        this.initializeAnnotationControls();
    }

    initializeAnnotationControls() {
        // Create annotation container
        this.annotationContainer = document.createElement('div');
        this.annotationContainer.className = 'video-annotation-container';
        this.video.parentNode.insertBefore(this.annotationContainer, this.video.nextSibling);

        // Create annotation controls
        this.createAnnotationControls();

        // Add event listeners
        this.video.addEventListener('timeupdate', () => this.updateAnnotationMarkers());
        this.video.addEventListener('loadedmetadata', () => this.loadSavedAnnotations());
    }

    createAnnotationControls() {
        const controlsHtml = `
            <div class="video-annotation-controls">
                <button id="start-annotation-btn">Start Annotation</button>
                <button id="end-annotation-btn" disabled>End Annotation</button>
                <input type="text" id="annotation-text" placeholder="Enter annotation text">
                <select id="annotation-type">
                    <option value="highlight">Highlight</option>
                    <option value="note">Note</option>
                    <option value="question">Question</option>
                </select>
                <button id="save-video-annotation-btn" disabled>Save Annotation</button>
            </div>
        `;

        this.annotationContainer.innerHTML = controlsHtml;

        // Get control elements
        this.startAnnotationBtn = document.getElementById('start-annotation-btn');
        this.endAnnotationBtn = document.getElementById('end-annotation-btn');
        this.annotationTextInput = document.getElementById('annotation-text');
        this.annotationTypeSelect = document.getElementById('annotation-type');
        this.saveAnnotationBtn = document.getElementById('save-video-annotation-btn');

        // Add event listeners
        this.startAnnotationBtn.addEventListener('click', () => this.startAnnotation());
        this.endAnnotationBtn.addEventListener('click', () => this.endAnnotation());
        this.saveAnnotationBtn.addEventListener('click', () => this.saveAnnotation());
    }

    startAnnotation() {
        this.currentAnnotation = {
            startTime: this.video.currentTime,
            endTime: null,
            text: '',
            type: 'highlight'
        };

        this.startAnnotationBtn.disabled = true;
        this.endAnnotationBtn.disabled = false;
        this.saveAnnotationBtn.disabled = true;
        this.annotationTextInput.value = '';
    }

    endAnnotation() {
        if (this.currentAnnotation) {
            this.currentAnnotation.endTime = this.video.currentTime;
            this.endAnnotationBtn.disabled = true;
            this.saveAnnotationBtn.disabled = false;
        }
    }

    saveAnnotation() {
        if (this.currentAnnotation) {
            // Get annotation details
            this.currentAnnotation.text = this.annotationTextInput.value.trim();
            this.currentAnnotation.type = this.annotationTypeSelect.value;

            // Validate annotation
            if (!this.currentAnnotation.text) {
                showNotification('Annotation text cannot be empty', 'error');
                return;
            }

            // Add to annotations array
            this.annotations.push(this.currentAnnotation);

            // Save annotations
            this.saveAnnotationsToStorage();

            // Reset UI
            this.startAnnotationBtn.disabled = false;
            this.endAnnotationBtn.disabled = true;
            this.saveAnnotationBtn.disabled = true;
            this.annotationTextInput.value = '';

            // Show success notification
            showNotification('Video annotation saved successfully', 'success');

            // Reset current annotation
            this.currentAnnotation = null;

            // Update annotation markers
            this.updateAnnotationMarkers();
        }
    }

    updateAnnotationMarkers() {
        // Clear existing markers
        const existingMarkers = this.annotationContainer.querySelectorAll('.video-annotation-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Calculate video duration and timeline width
        const duration = this.video.duration;
        const timelineWidth = this.annotationContainer.clientWidth;

        // Create markers for each annotation
        this.annotations.forEach((annotation, index) => {
            const marker = document.createElement('div');
            marker.className = `video-annotation-marker ${annotation.type}`;
            
            // Calculate marker position
            const left = (annotation.startTime / duration) * 100;
            marker.style.left = `${left}%`;

            // Add tooltip with annotation details
            marker.title = `${annotation.type}: ${annotation.text}`;

            // Add click event to seek to annotation
            marker.addEventListener('click', () => {
                this.video.currentTime = annotation.startTime;
            });

            this.annotationContainer.appendChild(marker);
        });
    }

    saveAnnotationsToStorage() {
        // Save to local storage
        localStorage.setItem(`video-annotations-${this.video.id}`, JSON.stringify(this.annotations));

        // Optional: Save to server
        this.saveAnnotationsToServer();
    }

    async saveAnnotationsToServer() {
        try {
            const response = await fetch('/video-annotations.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videoId: this.video.id,
                    annotations: this.annotations
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save video annotations');
            }
        } catch (error) {
            console.error('Error saving video annotations:', error);
        }
    }

    loadSavedAnnotations() {
        // Try to load from local storage first
        const savedAnnotations = localStorage.getItem(`video-annotations-${this.video.id}`);
        
        if (savedAnnotations) {
            this.annotations = JSON.parse(savedAnnotations);
            this.updateAnnotationMarkers();
        }

        // Optional: Load from server
        this.loadAnnotationsFromServer();
    }

    async loadAnnotationsFromServer() {
        try {
            const response = await fetch(`/video-annotations.json?videoId=${this.video.id}`);
            
            if (response.ok) {
                const serverAnnotations = await response.json();
                
                // Merge server annotations with local annotations
                this.annotations = [...this.annotations, ...serverAnnotations];
                
                // Remove duplicates
                this.annotations = Array.from(new Set(this.annotations.map(a => JSON.stringify(a))))
                    .map(a => JSON.parse(a));
                
                this.updateAnnotationMarkers();
            }
        } catch (error) {
            console.error('Error loading video annotations:', error);
        }
    }
}

// Add video annotation styles
const videoAnnotationStyles = document.createElement('style');
videoAnnotationStyles.textContent = `
.video-annotation-container {
    position: relative;
    width: 100%;
    height: 40px;
    background-color: #f0f0f0;
    margin-top: 10px;
}

.video-annotation-marker {
    position: absolute;
    width: 10px;
    height: 20px;
    top: 10px;
    transform: translateX(-50%);
    cursor: pointer;
    transition: all 0.3s ease;
}

.video-annotation-marker.highlight {
    background-color: yellow;
}

.video-annotation-marker.note {
    background-color: green;
}

.video-annotation-marker.question {
    background-color: blue;
}

.video-annotation-marker:hover {
    transform: translateX(-50%) scale(1.5);
    z-index: 10;
}

.video-annotation-controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    align-items: center;
}

.video-annotation-controls button,
.video-annotation-controls input,
.video-annotation-controls select {
    padding: 5px;
    height: 35px;
}
`;
document.head.appendChild(videoAnnotationStyles);

// Function to initialize video annotations
function initializeVideoAnnotations() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        // Assign unique ID if not present
        if (!video.id) {
            video.id = `video-${Date.now()}`;
        }
        
        // Create video annotator
        new VideoAnnotator(video);
    });
}

// Initialize video annotations when page loads
window.addEventListener('load', initializeVideoAnnotations);

// Enhanced UI Module for Annotations
const AnnotationUI = {
    // Create a modern, interactive annotation dashboard
    createAnnotationDashboard() {
        // Create dashboard container
        const dashboard = document.createElement('div');
        dashboard.id = 'annotation-dashboard';
        dashboard.innerHTML = `
            <div class="annotation-dashboard-container">
                <div class="dashboard-header">
                    <h1>Annotation Hub</h1>
                    <div class="dashboard-actions">
                        <button id="new-annotation-btn" class="btn-primary">
                            <i class="fas fa-plus"></i> New Annotation
                        </button>
                        <button id="export-annotations-btn" class="btn-secondary">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>

                <div class="dashboard-filters">
                    <input type="text" id="search-annotations" placeholder="🔍 Search annotations...">
                    <select id="filter-type">
                        <option value="">All Types</option>
                        <option value="text">Text</option>
                        <option value="video">Video</option>
                        <option value="highlight">Highlight</option>
                        <option value="web-search">Web Search</option>
                    </select>
                    <input type="date" id="filter-date-from" placeholder="From Date">
                    <input type="date" id="filter-date-to" placeholder="To Date">
                </div>

                <div class="annotations-grid">
                    <!-- Annotations will be dynamically populated here -->
                </div>

                <div class="pagination">
                    <button id="prev-page" class="btn-pagination">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span id="page-info">Page 1 of 10</span>
                    <button id="next-page" class="btn-pagination">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <!-- Floating Action Button -->
            <div id="fab-annotation" class="floating-action-btn">
                <i class="fas fa-plus"></i>
            </div>
        `;

        // Add to body
        document.body.appendChild(dashboard);

        // Add styles
        this.addDashboardStyles();

        // Initialize event listeners
        this.initializeDashboardEvents();
    },

    // Styles for dashboard
    addDashboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary-color: #3498db;
                --secondary-color: #2ecc71;
                --background-color: #f4f6f7;
                --text-color: #2c3e50;
                --card-background: white;
            }

            #annotation-dashboard {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .annotation-dashboard-container {
                width: 90%;
                max-width: 1200px;
                height: 90%;
                background: var(--card-background);
                border-radius: 15px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: slideUp 0.4s ease;
            }

            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: var(--background-color);
                border-bottom: 1px solid #e0e0e0;
            }

            .dashboard-actions {
                display: flex;
                gap: 10px;
            }

            .btn-primary, .btn-secondary {
                padding: 10px 15px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
            }

            .btn-primary {
                background: var(--primary-color);
                color: white;
            }

            .btn-secondary {
                background: var(--secondary-color);
                color: white;
            }

            .dashboard-filters {
                display: flex;
                gap: 15px;
                padding: 15px 20px;
                background: #f9f9f9;
            }

            .dashboard-filters input,
            .dashboard-filters select {
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                flex-grow: 1;
            }

            .annotations-grid {
                flex-grow: 1;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
                padding: 20px;
            }

            .annotation-card {
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                padding: 15px;
                transition: transform 0.3s ease;
            }

            .annotation-card:hover {
                transform: scale(1.03);
            }

            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: var(--background-color);
            }

            .btn-pagination {
                background: none;
                border: 1px solid #ddd;
                padding: 8px 15px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .floating-action-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: var(--primary-color);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                cursor: pointer;
                transition: all 0.3s ease;
                z-index: 1001;
            }

            .floating-action-btn:hover {
                transform: scale(1.1) rotate(90deg);
                background: var(--secondary-color);
            }
        `;
        document.head.appendChild(style);
    },

    // Initialize dashboard events
    initializeDashboardEvents() {
        const dashboard = document.getElementById('annotation-dashboard');
        const newAnnotationBtn = document.getElementById('new-annotation-btn');
        const exportAnnotationsBtn = document.getElementById('export-annotations-btn');
        const searchInput = document.getElementById('search-annotations');
        const typeFilter = document.getElementById('filter-type');
        const dateFromFilter = document.getElementById('filter-date-from');
        const dateToFilter = document.getElementById('filter-date-to');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const fab = document.getElementById('fab-annotation');

        // Close dashboard when clicking outside
        dashboard.addEventListener('click', (e) => {
            if (e.target === dashboard) {
                dashboard.remove();
            }
        });

        // New annotation
        newAnnotationBtn.addEventListener('click', () => {
            handleTextSelection();
        });

        // Export annotations
        exportAnnotationsBtn.addEventListener('click', () => {
            AnnotationStorage.exportAnnotations('json');
        });

        // Search and filter
        const applyFilters = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const typeFilterValue = typeFilter.value;
            const fromDate = new Date(dateFromFilter.value);
            const toDate = new Date(dateToFilter.value);

            this.renderAnnotations(
                AnnotationStorage.getLocalAnnotations().filter(annotation => {
                    const matchesSearch = !searchTerm || 
                        JSON.stringify(annotation).toLowerCase().includes(searchTerm);
                    
                    const matchesType = !typeFilterValue || 
                        annotation.type === typeFilterValue;
                    
                    const annotationDate = new Date(annotation.timestamp);
                    const matchesDateRange = 
                        (!dateFromFilter.value || annotationDate >= fromDate) &&
                        (!dateToFilter.value || annotationDate <= toDate);

                    return matchesSearch && matchesType && matchesDateRange;
                })
            );
        };

        searchInput.addEventListener('input', applyFilters);
        typeFilter.addEventListener('change', applyFilters);
        dateFromFilter.addEventListener('change', applyFilters);
        dateToFilter.addEventListener('change', applyFilters);

        // Floating Action Button
        fab.addEventListener('click', () => {
            handleTextSelection();
        });
    },

    // Render annotations in grid
    renderAnnotations(annotations = []) {
        const grid = document.querySelector('.annotations-grid');
        grid.innerHTML = ''; // Clear existing

        annotations.forEach(annotation => {
            const card = document.createElement('div');
            card.classList.add('annotation-card');
            
            // Determine icon based on type
            const typeIcons = {
                'text': 'fas fa-file-alt',
                'video': 'fas fa-video',
                'highlight': 'fas fa-highlighter',
                'web-search': 'fas fa-search'
            };

            card.innerHTML = `
                <div class="annotation-card-header">
                    <i class="${typeIcons[annotation.type] || 'fas fa-sticky-note'}"></i>
                    <span class="annotation-type">${annotation.type || 'Unknown'}</span>
                    <span class="annotation-date">${new Date(annotation.timestamp).toLocaleString()}</span>
                </div>
                <div class="annotation-card-content">
                    <p>${annotation.text || annotation.selectedText || 'No content'}</p>
                </div>
                <div class="annotation-card-tags">
                    ${(annotation.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            `;

            grid.appendChild(card);
        });
    }
};

// Modify text selection to include UI enhancements
function handleTextSelection() {
    // Existing text selection logic...
    
    // Add UI flourishes
    const modal = document.getElementById('enhanced-annotation-modal');
    if (modal) {
        // Add subtle animations
        modal.style.animation = 'modalSlideUp 0.3s ease';
        
        // Add sound effect (optional)
        try {
            const audio = new Audio('path/to/soft-notification.mp3');
            audio.play();
        } catch (error) {
            console.log('Sound effect not available');
        }
    }
}

// Add Font Awesome for icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css';
document.head.appendChild(fontAwesomeLink);

// Add global animation styles
const animationStyles = document.createElement('style');
animationStyles.textContent = `
@keyframes modalSlideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
`;
document.head.appendChild(animationStyles);

// Initialize dashboard on load or button click
window.addEventListener('load', () => {
    // Add dashboard toggle button
    const dashboardToggle = document.createElement('button');
    dashboardToggle.id = 'annotation-dashboard-toggle';
    dashboardToggle.innerHTML = '<i class="fas fa-sticky-note"></i> Annotations';
    dashboardToggle.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 10px 15px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    dashboardToggle.addEventListener('click', () => {
        AnnotationUI.createAnnotationDashboard();
    });

    document.body.appendChild(dashboardToggle);
});
