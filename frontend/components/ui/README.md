# GigStream UI Component Library

A comprehensive, accessible UI component library built with TypeScript, Tailwind CSS, and React.

## 🎨 Components

All components follow Shadcn design patterns and are fully typed with TypeScript. They meet WCAG 2.1 AA accessibility standards.

### Button

Versatile button component with multiple variants and states.

**Variants:**
- `default` - Primary blue button
- `secondary` - Secondary gray button
- `outline` - Outlined button
- `destructive` - Red destructive button
- `ghost` - Transparent hover button
- `link` - Link-style button

**Sizes:** `sm`, `default`, `lg`, `icon`

**Features:**
- Loading state with spinner
- Disabled state
- Full keyboard navigation
- ARIA attributes

```tsx
import { Button } from "@/components/ui";

<Button>Click me</Button>
<Button variant="outline" size="sm">Small</Button>
<Button loading>Loading...</Button>
```

### Card

Flexible container component with sections.

**Subcomponents:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Input

Form input with labels, validation, and helper text.

**Features:**
- Label support
- Error states
- Helper text
- Automatic ID generation
- ARIA attributes

```tsx
import { Input } from "@/components/ui";

<Input 
  label="Email" 
  type="email" 
  placeholder="Enter email"
/>
<Input 
  label="Password" 
  error 
  helperText="Password is required"
/>
```

### Select

Dropdown select component with labels and validation.

**Features:**
- Label support
- Error states
- Helper text
- Full accessibility

```tsx
import { Select } from "@/components/ui";

<Select label="Choose option">
  <option value="">Select...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
```

### Dialog (Modal)

Accessible modal dialog with backdrop.

**Features:**
- Keyboard navigation (ESC to close)
- Click outside to close
- Focus trap
- Body scroll lock
- Smooth animations

```tsx
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui";

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm</DialogTitle>
      <DialogDescription>
        Are you sure?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Badge

Status indicators and labels.

**Variants:**
- `default` - Blue badge
- `secondary` - Gray badge
- `success` - Green badge
- `warning` - Yellow badge
- `destructive` - Red badge
- `outline` - Outlined badge

```tsx
import { Badge } from "@/components/ui";

<Badge>Active</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="destructive">Failed</Badge>
```

### Spinner

Loading spinner in multiple sizes.

**Sizes:** `sm`, `md`, `lg`, `xl`

**Features:**
- Screen reader support
- Customizable colors

```tsx
import { Spinner } from "@/components/ui";

<Spinner />
<Spinner size="lg" />
```

### Toast

Toast notification system powered by Sonner.

**Features:**
- Success, error, info, warning types
- Auto-dismiss
- Action buttons
- Rich content support
- Stack management

```tsx
import { toast } from "@/components/ui";

toast.success("Success!", {
  description: "Your action completed successfully"
});

toast.error("Error!", {
  description: "Something went wrong"
});
```

## 🎯 Usage

### Import Components

```tsx
// Individual imports
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Or import from index
import { Button, Card, Input, toast } from "@/components/ui";
```

### Add Toaster to Layout

The `Toaster` component must be added to your root layout:

```tsx
// app/layout.tsx
import { Toaster } from "@/components/ui/toast";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

## 🛠️ Dependencies

- `class-variance-authority` - Variant management
- `clsx` - Class name utilities
- `tailwind-merge` - Tailwind class merging
- `sonner` - Toast notifications

## ♿ Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA attributes
- ✅ Focus management
- ✅ Color contrast
- ✅ Semantic HTML

## 🎨 Customization

Components use Tailwind CSS and can be customized via:

1. **Props** - Most components accept className prop
2. **Variants** - Use built-in variants
3. **Tailwind** - Override with Tailwind classes
4. **CVA** - Modify variant definitions in source

## 📝 TypeScript

All components are fully typed:

```tsx
import type { ButtonProps, InputProps } from "@/components/ui";

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

## 🧪 Demo

Visit the home page to see all components in action with interactive examples.

## 📦 Component Files

```
components/ui/
├── button.tsx       # Button component
├── card.tsx         # Card components
├── input.tsx        # Input component
├── select.tsx       # Select component
├── dialog.tsx       # Dialog/Modal component
├── badge.tsx        # Badge component
├── spinner.tsx      # Loading spinner
├── toast.tsx        # Toast wrapper
└── index.ts         # Barrel exports
```

## 🔄 Next Steps

These components will be used throughout the GigStream application:

- Authentication pages (Task 6.3)
- Worker dashboard (Task 7.1)
- Platform admin (Task 9.1)
- Demo simulator (Task 10.1)
