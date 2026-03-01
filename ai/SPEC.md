# AI Model Test Hub - Specification

## 1. Project Overview
- **Project Name**: AI Model Test Hub
- **Type**: Single-page web application (Vanilla HTML/CSS/JS)
- **Core Functionality**: Platform to catalog AI models, create/take tests, and share reviews
- **Target Users**: AI enthusiasts, researchers, developers testing AI models

## 2. UI/UX Specification

### Layout Structure
- **Navigation**: Fixed top navbar with glassmorphism effect
- **Hero Section**: Full-width intro with animated background
- **Main Content**: Tab-based navigation for different sections
- **Footer**: Minimal footer with links

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Design

#### Color Palette
- **Background Primary**: `#0a0a0f` (deep dark)
- **Background Secondary**: `#12121a` (card backgrounds)
- **Background Tertiary**: `#1a1a25` (elevated elements)
- **Accent Primary**: `#6366f1` (indigo)
- **Accent Secondary**: `#8b5cf6` (purple)
- **Accent Gradient**: `linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)`
- **Text Primary**: `#f8fafc`
- **Text Secondary**: `#94a3b8`
- **Text Muted**: `#64748b`
- **Success**: `#10b981`
- **Warning**: `#f59e0b`
- **Error**: `#ef4444`
- **Border**: `rgba(255, 255, 255, 0.08)`

#### Typography
- **Font Family**: `'Outfit', sans-serif` (headings), `'DM Sans', sans-serif` (body)
- **Font Sizes**:
  - H1: 3.5rem (hero)
  - H2: 2.5rem
  - H3: 1.5rem
  - Body: 1rem
  - Small: 0.875rem

#### Spacing System
- Base unit: 8px
- Sections: 80px vertical padding
- Cards: 24px padding
- Gap: 16px-24px

#### Visual Effects
- **Glassmorphism**: `backdrop-filter: blur(12px)` with semi-transparent backgrounds
- **Glow Effects**: Box shadows with accent colors
- **Animations**: Fade-in on scroll, hover scale, gradient shifts
- **Cards**: Rounded corners (16px), subtle border glow on hover

### Components

#### Navbar
- Logo with gradient text
- Nav links: Home, Models, Tests, Leaderboard
- Auth buttons: Login/Sign Up (or user avatar when logged in)
- Glassmorphism background

#### Hero Section
- Large animated gradient background (CSS animation)
- Main headline with gradient text
- Subtitle
- CTA buttons

#### AI Model Cards
- Model image/icon
- Name, provider, category
- Rating stars
- Quick stats (tests taken, avg score)
- Hover: subtle glow, scale

#### Test Cards
- Test title
- Description preview
- Category, difficulty
- Time estimate
- Questions count
- Take Test button

#### Modal System
- Login/Signup modals
- Test taking modal
- Create test modal

#### Rating Component
- 5-star interactive rating
- Review text area
- Submit button

## 3. Functionality Specification

### Core Features

#### Navigation
- Tab-based section switching (no page reload)
- Smooth scroll to sections
- Active state highlighting

#### AI Model Catalog
- Grid display of AI models
- Filter by category (LLM, Image, Audio, Coding, etc.)
- Search by name
- Sort by rating, popularity
- Model detail view (in modal or expanded)

#### Test Builder (Authenticated)
- Create new test form
  - Title, description, category, difficulty
  - Add questions (multiple choice, text input)
  - Set correct answers
  - Save to localStorage (Firebase later)
- Edit existing tests
- Delete tests

#### Test Taker
- Start test from test card
- Question-by-question or all-at-once display
- Timer (optional)
- Submit and auto-grade
- Show results with score
- Save result to user history

#### User Authentication (UI + localStorage for now)
- Login modal with email/password
- Signup modal
- Store user in localStorage
- User avatar in navbar when logged in
- Logout functionality

#### Ratings & Reviews
- Rate AI models (1-5 stars)
- Write review text
- Display reviews on model detail
- Sort reviews by newest/highest rated

#### Leaderboard
- Top rated models
- Most active testers
- Recent high scores

### Data Handling
- All data stored in localStorage (demo mode)
- Firebase integration ready (structured for easy swap)
- Sample data pre-populated

### Edge Cases
- Empty states for no results
- Loading states
- Form validation
- Error messages

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with proper contrast
- [ ] Glassmorphism navbar visible
- [ ] Gradient animations on hero
- [ ] Cards have hover effects
- [ ] Responsive on mobile/tablet/desktop

### Functional Checkpoints
- [ ] Navigation switches sections smoothly
- [ ] Can view AI models in catalog
- [ ] Can filter/search models
- [ ] Can open/close modals
- [ ] Login/Signup works (localStorage)
- [ ] Can take a test and see results
- [ ] Ratings can be submitted
- [ ] Leaderboard displays data
