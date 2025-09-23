# ScrumiX AI Chat Widget

A professional floating chat widget that provides access to three specialized AI agents for Scrum project management.

## Features

### 🎯 **Agent Selection**
- **Product Owner Agent** (Emerald) - User stories, backlog management, acceptance criteria
- **Scrum Master Agent** (Blue) - Sprint ceremonies, impediment removal, process improvement  
- **Developer Agent** (Purple) - Technical guidance, code reviews, architecture advice

### 🎨 **Design Highlights**
- **Floating Button**: Animated chat button in bottom-right corner with sparkle indicator
- **Expandable Window**: Smooth animations with minimize/maximize functionality
- **Agent Tabs**: Visual tabs with unique icons, colors, and tooltips for each agent
- **Theme Support**: Full dark/light mode compatibility
- **Responsive**: Optimized for desktop and mobile experiences

### 🛠 **Technical Implementation**
- Built with **React 19** and **TypeScript**
- **Framer Motion** animations for smooth interactions
- **Tailwind CSS** for consistent styling
- **Lucide React** icons for professional appearance
- Integrated with existing ScrumiX theme system

### 🎪 **User Experience**
- **One-click access** from any page (except auth pages)
- **Visual feedback** for active agent selection
- **Typing indicators** and message animations
- **Keyboard shortcuts** (Enter to send)
- **Accessibility** features with ARIA labels and focus management

## Usage

The chat widget is automatically available on all authenticated pages. Users can:

1. Click the floating chat button to open
2. Select their preferred AI agent using the header tabs
3. Type questions and receive contextual assistance
4. Switch between agents seamlessly during conversation
5. Minimize or close the chat as needed

## Integration

The widget is integrated into the main layout (`layout.tsx`) and appears on all pages except authentication pages. It maintains its state across page navigation and provides consistent access to AI assistance throughout the application.
