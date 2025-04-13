"use client";

import { PasswordSharing } from "@/components";
import { CustomBranding } from "@/components/CustomBranding";
import { SupportTickets } from "@/components/SupportTickets";
import { TeamManagement } from "@/components/TeamManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { getUserSubscription } from "@/lib/subscription";
import { Lock, MessageSquare, Palette, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<string>("free");

  useEffect(() => {
    const loadSubscription = async () => {
      if (user) {
        try {
          const sub = await getUserSubscription(user);
          setSubscription(sub);
        } catch (error: any) {
          console.error("Subscription error:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to load subscription",
            variant: "destructive",
          });
        }
      }
    };
    loadSubscription();
  }, [user]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="password-sharing" className="space-y-6">
        <TabsList>
          {/* <TabsTrigger value="devices" className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Devices
          </TabsTrigger> */}
          <TabsTrigger
            value="password-sharing"
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Password Sharing
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* <TabsContent value="devices">
          <DeviceManagement />
        </TabsContent> */}

        <TabsContent value="password-sharing">
          {subscription.toLocaleLowerCase() !== "free" ? (
            <PasswordSharing />
          ) : (
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
              <p className="text-muted-foreground mb-4">
                Upgrade to Premium or Business plan to share passwords with
                other users.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="support">
          <SupportTickets />
        </TabsContent>

        <TabsContent value="branding">
          <CustomBranding />
        </TabsContent>
      </Tabs>
    </div>
  );
}
