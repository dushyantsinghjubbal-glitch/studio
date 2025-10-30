'use client';

import { Suspense } from 'react';
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
import { initiateEmailSignIn, initiateEmailSignUp, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

const signUpSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


type LoginFormValues = z.infer<typeof loginSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;


function LoginContent() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await initiateEmailSignIn(auth, data.email, data.password);
      toast({
        title: 'Login Successful',
        description: "You're being redirected to the dashboard.",
      });
      router.push('/');
    } catch (error) {
       handleAuthError(error, 'Login Failed');
    }
  };

  const onSignUpSubmit = async (data: SignUpFormValues) => {
      try {
          await initiateEmailSignUp(auth, data.email, data.password);
          toast({
              title: 'Signup Successful',
              description: "You're being redirected to the dashboard.",
          });
          router.push('/');
      } catch (error) {
          handleAuthError(error, 'Signup Failed');
      }
  };
  
  const handleAuthError = (error: any, title: string) => {
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
              case 'auth/email-already-in-use':
                  description = 'An account with this email already exists.';
                  break;
              case 'auth/weak-password':
                  description = 'The password is too weak. Please use at least 6 characters.';
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
          title: title,
          description,
      });
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
            <Card>
                <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                    Enter your email below to login to your account
                </CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="grid gap-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email-login"
                        type="email"
                        placeholder="m@example.com"
                        {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                        <p className="text-xs text-red-500">
                        {loginForm.formState.errors.email.message}
                        </p>
                    )}
                    </div>
                    <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <Input id="password-login" type="password" {...loginForm.register('password')} />
                    {loginForm.formState.errors.password && (
                        <p className="text-xs text-red-500">
                        {loginForm.formState.errors.password.message}
                        </p>
                    )}
                    </div>
                    <Button type="submit" className="w-full">
                    Login
                    </Button>
                </form>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="signup">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Sign Up</CardTitle>
                    <CardDescription>
                        Enter your information to create an account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="grid gap-4">
                        <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email-signup"
                            type="email"
                            placeholder="m@example.com"
                            {...signUpForm.register('email')}
                        />
                        {signUpForm.formState.errors.email && (
                            <p className="text-xs text-red-500">
                            {signUpForm.formState.errors.email.message}
                            </p>
                        )}
                        </div>
                        <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password-signup" type="password" {...signUpForm.register('password')} />
                        {signUpForm.formState.errors.password && (
                            <p className="text-xs text-red-500">
                            {signUpForm.formState.errors.password.message}
                            </p>
                        )}
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" {...signUpForm.register('confirmPassword')} />
                            {signUpForm.formState.errors.confirmPassword && (
                                <p className="text-xs text-red-500">
                                {signUpForm.formState.errors.confirmPassword.message}
                                </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full">
                        Create an account
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}

    