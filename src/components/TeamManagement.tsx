import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Team,
  TeamMember,
  createTeam,
  getUserTeams,
  addTeamMember,
  removeTeamMember
} from '@/lib/team-management';
import { Users, UserPlus, Trash2 } from 'lucide-react';

export function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userTeams = await getUserTeams(user);
      setTeams(userTeams);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!user || !newTeamName.trim()) return;

    try {
      await createTeam(user, newTeamName.trim());
      toast({
        title: 'Success',
        description: 'Team created successfully',
      });
      setNewTeamName('');
      loadTeams();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!user || !newMemberEmail.trim()) return;

    try {
      await addTeamMember(user, teamId, newMemberEmail.trim());
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
      setNewMemberEmail('');
      setShowAddMember(false);
      loadTeams();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!user || !confirm('Are you sure you want to remove this team member?')) return;

    try {
      await removeTeamMember(user, teamId, memberId);
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
      loadTeams();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member',
        variant: 'destructive',
      });
    }
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Team Management</h2>
          <Button onClick={loadTeams} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Create Team */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <Button onClick={handleCreateTeam}>
            Create Team
          </Button>
        </div>

        {/* Teams List */}
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No teams created yet
          </p>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(team.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowAddMember(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Member
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTeam(team === selectedTeam ? null : team)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {team === selectedTeam ? 'Hide Members' : 'Show Members'}
                    </Button>
                  </div>
                </div>

                {/* Add Member Form */}
                {showAddMember && team === selectedTeam && (
                  <div className="flex gap-2 mt-4">
                    <Input
                      placeholder="Enter member email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                    <Button onClick={() => handleAddMember(team.id)}>
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberEmail('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Team Members List */}
                {team === selectedTeam && (
                  <div className="space-y-2 mt-4">
                    <h4 className="font-medium">Team Members</h4>
                    {Object.entries(team.members).map(([userId, member]) => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.role} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {userId !== team.ownerId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(team.id, userId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
} 