'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { initiateEmailSignIn, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // We are not awaiting here to adhere to non-blocking auth
      await initiateEmailSignIn(auth, data.email, data.password);
      toast({
        title: 'Login Successful',
        description: "You're being redirected to the dashboard.",
      });
      router.push('/');
    } catch (error) {
       let description = 'An unexpected error occurred. Please try again.';
        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    description = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    description = 'Please enter a valid email address.';
                    break;
                default:
                    description = error.message;
                    break;
            }
        } else if (error instanceof Error) {
            description = error.message;
        }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
