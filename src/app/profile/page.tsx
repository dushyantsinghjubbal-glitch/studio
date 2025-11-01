'use client';

import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppDataContext, UserProfile } from '@/context/AppDataContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const profileSchema = z.object({
  businessName: z.string().optional(),
  ownerName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  upiId: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { userProfile, updateUserProfile, loading } = useContext(AppDataContext);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      upiId: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        businessName: userProfile.businessName || '',
        ownerName: userProfile.ownerName || '',
        businessAddress: userProfile.businessAddress || '',
        businessPhone: userProfile.businessPhone || '',
        businessEmail: userProfile.businessEmail || '',
        upiId: userProfile.upiId || '',
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateUserProfile(data);
      toast({
        title: 'Profile Updated',
        description: 'Your business information has been saved.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your profile. Please try again.',
      });
    }
  };

  if (loading && !userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
      <div className="mx-auto grid w-full max-w-4xl gap-2">
        <h1 className="text-3xl font-semibold">Profile Settings</h1>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
            <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                This information will be displayed on your rental receipts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                        id="businessName"
                        placeholder="e.g., Acme Properties"
                        {...form.register('businessName')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ownerName">Owner Name</Label>
                        <Input
                        id="ownerName"
                        placeholder="e.g., John Doe"
                        {...form.register('ownerName')}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                    id="businessAddress"
                    placeholder="123 Main Street, Anytown, USA 12345"
                    {...form.register('businessAddress')}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="businessPhone">Business Phone</Label>
                        <Input
                        id="businessPhone"
                        placeholder="+91 123-456-7890"
                        {...form.register('businessPhone')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="businessEmail">Business Email</Label>
                        <Input
                        id="businessEmail"
                        type="email"
                        placeholder="contact@acmeproperties.com"
                        {...form.register('businessEmail')}
                        />
                         {form.formState.errors.businessEmail && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.businessEmail.message}
                            </p>
                        )}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID (for payments)</Label>
                    <Input
                    id="upiId"
                    placeholder="your-business@bank"
                    {...form.register('upiId')}
                    />
                </div>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
            </Card>
        </form>
      </div>
    </main>
  );
}
