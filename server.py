from http.server import SimpleHTTPRequestHandler
import json
import os
import socketserver
import threading
import webbrowser
import sys
import mimetypes
import urllib.parse
import openai
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Set OpenAI API key from environment variable
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("No OpenAI API key found. Please set the OPENAI_API_KEY environment variable.")
openai.api_key = api_key

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        text = data['text']
        if not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400

        # Call OpenAI API with student-focused prompt
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful educational assistant. For the given text, provide:
                    1. Easy Summary: Break down the main points in simple terms that a student can understand.
                    2. Study Tips: Provide 2-3 practical ways to remember and understand this information better.
                    3. Quick Facts: List 2-3 interesting facts or key points that make this topic memorable.
                    Keep the language simple and student-friendly."""
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0.7,
            max_tokens=400
        )

        # Get the AI response
        result = response.choices[0].message['content']
        
        # Split into sections and format
        sections = result.split('\n\n')
        analysis = {
            'summary': sections[0] if len(sections) > 0 else 'Here is a simple breakdown of the text...',
            'studyTips': sections[1] if len(sections) > 1 else 'Try these study methods...',
            'quickFacts': sections[2] if len(sections) > 2 else 'Remember these key points...'
        }

        return jsonify({
            'status': 'success',
            'analysis': analysis
        })

    except Exception as e:
        print(f"Error in analyze_text: {str(e)}")
        return jsonify({
            'error': 'Could not analyze the text. Please try again.'
        }), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
