import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Key, User, Settings, CreditCard } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/dashboard",
      label: "Passwords",
      icon: Key,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/personal-info",
      label: "Personal Info",
      icon: User,
      active: pathname === "/dashboard/personal-info",
    },
    {
      href: "/dashboard/subscription",
      label: "Subscription",
      icon: CreditCard,
      active: pathname === "/dashboard/subscription",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
    },
  ];

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => {
        const Icon = route.icon;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              route.active
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4 mr-2" />
            {route.label}
          </Link>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto flex items-center"
        onClick={() => signOut(auth)}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </nav>
  );
} 