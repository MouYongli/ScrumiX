# System Design Document

## Global Navigation

### 1.1 Dashboard

#### 1.1.1 Overview

- **Function**:
    - Provides users with a one-stop visual panel of project health and key information, helping to quickly grasp the current work status.

- **Core Content**:

    - Project progress summary: Displays the current progress percentage and key milestones for all projects.

    - Risk alerts: Highlights projects with high risks or unresolved issues.

    - Burndown snapshot: Brief display of burndown status for each Sprint or project phase.

    - Task reminders and to-dos: Summarizes urgent tasks, pending approvals, etc.

- **Interaction Design**:

    - Card-style layout, supports custom module display order and content filtering.

    - Real-time data refresh, supports switching views by time, project, team, etc.

- **Target Users**:
    - Project managers, senior managers, and team leaders.

#### 1.1.2 Global Analytics

- **Function**:
    - For users needing deep data insights and decision support, offering powerful data mining and statistical analysis features.

- **Core Content**:

    - Custom report builder: Users can freely choose indicators, time ranges, and grouping conditions to generate personalized data reports.

    - Trend analysis: Shows historical trends and forecasts of key metrics.

    - Complex filtering and drill-down: Supports multi-dimensional filtering for in-depth analysis of specific projects, teams, or time periods.

    - Data export: Supports export in Excel, CSV, PDF formats for sharing and offline analysis.

- **Interaction Design**:

    - Interactive charts (bar, line, pie, etc.) alongside data tables.

    - Supports saving report templates, automatic generation and pushing.

- **Target Users**:
    - Data analysts, PMO, senior decision-makers.

#### 1.1.3 My Workspace

- **Function**:
    - Provides a personalized work entry point for users, centralizing tasks, schedules, and messages to enhance efficiency.

- **Core Content**:

    - Task management: Lists all tasks the user is responsible for (in progress, pending approval, delayed, etc.), supports priority sorting and quick actions (e.g., commenting, status updates).

    - Schedule planning: Integrates meetings, deadlines, and reminders; supports syncing with external calendars (e.g., Google Calendar).

    - Message notifications: System messages, team announcements, and approval requests are clearly presented.

    - Quick access: Customizable shortcuts to frequently used projects or modules.

- **Interaction Design**:

    - Panels are draggable, layout customizable, theme color personalization supported.

    - Supports mobile and desktop synchronization.

- **Target Users**:
    - All users, especially team members and project leads.

### 1.2 Project Management

#### 1.2.1 My Projects

- **Function**:
    - Displays all projects the user is involved in, for easy access and management.

- **Core Content**:

    - Project list view (table and card modes).

    - Supports search, filter (by status, time, team, etc.), and sort.

    - Quick view of basic project info (status, progress, owner, deadline).

- **Target Users**:
    - Project members, project managers.

#### 1.2.2 New Project

- **Function**:
    - Provides a simple and flexible project creation process, supporting quick start and customization.

- **Core Content**:

    - Basic info input (name, description, start/end date, team members).

    - Template selection (Scrum, Kanban, Waterfall, etc.).

    - Initial permission settings.

- **Interaction Design**:

    - Step-by-step guidance, with preset templates and examples.

    - Direct link to project homepage after creation.

- **Target Users**:
    - Project managers, team leads.

#### 1.2.3 Recent

- **Function**:
    - Quickly access recently viewed or edited projects and content.

- **Core Content**:

    - Time-sorted list of recently accessed projects, tasks, and documents.

    - Support for pinning/unpinning recent items.

- **Target Users**:
    - All users.

#### 1.2.4 Favorites

- **Function**:
    - Helps users bookmark important or frequently used items for easy navigation.

- **Core Content**:

    - Bookmark projects, tasks, documents, etc.

    - Support for category management and bulk actions.

- **Target Users**:
    - All users.

### 1.3 Third-Party Integrations

- **Function**:
    - Connects with external tools to enrich the system ecosystem and improve collaboration efficiency.

- **Core Content**:

    - Integration with mainstream PM tools, code repositories, and communication tools (e.g., Jira, GitHub, Slack, Teams).

    - Integration settings interface for toggling, authorization, and sync options.

    - Webhooks or APIs for custom extensions.

- **Interaction Design**:

    - One-click authorization, supports OAuth2 authentication.

    - Real-time display of integration status and logs.

- **Target Users**:
    - System admins, project managers, dev teams.

### 1.4 Personal & System

#### 1.4.1 Profile

- **Function**:
    - Manage personal information and account security settings.

- **Core Content**:

    - Edit basic info (name, avatar, contact).

    - Password and multi-factor authentication settings.

    - Language and timezone preferences.

- **Target Users**:
    - All users.

#### 1.4.2 Settings

- **Function**:
    - Offers system-wide and personal configuration options, allowing admins to manage global parameters and users to adjust personal preferences.

- **Core Content**:

    - Global system config (admins only)

        - User roles and permissions management.

        - Notification strategy (email, push, etc.).

        - Integration service config (API keys, service toggles).

        - Branding (logo, theme, custom domain).

    - Personal settings

        - Language and timezone

        - Notification preferences (subscriptions, quiet hours)

        - Account security (password, MFA)

        - UI theme and layout customization

        - System status & maintenance (view status, changelog)

        - Feedback and help

- **Target Users**:

    - Admins: Manage global settings and permissions.

    - Regular users: Manage account preferences and security.

#### 1.4.3 Notification Center

- **Function**:
    - Central hub for managing system and external notifications.

- **Core Content**:

    - Categories: system alerts, task reminders, approval notifications.

    - Subscription settings: control channels (email, in-app, push).

    - Message history and search.

- **Target Users**:
    - All users.

## Project Navigation

### 2.1 Management & Configuration

- **Function**:
    - Manages project members, core settings, and unified version/resource/document configs.

- **Core Content**:

    - Team member management: list, roles, permissions.

    - Project settings: name, description, time, template, notifications.

    - Version control: releases, tags, version history.

    - Document management: requirements, technical docs, project wiki.

    - Resource & CI/CD management: budget, resource allocation, pipelines.

- **Target Users**:
    - PMs, team leads, system admins.

### 2.2 Progress & Data Tracking

- **Function**:
    - Tracks task progress and time, provides visualizations and analytics to support execution.

- **Core Content**:

    - Time/task tracking: status, time logs, priority.

    - Burndown and Gantt charts: project and Sprint timelines.

    - Reports & analytics: multi-dimensional reports, trend analysis, export support.

    - Health & risk monitoring.

- **Target Users**:
    - PMs, product owners, analysts.

### 2.3 Agile Core Management

- **Function**:
    - Supports agile workflow including backlog, Sprint planning, task visualization, and team collaboration.

- **Core Content**:

    - Project Dashboard

        - Key indicators: completion rate, burndown, workload.

        - Customizable card layout, bottleneck/risk highlight.

        - Filters by Sprint, owner, priority.

    - Backlog & User Stories

        - Create/edit/prioritize user stories.

        - Link tasks/subtasks, full traceability.

        - Status tracking (todo/in-progress/done), assignees.

        - Filter/sort by tags, milestones.

    - Sprint Management

        - Set goals/timelines.

        - Assign/split/merge tasks.

        - Track progress (burndown, progress bars).

        - Manage Sprint status.

    - Kanban

        - Visual task flow across stages.

        - Drag-and-drop cards with real-time updates.

        - Cards show key info: assignee, due date, priority, tags.

        - Quick actions: comments, attachments, status changes.

    - Meetings & Collaboration

        - Calendar view of meetings.

        - Meeting notes with editing, attachments, comments.

        - Built-in/team chat integration (e.g., Slack, Teams).

        - Assign/follow up on meeting action items.

- **Target Users**:
    - Agile teams, Scrum Masters, PMs.