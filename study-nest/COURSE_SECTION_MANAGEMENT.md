# Course and Section Management with Group Chats

This document describes the new course and section management feature that allows admins to create course sections and automatically generate group chat sections for each course-section combination.

## Features

### 1. Academic Terms Management
- Create and manage academic terms/trimesters
- Set active terms (only one can be active at a time)
- Track term start and end dates
- Support for multiple terms per year

### 2. Course Sections Management
- Create sections for existing courses (A, B, C, etc.)
- Assign instructors to sections
- Set maximum student capacity
- Bulk create multiple sections at once
- Link sections to specific academic terms

### 3. Group Chat Management
- Automatically create group chats for each course section
- Bulk create group chats for multiple sections
- Real-time messaging within group chats
- Participant management
- Message read status tracking

## Database Schema

### New Tables Created

1. **academic_terms** - Stores academic terms/trimesters
2. **course_sections** - Links courses to sections and terms
3. **group_chats** - Group chat rooms for course sections
4. **group_chat_participants** - Users participating in group chats
5. **group_chat_messages** - Messages within group chats
6. **group_chat_message_reads** - Read status tracking

## API Endpoints

### Admin API (admin_api.php)

#### Academic Terms
- `GET list_terms` - List all academic terms
- `POST create_term` - Create new academic term
- `POST update_term` - Update existing term
- `POST delete_term` - Delete academic term

#### Course Sections
- `GET list_course_sections` - List course sections with filters
- `POST create_course_section` - Create single section
- `POST create_sections_for_course` - Bulk create sections
- `POST update_course_section` - Update section
- `POST delete_course_section` - Delete section

#### Group Chats
- `GET list_group_chats` - List group chats
- `POST create_group_chat` - Create single group chat
- `POST create_group_chats_for_sections` - Bulk create group chats
- `POST update_group_chat` - Update group chat
- `POST delete_group_chat` - Delete group chat

### Student API (group_chat_api.php)

#### Group Chat Access
- `GET my_group_chats` - Get user's group chats
- `GET get_messages` - Get chat messages
- `POST send_message` - Send message to chat
- `POST mark_read` - Mark messages as read
- `GET get_participants` - Get chat participants
- `POST join_group_chat` - Join a group chat
- `POST leave_group_chat` - Leave a group chat
- `GET get_unread_counts` - Get unread message counts

## Usage Guide

### For Administrators

1. **Access Admin Dashboard**
   - Navigate to `/admin` in your browser
   - Use the admin key for authentication

2. **Create Academic Terms**
   - Go to "Terms" tab
   - Click "Add New Term"
   - Fill in term details (name, code, dates)
   - Set as active if needed

3. **Create Course Sections**
   - Go to "Sections" tab
   - Click "Add New Section"
   - Select course and term
   - Choose single section or bulk create
   - For bulk: Enter section names like "A, B, C, D"

4. **Create Group Chats**
   - Go to "Group Chats" tab
   - Click "Add New Group Chat"
   - Select course section
   - Or use bulk create to generate chats for multiple sections

### For Students

1. **Access Group Chats**
   - Navigate to `/group-chats` in your browser
   - View all your group chats in the left sidebar
   - Click on a chat to open it

2. **Send Messages**
   - Type your message in the input field
   - Press Enter or click Send
   - Messages appear in real-time

3. **View Participants**
   - See who's in each group chat
   - View participant count in chat header

## File Structure

```
src/
├── Pages/
│   ├── AdminDashboard.jsx      # Admin interface for course/section management
│   └── GroupChats.jsx          # Student interface for group chats
├── api/
│   ├── admin_api.php           # Admin API endpoints
│   └── group_chat_api.php      # Student group chat API
└── Components/
    └── LeftNav.jsx             # Updated with Group Chats link
```

## Key Features

### Real-time Messaging
- Messages poll every 3 seconds for new content
- Auto-scroll to bottom when new messages arrive
- Read status tracking
- Unread message counts

### Bulk Operations
- Create multiple sections at once
- Generate group chats for multiple sections
- Efficient database operations with transactions

### Responsive Design
- Mobile-friendly interface
- Collapsible sidebar navigation
- Modern UI with Tailwind CSS

### Security
- Session-based authentication
- User permission checks
- SQL injection protection with prepared statements

## Example Workflow

1. **Admin creates Fall 2024 term**
   - Term Name: "Fall 2024"
   - Term Code: "FALL2024"
   - Dates: Sep 1 - Dec 15, 2024

2. **Admin creates sections for Software Engineering**
   - Course: CSE-301 Software Engineering
   - Sections: A, B, C
   - Instructor: Dr. John Smith
   - Max Students: 50 each

3. **Admin creates group chats**
   - Bulk create for all sections
   - Auto-generates: "CSE-301 - Section A (Fall 2024)"

4. **Students join and chat**
   - Access via Group Chats page
   - Real-time messaging within their section
   - Can see all participants

## Technical Notes

- Database tables are created automatically on first API call
- Foreign key constraints ensure data integrity
- Messages are stored with timestamps for ordering
- Read status is tracked per user per chat
- Bulk operations use database transactions for consistency

## Future Enhancements

- File attachments in group chats
- Push notifications for new messages
- Chat moderation tools
- Message search functionality
- Integration with course enrollment system
- Mobile app support


