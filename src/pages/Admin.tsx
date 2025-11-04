import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shield, Building2, MapPin, ArrowLeft, Plus, Trash2, Users as UsersIcon } from 'lucide-react';
import { Company, CompanySite, UserProfile } from '@/types/user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const Admin = () => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [selectedCompanyForSite, setSelectedCompanyForSite] = useState('');

  useEffect(() => {
    if (!user || !isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, isSuperAdmin, navigate]);

  const loadData = async () => {
    try {
      // Load companies
      const companiesSnap = await getDocs(collection(db, 'companies'));
      setCompanies(companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));

      // Load sites
      const sitesSnap = await getDocs(collection(db, 'companySites'));
      setSites(sitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanySite)));

      // Load users
      const usersSnap = await getDocs(collection(db, 'userProfiles'));
      setUsers(usersSnap.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i dati',
      });
    }
  };

  const createCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Inserisci il nome dell\'azienda',
      });
      return;
    }

    try {
      await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        createdAt: new Date(),
      });
      
      setNewCompanyName('');
      loadData();
      toast({
        title: 'Azienda creata',
        description: 'Azienda aggiunta con successo',
      });
    } catch (error) {
      console.error('Errore creazione azienda:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile creare l\'azienda',
      });
    }
  };

  const createSite = async () => {
    if (!newSiteName.trim() || !newSiteAddress.trim() || !selectedCompanyForSite) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Compila tutti i campi',
      });
      return;
    }

    try {
      await addDoc(collection(db, 'companySites'), {
        companyId: selectedCompanyForSite,
        name: newSiteName,
        address: newSiteAddress,
        createdAt: new Date(),
      });
      
      setNewSiteName('');
      setNewSiteAddress('');
      setSelectedCompanyForSite('');
      loadData();
      toast({
        title: 'Sede creata',
        description: 'Sede aggiunta con successo',
      });
    } catch (error) {
      console.error('Errore creazione sede:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile creare la sede',
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa azienda? Verranno eliminate anche tutte le sue sedi.')) {
      return;
    }

    try {
      // Delete associated sites
      const sitesQuery = query(collection(db, 'companySites'), where('companyId', '==', companyId));
      const sitesSnap = await getDocs(sitesQuery);
      await Promise.all(sitesSnap.docs.map(doc => deleteDoc(doc.ref)));

      // Delete company
      await deleteDoc(doc(db, 'companies', companyId));
      
      loadData();
      toast({
        title: 'Azienda eliminata',
        description: 'Azienda e sedi associate eliminate',
      });
    } catch (error) {
      console.error('Errore eliminazione azienda:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile eliminare l\'azienda',
      });
    }
  };

  const deleteSite = async (siteId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sede?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'companySites', siteId));
      loadData();
      toast({
        title: 'Sede eliminata',
        description: 'Sede eliminata con successo',
      });
    } catch (error) {
      console.error('Errore eliminazione sede:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile eliminare la sede',
      });
    }
  };

  const toggleSuperAdmin = async (userId: string, currentRole: 'user' | 'super_admin') => {
    const newRole = currentRole === 'super_admin' ? 'user' : 'super_admin';
    
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        role: newRole,
      });
      
      loadData();
      toast({
        title: 'Ruolo aggiornato',
        description: `Utente ora è ${newRole === 'super_admin' ? 'Super Admin' : 'User'}`,
      });
    } catch (error) {
      console.error('Errore aggiornamento ruolo:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile aggiornare il ruolo',
      });
    }
  };

  const assignCompanyToUser = async (userId: string, companyId: string) => {
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        companyId: companyId || null,
        siteId: null, // Reset sede quando cambia azienda
      });
      
      loadData();
      toast({
        title: 'Azienda assegnata',
        description: 'Utente associato all\'azienda',
      });
    } catch (error) {
      console.error('Errore assegnazione azienda:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile assegnare l\'azienda',
      });
    }
  };

  const assignSiteToUser = async (userId: string, siteId: string) => {
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        siteId: siteId || null,
      });
      
      loadData();
      toast({
        title: 'Sede assegnata',
        description: 'Utente associato alla sede',
      });
    } catch (error) {
      console.error('Errore assegnazione sede:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile assegnare la sede',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Gestione Admin</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies">Aziende</TabsTrigger>
            <TabsTrigger value="sites">Sedi</TabsTrigger>
            <TabsTrigger value="users">Utenti</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-6">
            <Card className="shadow-xl border-2">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Nuova Azienda
                </CardTitle>
                <CardDescription>Crea una nuova azienda nel sistema</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="company-name">Nome Azienda</Label>
                    <Input
                      id="company-name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Es: Acme Corp"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createCompany} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Crea
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-2">
              <CardHeader className="border-b">
                <CardTitle>Aziende Esistenti ({companies.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {companies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessuna azienda creata</p>
                ) : (
                  <div className="space-y-3">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">{company.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sites.filter(s => s.companyId === company.id).length} sedi
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteCompany(company.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Elimina
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sites" className="space-y-6">
            <Card className="shadow-xl border-2">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Nuova Sede
                </CardTitle>
                <CardDescription>Aggiungi una sede ad un'azienda</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Azienda</Label>
                    <Select value={selectedCompanyForSite} onValueChange={setSelectedCompanyForSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona azienda" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="site-name">Nome Sede</Label>
                      <Input
                        id="site-name"
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        placeholder="Es: Sede di Milano"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site-address">Indirizzo</Label>
                      <Input
                        id="site-address"
                        value={newSiteAddress}
                        onChange={(e) => setNewSiteAddress(e.target.value)}
                        placeholder="Es: Via Roma 1, Milano"
                      />
                    </div>
                  </div>
                  <Button onClick={createSite} className="gap-2 w-full">
                    <Plus className="h-4 w-4" />
                    Crea Sede
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-2">
              <CardHeader className="border-b">
                <CardTitle>Sedi Esistenti ({sites.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {sites.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessuna sede creata</p>
                ) : (
                  <div className="space-y-3">
                    {sites.map((site) => {
                      const company = companies.find(c => c.id === site.companyId);
                      return (
                        <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-semibold">{site.name}</p>
                              <p className="text-sm text-muted-foreground">{site.address}</p>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {company?.name || 'Azienda non trovata'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteSite(site.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Elimina
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="shadow-xl border-2">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Gestione Utenti ({users.length})
                </CardTitle>
                <CardDescription>Assegna ruoli e aziende agli utenti</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessun utente registrato</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((userProfile) => {
                      const company = companies.find(c => c.id === userProfile.companyId);
                      const site = sites.find(s => s.id === userProfile.siteId);
                      const userCompanySites = sites.filter(s => s.companyId === userProfile.companyId);
                      
                      return (
                        <div key={userProfile.userId} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{userProfile.email}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge variant={userProfile.role === 'super_admin' ? 'default' : 'secondary'}>
                                  {userProfile.role === 'super_admin' ? 'Super Admin' : 'User'}
                                </Badge>
                                {company && (
                                  <Badge variant="outline">{company.name}</Badge>
                                )}
                                {site && (
                                  <Badge variant="outline" className="bg-primary/5">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {site.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant={userProfile.role === 'super_admin' ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => toggleSuperAdmin(userProfile.userId, userProfile.role)}
                              className="gap-2"
                            >
                              <Shield className="h-4 w-4" />
                              {userProfile.role === 'super_admin' ? 'Rimuovi Admin' : 'Rendi Admin'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Assegna Azienda</Label>
                              <Select
                                value={userProfile.companyId || ''}
                                onValueChange={(value) => assignCompanyToUser(userProfile.userId, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Nessuna azienda" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Nessuna azienda</SelectItem>
                                  {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                      {company.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Assegna Sede</Label>
                              <Select
                                value={userProfile.siteId || ''}
                                onValueChange={(value) => assignSiteToUser(userProfile.userId, value)}
                                disabled={!userProfile.companyId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={userProfile.companyId ? "Nessuna sede" : "Seleziona prima un'azienda"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Nessuna sede</SelectItem>
                                  {userCompanySites.map((site) => (
                                    <SelectItem key={site.id} value={site.id}>
                                      {site.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
