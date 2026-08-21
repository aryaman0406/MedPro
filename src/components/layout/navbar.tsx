"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Calendar, FileText, LayoutDashboard, LogOut, Menu, Shield, Stethoscope, User, Users, X } from "lucide-react";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutUserAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: Role;
  } | null;
}

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Role-specific Navigation Links
  const getNavLinks = (): NavItem[] => {
    if (!user) {
      return [
        { label: "Features", href: "/#features" },
        { label: "Specialists", href: "/#specialists" },
        { label: "How It Works", href: "/#how-it-works" },
      ];
    }

    switch (user.role) {
      case "PATIENT":
        return [
          { label: "Find a Doctor", href: "/patient/find-doctor", icon: Stethoscope },
          { label: "My Appointments", href: "/patient/appointments", icon: Calendar },
        ];
      case "DOCTOR":
        return [
          { label: "My Schedule", href: "/doctor/schedule", icon: Calendar },
          { label: "Leave", href: "/doctor/leaves", icon: FileText },
        ];
      case "ADMIN":
        return [
          { label: "Doctors", href: "/admin/doctors", icon: Users },
          { label: "Analytics", href: "/admin/analytics", icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive" className="font-mono text-[10px] tracking-wider uppercase">Admin</Badge>;
      case "DOCTOR":
        return <Badge variant="success" className="font-mono text-[10px] tracking-wider uppercase">Doctor</Badge>;
      case "PATIENT":
        return <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase">Patient</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent dark:to-blue-400 font-extrabold">
              MedTrack<span className="text-foreground">Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 flex items-center gap-2 rounded-full px-2 hover:bg-accent">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block max-w-[120px] truncate text-sm font-medium">
                    {user.name || user.email}
                  </span>
                  {getRoleBadge(user.role)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutUserAction} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-2 text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="border-b bg-background px-4 py-4 md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              );
            })}

            {!user && (
              <div className="pt-3 border-t flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-center" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button className="w-full justify-center" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
