"use client";

import { DeviceManagement } from '@/components/DeviceManagement';
import { TeamManagement } from '@/components/TeamManagement';
import { SupportTickets } from '@/components/SupportTickets';
import { CustomBranding } from '@/components/CustomBranding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Laptop, Users, MessageSquare, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Devices
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

        <TabsContent value="devices">
          <DeviceManagement />
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