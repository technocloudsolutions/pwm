"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DeviceManagement,
  TeamManagement,
  SupportTickets,
  CustomBranding,
  PasswordSharing
} from "@/components";
import { Laptop, Users, MessageSquare, Palette, Lock } from "lucide-react";
import { getUserSubscription } from "@/lib/subscription";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<string>("free");
  const [activeTab, setActiveTab] = useState("devices");
  const { toast } = useToast();

  useEffect(() => {
    const loadSubscription = async () => {
      if (user) {
        try {
          const sub = await getUserSubscription(user);
          console.log('Current subscription:', sub);
          setSubscription(sub);
        } catch (error: any) {
          console.error('Subscription error:', error);
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

  // Debug logging
  useEffect(() => {
    console.log('Current subscription state:', subscription);
  }, [subscription]);

  if (!user) {
    return (
      <Card className="p-6">
        <p>Please sign in to access settings.</p>
      </Card>
    );
  }

  const tabs = [
    {
      id: "devices",
      label: "Devices",
      icon: Laptop,
      show: true
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      show: subscription === "business"
    },
    {
      id: "support",
      label: "Support",
      icon: MessageSquare,
      show: true
    },
    {
      id: "sharing",
      label: "Password Sharing",
      icon: Lock,
      show: true
    },
    {
      id: "branding",
      label: "Branding",
      icon: Palette,
      show: subscription === "business"
    }
  ];

  // Debug logging
  console.log('Visible tabs:', tabs.filter(tab => tab.show).map(tab => tab.id));
  console.log('Active tab:', activeTab);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="flex space-x-1 bg-zinc-900 p-1 rounded-lg mb-4">
        {tabs
          .filter(tab => tab.show)
          .map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
        })}
      </div>

      <Card className="p-6">
        {activeTab === "devices" && <DeviceManagement />}
        {activeTab === "sharing" && (
          (subscription === "premium" || subscription === "business") ? (
            <PasswordSharing />
          ) : (
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
              <p className="text-muted-foreground mb-4">
                Upgrade to Premium or Business plan to share passwords with other users.
              </p>
              <Button onClick={() => setActiveTab("subscription")}>Upgrade Now</Button>
            </div>
          )
        )}
        {activeTab === "teams" && subscription === "business" && <TeamManagement />}
        {activeTab === "support" && <SupportTickets />}
        {activeTab === "branding" && subscription === "business" && <CustomBranding />}
      </Card>
    </div>
  );
} 