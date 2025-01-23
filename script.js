// Video Player Elements
const video = document.getElementById('educational-video');
const addAnnotationBtn = document.getElementById('add-video-annotation');

// Modal Elements
const modal = document.getElementById('annotation-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.querySelector('.close-modal');
const annotationForm = document.getElementById('annotation-form');
const annotationText = document.getElementById('annotation-text');
const annotationTags = document.getElementById('annotation-tags');
const annotationList = document.getElementById('annotation-list');

// State Management
let currentVideoTime = 0;
let selectedText = '';
let annotations = [];
let selectedColor = '#ffeb3b';

// Initialize Video Player
function initializeVideoPlayer() {
    // Video time update
    video.addEventListener('timeupdate', () => {
        currentVideoTime = video.currentTime;
    });

    // Text selection handling
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleTextSelection);

    // Modal controls
    addAnnotationBtn.addEventListener('click', openAnnotationModal);
    modalClose.addEventListener('click', closeAnnotationModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAnnotationModal();
        }
    });

    // Annotation form submission
    annotationForm.addEventListener('submit', handleAnnotationSubmit);

    // Load saved annotations
    loadAnnotations();
}

// Text Selection Handler
function handleTextSelection() {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Create or update the selection toolbar
        let toolbar = document.getElementById('selection-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'selection-toolbar';
            document.body.appendChild(toolbar);
        }

        toolbar.innerHTML = `
            <div class="toolbar-section">
                <span class="toolbar-label">🎨 Highlight Color:</span>
                <div class="color-buttons">
                    <button class="color-btn yellow" data-color="#ffeb3b"></button>
                    <button class="color-btn green" data-color="#4caf50"></button>
                    <button class="color-btn blue" data-color="#2196f3"></button>
                    <button class="color-btn pink" data-color="#e91e63"></button>
                </div>
            </div>
            <button class="analysis-btn" onclick="getAIAnalysis()">
                <i class="fas fa-brain"></i> Get AI Analysis
            </button>
        `;

        // Position the toolbar
        toolbar.style.position = 'absolute';
        toolbar.style.left = `${rect.left}px`;
        toolbar.style.top = `${rect.top - toolbar.offsetHeight - 10}px`;
        toolbar.style.display = 'block';

        // Initialize color buttons
        toolbar.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedColor = btn.dataset.color;
                highlightSelection();
            });
        });

        // Show annotation panel
        showAnnotationPanel(selectedText);
    }
}

// Show annotation panel
function showAnnotationPanel(text) {
    let panel = document.getElementById('annotation-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'annotation-panel';
        document.body.appendChild(panel);
    }

    panel.innerHTML = `
        <div class="panel-header">
            <h3>Smart Study Notes</h3>
            <button class="close-btn" onclick="closeAnnotationPanel()">×</button>
        </div>
        <div class="panel-content">
            <div class="selected-text">
                <h4>📚 Selected Text:</h4>
                <p>${text}</p>
            </div>
            <div class="ai-analysis" id="ai-analysis">
                <div class="analysis-loading" style="display: none;">
                    <div class="spinner"></div>
                    <p>Analyzing text for you...</p>
                </div>
                <div class="analysis-content" style="display: none;">
                    <div class="summary-section">
                        <h4>📝 Easy Summary</h4>
                        <p id="ai-summary"></p>
                    </div>
                    <div class="study-tips-section">
                        <h4>💡 Study Tips</h4>
                        <p id="ai-studyTips"></p>
                    </div>
                    <div class="quick-facts-section">
                        <h4>🌟 Quick Facts</h4>
                        <p id="ai-quickFacts"></p>
                    </div>
                </div>
            </div>
            <div class="annotation-form">
                <div class="color-picker">
                    <h4>🎨 Highlight Color:</h4>
                    <div class="color-options">
                        <button class="color-btn" style="background-color: #ffeb3b" onclick="selectColor('#ffeb3b')"></button>
                        <button class="color-btn" style="background-color: #4caf50" onclick="selectColor('#4caf50')"></button>
                        <button class="color-btn" style="background-color: #2196f3" onclick="selectColor('#2196f3')"></button>
                        <button class="color-btn" style="background-color: #e91e63" onclick="selectColor('#e91e63')"></button>
                    </div>
                </div>
                <textarea id="annotation-text" placeholder="Add your own notes here..."></textarea>
                <button class="save-btn" onclick="saveAnnotation()">
                    <i class="fas fa-save"></i> Save Notes
                </button>
            </div>
        </div>
    `;

    panel.style.display = 'block';
}

// Close annotation panel
function closeAnnotationPanel() {
    const panel = document.getElementById('annotation-panel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// Select highlight color
function selectColor(color) {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.style.backgroundColor === color);
    });
}

// Get AI Analysis
async function getAIAnalysis() {
    if (!selectedText) {
        showNotification('Please select some text first', 'error');
        return;
    }

    const panel = document.getElementById('annotation-panel');
    if (!panel) {
        showAnnotationPanel(selectedText);
    }

    const analysisDiv = document.getElementById('ai-analysis');
    const loadingDiv = analysisDiv.querySelector('.analysis-loading');
    const contentDiv = analysisDiv.querySelector('.analysis-content');

    try {
        loadingDiv.style.display = 'flex';
        contentDiv.style.display = 'none';

        const response = await fetch('http://localhost:5001/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: selectedText })
        });

        if (!response.ok) {
            throw new Error('Could not connect to the analysis service');
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // Update UI with student-friendly analysis
        document.getElementById('ai-summary').textContent = data.analysis.summary;
        document.getElementById('ai-studyTips').textContent = data.analysis.studyTips;
        document.getElementById('ai-quickFacts').textContent = data.analysis.quickFacts;

        // Show content
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';

    } catch (error) {
        console.error('AI Analysis Error:', error);
        loadingDiv.style.display = 'none';
        contentDiv.innerHTML = `
            <div class="error-message">
                <p>❌ Oops! Something went wrong with the analysis.</p>
                <p>Try selecting the text again or refresh the page.</p>
            </div>
        `;
        contentDiv.style.display = 'block';
        showNotification('Could not analyze the text. Please try again.', 'error');
    }
}

// Search online using AI suggestion
function searchOnline() {
    const searchQuery = document.getElementById('ai-search').textContent;
    
    // Create search results panel
    const searchPanel = document.createElement('div');
    searchPanel.className = 'search-results-panel';
    searchPanel.innerHTML = `
        <div class="panel-header">
            <h3>🔍 Search Results</h3>
            <button class="close-btn" onclick="this.closest('.search-results-panel').remove()">×</button>
        </div>
        <div class="panel-content">
            <div class="search-query">
                <strong>Searching for:</strong> ${searchQuery}
            </div>
            <div class="search-loading">
                <div class="spinner"></div>
                <p>Fetching results...</p>
            </div>
            <div class="search-results"></div>
        </div>
    `;
    
    document.body.appendChild(searchPanel);
    
    // Simulate fetching search results (replace with actual API call)
    setTimeout(() => {
        const resultsContainer = searchPanel.querySelector('.search-results');
        const loadingDiv = searchPanel.querySelector('.search-loading');
        
        loadingDiv.style.display = 'none';
        resultsContainer.innerHTML = `
            <div class="search-result-item">
                <h4>${searchQuery} - Overview</h4>
                <p>Comprehensive overview and explanation of the topic.</p>
                <div class="result-actions">
                    <button onclick="addToAnnotation(this.closest('.search-result-item').querySelector('p').textContent)">
                        Add to Annotation
                    </button>
                </div>
            </div>
            <div class="search-result-item">
                <h4>Key Concepts</h4>
                <p>Important concepts and definitions related to ${searchQuery}.</p>
                <div class="result-actions">
                    <button onclick="addToAnnotation(this.closest('.search-result-item').querySelector('p').textContent)">
                        Add to Annotation
                    </button>
                </div>
            </div>
            <div class="search-result-item">
                <h4>Examples & Applications</h4>
                <p>Real-world examples and applications of ${searchQuery}.</p>
                <div class="result-actions">
                    <button onclick="addToAnnotation(this.closest('.search-result-item').querySelector('p').textContent)">
                        Add to Annotation
                    </button>
                </div>
            </div>
        `;
    }, 1500);
}

// Function to add search result to annotation
function addToAnnotation(content) {
    const annotationText = document.getElementById('annotation-text');
    if (annotationText) {
        const currentContent = annotationText.value;
        annotationText.value = currentContent + '\n\nFrom Search Results:\n' + content;
        showNotification('Added to annotation', 'success');
    }
}

// Use AI suggestion as annotation
function useAsSuggestion() {
    const summary = document.getElementById('ai-summary').textContent;
    const insight = document.getElementById('ai-insight').textContent;
    const search = document.getElementById('ai-search').textContent;
    
    const formattedAnnotation = `📝 Summary: ${summary}\n\n💡 Insight: ${insight}\n\n🔍 Related Search: ${search}`;
    
    document.getElementById('annotation-text').value = formattedAnnotation;
}

// Save annotation
function saveAnnotation() {
    const annotationText = document.getElementById('annotation-text').value.trim();
    
    if (!annotationText) {
        showNotification('Please write an annotation', 'error');
        return;
    }

    try {
        // Create annotation object
        const annotation = {
            id: Date.now(),
            text: selectedText,
            annotation: annotationText,
            color: selectedColor,
            timestamp: new Date().toISOString()
        };

        // Save to localStorage
        const annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
        annotations.push(annotation);
        localStorage.setItem('annotations', JSON.stringify(annotations));

        // Highlight text
        highlightSelection();

        // Show success message
        showNotification('Annotation saved successfully!', 'success');

        // Hide panel
        document.getElementById('annotation-panel').style.display = 'none';

    } catch (error) {
        console.error('Save Error:', error);
        showNotification('Could not save annotation', 'error');
    }
}

// Highlight text with selected color
function highlightSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = selectedColor;
    span.className = 'highlighted-text';
    
    try {
        range.surroundContents(span);
        selection.removeAllRanges();
    } catch (e) {
        console.warn('Could not highlight selection:', e);
    }
}

// Modal Controls
function openAnnotationModal() {
    modal.style.display = 'block';
    modalTitle.textContent = 'Add Annotation';
    annotationText.focus();
}

function closeAnnotationModal() {
    modal.style.display = 'none';
    annotationForm.reset();
}

// Handle annotation submission
function handleAnnotationSubmit(e) {
    e.preventDefault();

    const annotation = {
        text: annotationText.value,
        tags: annotationTags.value.split(',').map(tag => tag.trim()).filter(Boolean),
        timestamp: currentVideoTime,
        color: selectedColor,
        created: new Date().toISOString()
    };

    saveAnnotation(annotation);
    closeAnnotationModal();
}

// Save and render annotations
function saveAnnotation(annotation) {
    annotations.push(annotation);
    localStorage.setItem('annotations', JSON.stringify(annotations));
    renderAnnotation(annotation);
    showNotification('Annotation saved successfully!');
}

function renderAnnotation(annotation) {
    return `
        <div class="annotation-item" data-id="${annotation.id}">
            <div class="annotation-header">
                <span class="annotation-timestamp">${new Date(annotation.timestamp).toLocaleString()}</span>
                <div class="annotation-tags">
                    ${annotation.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            </div>
            <div class="annotation-content">
                <div class="original-text">
                    <h5>Selected Text</h5>
                    <p>${annotation.text}</p>
                </div>
                ${annotation.summary ? `
                    <div class="summary-section">
                        <h5>Summary</h5>
                        <p>${annotation.summary}</p>
                    </div>
                ` : ''}
                ${annotation.insights ? `
                    <div class="insights-section">
                        <h5>Key Insights</h5>
                        <p>${annotation.insights}</p>
                    </div>
                ` : ''}
                ${annotation.funFacts ? `
                    <div class="fun-facts-section">
                        <h5>Fun Facts</h5>
                        <p>${annotation.funFacts}</p>
                    </div>
                ` : ''}
                ${annotation.suggestions ? `
                    <div class="suggestions-section">
                        <h5>Study Tips</h5>
                        <p>${annotation.suggestions}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function loadAnnotations() {
    const savedAnnotations = localStorage.getItem('annotations');
    if (savedAnnotations) {
        annotations = JSON.parse(savedAnnotations);
        annotations.forEach(renderAnnotation);
    }
}

// Utility functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function seekToTime(time) {
    video.currentTime = time;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Student-friendly features
const studentFeatures = {
    // Track study time for different topics
    studyTimer: {
        startTime: null,
        topic: '',
        history: [],
        
        start(topic) {
            this.startTime = new Date();
            this.topic = topic;
            showNotification('Study session started for: ' + topic, 'success');
        },
        
        stop() {
            if (!this.startTime) return;
            const duration = (new Date() - this.startTime) / 1000 / 60; // in minutes
            this.history.push({
                topic: this.topic,
                duration: duration,
                date: new Date()
            });
            localStorage.setItem('studyHistory', JSON.stringify(this.history));
            showNotification(`Study session ended: ${Math.round(duration)} minutes`, 'success');
            this.startTime = null;
        }
    },

    // Vocabulary helper
    vocabularyHelper: {
        async lookupWord(word) {
            try {
                const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                const data = await response.json();
                return {
                    definition: data[0].meanings[0].definitions[0].definition,
                    examples: data[0].meanings[0].definitions[0].example || null,
                    synonyms: data[0].meanings[0].synonyms || []
                };
            } catch (error) {
                console.error('Error looking up word:', error);
                return null;
            }
        },

        async showDefinition(word) {
            const result = await this.lookupWord(word);
            if (result) {
                const definitionHtml = `
                    <div class="word-definition">
                        <h4>${word}</h4>
                        <p><strong>Definition:</strong> ${result.definition}</p>
                        ${result.examples ? `<p><strong>Example:</strong> ${result.examples}</p>` : ''}
                        ${result.synonyms.length ? `<p><strong>Synonyms:</strong> ${result.synonyms.join(', ')}</p>` : ''}
                    </div>
                `;
                showPopup(definitionHtml);
            }
        }
    },

    // Citation helper
    citationHelper: {
        generateCitation(data) {
            const today = new Date();
            const citationFormats = {
                website: () => {
                    return `${data.author || 'N.A.'} (${data.year || today.getFullYear()}). ${data.title}. Retrieved from ${data.url}`;
                },
                book: () => {
                    return `${data.author} (${data.year}). ${data.title}. ${data.publisher}`;
                },
                article: () => {
                    return `${data.author} (${data.year}). ${data.title}. ${data.journal}, ${data.volume}(${data.issue}), ${data.pages}`;
                }
            };

            return citationFormats[data.type]();
        },

        showCitationForm() {
            const formHtml = `
                <div class="citation-form">
                    <h4>Generate Citation</h4>
                    <select id="citation-type">
                        <option value="website">Website</option>
                        <option value="book">Book</option>
                        <option value="article">Article</option>
                    </select>
                    <div id="citation-fields"></div>
                    <button onclick="studentFeatures.citationHelper.generateAndCopy()">Generate & Copy</button>
                </div>
            `;
            showPopup(formHtml);
            this.updateFields();
        },

        updateFields() {
            const type = document.getElementById('citation-type').value;
            const fields = {
                website: ['author', 'year', 'title', 'url'],
                book: ['author', 'year', 'title', 'publisher'],
                article: ['author', 'year', 'title', 'journal', 'volume', 'issue', 'pages']
            };

            const fieldsHtml = fields[type].map(field => `
                <div class="form-group">
                    <label for="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                    <input type="text" id="${field}" name="${field}">
                </div>
            `).join('');

            document.getElementById('citation-fields').innerHTML = fieldsHtml;
        },

        generateAndCopy() {
            const type = document.getElementById('citation-type').value;
            const data = { type };
            const fields = document.querySelectorAll('#citation-fields input');
            fields.forEach(field => {
                data[field.name] = field.value;
            });

            const citation = this.generateCitation(data);
            navigator.clipboard.writeText(citation);
            showNotification('Citation copied to clipboard!', 'success');
        }
    },

    // Study notes organizer
    notesOrganizer: {
        notes: JSON.parse(localStorage.getItem('studyNotes') || '{}'),

        addNote(topic, content) {
            if (!this.notes[topic]) {
                this.notes[topic] = [];
            }
            this.notes[topic].push({
                content,
                timestamp: new Date().toISOString(),
                tags: this.extractTags(content)
            });
            this.saveNotes();
            showNotification('Note added successfully!', 'success');
        },

        extractTags(content) {
            const tags = content.match(/#\w+/g);
            return tags ? tags.map(tag => tag.slice(1)) : [];
        },

        searchNotes(query) {
            const results = [];
            for (const topic in this.notes) {
                const topicNotes = this.notes[topic].filter(note => 
                    note.content.toLowerCase().includes(query.toLowerCase()) ||
                    note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                );
                if (topicNotes.length) {
                    results.push(...topicNotes.map(note => ({...note, topic})));
                }
            }
            return results;
        },

        saveNotes() {
            localStorage.setItem('studyNotes', JSON.stringify(this.notes));
        },

        showNotesPanel() {
            const topics = Object.keys(this.notes);
            const notesHtml = `
                <div class="notes-panel">
                    <h4>Study Notes</h4>
                    <div class="notes-search">
                        <input type="text" placeholder="Search notes..." onkeyup="studentFeatures.notesOrganizer.handleSearch(this.value)">
                    </div>
                    <div class="notes-topics">
                        ${topics.map(topic => `
                            <div class="topic-section">
                                <h5>${topic}</h5>
                                ${this.notes[topic].map(note => `
                                    <div class="note-item">
                                        <p>${note.content}</p>
                                        <div class="note-tags">
                                            ${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                                        </div>
                                        <small>${new Date(note.timestamp).toLocaleString()}</small>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            showPopup(notesHtml);
        },

        handleSearch(query) {
            const results = this.searchNotes(query);
            const resultsHtml = results.map(note => `
                <div class="note-item">
                    <h5>${note.topic}</h5>
                    <p>${note.content}</p>
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                    <small>${new Date(note.timestamp).toLocaleString()}</small>
                </div>
            `).join('');
            document.querySelector('.notes-topics').innerHTML = resultsHtml;
        }
    }
};

// Add student toolbar to the page
function addStudentToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'student-toolbar';
    toolbar.innerHTML = `
        <button onclick="studentFeatures.studyTimer.start(prompt('Enter topic:'))">Start Study Timer</button>
        <button onclick="studentFeatures.studyTimer.stop()">Stop Study Timer</button>
        <button onclick="studentFeatures.vocabularyHelper.showDefinition(prompt('Enter word:'))">Look Up Word</button>
        <button onclick="studentFeatures.citationHelper.showCitationForm()">Generate Citation</button>
        <button onclick="studentFeatures.notesOrganizer.showNotesPanel()">Study Notes</button>
    `;
    document.body.appendChild(toolbar);
}

// Initialize student features
document.addEventListener('DOMContentLoaded', () => {
    addStudentToolbar();
    
    // Load study history
    studentFeatures.studyTimer.history = JSON.parse(localStorage.getItem('studyHistory') || '[]');
    
    // Add double-click word lookup
    document.addEventListener('dblclick', (e) => {
        if (e.target.matches('p, h1, h2, h3, h4, h5, h6, span, div')) {
            const selection = window.getSelection();
            const word = selection.toString().trim();
            if (word) {
                studentFeatures.vocabularyHelper.showDefinition(word);
            }
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', initializeVideoPlayer);

// AI Analysis and Annotation features
const aiAnnotation = {
    currentAnalysis: null,
    colors: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
    ],
    
    async analyzeText(text) {
        try {
            showLoadingSpinner();
            console.log('Analyzing text:', text);
            
            const response = await fetch('http://localhost:5001/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to analyze text: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentAnalysis = {
                text: text,
                ...data.analysis,
                color: this.colors[Math.floor(Math.random() * this.colors.length)]
            };
            
            this.showAnalysisPanel();
        } catch (error) {
            console.error('Error analyzing text:', error);
            showNotification('Error analyzing text: ' + error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    },
    
    showAnalysisPanel() {
        if (!this.currentAnalysis) {
            showNotification('No analysis available', 'error');
            return;
        }
        
        const panel = document.createElement('div');
        panel.className = 'analysis-panel';
        panel.innerHTML = `
            <div class="analysis-header">
                <h3>AI Analysis</h3>
                <button class="close-btn" onclick="aiAnnotation.closePanel()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="analysis-content">
                <div class="section original-text">
                    <h4>Selected Text</h4>
                    <p>${this.currentAnalysis.text}</p>
                </div>
                <div class="section">
                    <h4>Summary</h4>
                    <p>${this.currentAnalysis.summary}</p>
                </div>
                <div class="section">
                    <h4>Key Insights</h4>
                    <p>${this.currentAnalysis.insights}</p>
                </div>
                <div class="section">
                    <h4>Fun Facts</h4>
                    <p>${this.currentAnalysis.funFacts}</p>
                </div>
                <div class="section">
                    <h4>Study Suggestions</h4>
                    <p>${this.currentAnalysis.suggestions}</p>
                </div>
                <div class="section">
                    <h4>Annotation Color</h4>
                    <div class="color-picker">
                        ${this.colors.map(color => `
                            <div class="color-option ${color === this.currentAnalysis.color ? 'selected' : ''}" 
                                 style="background-color: ${color}"
                                 onclick="aiAnnotation.selectColor('${color}')">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="section">
                    <h4>Tags</h4>
                    <input type="text" id="annotation-tags" placeholder="Add tags (comma-separated)" class="tag-input">
                </div>
                <div class="button-group">
                    <button class="save-btn" onclick="aiAnnotation.handleSave()">
                        <i class="fas fa-save"></i> Save Annotation
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        setTimeout(() => panel.classList.add('show'), 10);
    },
    
    selectColor(color) {
        if (this.currentAnalysis) {
            this.currentAnalysis.color = color;
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.toggle('selected', option.style.backgroundColor === color);
            });
        }
    },
    
    closePanel() {
        const panel = document.querySelector('.analysis-panel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => panel.remove(), 300);
        }
    },
    
    async handleSave() {
        if (!this.currentAnalysis) {
            showNotification('No analysis data available', 'error');
            return;
        }
        
        const tagsInput = document.getElementById('annotation-tags');
        const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean);
        
        try {
            const response = await fetch('http://localhost:5001/save-annotation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: this.currentAnalysis.text,
                    summary: this.currentAnalysis.summary,
                    insights: this.currentAnalysis.insights,
                    funFacts: this.currentAnalysis.funFacts,
                    suggestions: this.currentAnalysis.suggestions,
                    color: this.currentAnalysis.color,
                    tags: tags
                })
            });
            
            if (!response.ok) throw new Error('Failed to save annotation');
            const data = await response.json();
            
            const annotation = {
                id: data.id || crypto.randomUUID(),
                text: this.currentAnalysis.text,
                summary: this.currentAnalysis.summary,
                insights: this.currentAnalysis.insights,
                funFacts: this.currentAnalysis.funFacts,
                suggestions: this.currentAnalysis.suggestions,
                color: this.currentAnalysis.color,
                tags: tags,
                timestamp: new Date().toISOString()
            };
            
            saveAnnotation(annotation);
            this.closePanel();
            showNotification('Annotation saved successfully!', 'success');
        } catch (error) {
            console.error('Error in handleSave:', error);
            showNotification('Error saving annotation: ' + error.message, 'error');
        }
    }
};

// Update the renderAnnotation function to include color
function renderAnnotation(annotation) {
    const validAnnotation = validateAnnotation(annotation);
    
    return `
        <div class="annotation-item" data-id="${validAnnotation.id}" style="border-left: 4px solid ${validAnnotation.color || '#1a73e8'}">
            <div class="annotation-header">
                <span class="annotation-timestamp">${new Date(validAnnotation.timestamp).toLocaleString()}</span>
                <div class="annotation-tags">
                    ${validAnnotation.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            </div>
            <div class="annotation-content">
                <div class="original-text">
                    <h5>Selected Text</h5>
                    <p>${validAnnotation.text}</p>
                </div>
                ${validAnnotation.summary ? `
                    <div class="summary-section">
                        <h5>Summary</h5>
                        <p>${validAnnotation.summary}</p>
                    </div>
                ` : ''}
                ${validAnnotation.insights ? `
                    <div class="insights-section">
                        <h5>Key Insights</h5>
                        <p>${validAnnotation.insights}</p>
                    </div>
                ` : ''}
                ${validAnnotation.funFacts ? `
                    <div class="fun-facts-section">
                        <h5>Fun Facts</h5>
                        <p>${validAnnotation.funFacts}</p>
                    </div>
                ` : ''}
                ${validAnnotation.suggestions ? `
                    <div class="suggestions-section">
                        <h5>Study Tips</h5>
                        <p>${validAnnotation.suggestions}</p>
                    </div>
                ` : ''}
            </div>
            <div class="annotation-actions">
                <button class="delete-btn" onclick="deleteAnnotation('${validAnnotation.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function deleteAnnotation(id) {
    try {
        if (!id) {
            throw new Error('No annotation ID provided');
        }

        // Get annotations from localStorage
        let annotations = [];
        try {
            annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
            if (!Array.isArray(annotations)) {
                throw new Error('Invalid annotations data');
            }
        } catch (parseError) {
            console.error('Error parsing annotations:', parseError);
            localStorage.setItem('annotations', '[]');
            annotations = [];
        }

        // Find the annotation to delete
        const annotationToDelete = annotations.find(a => a && a.id === id);
        if (!annotationToDelete) {
            throw new Error('Annotation not found');
        }

        // Remove from localStorage
        const updatedAnnotations = annotations.filter(a => a && a.id !== id);
        localStorage.setItem('annotations', JSON.stringify(updatedAnnotations));
        
        // Remove from UI
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            // Add fade out animation
            element.style.animation = 'fadeOut 0.3s ease-out';
            element.addEventListener('animationend', () => {
                element.remove();
                
                // Check if container is empty
                const container = document.querySelector('.annotations-container');
                if (container && !container.hasChildNodes()) {
                    container.remove();
                }
            });
            
            showNotification('Annotation deleted successfully', 'success');
        } else {
            throw new Error('Annotation element not found in UI');
        }
    } catch (error) {
        console.error('Error deleting annotation:', error);
        showNotification(`Error deleting annotation: ${error.message}`, 'error');
    }
}

function saveAnnotation(annotation) {
    try {
        if (!annotation) {
            throw new Error('No annotation data provided');
        }

        // Validate annotation object
        if (!annotation.id || !annotation.text) {
            throw new Error('Invalid annotation data');
        }

        let annotationsContainer = document.querySelector('.annotations-container');
        if (!annotationsContainer) {
            annotationsContainer = document.createElement('div');
            annotationsContainer.className = 'annotations-container';
            
            // Add container header
            const containerHeader = document.createElement('div');
            containerHeader.className = 'annotations-header';
            containerHeader.innerHTML = `
                <h3>Saved Annotations</h3>
                <button class="close-annotations" onclick="toggleAnnotations()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            annotationsContainer.appendChild(containerHeader);
            
            document.body.appendChild(annotationsContainer);
        }

        // Get existing annotations from localStorage
        let annotations = [];
        try {
            annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
            if (!Array.isArray(annotations)) {
                throw new Error('Invalid annotations data');
            }
        } catch (parseError) {
            console.error('Error parsing annotations:', parseError);
            annotations = [];
        }
        
        // Add new annotation to the array
        annotations.unshift(annotation);
        
        // Save to localStorage
        localStorage.setItem('annotations', JSON.stringify(annotations));
        
        // Update UI
        const annotationHtml = renderAnnotation(annotation);
        const annotationsContent = annotationsContainer.querySelector('.annotations-content') || annotationsContainer;
        annotationsContent.insertAdjacentHTML('afterbegin', annotationHtml);
        
        showNotification('Annotation saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving annotation:', error);
        showNotification('Error saving annotation: ' + error.message, 'error');
    }
}

function toggleAnnotations() {
    const container = document.querySelector('.annotations-container');
    if (container) {
        container.classList.toggle('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
        
        if (annotations.length > 0) {
            const container = document.createElement('div');
            container.className = 'annotations-container';
            
            // Add container header
            container.innerHTML = `
                <div class="annotations-header">
                    <h3>Saved Annotations</h3>
                    <button class="close-annotations" onclick="toggleAnnotations()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="annotations-content">
                    ${annotations.map(renderAnnotation).join('')}
                </div>
            `;
            
            document.body.appendChild(container);
        }
    } catch (error) {
        console.error('Error loading annotations:', error);
        showNotification('Error loading annotations: ' + error.message, 'error');
    }
});

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(30px); }
    }
`;
document.head.appendChild(styleSheet);

// Show loading spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '<div class="spinner"></div><p>Analyzing text...</p>';
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

// Function to show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility function to ensure annotation has all required properties
function validateAnnotation(annotation) {
    const defaultAnnotation = {
        id: crypto.randomUUID(),
        text: '',
        summary: '',
        insights: '',
        funFacts: '',
        suggestions: '',
        tags: [],
        timestamp: new Date().toISOString()
    };

    return { ...defaultAnnotation, ...annotation };
}

// Add event listener for text selection
document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Remove any existing selection popup
    const existingPopup = document.querySelector('.selection-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    if (selectedText && !document.querySelector('.analysis-panel')) {
        const popup = document.createElement('div');
        popup.className = 'selection-popup';
        
        // Create a button element instead of using innerHTML
        const button = document.createElement('button');
        button.innerHTML = '<i class="fas fa-robot"></i> AI Analysis';
        button.onclick = function() {
            aiAnnotation.analyzeText(selectedText);
            popup.remove();
        };
        
        popup.appendChild(button);
        document.body.appendChild(popup);
        
        // Position the popup near the selection
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
    }
});