'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarItem, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Users, Building, LogOut, Wallet, BotMessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDataProvider } from '@/context/AppDataContext';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';

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
        if (auth) {
            await signOut(auth);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
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
        <title>Expro - Finance Manager</title>
        <meta name="description" content="A simple app to manage rental properties and finances." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <FirebaseClientProvider>
          <AppDataProvider>
              <SidebarProvider>
                  <Sidebar>
                      <SidebarHeader>
                          <div className="flex items-center gap-2 p-2">
                              <BotMessageSquare className="h-8 w-8 text-primary" />
                              <span className="text-2xl font-bold tracking-tight">Expro</span>
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
                                  <SidebarMenuButton asChild tooltip="Ledger">
                                      <Link href="/ledger">
                                          <Wallet />
                                          <span>Ledger</span>
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
                      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
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
