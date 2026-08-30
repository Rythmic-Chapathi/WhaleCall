"""Vercel serverless entrypoint. Vercel's Python runtime looks for an ASGI
`app` object in files under /api -- this just re-exports the real FastAPI
app from whalecall/main.py so the actual code lives in one place.

Note: WebSockets (/ws/tracking/*, /ws/queue) do not work on Vercel's
serverless functions -- those routes will fail to upgrade the connection
there. Everything else (pages, REST API, SOS scoring, booking) works fine.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "whalecall"))

from main import app  # noqa: E402
