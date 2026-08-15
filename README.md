# Teacher SaaS Platform

A modern, scalable **multi-tenant educational SaaS platform** designed to help teachers build and manage their online educational presence.

The platform provides teachers with a centralized workspace to manage courses, lessons, students, educational materials, quizzes, and student progress — with a foundation designed to support future online course monetization.

Built with modern web technologies and designed for scalability, security, accessibility, and a professional educational experience.

---

## ✨ Features

### 👨‍🏫 Teacher Management

- Teacher authentication and account management
- Dedicated teacher dashboard
- Course management
- Lesson management
- Student management
- Educational file management
- Quiz and exam management
- Student progress tracking
- Course publishing and management
- Public teacher profile

### 🎓 Student Experience

- Student registration and authentication
- Browse available courses
- Course enrollment
- Access enrolled courses
- View lessons and educational materials
- Take quizzes and exams
- Track learning progress
- View exam results

### 🏫 Multi-Tenant Architecture

The platform is designed as a **multi-tenant SaaS**.

Each teacher operates within an isolated environment while sharing the same application infrastructure.

```text
Teacher A
 ├── Courses
 ├── Students
 ├── Lessons
 └── Exams

Teacher B
 ├── Courses
 ├── Students
 ├── Lessons
 └── Exams
```

Teachers can never access another teacher's private data.

---

## 🌍 Internationalization

The platform supports:

- 🇬🇧 English
- 🇪🇬 Arabic

The application is designed with internationalization from the beginning rather than adding translations later.

### RTL / LTR

- English → LTR
- Arabic → RTL

The interface automatically adapts its layout and directional behavior according to the selected language.

---

## 🌓 Theme Support

The platform supports:

- ☀️ Light Mode
- 🌙 Dark Mode

The UI uses a centralized design system and semantic color tokens to maintain visual consistency across both themes.

---

## 🎨 Design System

The platform follows a professional educational visual identity focused on:

- Trust
- Education
- Simplicity
- Professionalism
- Accessibility
- Modern SaaS UX

The design system includes centralized:

- Colors
- Typography
- Spacing
- Components
- Shadows
- Borders
- Theme tokens
- Responsive behavior

The UI avoids excessive gradients, random colors, and inconsistent component styling.

---

## 🛠️ Tech Stack

### Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**

### Backend & Database

- **Firebase Authentication**
- **Cloud Firestore**
- **Firebase Security Rules**
- **Firebase Admin SDK** where server-side privileged operations are required

### Media

- **Cloudinary**

Used for media and educational assets such as:

- Course thumbnails
- Teacher avatars
- Images
- Videos
- Educational files

### Deployment

- **Vercel**

---

## 🏗️ Architecture

The application follows a modular architecture designed around maintainability and future extensibility.

```text
                         ┌──────────────────┐
                         │     Students     │
                         └────────┬─────────┘
                                  │
                                  │
                         ┌────────▼─────────┐
                         │   Next.js App    │
                         │                  │
                         │  Teacher Portal  │
                         │  Student Portal  │
                         │  Public Pages    │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
             ┌──────▼──────┐ ┌────▼─────┐ ┌────▼──────┐
             │   Firebase  │ │Cloudinary│ │  Vercel   │
             │             │ │          │ │           │
             │ Auth        │ │ Images   │ │ Deployment│
             │ Firestore   │ │ Videos   │ │           │
             │ Security    │ │ Files    │ │           │
             └─────────────┘ └──────────┘ └───────────┘
```

---

## 🔐 Security

Security is a core part of the architecture.

The platform uses:

- Firebase Authentication
- Firebase Security Rules
- Role-based authorization
- Tenant isolation
- Server-side validation
- Protected routes
- Environment variables for secrets
- Secure Cloudinary configuration

The client is never trusted for security-critical operations.

Tenant isolation is enforced at the data/security layer.

---

## 📁 Project Documentation

Complete project documentation is maintained inside:

```text
docs/
```

The documentation covers:

```text
docs/
├── architecture/
├── authentication/
├── authorization/
├── database/
├── firebase/
├── cloudinary/
├── internationalization/
├── design-system/
├── features/
├── security/
├── deployment/
├── development/
├── decisions/
└── tasks/
```

The documentation includes:

- System architecture
- Firestore data model
- Authentication flow
- Authorization strategy
- Multi-tenant architecture
- Firebase configuration
- Cloudinary integration
- Internationalization
- RTL/LTR behavior
- Light/Dark theme
- Design system
- Security strategy
- Development guidelines
- Implementation tasks
- Architecture decisions

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm / pnpm / yarn
- Git
- A Firebase project
- A Cloudinary account

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

---

### 2. Install Dependencies

```bash
npm install
```

or:

```bash
pnpm install
```

---

### 3. Configure Environment Variables

Create a local environment file:

```bash
.env.local
```

Use the provided example:

```bash
cp .env.example .env.local
```

Configure the required Firebase and Cloudinary variables.

Never commit real credentials to the repository.

---

### 4. Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🌐 Environment Variables

The project uses environment variables for configuration and secrets.

Example:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Never expose server-side secrets to the browser.

---

## 🧪 Development

Before submitting changes, make sure to:

- Run TypeScript checks.
- Run linting.
- Run tests where available.
- Verify authentication.
- Verify authorization.
- Verify tenant isolation.
- Test English and Arabic.
- Test RTL and LTR.
- Test Light and Dark Mode.
- Test responsive layouts.

---

## 📋 MVP Roadmap

### Phase 1 — Foundation

- [x] Project setup
- [ ] Base architecture
- [ ] Design system
- [ ] Theme system
- [ ] Internationalization

### Phase 2 — Authentication

- [ ] Teacher authentication
- [ ] Student authentication
- [ ] Password reset
- [ ] Protected routes
- [ ] Role management

### Phase 3 — Teacher Platform

- [ ] Teacher dashboard
- [ ] Course management
- [ ] Lesson management
- [ ] Student management
- [ ] File management

### Phase 4 — Learning System

- [ ] Course enrollment
- [ ] Student progress
- [ ] Quiz system
- [ ] Exam results

### Phase 5 — Public Platform

- [ ] Public teacher profiles
- [ ] Public course pages
- [ ] Course discovery

### Phase 6 — Security & Production

- [ ] Firebase Security Rules
- [ ] Tenant isolation verification
- [ ] Validation
- [ ] Error handling
- [ ] Testing
- [ ] Production deployment

---

## 🔮 Future Features

The architecture is designed to support future functionality such as:

- 💳 Online course payments
- 📦 Teacher subscriptions
- 🌐 Custom domains
- 🎨 Teacher branding
- 📊 Advanced analytics
- 🏆 Certificates
- 📅 Attendance management
- 🔔 Notifications
- 📧 Email communication
- 🎥 Live classes
- 🤖 AI-powered educational tools
- 📈 Marketing tools
- 🔗 Referral system

These features are intentionally outside the initial MVP scope.

---

## 🧩 Development Principles

The project follows several core engineering principles:

### Clean Code

Code should be:

- Readable
- Maintainable
- Modular
- Type-safe
- Reusable

### Separation of Concerns

Business logic, UI, data access, validation, and infrastructure should remain properly separated.

### Extensibility

New features should be added without unnecessarily modifying unrelated parts of the system.

### Reusability

Existing components, services, utilities, and types should be reused whenever appropriate.

### Security First

Security-sensitive operations must never depend solely on client-side checks.

### Documentation First

Architecture and important implementation decisions must be documented inside `/docs`.

---

## 🤖 AI Agent Development Rules

AI agents working on this repository must:

1. Read the relevant documentation before making changes.
2. Understand the existing architecture.
3. Search for existing implementations before creating new ones.
4. Avoid duplicate functionality.
5. Follow the project's coding conventions.
6. Maintain tenant isolation.
7. Respect the internationalization system.
8. Support both RTL and LTR.
9. Support both Light and Dark Mode.
10. Update documentation after architectural changes.
11. Update the relevant task after completing work.
12. Never introduce unnecessary complexity.

---

## 📜 License

This project is currently under development.

License information will be added when the project reaches its public release stage.

---

## 🚧 Project Status

**Status: MVP Development**

The project is currently under active development.

The architecture and documentation are being established before implementing the complete MVP to ensure the platform remains scalable, secure, and maintainable as the number of teachers grows.

---

## 🎯 Vision

The long-term goal is to provide teachers with a complete digital infrastructure for running their educational business online.

From managing:

**Students → Courses → Lessons → Exams → Progress → Revenue**

all from one unified educational platform.
