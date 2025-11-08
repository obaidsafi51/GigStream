# GigStream Frontend-v1 (Next.js)# Welcome to your Lovable project

**AI-powered real-time USDC payment streaming platform for gig workers**## Project info

Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4**URL**: https://lovable.dev/projects/2386d529-39ab-48b7-94cf-cdb433382be4

---## How can I edit this code?

## 🚀 Quick StartThere are several ways of editing your application.

```bash**Use Lovable**

# 1. Automated setup (recommended)

./integrate.shSimply visit the [Lovable Project](https://lovable.dev/projects/2386d529-39ab-48b7-94cf-cdb433382be4) and start prompting.



# 2. Start development serverChanges made via Lovable will be committed automatically to this repo.

npm run dev

**Use your preferred IDE**

# 3. Open browser

http://localhost:3000If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

```

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

**That's it!** 🎉

Follow these steps:

---

```sh

## 📁 Project Structure# Step 1: Clone the repository using the project's Git URL.

git clone <YOUR_GIT_URL>

```

frontend-v1/# Step 2: Navigate to the project directory.

├── app/ # Next.js App Routercd <YOUR_PROJECT_NAME>

│ ├── layout.tsx # Root layout

│ ├── page.tsx # Home page# Step 3: Install the necessary dependencies.

│ ├── (auth)/ # Public auth pagesnpm i

│ │ ├── login/

│ │ └── register/# Step 4: Start the development server with auto-reloading and an instant preview.

│ └── (worker)/ # Protected worker routesnpm run dev

│ ├── dashboard/```

│ ├── tasks/

│ ├── history/**Edit a file directly in GitHub**

│ ├── advance/

│ └── reputation/- Navigate to the desired file(s).

├── src/- Click the "Edit" button (pencil icon) at the top right of the file view.

│ ├── components/ # React components- Make your changes and commit the changes.

│ │ ├── ui/ # shadcn/ui components

│ │ ├── dashboard/ # Dashboard widgets**Use GitHub Codespaces**

│ │ └── ...

│ ├── lib/ # Utilities- Navigate to the main page of your repository.

│ │ ├── api-client.ts # Backend API- Click on the "Code" button (green button) near the top right.

│ │ └── utils.ts # Helpers- Select the "Codespaces" tab.

│ ├── stores/ # Zustand state- Click on "New codespace" to launch a new Codespace environment.

│ │ └── auth-store.ts # Authentication- Edit files directly within the Codespace and commit and push your changes once you're done.

│ ├── hooks/ # Custom React hooks

│ └── pages/ # Page components## What technologies are used for this project?

├── middleware.ts # Route protection

└── public/ # Static assetsThis project is built with:

````

- Vite

---- TypeScript

- React

## 🎨 Features- shadcn-ui

- Tailwind CSS

### ✅ Implemented

- **Authentication**: Login, Register, Token Refresh## How can I deploy this project?

- **Route Protection**: Middleware-based auth guards

- **Worker Dashboard**: Earnings, Reputation, TransactionsSimply open [Lovable](https://lovable.dev/projects/2386d529-39ab-48b7-94cf-cdb433382be4) and click on Share -> Publish.

- **Modern UI**: Gradient designs, smooth animations

- **Real-time Updates**: Polling-based (WebSocket-ready)## Can I connect a custom domain to my Lovable project?

- **Responsive**: Mobile-first design

Yes, you can!

### 🚧 In Progress (see INTEGRATION_CHECKLIST.md)

- Copy additional worker componentsTo connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

- Add validation schemas

- Complete E2E testingRead more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui (Radix UI) |
| **State** | Zustand 5 |
| **Forms** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Testing** | Jest + React Testing Library |

---

## 📝 Available Scripts

```bash
npm run dev         # Start dev server (localhost:3000)
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run type-check  # TypeScript validation
npm run test        # Run Jest tests
````

---

## 🔐 Authentication Flow

```
1. User visits /login
2. Enters credentials
3. apiClient.login() → Backend API
4. Response: { user, token }
5. useAuthStore.login(user, token)
6. Saved to localStorage + httpOnly cookie
7. Redirect to /dashboard
8. middleware.ts validates token
9. Dashboard renders
10. Auto-refresh every 23 hours
```

---

## 🗂️ Environment Variables

Create `.env.local`:

```env
# Required
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787

# Optional (future)
NEXT_PUBLIC_CIRCLE_API_URL=https://api.circle.com
NEXT_PUBLIC_ARC_EXPLORER=https://explorer.testnet.arc.network
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Type check
npm run type-check
```

---

## 📚 Documentation

- **[INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md)** - Step-by-step integration guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Complete migration documentation
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - Technical summary
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Command cheat sheet

---

## 🔗 Routes

| Route         | Description          | Protected |
| ------------- | -------------------- | --------- |
| `/`           | Home page            | ❌        |
| `/login`      | Login form           | ❌        |
| `/register`   | Registration         | ❌        |
| `/dashboard`  | Worker dashboard     | ✅        |
| `/tasks`      | Active tasks         | ✅        |
| `/history`    | Transaction history  | ✅        |
| `/advance`    | Cash advance request | ✅        |
| `/reputation` | Profile & reputation | ✅        |

---

## 🎯 Migration Status

**Current**: 80% Complete ✅

- [x] Core Next.js migration
- [x] Routing with App Router
- [x] Authentication system
- [x] Component updates
- [x] API client
- [ ] Copy missing components (20%)
- [ ] Final E2E testing

See [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) for remaining tasks.

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Docker

```bash
docker build -t gigstream-frontend .
docker run -p 3000:3000 gigstream-frontend
```

### Static Export

```javascript
// next.config.ts
export default {
  output: "export",
};
```

---

## 🐛 Troubleshooting

| Issue             | Solution                 |
| ----------------- | ------------------------ |
| Can't find 'next' | Run `npm install`        |
| No styles         | Check `app/globals.css`  |
| Auth not working  | Clear localStorage       |
| Build fails       | Run `npm run type-check` |
| TypeScript errors | Run `npm install` first  |

See [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md#-troubleshooting-guide) for detailed solutions.

---

## 🤝 Contributing

This is a hackathon project. For the main GigStream project:

1. Check [project/tasks.md](../project/tasks.md) for task status
2. Follow [project/design.md](../project/design.md) architecture
3. Read [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

## 📄 License

Part of GigStream - Arc Hackathon Project  
© 2025 GigStream Team

---

## 🙏 Acknowledgments

- **Circle**: Developer-Controlled Wallets SDK
- **Arc**: Blockchain testnet infrastructure
- **shadcn/ui**: Component library
- **Vercel**: Next.js framework

---

## 📞 Support

**Documentation**: See `/docs` in project root  
**Issues**: Check [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md)  
**Questions**: Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

**Status**: ✅ Ready for Integration (80% complete)  
**Next.js**: 16.0.0 | **React**: 19.2.0 | **TypeScript**: 5.x  
**Last Updated**: November 8, 2025
