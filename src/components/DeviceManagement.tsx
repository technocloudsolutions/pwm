import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DeviceInfo, getUserDevices, removeDevice } from '@/lib/device-management';
import { Laptop, Smartphone, Trash2 } from 'lucide-react';

export function DeviceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDevices = await getUserDevices(user);
      setDevices(userDevices);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user || !confirm('Are you sure you want to remove this device?')) return;

    try {
      await removeDevice(user, deviceId);
      toast({
        title: 'Success',
        description: 'Device removed successfully',
      });
      loadDevices();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove device',
        variant: 'destructive',
      });
    }
  };

  const getDeviceIcon = (deviceInfo: DeviceInfo) => {
    const isMobile = deviceInfo.os.toLowerCase().includes('android') || 
                    deviceInfo.os.toLowerCase().includes('ios');
    return isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Connected Devices</h2>
          <Button onClick={loadDevices} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {devices.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No devices connected
          </p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  {getDeviceIcon(device)}
                  <div>
                    <p className="font-medium">
                      {device.deviceName}
                      {device.isCurrentDevice && (
                        <span className="ml-2 text-sm text-primary">(Current Device)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {device.browser} on {device.os}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active: {new Date(device.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!device.isCurrentDevice && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDevice(device.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
} 