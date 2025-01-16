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
const annotationPanel = document.getElementById('annotations-list');
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
    annotationEditor.focus();
    annotationEditor.value = `Selected Text: "${selectedText}"\n\n`;
}

// Close Annotation Modal
function closeModal() {
    annotationModal.style.display = 'none';
    annotationModal.setAttribute('aria-hidden', 'true');
    annotationEditor.value = '';
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
    const text = annotationEditor.value.trim();
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
            
            saveAnnotations();
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
importBtn.addEventListener('click', () => {
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
                
                saveAnnotations();
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
