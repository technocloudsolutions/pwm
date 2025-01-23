import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.svg"
                alt="BIGTIFY PASS"
                width={48}
                height={48}
                priority
              />
              <span className="text-xl font-bold">BIGTIFY PASS</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="container px-4 py-16">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="BIGTIFY PASS"
              width={180}
              height={180}
              priority
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Secure Password Management
          </h1>
          <p className="max-w-[800px] text-muted-foreground text-lg md:text-xl">
            Store and manage your passwords securely with our modern password manager.
            Features include admin controls, subscription plans, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:space-x-4">
            <Link href="/auth/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
