# CESSCalculator

**Civil Engineering Structural Slope-Deflection Analysis Calculator**

A comprehensive web application for slope deflection analysis of beams and frames. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Beam Analysis**: Single and multiple span beams with various support and loading conditions
- **Frame Analysis**: Multi-bay, multi-storey rigid frame analysis
- **Dark Mode UI**: Mobile-first design with intuitive card-based interface
- **Project History**: Save, load, rename, and delete projects
- **Export**: PDF export for results and charts
- **User Manual**: Searchable MDX-based documentation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components based on shadcn/ui patterns
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Documentation**: MDX
- **Testing**: Vitest + React Testing Library
- **Package Manager**: pnpm (npm also supported)

## Local Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (or npm >= 9.0.0)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/CESSCalculator.git
cd CESSCalculator

# Install dependencies (using pnpm - recommended)
pnpm install

# OR using npm
npm install
```

### Development

```bash
# Start the development server
pnpm dev

# OR
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# Create production build
pnpm build

# Start production server
pnpm start

# OR
npm run build
npm start
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# OR
npm test
npm run test:ui
```

### Linting & Formatting

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```



### Environment Configuration

No environment variables are required for the MVP. All data is stored in browser localStorage.

## Project Structure

```
CESSCalculator/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Base UI components
│   ├── layout/      # Layout components
│   ├── beam/        # Beam analysis components
│   ├── frame/       # Frame analysis components
│   ├── charts/      # Chart components
│   └── history/     # History components
├── lib/             # Core business logic
│   ├── store/       # Zustand state management
│   ├── storage/     # LocalStorage utilities
│   ├── solver/      # Analysis solver modules
│   ├── validation/  # Zod schemas
│   ├── export/      # PDF export utilities
│   └── utils.ts     # Helper functions
├── content/         # MDX documentation
└── __tests__/       # Test files
```

## Solver Architecture

The application uses a **modular solver interface** that allows you to swap in production-grade analysis engines without touching the UI.

### Current Implementation

The MVP includes **placeholder solvers** with simplified calculations:

- `lib/solver/BeamSolver.ts`: Basic beam statics (reactions, SFD, BMD, deflection)
- `lib/solver/FrameSolver.ts`: Placeholder frame analysis

### Replacing Solvers

To integrate a production slope-deflection solver:

1. Review the interface in `lib/solver/types.ts`
2. Implement the interface with your solver
3. Replace the import in the analysis tabs
4. No UI changes required!

See `lib/solver/README.md` for detailed instructions.

## Key Routes

- `/` - Dashboard
- `/beam/new` - Create new beam project
- `/beam/[id]` - Edit beam project
- `/frame/new` - Create new frame project
- `/frame/[id]` - Edit frame project
- `/history` - View saved projects
- `/manual` - User manual and documentation
- `/settings` - App settings

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

For issues or questions, please open a GitHub issue.
# cess-calculator
