# r/SideProject Post

## Title
Vibe-based movie tracker with AI Oracle and native UPC scanner

## Draft
Built a movie tracker called Filmgraph with a different goal: recommendations by vibe + mood context instead of popularity-only ranking.

Stack:
- React + Vite frontend
- Supabase auth/postgres/RLS
- Vercel deploy + serverless UPC proxy
- html5-qrcode for scanner reliability
- Groq + Gemini orchestration for discovery

Hardest part so far:
- getting mobile camera scanning reliable across browser + webview without black preview regressions.

If you are open to feedback swap:
- I can test your project if you test one Filmgraph flow (log, discover, or collection scan).
