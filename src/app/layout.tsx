'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarItem, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Users, Building, LogOut, Wallet, BotMessageSquare, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDataProvider } from '@/context/AppDataContext';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePathname, useRouter } from 'next/navigation';

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

function FloatingActionButton() {
  const router = useRouter();
  const pathname = usePathname();

  const getFabContent = () => {
    switch (pathname) {
      case '/properties':
        return (
          <Button className="h-16 w-16 rounded-full shadow-lg" size="icon" onClick={() => router.push('/properties?action=add')}>
            <Building className="mr-0 h-6 w-6" />
             <Plus className="absolute bottom-3 right-3 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
          </Button>
        );
      case '/tenants':
        return (
          <Button className="h-16 w-16 rounded-full shadow-lg" size="icon" onClick={() => router.push('/tenants?action=add')}>
            <Users className="mr-0 h-6 w-6" />
            <Plus className="absolute bottom-3 right-3 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
          </Button>
        );
      default:
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="h-16 w-16 rounded-full shadow-lg" size="icon">
                <Plus className="h-8 w-8" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 mb-2" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" className="justify-start" onClick={() => router.push('/ledger?action=add')}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => router.push('/ledger?action=scan')}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Scan Receipt
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
        {getFabContent()}
    </div>
  );
}

function NavMenu() {
    const { setOpenMobile } = useSidebar();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" onClick={() => setOpenMobile(false)}>
                    <Link href="/">
                        <Home />
                        <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ledger" onClick={() => setOpenMobile(false)}>
                    <Link href="/ledger">
                        <Wallet />
                        <span>Ledger</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Tenants" onClick={() => setOpenMobile(false)}>
                    <Link href="/tenants">
                        <Users />
                        <span>Tenants</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Properties" onClick={() => setOpenMobile(false)}>
                    <Link href="/properties">
                        <Building />
                        <span>Properties</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
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
                          <NavMenu />
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
                      <FloatingActionButton />
                  </SidebarInset>
              </SidebarProvider>
          </AppDataProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
