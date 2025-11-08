"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Platform name must be at least 3 characters.' }),
  webhookUrl: z.string().url({ message: 'Please enter a valid URL.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function PlatformRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await apiClient.registerPlatform(data.name, data.webhookUrl) as any;

      if (response.success && response.data.platform) {
        // Store platform data in localStorage to pass it to the console page
        localStorage.setItem('platformData', JSON.stringify(response.data.platform));
        
        toast({
          title: 'Registration Successful!',
          description: `Welcome, ${response.data.platform.name}.`,
        });
        router.push('/platform/console');
      } else {
        throw new Error(response.error || 'Failed to register platform.');
      }
    } catch (err: any) {
      toast({
        title: 'Registration Failed',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building className="mx-auto h-12 w-12 mb-4" />
          <CardTitle className="text-2xl">Register Your Platform</CardTitle>
          <CardDescription>Join GigStream to enable real-time payments for your workers.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Platform Name</Label>
              <Input
                id="name"
                placeholder="e.g., DeliveryHub"
                {...register('name')}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                placeholder="https://your-platform.com/webhooks"
                {...register('webhookUrl')}
                disabled={loading}
              />
              {errors.webhookUrl && <p className="text-sm text-red-500">{errors.webhookUrl.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
