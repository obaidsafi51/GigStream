"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  Spinner,
  toast,
} from "@/components/ui";

export default function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            GigStream UI Components
          </h1>
          <p className="text-gray-600">
            Component library built with accessibility and TypeScript in mind
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Various button variants with loading states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button loading>Loading</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>Form inputs with labels and validation states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <Input label="Email" type="email" placeholder="Enter your email" />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
              />
              <Input
                label="Error State"
                error
                helperText="This field is required"
                placeholder="Invalid input"
              />
              <Input
                label="With Helper Text"
                helperText="This is a helpful message"
                placeholder="Type something..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Select */}
        <Card>
          <CardHeader>
            <CardTitle>Select Dropdown</CardTitle>
            <CardDescription>Dropdown select component</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <Select label="Choose an option">
                <option value="">Select...</option>
                <option value="worker">Worker</option>
                <option value="platform">Platform</option>
                <option value="admin">Admin</option>
              </Select>
              <Select label="With Error" error helperText="Please select a value">
                <option value="">Select...</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Spinner */}
        <Card>
          <CardHeader>
            <CardTitle>Loading Spinner</CardTitle>
            <CardDescription>Loading indicators in different sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog/Modal</CardTitle>
            <CardDescription>Accessible modal dialogs</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to proceed with this action? This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Toast */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>Toast messages powered by Sonner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => toast.success("Success!", {
                description: "Your action was completed successfully"
              })}>
                Success Toast
              </Button>
              <Button onClick={() => toast.error("Error!", {
                description: "Something went wrong"
              })}>
                Error Toast
              </Button>
              <Button onClick={() => toast.info("Info", {
                description: "Here's some information"
              })}>
                Info Toast
              </Button>
              <Button onClick={() => toast.warning("Warning", {
                description: "Please be careful"
              })}>
                Warning Toast
              </Button>
              <Button onClick={handleLoadingDemo} loading={loading}>
                {loading ? "Loading..." : "Loading Demo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Card Component</CardTitle>
            <CardDescription>
              Flexible card container with header, content, and footer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              This is the card content area. You can put any content here.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
