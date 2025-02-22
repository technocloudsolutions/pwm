import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Share2, Clock, Shield, X } from 'lucide-react';
import {
  sharePassword,
  getSharedPasswords,
  getPasswordShares,
  updatePasswordShare,
  revokePasswordShare,
  type SharedPassword,
  SharedPasswordWithDetails
} from '@/lib/password-sharing';
import { IPassword } from '@/app/models/password';
import { loadPasswords } from '@/lib/password';

export function PasswordSharing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [sharedWithMe, setSharedWithMe] = useState<SharedPassword[]>([]);
  const [sharedByMe, setSharedByMe] = useState<SharedPasswordWithDetails[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedPasswordId, setSelectedPasswordId] = useState('');
  const [permissions, setPermissions] = useState<'read' | 'write'>('read');
  const [expiresAt, setExpiresAt] = useState('');
  const [passwords, setPasswords] = useState<IPassword[]>([]);

  useEffect(() => {
    const fetchPasswords = async () => {
      const passwords = await loadPasswords(user?.uid);
      setPasswords(passwords);
    };

    loadSharedPasswords();
    fetchPasswords();
  }, [user]);

  const loadSharedPasswords = async () => {    
    if (!user) return;

    try {
      setLoading(true);
      const sharedWithMePasswords = await getSharedPasswords(user.uid);
      setSharedWithMe(sharedWithMePasswords);

      // Get passwords shared by me
      const myPasswords = await getPasswordShares(user.uid);
      setSharedByMe(myPasswords);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load shared passwords',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!user || !selectedPasswordId || !recipientEmail) return;

    try {
      setSharing(true);
      await sharePassword(user.uid, selectedPasswordId, recipientEmail, {
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });
      
      toast({
        title: 'Success',
        description: 'Password shared successfully',
      });
      
      // Reset form and reload shares
      setRecipientEmail('');
      setSelectedPasswordId('');
      setPermissions('read');
      setExpiresAt('');
      loadSharedPasswords();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share password',
        variant: 'destructive',
      });
    } finally {
      setSharing(false);
    }
  };

  const handleUpdateShare = async (shareId: string, updates: { permissions?: 'read' | 'write'; expiresAt?: Date | null }) => {
    if (!user) return;

    try {
      await updatePasswordShare(user.uid, shareId, updates);
      toast({
        title: 'Success',
        description: 'Share updated successfully',
      });
      loadSharedPasswords();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update share',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!user) return;

    try {
      await revokePasswordShare(user.uid, shareId);
      toast({
        title: 'Success',
        description: 'Share revoked successfully',
      });
      loadSharedPasswords();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke share',
        variant: 'destructive',
      });
    }
  };

  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return "";
    
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Share Password</h2>
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <select
                onChange={(e) => setSelectedPasswordId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {passwords.map((password) => (
                  <option key={password.id} value={password.id}>{password.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Email</label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Enter recipient's email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Permissions</label>
              <select
                value={permissions}
                onChange={(e) => setPermissions(e.target.value as 'read' | 'write')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="read">Read Only</option>
                <option value="write">Read & Write</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expires At (Optional)</label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <Button
              onClick={handleShare}
              disabled={sharing || !selectedPasswordId || !recipientEmail}
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {sharing ? 'Sharing...' : 'Share Password'}
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Shared with Me</h2>
        {sharedWithMe.length === 0 ? (
          <p className="text-muted-foreground">No passwords have been shared with you.</p>
        ) : (
          <div className="space-y-4">
            {sharedWithMe.map((share) => (
              <Card key={share.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Lock className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Password ID: {share.passwordId}</p>
                      <p className="text-sm text-muted-foreground">
                        Shared by: {share.sharedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className={`w-4 h-4 ${share.permissions === 'write' ? 'text-green-500' : 'text-yellow-500'}`} />
                    {share.expiresAt && <Clock className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Shared by Me</h2>
        {sharedByMe.length === 0 ? (
          <p className="text-muted-foreground">You haven't shared any passwords.</p>
        ) : (
          <div className="space-y-4">
            {sharedByMe.map((share) => (
              <Card key={share.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Lock className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Password ID: {share.passwordId}</p>
                      <p className="text-sm text-muted-foreground">
                        Shared with: {share.sharedWithEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={share.permissions}
                      onChange={(e) => handleUpdateShare(share.id, { permissions: e.target.value as 'read' | 'write' })}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="read">Read Only</option>
                      <option value="write">Read & Write</option>
                    </select>
                    <Input
                      type="datetime-local"
                      value={formatDateForInput(share.expiresAt)}
                      onChange={(e) => handleUpdateShare(share.id, { expiresAt: e.target.value ? new Date(e.target.value) : null })}
                      className="w-40 text-sm"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeShare(share.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 