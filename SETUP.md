# Quick Setup Guide

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## What's Included

✅ **Full Next.js 14 app** with App Router
✅ **Dark mode UI** with Tailwind CSS
✅ **Beam & Frame analysis** pages
✅ **Project history** with localStorage persistence
✅ **User manual** with MDX documentation
✅ **Chart visualization** using Recharts
✅ **Placeholder solvers** ready to replace
✅ **Test suite** with Vitest

## First Steps

1. Run `npm install` to install all dependencies
2. Run `npm run dev` to start the development server
3. Visit http://localhost:3000 in your browser
4. Click "Beam Analysis" to create your first project
5. Fill in the input form and switch to "Results" tab

## Project Structure

```
CESSCalculator/
├── app/              # Next.js pages & routes
├── components/       # React components
│   ├── ui/          # Base UI components
│   ├── beam/        # Beam-specific components
│   ├── frame/       # Frame-specific components
│   └── layout/      # Layout components
├── lib/             # Business logic
│   ├── solver/      # Analysis solvers (REPLACE THESE!)
│   ├── store/       # Zustand state management
│   └── utils.ts     # Helper functions
└── __tests__/       # Test files
```

## Replacing the Solver

The placeholder solvers are in `lib/solver/`. To integrate your production solver:

1. Review `lib/solver/types.ts` for the interface
2. Replace implementation in `lib/solver/BeamSolver.ts`
3. Keep the same interface - no UI changes needed!

See `lib/solver/README.md` for detailed instructions.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run type-check` - TypeScript type checking

## Deployment to Vercel

1. Push code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Import your repository
4. Click Deploy (auto-detects Next.js)

Or use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## Need Help?

- Check `README.md` for full documentation
- Review the `/manual` section in the app
- See `lib/solver/README.md` for solver integration guide

## Known Issues / MVP Limitations

- Solvers use placeholder calculations (not real slope-deflection)
- PDF export shows "coming soon" toast
- Limited to basic load types
- No advanced support conditions yet

Replace the solvers with your production code to get full functionality!
