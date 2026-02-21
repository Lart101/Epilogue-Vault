# Epilogue Vault

![Epilogue Vault Banner](https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=2730&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)

Epilogue Vault is a premium digital sanctuary for bibliophiles. It provides a prestigious, private environment for archiving, managing, and reading your personal collection of EPUB and PDF volumes. Designed with a "Library Archive" aesthetic, it prioritizes tranquility, focus, and the heritage of the written word.

## ✨ Features

### 📖 Immersive Reader
- **Customizable Experience**: Choose from multiple themes (Light, Dark, Paper, Midnight), fonts, and layout options.
- **Advanced Navigation**: Scrolled vs. Paginated modes, robust keyboard shortcuts, and interactive Table of Contents.
- **Focus Mode**: A "Dynamic Island" style header and footer that vanish to let you focus on the text.
- **Progress Tracking**: Automatic progress saving and accurate chapter completion estimates.

### 📚 Smart Library
- **Drag & Drop Upload**: Instantly add EPUB and PDF files to your library.
- **Metadata Extraction**: Automatically extracts book covers, titles, and authors from files.
- **Collections**: Organize your library with custom collections and tags.
- **Cloud Sync**: powered by Supabase to keep your library accessible from any device.

### 🔍 Discovery Engine
- **Integrated Catalog**: Browse thousands of free public domain books via the Gutendex API.
- **Visual Search**: Real-time search with instant cover previews.
- **Project Gutenberg**: Direct, reliable downloads for classic literature.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **Reader Engine**: [epub.js](https://github.com/futurepress/epub.js)

## 🚀 Getting Started

Follow these steps to set up Epilogue Vault locally on your machine.

### Prerequisites

- **Node.js** 18+
- **npm** or **pnpm**
- A **Supabase** project (for Auth, Database, and Storage)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/epilogue-vault.git
    cd epilogue-vault
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your Supabase credentials:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

Epilogue Vault uses Supabase specifically configured with the following tables:
- `books`: Stores metadata for user-uploaded books.
- `store_books`: Caches metadata for discovered books.
- `collections`: User-created book collections.
- `profiles`: User profile data.

*Storage Buckets:*
- `books`: Stores the actual EPUB/PDF files.
- `covers`: Stores extracted cover images.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ by [Your Name]*
