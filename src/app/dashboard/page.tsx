"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Copy, Trash, RefreshCw, Settings } from "lucide-react";
import { generatePassword } from "@/lib/utils";
import { canAddPassword } from "@/lib/subscription";

interface Password {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
}

interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState({
    title: "",
    username: "",
    password: "",
    url: "",
  });
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [passwordOptions, setPasswordOptions] = useState<PasswordGeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });

  useEffect(() => {
    if (user) {
      loadPasswords();
    }
  }, [user]);

  useEffect(() => {
    if (showPasswordGenerator) {
      const newGeneratedPassword = generatePassword(passwordOptions);
      setNewPassword({ ...newPassword, password: newGeneratedPassword });
    }
  }, [passwordOptions, showPasswordGenerator]);

  const loadPasswords = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "passwords"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const loadedPasswords: Password[] = [];
      querySnapshot.forEach((doc) => {
        loadedPasswords.push({ id: doc.id, ...doc.data() } as Password);
      });
      setPasswords(loadedPasswords);
    } catch (error: any) {
      console.error("Error loading passwords:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to load passwords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const canAdd = await canAddPassword(user.uid, passwords.length);
      if (!canAdd) {
        toast({
          title: "Limit Reached",
          description: "You've reached your password limit. Please upgrade your plan to add more passwords.",
          variant: "destructive",
        });
        return;
      }

      await addDoc(collection(db, "passwords"), {
        ...newPassword,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      setNewPassword({ title: "", username: "", password: "", url: "" });
      setShowAddForm(false);
      loadPasswords();

      toast({
        title: "Success",
        description: "Password added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add password",
        variant: "destructive",
      });
    }
  };

  const handleDeletePassword = async (id: string) => {
    try {
      await deleteDoc(doc(db, "passwords", id));
      loadPasswords();
      toast({
        title: "Success",
        description: "Password deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete password",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Password copied to clipboard",
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleGeneratePassword = () => {
    const newGeneratedPassword = generatePassword(passwordOptions);
    setNewPassword({ ...newPassword, password: newGeneratedPassword });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Passwords</h2>
        <Button onClick={() => setShowAddForm(true)}>Add Password</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddPassword} className="space-y-4 p-4 border rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={newPassword.title}
                onChange={(e) =>
                  setNewPassword({ ...newPassword, title: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                value={newPassword.url}
                onChange={(e) =>
                  setNewPassword({ ...newPassword, url: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                value={newPassword.username}
                onChange={(e) =>
                  setNewPassword({ ...newPassword, username: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newPassword.password}
                  onChange={(e) =>
                    setNewPassword({ ...newPassword, password: e.target.value })
                  }
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGeneratePassword}
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                  title="Password generator settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {showPasswordGenerator && (
            <div className="mt-4 p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Password Generator Settings</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Password Length: {passwordOptions.length}
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {passwordOptions.length} characters
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={passwordOptions.length}
                    onChange={(e) =>
                      setPasswordOptions({
                        ...passwordOptions,
                        length: parseInt(e.target.value),
                      })
                    }
                    className="w-full mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={passwordOptions.includeUppercase}
                      onChange={(e) =>
                        setPasswordOptions({
                          ...passwordOptions,
                          includeUppercase: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span>Uppercase Letters</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={passwordOptions.includeLowercase}
                      onChange={(e) =>
                        setPasswordOptions({
                          ...passwordOptions,
                          includeLowercase: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span>Lowercase Letters</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={passwordOptions.includeNumbers}
                      onChange={(e) =>
                        setPasswordOptions({
                          ...passwordOptions,
                          includeNumbers: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span>Numbers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={passwordOptions.includeSymbols}
                      onChange={(e) =>
                        setPasswordOptions({
                          ...passwordOptions,
                          includeSymbols: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span>Symbols</span>
                  </label>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Tip: A strong password should be at least 12 characters long and include a mix of different character types.
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setShowPasswordGenerator(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {passwords.map((password) => (
          <div
            key={password.id}
            className="p-4 border rounded-lg flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="font-medium">{password.title}</h3>
              <p className="text-sm text-muted-foreground">{password.username}</p>
              <p className="text-sm font-mono">
                {showPasswords[password.id] ? password.password : '••••••••'}
              </p>
              {password.url && (
                <a
                  href={password.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {password.url}
                </a>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePasswordVisibility(password.id)}
                title={showPasswords[password.id] ? "Hide password" : "Show password"}
              >
                {showPasswords[password.id] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(password.password)}
                title="Copy password"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeletePassword(password.id)}
                title="Delete password"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {passwords.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No passwords saved yet. Click "Add Password" to get started.
          </div>
        )}
      </div>
    </div>
  );
} 