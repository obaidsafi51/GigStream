"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Clipboard, ClipboardCheck, Send } from 'lucide-react';

const taskSchema = z.object({
  workerId: z.string().min(1, { message: 'Please select a worker.' }),
  title: z.string().min(5, { message: 'Title must be at least 5 characters.' }),
  description: z.string().optional(),
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  taskType: z.enum(['fixed', 'streaming']),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function PlatformConsolePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [platform, setPlatform] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('platformData');
    if (storedData) {
      setPlatform(JSON.parse(storedData));
    } else {
      router.push('/platform/register');
    }

    async function fetchWorkers() {
      try {
        const response = await apiClient.getDemoWorkers() as any;
        if (response.success) {
          setWorkers(response.data.workers);
        }
      } catch (error) {
        console.error("Failed to fetch workers", error);
        toast({
          title: 'Error',
          description: 'Could not load the list of workers.',
          variant: 'destructive',
        });
      }
    }

    fetchWorkers();
  }, [router, toast]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskType: 'fixed',
    },
  });

  const copyToClipboard = () => {
    if (platform?.apiKey) {
      navigator.clipboard.writeText(platform.apiKey);
      setIsCopied(true);
      toast({ title: 'API Key copied to clipboard!' });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const onAssignTask = async (data: TaskFormData) => {
    setLoading(true);
    try {
      const response = await apiClient.assignTask(
        platform.apiKey,
        data.workerId,
        data.title,
        data.description || '',
        data.amount,
        data.taskType
      ) as any;

      if (response.success) {
        toast({
          title: 'Task Assigned!',
          description: `Task "${data.title}" has been assigned successfully.`,
        });
        reset();
      } else {
        throw new Error(response.error || 'Failed to assign task.');
      }
    } catch (err: any) {
      toast({
        title: 'Assignment Failed',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!platform) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome, {platform.name}!</CardTitle>
          <CardDescription>This is your platform console. Here is your API key for integration.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="apiKey">Your API Key</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Key className="h-5 w-5 text-gray-400" />
            <Input id="apiKey" readOnly value={platform.apiKey} className="font-mono" />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              {isCopied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Store this key securely. It will not be shown again after you leave this page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign a Task</CardTitle>
          <CardDescription>Use this form to simulate assigning a task to a worker.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onAssignTask)}>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workerId">Worker</Label>
                <Controller
                  name="workerId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a worker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.displayName} ({worker.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.workerId && <p className="text-sm text-red-500">{errors.workerId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" placeholder="e.g., Deliver a package" {...register('title')} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" placeholder="Additional details about the task" {...register('description')} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (USDC)</Label>
                <Input id="amount" type="number" step="0.01" placeholder="e.g., 25.50" {...register('amount')} />
                {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <select id="taskType" {...register('taskType')} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="fixed">Fixed</option>
                  <option value="streaming">Streaming</option>
                </select>
              </div>
            </div>
          </CardContent>
          <CardContent>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Assign Task
                </>
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
