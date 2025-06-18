# ADES Frontend-Backend Integration Guide

## Overview

This document describes how the React frontend (`@/frontend`) integrates with the Go backend to create a complete **AI Development Experience System (ADES)**. The integration provides a modern, responsive web interface for all ADES functionality while maintaining full compatibility with the existing system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADES Full Stack                          │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Vite + TypeScript + Tailwind + shadcn/ui) │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   Main UI   │  Dashboard  │ Components  │    i18n     │  │
│  │   App.tsx   │ Dashboard   │   Library   │  EN / ZH    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    API Integration Layer                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   API       │   Hooks     │ WebSocket   │    Types    │  │
│  │ Service     │ useGitData  │ Real-time   │ TypeScript  │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Go Backend (Port 8080)                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  Git API    │  ADES API   │   AI API    │   WebSocket │  │
│  │ Endpoints   │ Analytics   │  Features   │   Support   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Integration Points

### 1. API Communication

The frontend communicates with the backend through a comprehensive API service (`src/lib/api.ts`) that provides:

#### Core Git Operations
- Repository management (add, switch, clone, remove)
- Commit operations (create, cherry-pick, revert)
- Branch operations (checkout, create, delete, merge, rebase)
- File operations (stage, unstage, discard)
- Remote operations (fetch, pull, push)
- Tag and stash management

#### ADES-Specific Features
- Repository analysis and insights
- Pattern extraction and reusability scoring
- Semantic commit analysis
- Knowledge graph queries
- Development experience search

#### AI-Powered Features (Sprint 8)
- Conversational AI assistant
- Semantic embeddings and search
- Technical debt prediction
- Bug likelihood estimation
- Productivity forecasting

### 2. Real-time Communication

WebSocket integration provides real-time updates for:
- Dashboard data refresh
- Analysis progress tracking
- Live collaboration features
- Notification system

### 3. Multilingual Support

Complete internationalization with:
- English and Chinese translations
- Backend language switching API
- Synchronized frontend/backend language state
- Comprehensive UI text coverage

## Frontend Components

### Main Application (`App.tsx`)
- **ADES header** with branding and navigation
- **Resizable layout** with sidebar and main content
- **Git operations toolbar** with all essential commands
- **Commit list** with pagination and search
- **File diff viewer** with syntax highlighting
- **Status bar** with keyboard shortcuts

### Dashboard (`Dashboard.tsx`)
- **Analytics overview** with key metrics
- **Interactive charts** using Recharts
- **AI assistant** chat interface
- **Semantic search** functionality
- **Progress tracking** for analysis operations
- **Knowledge graph** export capabilities

### Custom Hooks
- **`useGitData`**: Manages all Git operations and state
- **`useNotifications`**: Toast notification system
- **`useWebSocket`**: Real-time communication

### UI Components
Built with shadcn/ui for consistency:
- Forms, buttons, inputs, dialogs
- Data tables and charts
- Navigation and layout components
- Theme and language toggles

## API Endpoints Integration

### Git Operations (20+ endpoints)
```typescript
// Repository management
GET    /api/repositories
POST   /api/repositories/add
POST   /api/repository/switch

// Commit operations  
GET    /api/commits
GET    /api/commit/{hash}
POST   /api/commit/create

// Branch operations
GET    /api/branches
POST   /api/branch/checkout
POST   /api/branch/create
```

### ADES Analytics (15+ endpoints)
```typescript
// Analysis and insights
POST   /api/ades/analyze/comprehensive
GET    /api/ades/analyze/progress
GET    /api/ades/insights
GET    /api/ades/patterns

// Dashboard data
GET    /api/ades/dashboard
GET    /api/ades/analytics
GET    /api/ades/metrics
```

### AI Features (10+ endpoints)
```typescript
// AI assistant
POST   /api/ai/chat
GET    /api/ai/capabilities
GET    /api/ai/status

// Semantic operations
POST   /api/ai/embeddings
POST   /api/ai/search
POST   /api/ai/analyze/commit

// Predictions
POST   /api/ai/predict/debt
POST   /api/ai/predict/bugs
POST   /api/ai/predict/productivity
```

## Development Setup

### Prerequisites
- Node.js 18+
- Go 1.22+
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/knoxai/gait.git
cd gait

# Install frontend dependencies
cd frontend
npm install

# Build frontend
npm run build

# Start backend (from root directory)
cd ..
go build -o ades .
./ades -port 8080

# Start frontend development server
cd frontend
npm run dev
```

### Development Workflow
1. **Backend**: Start `./ades -port 8080`
2. **Frontend**: Start `npm run dev` (runs on port 5173)
3. **API Proxy**: Vite proxies `/api/*` requests to backend
4. **Hot Reload**: Frontend auto-reloads on changes

## Configuration

### Vite Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
```

### Environment Variables
```bash
# Backend configuration
ADES_PORT=8080
OPENAI_API_KEY=your_key_here  # For AI features

# Frontend development
VITE_API_BASE_URL=http://localhost:8080
```

## Testing Integration

### Automated Testing
```bash
# Run integration test
cd frontend
node test-integration.cjs
```

### Manual Testing
1. **Start both servers**
2. **Navigate to** `http://localhost:5173`
3. **Test core features**:
   - Repository switching
   - Commit operations
   - Dashboard analytics
   - Language switching
   - AI features (if configured)

## Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend with embedded frontend
cd ..
go build -o ades .

# Deploy single binary
./ades -port 8080
```

### Docker Deployment
```bash
# Build Docker image
docker build -t ades:latest .

# Run container
docker run -p 8080:8080 ades:latest
```

## Features Comparison

| Feature | Legacy Frontend | React Frontend |
|---------|----------------|----------------|
| **UI Framework** | HTML/CSS/JS | React + TypeScript |
| **Styling** | Custom CSS | TailwindCSS + shadcn/ui |
| **State Management** | jQuery | React Hooks |
| **API Integration** | Fetch calls | Typed API service |
| **Internationalization** | Basic | Comprehensive i18n |
| **Real-time Updates** | Manual refresh | WebSocket integration |
| **Responsive Design** | Limited | Full responsive |
| **Accessibility** | Basic | WCAG compliant |
| **Development Experience** | Manual | Hot reload + TypeScript |

## Migration Benefits

### For Developers
- **TypeScript**: Full type safety and IDE support
- **Modern Tooling**: Vite, ESLint, Prettier
- **Component Library**: Reusable UI components
- **Testing**: Automated integration tests

### For Users
- **Better Performance**: Optimized React rendering
- **Responsive Design**: Works on all devices
- **Accessibility**: Screen reader support
- **Real-time Updates**: Live data refresh
- **Better UX**: Smooth animations and transitions

### For Maintainers
- **Code Organization**: Modular component structure
- **Internationalization**: Easy to add new languages
- **Extensibility**: Plugin architecture
- **Documentation**: Comprehensive guides

## Troubleshooting

### Common Issues

#### Backend Not Responding
```bash
# Check if backend is running
ps aux | grep ades

# Start backend
./ades -port 8080

# Check logs
tail -f gait.log
```

#### API Proxy Issues
```bash
# Verify Vite proxy configuration
cat frontend/vite.config.ts

# Check network requests in browser DevTools
# Ensure requests go to localhost:8080
```

#### Build Errors
```bash
# Clear node modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build
```

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native companion
2. **PWA Support**: Offline functionality
3. **Plugin System**: Third-party extensions
4. **Advanced Analytics**: Machine learning insights
5. **Team Collaboration**: Multi-user features

### Performance Optimizations
1. **Code Splitting**: Dynamic imports
2. **Caching**: Service worker implementation
3. **Compression**: Gzip/Brotli compression
4. **CDN**: Static asset distribution

## Contributing

### Frontend Development
1. **Follow TypeScript conventions**
2. **Use shadcn/ui components**
3. **Add translations for new features**
4. **Write integration tests**
5. **Update documentation**

### Backend Integration
1. **Maintain API compatibility**
2. **Add proper error handling**
3. **Include WebSocket support**
4. **Follow REST conventions**
5. **Document new endpoints**

## Support

- **Documentation**: [docs.knox.chat](https://docs.knox.chat)
- **Issues**: [GitHub Issues](https://github.com/knoxai/gait/issues)
- **Discussions**: [GitHub Discussions](https://github.com/knoxai/gait/discussions)

---

**ADES Frontend Integration - Complete and Production Ready** 🚀 