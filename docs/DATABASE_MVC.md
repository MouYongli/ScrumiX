# Model-View-Controller Architecture 

## Introduction  
This document provides a structured overview of the Model-View-Controller (MVC) architecture for the ScrumiX project. It maps each View to its corresponding Models, clarifying the data dependencies and facilitating coherent development and maintenance.

---

## 1) Global Views and Their Corresponding Models

### 1.1) Dashboard View  
**Description:**  
Provides a one-stop visual panel of projects and their respective health and key information, such as progress, risk alerts, sprint status, and task reminders.  

**Models:**  
- **Project**  
  - **Relevant Fields:** `id`, `name`, `description`, `created_at`  
  - **Purpose in View:** Provides summary information such as project description and project progress.

- **User**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Indicates user-specific information such as user name.

- **ProjectUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `user_id`, `project_id`  
  - **Purpose in View:** Determines the total number of team members in the current dashboard as well as determines which team members are assigned to a specific project.

- **Backlog**  
  - **Relevant Fields:** `id`, `project_id`, `status`
  - **Purpose in View:** Used by the dashboard to retrieve and group associated tasks, enabling calculation of project progress based on the status of those tasks.

- **Sprint**  
  - **Relevant Fields:** `id`, `project_id`, `status`
  - **Purpose in View:** Displays the current sprint status of a project.

- **ActivityLog**  
  - **Relevant Fields:** `id`, `user_id`, `description`, `action_type`, `created_at`  
  - **Purpose in View:** Shows the latest system-wide updates and user actions (e.g., creation of new tasks or projects).
---


### 1.2) Global Analytics View  
**Description:**  
Provides deep insights and decision-support tools for project and team performance. Offers customizable reports, trend analysis, and drill-down metrics such as sprint velocity, burndown rates, task completion rate, bug trends, and team capacity over time.

**Models:**  

- **Project**  
  - **Relevant Fields:** `id`, `name`, `created_at`  
  - **Purpose in View:** Used to scope analytics to a particular project and provide project-level filters.

- **User**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Required for personal user details

- **ProjectUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `user_id`, `project_id`, `role`  
  - **Purpose in View:** Determines team composition and roles for capacity and performance analysis.

- **Sprint**  
  - **Relevant Fields:** `id`, `project_id`, `start_date`, `end_date`  
  - **Purpose in View:** Used to determine the current sprint cycle.

- **Backlog (1:n relationship with Sprint)**  
  - **Relevant Fields:** `id`, `project_id`, `sprint_id`, `status`, `story_points`, `completed_at`  
  - **Purpose in View:** Provides data for task completion rates, burndown charts, velocity calculations, and defect tracking.


---

### 1.3) My Workspace View  
**Description:**  
A personalized work hub centralizing tasks, schedules, and messages.  

**Models:**  
- **Backlog**  
  - **Relevant Fields:** `id`,`status`, `due_date`, `priority`  
  - **Purpose in View:** Lists assigned tasks with quick actions.

- **BacklogUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `id`,`backlog_id`, `assignee_id`
  - **Purpose in View:** Lists assigned tasks with quick actions.

- **CalendarEvent**  
  AI-powered Scrum management system designed to enhance agile team productivity and collaboration through intelligent automation and smart assistance with AI agents.- **Relevant Fields:** `id`, `user_id`, `start_time`, `end_time`, `description`  
  - **Purpose in View:** Manages meetings and reminders.

- **Notification**  
  - **Relevant Fields:** `id`, `user_id`, `type`, `content`, `read_status`  
  - **Purpose in View:** Displays messages and announcements.

---

### 1.4) Project Management View  
**Description:**  
Displays projects the user is involved in.  

**Models:**  
- **Project**  
  - **Relevant Fields:** `id`, `name`, `description`, `created_at`  
  - **Purpose in View:** Provides summary information such as project description and project progress. Also is needed for project creation and a preview of recently created, updated, and viewed projects.

- **User**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Indicates user-specific information such as user name and needed for creating a project.

- **ProjectUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `user_id`, `project_id`  
  - **Purpose in View:** Required to filter all the projects a user is part of and needed to assign users/members to projects.

- **FavoriteProject (Join Table n:m relationshipship)**  
  - **Relevant Fields:** `user_id`, `project_id`  
  - **Purpose in View:** Marks favorited projects.

---

### 1.5) Favorites View  
**Description:**  
Shows items bookmarked by the user.  

**Models:**  
- **FavoriteProject**  
  - **Relevant Fields:** `user_id`, `project_id`, `item_type`  
  - **Purpose in View:** Manages user's favorites.

---

### 1.6) Third-Party Integrations View  
**Description:**  
Displays and manages external tool integrations.  

**Models:**  
- **Integration**  
  - **Relevant Fields:** `id`, `type`, `status`, `config`, `user_id`  
  - **Purpose in View:** Handles integration settings and status.

- **OAuthToken**  
  - **Relevant Fields:** `user_id`, `provider`, `access_token`, `expires_at`  
  - **Purpose in View:** Stores credentials for linked services.

---

### 1.7) Profile View  
**Description:**  
Manages personal account and profile data.  

**Models:**  
- **User**  
  - **Relevant Fields:** `id`, `name`, `avatar`, `email`, `timezone`  
  - **Purpose in View:** Stores user profile data.

---

### 1.8) Personal Settings View  
**Description:**  
Allows users to customize their personal preferences including language, notifications, security, UI, and access support information.

**Models:**  
- **UserPreference**  
  - **Relevant Fields:** `user_id`, `language`, `timezone`, `ui_theme`, `layout`  
  - **Purpose in View:** Stores user-specific preferences for language, timezone, UI theme, and layout customization.

- **NotificationPreference**  
  - **Relevant Fields:** `user_id`, `subscription_types`, `quiet_hours_start`, `quiet_hours_end`  
  - **Purpose in View:** Manages user notification settings, including types of notifications subscribed to and preferred quiet hours.

- **AccountSecurity**  
  - **Relevant Fields:** `user_id`, `password_hash`, `mfa_enabled`, `mfa_secret`  
  - **Purpose in View:** Handles user account security details, including password and multi-factor authentication (MFA) status.

- **SystemStatus**  
  - **Relevant Fields:** `status_message`, `last_updated`, `changelog_url`  
  - **Purpose in View:** Provides current system status, recent updates, and maintenance notifications.

- **UserFeedback**  
  - **Relevant Fields:** `user_id`, `feedback_text`, `submitted_at`, `response_status`  
  - **Purpose in View:** Collects user feedback and tracks status of submitted help requests or suggestions.

---
## 2) Project-Related Views and Their Corresponding Models

### 2.1) Project Dashboard View  
**Description:**  
Provides a central visual panel of project key indicators and metrics such such as sprint velocity, burndown rates, task completion rate, bug trends, and team capacity over time.

**Models:**  
- **Project**  
  - **Relevant Fields:** `id`, `name`, `description`, `created_at`  
  - **Purpose in View:** Provides project summary and metadata.

- **Sprint**  
  - **Relevant Fields:** `id`, `project_id`, `start_date`, `end_date`, `status`  
  - **Purpose in View:** Displays current sprint info and progress.

- **Backlog**  
  - **Relevant Fields:** `id`, `project_id`, `sprint_id`, `status`, `story_points`  
  - **Purpose in View:** Tracks task completion, status, and story points for burndown and progress.

- **ProjectUser (Join Table n:m)**  
  - **Relevant Fields:** `user_id`, `project_id`, `role`  
  - **Purpose in View:** Determines team members and roles involved in the project.

- **ActivityLog**  
  - **Relevant Fields:** `id`, `user_id`, `description`, `action_type`, `created_at`  
  - **Purpose in View:** Shows the latest project-related updates and user actions (e.g., creation of new tasks).

**Models:**  
- **Meeting**  
  - **Relevant Fields:** `id`, `project_id`, `title`, `scheduled_time`, `
  - **Purpose in View:** Gives a preview of upcoming meetings.
---

### 2.2) Backlog View  
**Description:**  
Manages the backlog of user stories and tasks including creation, prioritization, assignment, and status tracking.

**Models:**  
- **User**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Indicates user-specific information such as user name.

- **ProjectUser (Join Table n:m)**  
  - **Relevant Fields:** `user_id`, `project_id`  
  - **Purpose in View:** Determines the total number of team members in the current dashboard as well as determines which team members are assigned to a specific project.

- **Backlog**  
  - **Relevant Fields:** `id`, `project_id`, `status`
  - **Purpose in View:** Used by the dashboard to retrieve and group associated tasks, enabling calculation of project progress based on the status of those tasks.

- **BacklogUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Required to assign multiple users to multiple backlog items.

- **Sprint**  
  - **Relevant Fields:** `id`, `project_id`, `start_date`, `end_date`  
  - **Purpose in View:** Associates backlog items to sprints for planning.


---

### 2.3) Sprint Management View  
**Description:**  
Allows planning and management of sprints including setting goals, timelines, task assignment, and tracking progress.

**Models:**  
- **Sprint**  
  - **Relevant Fields:** `id`, `project_id`, `name`, `start_date`, `end_date`, `goal`, `status`  
  - **Purpose in View:** Core sprint entity with schedule and goals.

- **BacklogItem**  
  - **Relevant Fields:** `id`, `sprint_id`, `status`, `story_points`  
  - **Purpose in View:** Tasks assigned to the sprint for tracking completion and velocity.

- **ProjectUser (Join Table n:m)**  
  - **Relevant Fields:** `user_id`, `project_id`, `role`  
  - **Purpose in View:** Identifies sprint team members for task assignment.

---

### 2.4) Kanban View  
**Description:**  
Visualizes task flow across stages with drag-and-drop support, enabling real-time updates on task statuses.

**Models:**  
- **Backlog (1:n relationship with Project)**  
  - **Relevant Fields:** `id`, `project_id`, `status`, `priority`, `due_date`  
  - **Purpose in View:** Tasks displayed as cards organized by workflow stages.

- **User**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Shows assignees on cards and allows assignment.

- **BacklogUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `id`, `username`  
  - **Purpose in View:** Required to assign multiple users to multiple backlog items.

---

### 2.5) Meeting Dashboard View  
**Description:**  
Gives an overview of all meetings that a user has regarding a project including a preview of all important information of a meeting. The user can also create, update

**Models:**  
- **Meeting (1:n relationship with Project)**  
  - **Relevant Fields:** `id`, `project_id`, `title`, `status`, `scheduled_time`, `meeting_location`, `meeting_agenda`
  - **Purpose in View:** Displays the history of all meetings of a project.

- **MeetingUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `id`, `meeting_id`, `user_id`, `created_at`, `updated_at`, `note`
  - **Purpose in View:** Required to show the team members participating in the meeting as well as the number of paricipants.

---


### 2.5) Meetings View  
**Description:**  
Supports scheduling, viewing, and managing project meetings including notes, action items, and attachments.

**Models:**  
- **Meeting**  
  - **Relevant Fields:** `id`, `project_id`, `title`, `description`, `status`, `scheduled_time`, `meeting_location`, `meeting_agenda`
  - **Purpose in View:** Displays all necessary information about the meeting such as the meeting description and agenda.

- **MeetingUser (Join Table n:m relationship)**  
  - **Relevant Fields:** `id`, `meeting_id`, `user_id`, `created_at`, `updated_at`, `note`
  - **Purpose in View:** Required to display information about participants as well as meeting notes of participants.

---
