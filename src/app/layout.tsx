import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarItem, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Users, Building, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDataProvider } from '@/context/AppDataContext';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';

export const metadata: Metadata = {
  title: 'Rent Manager',
  description: 'A simple app to manage rental properties and payments.',
};

function UserMenu() {
    const { user } = useUser();
    const auth = useAuth();

    if (!user || user.isAnonymous) {
        return (
            <Button asChild variant="outline">
                <Link href="/login">Login</Link>
            </Button>
        );
    }
    
    const handleSignOut = async () => {
        await signOut(auth);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} alt={user.displayName || user.email || ''} />
                        <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AppDataProvider>
              <SidebarProvider>
                  <Sidebar>
                      <SidebarHeader>
                          <div className="flex items-center gap-2">
                              <Button asChild variant="ghost" className="w-full justify-start">
                                  <Link href="/">
                                      <Home className="h-5 w-5 text-primary" />
                                      <span className="text-lg font-bold tracking-tight">RentBox</span>
                                  </Link>
                              </Button>
                          </div>
                      </SidebarHeader>
                      <SidebarContent>
                          <SidebarMenu>
                              <SidebarMenuItem>
                                  <SidebarMenuButton asChild tooltip="Dashboard">
                                      <Link href="/">
                                          <Home />
                                          <span>Dashboard</span>
                                      </Link>
                                  </SidebarMenuButton>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <SidebarMenuButton asChild tooltip="Tenants">
                                      <Link href="/tenants">
                                          <Users />
                                          <span>Tenants</span>
                                      </Link>
                                  </SidebarMenuButton>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <SidebarMenuButton asChild tooltip="Properties">
                                      <Link href="/properties">
                                          <Building />
                                          <span>Properties</span>
                                      </Link>
                                  </SidebarMenuButton>
                              </SidebarMenuItem>
                          </SidebarMenu>
                      </SidebarContent>
                       <SidebarFooter>
                            <UserMenu />
                        </SidebarFooter>
                  </Sidebar>
                  <SidebarInset>
                      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                          <SidebarTrigger className="md:hidden"/>
                      </header>
                      {children}
                  </SidebarInset>
              </SidebarProvider>
          </AppDataProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
