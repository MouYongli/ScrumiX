# ScrumiX Frontend

A modern Next.js-based frontend application for the ScrumiX AI-powered Scrum management system. Built with React 19, TypeScript, and Tailwind CSS, featuring AI-powered chat agents, real-time collaboration, and comprehensive project management tools.

## Features

### Core Functionality
- **AI-Powered Chat Agents**: Interactive AI assistants for different roles (Scrum Master, Product Owner, Developer, Support)
- **Real-time Collaboration**: Live updates and team communication
- **Project Management**: Complete Scrum workflow management
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Internationalization**: Multi-language support (English/Chinese)
- **Dark/Light Theme**: User preference-based theming

### Project Management
- **Dashboard**: Project overview with key metrics and analytics
- **Sprint Management**: Sprint planning, tracking, and retrospective tools
- **Backlog Management**: User story creation, prioritization, and refinement
- **Task Management**: Kanban board with drag-and-drop functionality
- **Team Management**: Member invitation, role assignment, and collaboration
- **Documentation**: Knowledge base with semantic search capabilities

### AI Integration
- **Multi-Model Support**: OpenAI, Google, and other AI providers
- **Semantic Search**: AI-powered document and content search
- **Intelligent Suggestions**: Context-aware recommendations
- **Multimodal Chat**: Support for text, images, and file uploads
- **Role-Specific Agents**: Specialized AI assistants for different Scrum roles

## Technology Stack

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icon library
- **Framer Motion**: Smooth animations and transitions
- **React Hook Form**: Form management with validation
- **Zod**: Schema validation

### Data & State Management
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management
- **React Virtual**: Virtualization for large lists

### AI & Chat
- **AI SDK**: Vercel AI SDK for AI integrations
- **OpenAI SDK**: OpenAI API integration
- **Google AI SDK**: Google AI model support
- **Multimodal Support**: Text, image, and file processing

### Visualization & Charts
- **Recharts**: Data visualization library
- **Vis Timeline**: Interactive timeline components
- **FullCalendar**: Calendar and scheduling components

### Development Tools
- **ESLint**: Code linting and formatting
- **TypeScript**: Static type checking
- **Turbopack**: Fast development builds

## Project Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API routes
│   │   │   ├── chat/                 # AI chat endpoints
│   │   │   │   ├── developer/        # Developer agent
│   │   │   │   ├── product-owner/    # Product Owner agent
│   │   │   │   ├── scrum-master/     # Scrum Master agent
│   │   │   │   └── support/          # Support agent
│   │   │   ├── models/               # AI model management
│   │   │   └── uploads/              # File upload handling
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── forgot-password/
│   │   ├── project/                  # Project management pages
│   │   │   └── [project-id]/
│   │   │       ├── dashboard/        # Project dashboard
│   │   │       ├── backlog/          # Product backlog
│   │   │       ├── sprint/           # Sprint management
│   │   │       ├── kanban/           # Kanban board
│   │   │       ├── team/             # Team management
│   │   │       ├── ai-chat/          # AI chat interface
│   │   │       ├── documentation/    # Knowledge base
│   │   │       ├── meeting/          # Meeting management
│   │   │       ├── velocity/         # Velocity tracking
│   │   │       └── settings/         # Project settings
│   │   ├── workspace/                # Workspace overview
│   │   ├── profile/                  # User profile
│   │   ├── notifications/            # Notification center
│   │   └── settings/                 # Global settings
│   ├── components/                   # Reusable components
│   │   ├── auth/                     # Authentication components
│   │   ├── chat/                     # Chat and AI components
│   │   ├── common/                   # Shared components
│   │   └── layout/                   # Layout components
│   ├── contexts/                     # React contexts
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Utility libraries
│   │   ├── tools/                    # AI tool integrations
│   │   │   ├── developer/            # Developer tools
│   │   │   ├── product-owner/        # Product Owner tools
│   │   │   ├── scrum-master/         # Scrum Master tools
│   │   │   ├── schemas/              # Data schemas
│   │   │   └── utils/                # Utility functions
│   │   ├── ai-gateway.ts             # AI service gateway
│   │   └── chat-api.ts               # Chat API client
│   ├── types/                        # TypeScript type definitions
│   └── utils/                        # Utility functions
├── public/                           # Static assets
│   └── locales/                      # Internationalization files
│       ├── en/                       # English translations
│       └── zh/                       # Chinese translations
├── docs/                             # Documentation
├── package.json                      # Dependencies and scripts
├── next.config.ts                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- npm or yarn package manager
- Backend API running (see backend README)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MouYongli/ScrumiX.git
   cd ScrumiX/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Configuration

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Additional AI providers
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Development

### Available Scripts

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Development Features

- **Hot Reload**: Instant updates during development
- **Turbopack**: Fast builds and hot module replacement
- **TypeScript**: Full type checking and IntelliSense
- **ESLint**: Code quality and consistency
- **Tailwind CSS**: Utility-first styling with IntelliSense

## AI Integration

### Supported AI Providers

- **OpenAI**: GPT-4, GPT-3.5-turbo, text-embedding-3-small
- **Google AI**: Gemini Pro, Gemini Pro Vision
- **Anthropic**: Claude (via AI SDK)

### AI Features

1. **Role-Specific Agents**:
   - **Scrum Master**: Sprint management, team coordination
   - **Product Owner**: Backlog management, user stories
   - **Developer**: Task management, technical guidance
   - **Support**: General assistance and troubleshooting

2. **Multimodal Support**:
   - Text conversations
   - Image analysis and description
   - File upload and processing
   - Document understanding

3. **Semantic Search**:
   - AI-powered document search
   - Context-aware recommendations
   - Intelligent content discovery

## Key Components

### Authentication
- **Login/Signup**: User authentication with email/password
- **OAuth Integration**: Google, GitHub, Keycloak support
- **Password Reset**: Secure password recovery
- **Role Management**: User roles and permissions

### Project Management
- **Dashboard**: Project overview with metrics
- **Sprint Board**: Visual sprint management
- **Backlog**: User story and task management
- **Team Management**: Member collaboration tools

### AI Chat Interface
- **Multi-Agent Support**: Different AI assistants
- **Model Selection**: Choose AI provider and model
- **Chat History**: Persistent conversation history
- **File Upload**: Support for various file types

### Documentation System
- **Knowledge Base**: Centralized documentation
- **Semantic Search**: AI-powered content discovery
- **Markdown Support**: Rich text editing
- **Version Control**: Document versioning

## Styling and Theming

### Design System
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Custom Components**: Reusable UI components
- **Responsive Design**: Mobile-first approach

### Theme Support
- **Light/Dark Mode**: User preference-based theming
- **Custom Colors**: Brand-specific color schemes
- **Accessibility**: WCAG 2.1 compliance

## Internationalization

### Supported Languages
- **English**: Primary language
- **Chinese**: Full translation support

### Adding New Languages
1. Create language directory in `public/locales/`
2. Add translation files
3. Update language selector component
4. Configure Next.js i18n settings

## Performance Optimization

### Built-in Optimizations
- **Next.js 15**: Latest performance features
- **React 19**: Concurrent rendering
- **Turbopack**: Fast development builds
- **Image Optimization**: Automatic image optimization
- **Code Splitting**: Automatic route-based splitting

### Additional Optimizations
- **Virtual Scrolling**: For large lists
- **Lazy Loading**: Component and route lazy loading
- **Caching**: Intelligent data caching
- **Bundle Analysis**: Built-in bundle analyzer

## Testing

### Testing Strategy
- **Unit Tests**: Component testing with Jest
- **Integration Tests**: API integration testing
- **E2E Tests**: End-to-end testing with Playwright
- **Visual Regression**: UI consistency testing

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t scrumix-frontend .

# Run container
docker run -p 3000:3000 scrumix-frontend
```

### Environment Variables for Production
```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret
```

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use ESLint configuration
- Write meaningful commit messages
- Add JSDoc comments for complex functions

## Troubleshooting

### Common Issues

1. **Build Errors**:
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **TypeScript Errors**:
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   ```

3. **AI Integration Issues**:
   - Verify API keys in environment variables
   - Check network connectivity
   - Review AI provider documentation

4. **Styling Issues**:
   ```bash
   # Rebuild Tailwind CSS
   npm run build
   ```

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the component documentation
3. Check the main project documentation
4. Open an issue on the GitHub repository

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.

## Dependencies

### Core Dependencies
- **Next.js 15**: React framework
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS 4**: Styling framework

### UI Libraries
- **@radix-ui/themes**: Component system
- **@dnd-kit/core**: Drag and drop
- **@fullcalendar/react**: Calendar components
- **recharts**: Data visualization

### AI Integration
- **@ai-sdk/openai**: OpenAI integration
- **@ai-sdk/google**: Google AI integration
- **ai**: Vercel AI SDK

### Development Tools
- **ESLint**: Code linting
- **TypeScript**: Type checking
- **Turbopack**: Fast builds