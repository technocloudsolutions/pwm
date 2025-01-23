"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { canAddPersonalInfo } from "@/lib/subscription";

interface PersonalInfo {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  idNumber?: string;
  socialSecurityNumber?: string;
  company?: string;
  phone?: string;
  email: string;
  country: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  createdAt: string;
}

export default function PersonalInfoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personalInfos, setPersonalInfos] = useState<PersonalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Omit<PersonalInfo, 'id' | 'createdAt'>>({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    idNumber: '',
    socialSecurityNumber: '',
    company: '',
    phone: '',
    email: '',
    country: '',
    streetAddress: '',
    city: '',
    postalCode: '',
  });

  useEffect(() => {
    if (user) {
      loadPersonalInfos();
    }
  }, [user]);

  const loadPersonalInfos = async () => {
    try {
      const q = query(collection(db, 'personal_info'), where('userId', '==', user?.uid));
      const querySnapshot = await getDocs(q);
      const infos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PersonalInfo[];
      setPersonalInfos(infos);
    } catch (error) {
      console.error('Error loading personal info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load personal information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const canAdd = await canAddPersonalInfo(user.uid, personalInfos.length);
      if (!canAdd) {
        toast({
          title: 'Limit Reached',
          description: 'You have reached your personal information limit. Please upgrade your plan to add more.',
          variant: 'destructive',
        });
        return;
      }

      await addDoc(collection(db, 'personal_info'), {
        ...formData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Personal information added successfully',
      });

      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        idNumber: '',
        socialSecurityNumber: '',
        company: '',
        phone: '',
        email: '',
        country: '',
        streetAddress: '',
        city: '',
        postalCode: '',
      });

      loadPersonalInfos();
    } catch (error) {
      console.error('Error adding personal info:', error);
      toast({
        title: 'Error',
        description: 'Failed to add personal information',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'personal_info', id));
      toast({
        title: 'Success',
        description: 'Personal information deleted successfully',
      });
      loadPersonalInfos();
    } catch (error) {
      console.error('Error deleting personal info:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete personal information',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Personal Information</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Add New Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <Input
                name="middleName"
                placeholder="Middle Name"
                value={formData.middleName}
                onChange={handleInputChange}
              />
              <Input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              <Input
                name="dateOfBirth"
                type="date"
                placeholder="Date of Birth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
              />
              <Input
                name="idNumber"
                placeholder="ID Number"
                value={formData.idNumber}
                onChange={handleInputChange}
              />
              <Input
                name="socialSecurityNumber"
                placeholder="Social Security Number"
                value={formData.socialSecurityNumber}
                onChange={handleInputChange}
              />
              <Input
                name="company"
                placeholder="Company"
                value={formData.company}
                onChange={handleInputChange}
              />
              <Input
                name="phone"
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <Input
                name="country"
                placeholder="Country"
                value={formData.country}
                onChange={handleInputChange}
                required
              />
              <Input
                name="streetAddress"
                placeholder="Street Address"
                value={formData.streetAddress}
                onChange={handleInputChange}
                required
              />
              <Input
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
              <Input
                name="postalCode"
                placeholder="Postal Code"
                value={formData.postalCode}
                onChange={handleInputChange}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Add Personal Information
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Saved Entries</h2>
          {personalInfos.length === 0 ? (
            <p className="text-muted-foreground">No personal information entries yet.</p>
          ) : (
            personalInfos.map((info) => (
              <Card key={info.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">
                    {info.firstName} {info.middleName} {info.lastName}
                  </h3>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(info.id)}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Date of Birth:</strong> {info.dateOfBirth}
                  </div>
                  {info.idNumber && (
                    <div>
                      <strong>ID Number:</strong> {info.idNumber}
                    </div>
                  )}
                  {info.socialSecurityNumber && (
                    <div>
                      <strong>SSN:</strong> {info.socialSecurityNumber}
                    </div>
                  )}
                  {info.company && (
                    <div>
                      <strong>Company:</strong> {info.company}
                    </div>
                  )}
                  {info.phone && (
                    <div>
                      <strong>Phone:</strong> {info.phone}
                    </div>
                  )}
                  <div>
                    <strong>Email:</strong> {info.email}
                  </div>
                  <div>
                    <strong>Country:</strong> {info.country}
                  </div>
                  <div>
                    <strong>Address:</strong> {info.streetAddress}
                  </div>
                  <div>
                    <strong>City:</strong> {info.city}
                  </div>
                  <div>
                    <strong>Postal Code:</strong> {info.postalCode}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 