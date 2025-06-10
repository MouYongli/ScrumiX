## Scrum System Features

1. User Management Module
- User Registration/Login
- Email Registration/Login
- OAuth Integration (Google, GitHub, Keycloak,etc.)
- Password Reset
- Role Management
  - Product Owner
  - Scrum Master
  - Development Team Member
  - Stakeholder

2. Project Management Module
- Project Creation/Management
- Team Member Management
- Project Settings
- Project Dashboard
- Project Analytics

3. Sprint Management Module
- Sprint Planning
- Sprint Backlog
- Sprint Board
- Sprint Review
- Sprint Retrospective
- Sprint Reports

4. Product Backlog Management
- User Story Management
- Story Point Estimation
- Priority Management
- Backlog Refinement
- Release Planning

5. Task Management Module
- Task Creation/Assignment
- Task Status Tracking
- Task Dependencies
- Task Comments
- Task Attachments

6. Meeting Management Module
- Daily Stand-up
- Sprint Planning Meeting
- Sprint Review Meeting
- Sprint Retrospective Meeting
- Backlog Refinement Meeting

7. Dashboard & Analytics
- Project Progress
- Sprint Burndown Chart
- Velocity Chart
- Team Performance
- Custom Reports

8. Collaboration Features
- Real-time Updates
- Team Chat
- File Sharing
- @mentions
- Email Notifications

9. System Settings
- User Preferences
- Notification Settings
- Theme Settings
- Language Settings
- Integration Settings

10. API & Integration
- RESTful API
- Webhook Support
- Third-party Integration
- Data Import/Export
- Custom Integration

## Packages

### Calendar
- @fullcalendar/core
- @fullcalendar/daygrid
- @fullcalendar/interaction
- @fullcalendar/react
- @fullcalendar/timegrid

### UI
- @headlessui/react
- @radix-ui/react-alert-dialog
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-popover
- @radix-ui/react-select
- @radix-ui/react-tooltip

### DND
- @dnd-kit/core
- @dnd-kit/modifiers
- @dnd-kit/sortable
- @dnd-kit/utilities

### Auth
- @auth/core
- @auth/prisma-adapter
- next-auth

### Charts
- recharts

### Query
- @tanstack/react-query
- @tanstack/react-query-devtools

### Date
- date-fns

### Date Picker
- react-day-picker

### Markdown
- @uiw/react-md-editor
- react-markdown

Installation suggestions

日历组件

```bash
npm install --save @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

UI 组件

```bash
npm install --save @radix-ui/themes lucide-react
```

DND 组件
```bash
npm install --save @dnd-kit/core @dnd-kit/sortable
```

auth 组件
```bash
npm install --save next-auth
```

recharts 组件
```bash
npm install --save recharts
```


tanstack 组件
```bash
npm install --save @tanstack/react-virtual
```

date-fns 组件
```bash
npm install --save date-fns
```

react-day-picker 组件
```bash
npm install --save react-day-picker
```

markdown 组件
```bash
npm install --save @uiw/react-md-editor
```