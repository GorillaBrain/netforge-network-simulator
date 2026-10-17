# NetForge Deployment Guide

NetForge is architected to be 100% free and open-source, deployable without requiring paid databases, cloud accounts with credit cards, or external proprietary APIs.

- **Production URL:** [https://netforge-network-simulator.vercel.app](https://netforge-network-simulator.vercel.app)
- **Deployment URL:** [https://netforge-network-simulator-ggq4ebr4u-project-4d49.vercel.app](https://netforge-network-simulator-ggq4ebr4u-project-4d49.vercel.app)
- **GitHub Repository:** [https://github.com/GorillaBrain/netforge-network-simulator](https://github.com/GorillaBrain/netforge-network-simulator)

---

## 1. Hosting Architecture on Vercel

```
                        [ User Browser ]
                               |
               +---------------+---------------+
               |                               |
       (HTML / CSS / JS)               (Pyodide WebAssembly)
               |                               |
     [ Vercel Edge CDN ]              [ Client-Side Engine ]
   (Vite Static Build)              (Zero Server Overhead)
               |
     (Fallback API: /api/*)
               |
    [ Vercel Serverless ]
     (Python 3 Runtime)
```

1. **Frontend:** Built with Vite and React, deployed as optimized static assets to Vercel's global CDN.
2. **Client-Side Simulation (Primary):** The exact Python 3 engine runs directly in the client browser through Pyodide WebAssembly. This delivers instantaneous, offline-capable discrete simulation without serverless execution limits.
3. **Serverless Python Functions (Redundancy):** Vercel serverless Python functions in `api/` (`simulate.py`, `cli.py`, `subnet.py`, `labs.py`) provide API fallback.

---

## 2. Deploying to Vercel via CLI

NetForge can be deployed directly using the Vercel CLI:

```bash
# 1. Install dependencies and build project
npm install
npm run build

# 2. Deploy to Vercel production
vercel --prod --yes
```

`vercel.json` is preconfigured to handle Vite builds and SPA routing:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## 3. Local Development Workflow

Run NetForge locally with Python 3 and Node.js:

```bash
# Run the Python test suite
python -m pytest -v

# Run the interactive terminal CLI
python -m netforge

# Start the Vite React development server
npm run dev
```

The web interface will open at `http://localhost:3000`.
