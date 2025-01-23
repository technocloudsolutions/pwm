import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserSubscription } from '@/lib/subscription';
import { Palette } from 'lucide-react';

interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string;
  companyName: string;
  customDomain: string;
}

export function CustomBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<string>('free');
  const [settings, setSettings] = useState<BrandingSettings>({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#0070f3',
    logo: '',
    companyName: '',
    customDomain: ''
  });

  useEffect(() => {
    loadBrandingSettings();
  }, [user]);

  const loadBrandingSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's subscription
      const userSubscription = await getUserSubscription(user);
      setSubscription(userSubscription);

      // Get branding settings
      const settingsDoc = await getDoc(doc(db, 'branding_settings', user.uid));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as BrandingSettings);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load branding settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);
      // Convert settings to a plain object
      const settingsData = {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        logo: settings.logo,
        companyName: settings.companyName,
        customDomain: settings.customDomain
      };
      await updateDoc(doc(db, 'branding_settings', user.uid), settingsData);
      toast({
        title: 'Success',
        description: 'Branding settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save branding settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof BrandingSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (subscription !== 'business') {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Custom Branding</h2>
          <p className="text-muted-foreground">
            Custom branding is only available with the Business plan.
            Upgrade your subscription to access this feature.
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/subscription'}
            className="mt-4"
          >
            Upgrade to Business
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Custom Branding</h2>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Logo URL</label>
                <Input
                  value={settings.logo}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="Enter your logo URL"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Custom Domain</label>
                <Input
                  value={settings.customDomain}
                  onChange={(e) => handleChange('customDomain', e.target.value)}
                  placeholder="Enter your custom domain"
                />
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Color Scheme</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-12 h-12 p-1"
                  />
                  <Input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Secondary Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="w-12 h-12 p-1"
                  />
                  <Input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Accent Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="w-12 h-12 p-1"
                  />
                  <Input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    placeholder="#0070f3"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div
            className="p-6 rounded-lg"
            style={{
              backgroundColor: settings.secondaryColor,
              color: settings.primaryColor,
              border: `2px solid ${settings.accentColor}`
            }}
          >
            <div className="flex items-center gap-4">
              {settings.logo && (
                <img
                  src={settings.logo}
                  alt="Company Logo"
                  className="h-12 w-12 object-contain"
                />
              )}
              <div>
                <h4 className="text-xl font-bold" style={{ color: settings.primaryColor }}>
                  {settings.companyName || 'Your Company Name'}
                </h4>
                <p className="text-sm" style={{ color: settings.accentColor }}>
                  {settings.customDomain || 'your-domain.com'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 