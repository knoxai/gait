# GAIT Frontend

A modern React-based frontend for the GAIT (Git AI Tool) system, built with Vite, TailwindCSS, and shadcn/ui components.

## 🚀 Features

- **Modern UI**: Built with React 19, TailwindCSS, and shadcn/ui components
- **Multilingual Support**: Complete i18n implementation with English and Chinese translations
- **Real-time Updates**: WebSocket integration for live dashboard updates
- **Responsive Design**: Mobile-first design with resizable panels
- **Git Operations**: Full Git workflow support with visual interface
- **Dashboard Analytics**: Comprehensive repository analytics and insights
- **Theme Support**: Dark/light theme switching
- **TypeScript**: Full type safety throughout the application

## 🛠 Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS 4
- **Components**: shadcn/ui
- **Internationalization**: react-i18next
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── modals/          # Modal dialogs
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   └── language-toggle.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useGitData.ts    # Git operations and data management
│   │   ├── useNotifications.ts # Toast notifications
│   │   └── useWebSocket.ts  # WebSocket connection
│   ├── lib/                 # Utilities and services
│   │   ├── api.ts           # API service layer
│   │   └── types.ts         # TypeScript type definitions
│   ├── i18n/                # Internationalization
│   │   ├── index.ts         # i18n configuration
│   │   └── locales/         # Translation files
│   │       ├── en.json      # English translations
│   │       └── zh.json      # Chinese translations
│   ├── pages/               # Page components
│   │   └── Dashboard.tsx    # Analytics dashboard
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # TailwindCSS configuration
└── tsconfig.json            # TypeScript configuration
```

## 🎯 Key Components

### Main Application (App.tsx)
- **Header**: ADES branding, Git operations toolbar, search, and controls
- **Sidebar**: Repository navigation, branches, tags, stashes, remotes
- **Commit List**: Paginated commit history with search functionality
- **Commit Details**: File changes, diff viewer, commit operations
- **Status Bar**: Application status and shortcuts

### Dashboard (Dashboard.tsx)
- **Repository Statistics**: Commits, developers, code quality metrics
- **Activity Charts**: Commit activity over time
- **Language Distribution**: Code composition analysis
- **Developer Contributions**: Team productivity metrics
- **AI Insights**: Automated code analysis results
- **Timeline**: Development milestones and events

### Custom Hooks
- **useGitData**: Manages all Git operations and repository state
- **useNotifications**: Handles toast notifications
- **useWebSocket**: Real-time dashboard updates

## 🌐 Internationalization

The application supports multiple languages with comprehensive translations:

- **English**: Complete UI translation
- **Chinese**: Full localization support
- **Extensible**: Easy to add new languages

Key translation categories:
- Navigation and UI elements
- Git operations and status messages
- Error handling and notifications
- Dashboard analytics terms

## 🎨 Theming

- **Dark/Light Mode**: Automatic system preference detection
- **Theme Persistence**: Settings saved in localStorage
- **Consistent Design**: shadcn/ui design system
- **Responsive**: Mobile-first approach

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔗 API Integration

The frontend communicates with the Go backend through a comprehensive REST API:

### Repository Management
- List, add, clone, and switch repositories
- Repository discovery and management

### Git Operations
- Commit history and details
- Branch, tag, and stash management
- File staging, unstaging, and discarding
- Cherry-pick, revert, merge operations
- Remote operations (fetch, pull, push)

### Search and Analysis
- Commit and file search
- Repository analytics
- AI-powered insights

## 🚀 Deployment

The frontend is built as a static application that can be deployed to any web server:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server

3. **Configure routing** for SPA (Single Page Application) support

## 🔄 Migration from Legacy Frontend

This React frontend replaces the previous HTML/CSS/JavaScript implementation with:

### Improvements
- **Better Maintainability**: Component-based architecture
- **Type Safety**: Full TypeScript implementation
- **Modern Tooling**: Vite for fast development and building
- **Enhanced UX**: Responsive design and smooth interactions
- **Internationalization**: Proper i18n implementation
- **Real-time Updates**: WebSocket integration
- **Extensibility**: Easy to add new features and components

### Compatibility
- **API Compatibility**: Uses the same backend API endpoints
- **Feature Parity**: All existing functionality preserved
- **Enhanced Features**: Additional dashboard analytics and insights

## 🤝 Contributing

1. Follow the established component structure
2. Use TypeScript for all new code
3. Add translations for new UI elements
4. Maintain responsive design principles
5. Write tests for new functionality

## 📄 License

This project is part of the GAIT system and follows the same licensing terms. 