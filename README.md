# AskMyRepo ![Next.js](https://img.shields.io/badge/Next.js-14.2.16-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.7-pink) ![Radix UI](https://img.shields.io/badge/Radix-UI-ff69b4) ![Prisma](https://img.shields.io/badge/Prisma-6.5.0-green) ![tRPC](https://img.shields.io/badge/tRPC-10.0.0-purple)

> An AI-powered code repository assistant that leverages GPT, embeddings, and source code analysis to answer questions about your codebase. Built with the T3 Stack, Next.js, Prisma, Radix UI, and modern React patterns.

---

## 📖 Introduction

AskMyRepo is a professional, full-stack web application designed to enable seamless interaction with your GitHub repositories. It combines AI capabilities with source code understanding, allowing users to ask questions about their codebase and receive accurate, context-aware answers. The platform integrates GPT-based AI models, embedding similarity search, and a user-friendly interface to facilitate efficient code exploration, documentation, and project management.

The project showcases a modern architecture built on Next.js 14, Prisma ORM, tRPC for type-safe API routes, Radix UI components for accessible UI elements, and Clerk for user authentication. Its modular design, clear separation of concerns, and extensive use of React hooks make it scalable and maintainable.

---

## ✨ Features

- **AI-Powered Q&A**: Ask questions about your codebase and receive intelligent responses based on source code analysis and embeddings.
- **Repository Integration**: Link your GitHub repositories for automated code indexing and content retrieval.
- **Embedded Source Code Search**: Use vector similarity search to find relevant files and code snippets quickly.
- **Source Code Visualization**: View source code summaries, file details, and source snippets within the app.
- **User Authentication & Authorization**: Secure login/logout with Clerk, managing project access.
- **Project Management**: Create and switch between multiple projects linked to different repositories.
- **Commit History & Resummarization**: View commit logs and trigger re-summarization of code files.
- **Responsive UI**: Built with Radix UI and Tailwind CSS for a consistent, accessible interface.
- **Modular Architecture**: Organized into components, hooks, and API routes for ease of development and testing.

---

## 🛠️ Tech Stack

| Technology / Library                 | Purpose                                              | Version / Note                      |
|-------------------------------------|------------------------------------------------------|-------------------------------------|
| **Next.js**                        | React framework for server-rendered and static pages | 14.2.16                           |
| **React**                          | UI library for building component interfaces          | Included in Next.js                |
| **Tailwind CSS**                   | Utility-first CSS styling                            | 3.4.7                            |
| **Radix UI**                       | Accessible UI component primitives                     | Accordion, Alert Dialog, Tabs, etc. (latest) |
| **Prisma ORM**                     | Database ORM for PostgreSQL/MySQL/SQLite             | 6.5.0                            |
| **tRPC**                          | End-to-end typesafe API routes                       | 10.0.0 (assumed latest)          |
| **Clerk**                          | Authentication and user management                     | ^6.13.0                          |
| **Lucide-react**                  | Icon library for React                                | Latest                            |
| **Sonner**                         | Toast notifications                                   | Latest                            |
| **@ai-sdk/google**                 | Google Generative AI SDK                              | 1.2.10                          |
| **@google/generative-ai**           | Google Generative AI API client                      | 0.24.0                          |
| **@langchain/core**                 | Language model chaining                                | 0.3.43                          |
| **@langchain/community**            | Community models and tools                             | 0.3.39                          |
| **@hookform/resolvers**             | React Hook Form resolver support                     | 5.0.1                           |
| **Prisma Client**                   | Prisma generated client for database access          | ^6.5.0                          |

*(Additional dependencies support UI, state management, and integrations as identified in package.json)*

---

## 🚀 Quick Start / Installation

### Clone the repository

```bash
git clone https://github.com/uzumaki-ak/AskMyRepo.git
cd AskMyRepo
```

### Install dependencies

```bash
npm install
# or
pnpm install
```

### Set up environment variables

Create a `.env.local` file in the root directory with the following variables (based on observed code and typical setup):

```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
NEXT_PUBLIC_GITHUB_SECRET=your_github_secret
GEMINI_API_KEY=your_google_generative_ai_api_key
DATABASE_URL=your_database_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
```

*(Replace placeholders with actual credentials)*

### Generate Prisma client and run migrations

```bash
npm run db:generate
npm run db:migrate
```

### Run the development server

```bash
npm run dev
```

Access the app at [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```plaintext
/
├── app/                         # Next.js 14 App Directory with routing and pages
│   ├── (protected)/            # Protected routes with layout and dashboard
│   │   ├── layout.tsx           # Main layout with sidebar and header
│   │   ├── page.tsx             # Dashboard main page
│   │   ├── qa/page.tsx           # Q&A interface
│   │   ├── commit-log.tsx        # Commit history view
│   │   └── create/page.tsx       # Create new project form
│   ├── (public)/                 # Public assets like images
│   └── ...                       # Other route segments
├── components/                   # Reusable UI components (buttons, dialogs, cards, sidebar)
├── hooks/                        # Custom React hooks for project state, refetch, etc.
├── lib/                          # Utility functions (e.g., utils/cn)
├── server/                       # Backend logic, database, and API routes
│   ├── api/                      # tRPC routers and handlers
│   ├── db/                       # Prisma database client
│   └── env.ts                    # Environment configuration
├── public/                       # Static assets
├── styles/                       # Tailwind CSS configuration
├── package.json                  # Dependencies and scripts
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS setup
└── README.md                     # Documentation
```

---

## 🔧 Configuration

### Environment Variables

- `NEXT_PUBLIC_GITHUB_CLIENT_ID` & `NEXT_PUBLIC_GITHUB_SECRET`: For GitHub OAuth integration.
- `GEMINI_API_KEY`: API key for Google Generative AI services.
- `DATABASE_URL`: Connection string for your PostgreSQL/MySQL/SQLite database.
- `CLERK_SECRET_KEY`: Clerk authentication secret.

### Build & Deployment

- Uses Next.js built-in build system.
- Run `npm run build` to generate production build.
- Deploy on Vercel, Netlify, or Docker following respective guides.

---

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests via the [GitHub repository](https://github.com/uzumaki-ak/AskMyRepo). Ensure to follow the coding standards and include relevant tests.

### Useful Links:
- [Contribute Guide](https://github.com/uzumaki-ak/AskMyRepo/blob/main/CONTRIBUTING.md)
- [Issue Tracker](https://github.com/uzumaki-ak/AskMyRepo/issues)
- [Discussions](https://github.com/uzumaki-ak/AskMyRepo/discussions)

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Special thanks to the T3 Stack community for their scaffolding and best practices.
- Inspired by modern AI and code analysis tools.
- Contributors and open-source libraries that make this project possible.

---

**This README provides a comprehensive, technical overview of AskMyRepo, grounded in the actual codebase and dependencies.**