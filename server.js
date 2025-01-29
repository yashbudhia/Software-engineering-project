/**
 * server.js
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve the static frontend from the ../client folder
app.use(express.static(path.join(__dirname, '../client')));

/**
 * GET /annotations
 * Reads the annotation.json file and returns the content as JSON.
 */
app.get('/annotations', (req, res) => {
  fs.readFile(path.join(__dirname, 'annotation.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read annotations.' });
    }
    try {
      const annotations = JSON.parse(data);
      return res.json(annotations);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse annotations.' });
    }
  });
});

/**
 * POST /annotations
 * Appends a new annotation entry to the annotation.json file.
 */
app.post('/annotations', (req, res) => {
  const newAnnotation = req.body;

  // Read existing annotations
  fs.readFile(path.join(__dirname, 'annotation.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read annotations.' });
    }

    let annotations = [];
    try {
      annotations = JSON.parse(data);
    } catch (parseError) {
      // If parse fails, use an empty array
      annotations = [];
    }

    // Add the new annotation
    annotations.push(newAnnotation);

    // Write back to annotation.json
    fs.writeFile(
      path.join(__dirname, 'annotation.json'),
      JSON.stringify(annotations, null, 2),
      (writeErr) => {
        if (writeErr) {
          return res.status(500).json({ error: 'Failed to write annotation.' });
        }
        return res.json({ success: true });
      }
    );
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
