"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Fetch tasks from backend
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getDemoTasks() as any;
        
        if (response.success) {
          // Filter tasks for current user and not completed
          const myTasks = (response.data.tasks || []).filter(
            (t: any) => t.workerId === user.id && t.status !== 'completed'
          );
          setTasks(myTasks);
        } else {
          setError('Failed to load tasks');
          setTasks([]);
        }
      } catch (err: any) {
        console.error('Tasks fetch error:', err);
        setError(err.message || 'Failed to load tasks');
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Polling: Refresh every 15 seconds
    const interval = setInterval(fetchTasks, 15000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Handle task completion
  const handleCompleteTask = async (taskId: string, amount: number, taskType: 'fixed' | 'streaming') => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setCompletingTaskId(taskId);

      const response = await apiClient.completeTaskDemo(
        user.id,
        amount,
        taskType,
        'Task completed via dashboard'
      ) as any;

      if (response.success) {
        toast({
          title: "Task Completed!",
          description: `Payment of $${amount.toFixed(2)} processed successfully`,
        });

        // Remove completed task from list
        setTasks(tasks.filter(t => t.id !== taskId));
      } else {
        throw new Error('Failed to complete task');
      }
    } catch (err: any) {
      console.error('Task completion error:', err);
      toast({
        title: "Error",
        description: err.message || 'Failed to complete task',
        variant: "destructive",
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
    };
    return variants[status] || 'secondary';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Active Tasks</h1>
        <p className="text-muted-foreground">
          {tasks.length > 0 
            ? `You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} available`
            : 'No active tasks at the moment'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {tasks.length === 0 && !error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-2">No tasks available</p>
            <p className="text-sm text-muted-foreground">
              New tasks will appear here when they're assigned to you
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
          <Card key={task.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${task.amount.toFixed(2)}</div>
                  <Badge variant={getStatusBadge(task.status)} className="mt-1">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {task.type === 'streaming' ? 'Streaming Payment' : 'Fixed Payment'}
                    </span>
                  </div>
                  {task.streamInfo && (
                    <div className="flex items-center gap-2 text-accent font-medium">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {formatTime(task.streamInfo.elapsed)} elapsed • ${task.streamInfo.released.toFixed(2)} released
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {task.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="gradient"
                      onClick={() => handleCompleteTask(
                        task.id,
                        parseFloat(task.paymentAmountUsdc || '0'),
                        task.type || 'fixed'
                      )}
                      disabled={completingTaskId !== null}
                    >
                      {completingTaskId === task.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Accept & Complete'
                      )}
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      variant="success"
                      onClick={() => handleCompleteTask(
                        task.id,
                        parseFloat(task.paymentAmountUsdc || '0'),
                        task.type || 'fixed'
                      )}
                      disabled={completingTaskId !== null}
                    >
                      {completingTaskId === task.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </>
  );
}
