"""
SmartBot — AI Chatbot Backend Server
-------------------------------------
A modular, secure, and production-ready Flask backend that interfaces
with the Google Gemini API to provide real-time conversational AI.

Key Features:
- Secure environment configuration via python-dotenv.
- Never exposes API keys or secrets to the client.
- Strict payload validation and sanitization (roles, lengths, sizes).
- Comprehensive error handling for Gemini API errors (quota, auth, network).
- Configurable model, system instructions, and fallback demo mode.
- Context window management to prevent token exhaustion.
"""

import os
import sys
import logging
from typing import List, Dict, Any, Tuple
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)

# -----------------------------------------------------------------------------
# Configuration Constants
# -----------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
PORT = int(os.getenv("PORT", 5000))
HOST = os.getenv("HOST", "127.0.0.1")
DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

SYSTEM_INSTRUCTIONS = os.getenv(
    "SYSTEM_INSTRUCTIONS",
    (
        "You are SmartBot, an advanced, highly knowledgeable, and friendly AI assistant. "
        "You excel in computer science, software engineering, educational explanations, "
        "step-by-step tutoring, and college project planning. "
        "Format your output cleanly using GitHub-flavored Markdown. "
        "Use syntax-highlighted code blocks with language tags (e.g., ```python) for code, "
        "bullet points for readability, bold text for key terms, and tables when presenting structured data. "
        "Provide direct, accurate, and inspiring answers."
    ),
).strip()

MAX_MESSAGE_LENGTH = 4000      # Max characters allowed per single message
MAX_HISTORY_MESSAGES = 20     # Max prior messages retained in conversational context
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1 MB max payload size

# -----------------------------------------------------------------------------
# Application Setup & Logging
# -----------------------------------------------------------------------------
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# Enable CORS for local testing if needed
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure clean logging format
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("SmartBot")


def is_api_key_valid() -> bool:
    """Check if GEMINI_API_KEY is configured with a real key."""
    if not GEMINI_API_KEY:
        return False
    # Check for placeholder string
    if "your_gemini_api_key_here" in GEMINI_API_KEY.lower() or "your_api_key_here" in GEMINI_API_KEY.lower():
        return False
    return True


# -----------------------------------------------------------------------------
# Google Gemini Client Initialization
# -----------------------------------------------------------------------------
gemini_client = None
if is_api_key_valid():
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info(f"Gemini Client initialized successfully for model: {GEMINI_MODEL}")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
        gemini_client = None
else:
    logger.warning("GEMINI_API_KEY is missing or set to placeholder. Operating in Demo/Configuration mode.")


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def validate_chat_payload(payload: Any) -> Tuple[bool, str, List[Dict[str, str]]]:
    """
    Validates the structure and content of incoming chat requests.
    Enforces role restrictions, type constraints, and length limits.
    """
    if not isinstance(payload, dict):
        return False, "Invalid request body: Expected a JSON object.", []

    messages = payload.get("messages")
    if not isinstance(messages, list) or len(messages) == 0:
        return False, "Invalid request: 'messages' must be a non-empty list of message objects.", []

    sanitized_messages: List[Dict[str, str]] = []
    for idx, msg in enumerate(messages):
        if not isinstance(msg, dict):
            return False, f"Message at index {idx} must be a JSON object.", []

        role = msg.get("role")
        content = msg.get("content")

        # Restrict incoming message roles to user or assistant
        if role not in ("user", "assistant"):
            return False, f"Invalid role '{role}' at index {idx}. Only 'user' and 'assistant' are permitted.", []

        if not isinstance(content, str):
            return False, f"Content at index {idx} must be a string.", []

        cleaned_content = content.strip()
        if not cleaned_content:
            return False, f"Message content at index {idx} cannot be empty.", []

        if len(cleaned_content) > MAX_MESSAGE_LENGTH:
            return False, (
                f"Message at index {idx} exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters."
            ), []

        sanitized_messages.append({"role": role, "content": cleaned_content})

    # Restrict to last MAX_HISTORY_MESSAGES to maintain context window within safe limits
    trimmed_messages = sanitized_messages[-MAX_HISTORY_MESSAGES:]
    return True, "", trimmed_messages


def call_gemini_model(messages: List[Dict[str, str]]) -> str:
    """
    Sends the conversational context to the Google Gemini API and returns the generated text.
    Uses the official google-genai Python SDK with automatic retry for temporary errors.
    """
    import time
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Convert messages to Gemini format
    # Gemini uses "user" and "model" roles (not "assistant")
    gemini_contents = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else "user"
        gemini_contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            )
        )

    # Retry logic for temporary 503 errors (high demand)
    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=gemini_contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTIONS,
                    temperature=0.7,
                    max_output_tokens=2048,
                ),
            )

            if not response.text:
                raise ValueError("Empty response received from Gemini.")

            return response.text.strip()

        except Exception as e:
            error_str = str(e)
            # Retry on 503 UNAVAILABLE (temporary high demand)
            if "503" in error_str and attempt < max_retries:
                wait_time = 2 ** (attempt + 1)  # 2s, 4s, 8s
                logger.warning(f"Gemini 503 (high demand), retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            raise  # Re-raise on final attempt or non-503 errors


def generate_demo_response(user_query: str) -> str:
    """
    Intelligent offline fallback response when GEMINI_API_KEY is not yet configured.
    Provides helpful educational guidance and instructions to configure the API key.
    """
    query_lower = user_query.lower()
    
    if "prime" in query_lower:
        return (
            "### 🐍 Python Program to Check Prime Numbers (Demo Mode)\n\n"
            "Here is an efficient Python function to check whether a number is prime:\n\n"
            "```python\n"
            "def is_prime(n: int) -> bool:\n"
            "    \"\"\"Return True if n is a prime number, otherwise False.\"\"\"\n"
            "    if n <= 1:\n"
            "        return False\n"
            "    if n <= 3:\n"
            "        return True\n"
            "    if n % 2 == 0 or n % 3 == 0:\n"
            "        return False\n"
            "    # Check factors up to square root of n\n"
            "    i = 5\n"
            "    while i * i <= n:\n"
            "        if n % i == 0 or n % (i + 2) == 0:\n"
            "            return False\n"
            "        i += 6\n"
            "    return True\n\n"
            "# Example usage:\n"
            "test_num = 29\n"
            "if is_prime(test_num):\n"
            "    print(f\"{test_num} is a prime number!\")\n"
            "else:\n"
            "    print(f\"{test_num} is not prime.\")\n"
            "```\n\n"
            "> ℹ️ **Notice**: SmartBot is currently running in **Demo Mode** because `GEMINI_API_KEY` is not yet configured in `.env`. "
            "To connect to live Gemini models, add your API key in the `.env` file and restart the server!"
        )
    elif "machine learning" in query_lower or "ml" in query_lower:
        return (
            "### 🧠 What is Machine Learning? (Demo Mode)\n\n"
            "**Machine Learning (ML)** is a branch of Artificial Intelligence where computers learn from historical data to make predictions or decisions without being explicitly hard-coded with rules.\n\n"
            "#### The 3 Core Paradigms:\n"
            "1. **Supervised Learning**: Training models on labeled data (e.g., predicting house prices based on size, bedrooms, and location).\n"
            "2. **Unsupervised Learning**: Discovering hidden patterns or groupings in unlabeled data (e.g., customer segmentation).\n"
            "3. **Reinforcement Learning**: An agent learns optimal actions through trial, error, rewards, and penalties (e.g., playing chess or robotics).\n\n"
            "> 💡 **Setup Tip**: Add your real `GEMINI_API_KEY` to `.env` to unlock full dynamic AI responses across any topic!"
        )
    elif "college project" in query_lower or "project" in query_lower:
        return (
            "### 🎓 Impressive College Project Idea (Demo Mode)\n\n"
            "**Project Title**: *SmartStudy AI — Intelligent Document Q&A and Flashcard Synthesizer*\n\n"
            "#### Recommended Tech Stack:\n"
            "- **Frontend**: HTML5, Modern Vanilla CSS, JavaScript (SPA architecture)\n"
            "- **Backend**: Python Flask / FastAPI\n"
            "- **AI / LLM**: Google Gemini + LangChain / LlamaIndex\n"
            "- **Vector Store**: ChromaDB or SQLite with sqlite-vss\n\n"
            "#### Core Features:\n"
            "1. **PDF Syllabus Upload**: Extracts course material and lecture notes.\n"
            "2. **Semantic Q&A**: Answers student questions with exact page citations.\n"
            "3. **Automatic Flashcards**: Generates interactive study decks from complex topics.\n\n"
            "> 💡 *Set your `GEMINI_API_KEY` in `.env` to get personalized project roadmaps and code generators!*"
        )
    elif "html" in query_lower or "css" in query_lower:
        return (
            "### 🌐 HTML, CSS, and JavaScript Explained (Demo Mode)\n\n"
            "Think of building a modern website like constructing a human body:\n\n"
            "| Technology | Role | Analogy |\n"
            "| :--- | :--- | :--- |\n"
            "| **HTML5** | Structure & Content | The **Skeleton** (Bones, paragraphs, headings, inputs) |\n"
            "| **CSS3** | Presentation & Style | The **Skin & Clothing** (Colors, layouts, glassmorphism, fonts) |\n"
            "| **JavaScript** | Logic & Interactivity | The **Brain & Muscles** (Event handlers, API fetch, animations) |\n\n"
            "> 💡 *Configure your `GEMINI_API_KEY` in `.env` to ask deeper technical follow-ups!*"
        )
    else:
        return (
            f"Hello! I received your message: **\"{user_query}\"**.\n\n"
            "I am currently operating in **Offline Demo Mode** because your Gemini API key has not yet been set in `.env`.\n\n"
            "### How to activate Live AI responses:\n"
            "1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey).\n"
            "2. Open the `.env` file in the project folder.\n"
            "3. Set `GEMINI_API_KEY=your_key_here` with your Gemini API key.\n"
            "4. Restart the server (`python app.py`).\n\n"
            "All frontend features (chat history, themes, code copy, voice synthesis) are active and ready!"
        )


# -----------------------------------------------------------------------------
# Application Routes
# -----------------------------------------------------------------------------
@app.route("/")
def index():
    """Serves the main single-page chat application."""
    return render_template("index.html")


@app.route("/api/status", methods=["GET"])
def api_status():
    """
    Returns public, safe application status without exposing secrets.
    Used by frontend for dynamic status pills and health checks.
    """
    has_key = is_api_key_valid()
    return jsonify({
        "status": "online",
        "app_name": "SmartBot — AI Chatbot",
        "version": "1.0.0",
        "model": GEMINI_MODEL,
        "api_key_configured": has_key,
        "demo_mode": not has_key,
        "message": (
            "Google Gemini API connected and operational."
            if has_key
            else "Running in Demo Mode: Please set your GEMINI_API_KEY in .env for live AI answers."
        ),
    }), 200


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Main chat endpoint. Receives conversation context, validates input,
    calls Gemini API, and returns the assistant's reply.
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 400

    payload = request.get_json(silent=True)
    is_valid, error_msg, messages = validate_chat_payload(payload)

    if not is_valid:
        logger.warning(f"Validation rejected request: {error_msg}")
        return jsonify({"error": error_msg, "type": "validation_error"}), 400

    last_user_message = messages[-1]["content"]

    # If API key is not configured, supply helpful demo response
    if not is_api_key_valid():
        logger.info("Serving demo response (GEMINI_API_KEY not configured).")
        demo_reply = generate_demo_response(last_user_message)
        return jsonify({
            "role": "assistant",
            "content": demo_reply,
            "model": f"{GEMINI_MODEL} (Demo Mode)",
            "status": "demo_fallback",
        }), 200

    # Call Gemini API
    try:
        ai_reply = call_gemini_model(messages)
        return jsonify({
            "role": "assistant",
            "content": ai_reply,
            "model": GEMINI_MODEL,
            "status": "success",
        }), 200

    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"Gemini API Error: {e}")

        # Handle specific error types based on error message content
        if "api_key" in error_str or "api key" in error_str or "unauthorized" in error_str or "401" in error_str:
            return jsonify({
                "error": "Authentication failed. The provided Gemini API key is invalid or expired. Check your .env configuration.",
                "type": "authentication_error",
            }), 401

        elif "quota" in error_str or "rate" in error_str or "429" in error_str or "resource_exhausted" in error_str:
            return jsonify({
                "error": "Gemini API rate limit or quota exceeded. Please wait a moment and try again, or check your API usage at aistudio.google.com.",
                "type": "rate_limit_error",
            }), 429

        elif "connect" in error_str or "network" in error_str or "timeout" in error_str:
            return jsonify({
                "error": "Could not connect to Google Gemini servers. Please check your internet connection.",
                "type": "connection_error",
            }), 503

        elif "safety" in error_str or "blocked" in error_str:
            return jsonify({
                "error": "The response was blocked by Gemini's safety filters. Please rephrase your message.",
                "type": "safety_error",
            }), 400

        else:
            return jsonify({
                "error": "An error occurred with the AI service. Please try again in a few moments.",
                "type": "api_error",
            }), 500


# -----------------------------------------------------------------------------
# Streaming Chat Endpoint (Server-Sent Events)
# -----------------------------------------------------------------------------
@app.route("/api/chat/stream", methods=["POST"])
def api_chat_stream():
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    Streams Gemini's response token-by-token so the frontend renders
    text in real time — just like ChatGPT — instead of waiting for
    the full response.
    """
    from flask import Response, stream_with_context
    import json

    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 400

    payload = request.get_json(silent=True)
    is_valid, error_msg, messages = validate_chat_payload(payload)

    if not is_valid:
        logger.warning(f"Validation rejected stream request: {error_msg}")
        return jsonify({"error": error_msg, "type": "validation_error"}), 400

    last_user_message = messages[-1]["content"]

    # Demo mode — stream demo response word-by-word
    if not is_api_key_valid():
        demo_reply = generate_demo_response(last_user_message)

        def demo_stream():
            words = demo_reply.split(" ")
            for i, word in enumerate(words):
                chunk = word if i == len(words) - 1 else word + " "
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True, 'model': GEMINI_MODEL + ' (Demo)'})}\n\n"

        return Response(
            stream_with_context(demo_stream()),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    # Live Gemini streaming
    def gemini_stream():
        import time
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        gemini_contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                )
            )

        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                stream = client.models.generate_content_stream(
                    model=GEMINI_MODEL,
                    contents=gemini_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTIONS,
                        temperature=0.7,
                        max_output_tokens=2048,
                    ),
                )
                for chunk in stream:
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"

                yield f"data: {json.dumps({'done': True, 'model': GEMINI_MODEL})}\n\n"
                return

            except Exception as e:
                error_str = str(e)
                if "503" in error_str and attempt < max_retries:
                    wait_time = 2 ** (attempt + 1)
                    logger.warning(f"Gemini stream 503, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue

                logger.error(f"Gemini stream error: {e}")
                error_str_lower = error_str.lower()
                if "api_key" in error_str_lower or "401" in error_str_lower:
                    msg_out = "Authentication failed. Check your GEMINI_API_KEY in .env."
                elif "429" in error_str_lower or "quota" in error_str_lower:
                    msg_out = "Rate limit exceeded. Please wait and try again."
                elif "safety" in error_str_lower or "blocked" in error_str_lower:
                    msg_out = "Response blocked by safety filters. Please rephrase."
                else:
                    msg_out = "AI service error. Please try again in a moment."
                yield f"data: {json.dumps({'error': msg_out})}\n\n"
                return

    return Response(
        stream_with_context(gemini_stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )



@app.errorhandler(404)
def not_found_handler(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found."}), 404
    return render_template("index.html"), 404


@app.errorhandler(413)
def request_entity_too_large(e):
    return jsonify({
        "error": f"Request payload exceeds maximum allowed size ({MAX_CONTENT_LENGTH // 1024} KB).",
        "type": "payload_too_large",
    }), 413


@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"error": "Internal server error."}), 500


# -----------------------------------------------------------------------------
# Application Entry Point
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    key_status = "[CONFIGURED]" if is_api_key_valid() else "[NOT CONFIGURED - DEMO MODE]"
    print("\n" + "=" * 65)
    print("  * SmartBot -- Advanced AI Chatbot Web Application")
    print(f"  * Running at: http://{HOST}:{PORT}")
    print(f"  * Active Model: {GEMINI_MODEL}")
    print(f"  * API Key: {key_status}")
    print(f"  * Provider: Google Gemini (Free Tier)")
    print("=" * 65 + "\n")

    app.run(host=HOST, port=PORT, debug=DEBUG)
