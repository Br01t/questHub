import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Shield,
  Building2,
  MapPin,
  ArrowLeft,
  Plus,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { Company, CompanySite, UserProfile } from "@/types/user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userAssignments, setUserAssignments] = useState<
    Record<
      string,
      {
        companies: string[];
        sites: string[];
        pending: boolean;
      }
    >
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [selectedCompanyForSite, setSelectedCompanyForSite] = useState("");

  const deleteUserProfile = async (userId: string, email: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${email}?`)) return;

    try {
      await deleteDoc(doc(db, "userProfiles", userId));
      loadData();

      toast({
        title: "Utente eliminato",
        description: `Il profilo ${email} è stato eliminato con successo.`,
      });
    } catch (error) {
      console.error("Errore eliminazione utente:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare l'utente",
      });
    }
  };

  useEffect(() => {
    if (!user || !isSuperAdmin) {
      navigate("/dashboard");
      return;
    }
    loadData();
  }, [user, isSuperAdmin, navigate]);

  const loadData = async () => {
    try {
      // Load companies
      const companiesSnap = await getDocs(collection(db, "companies"));
      setCompanies(
        companiesSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Company)
        )
      );

      // Load sites
      const sitesSnap = await getDocs(collection(db, "companySites"));
      setSites(
        sitesSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as CompanySite)
        )
      );

      // Load users
      const usersSnap = await getDocs(collection(db, "userProfiles"));
      setUsers(usersSnap.docs.map((doc) => ({ ...doc.data() } as UserProfile)));
    } catch (error) {
      console.error("Errore caricamento dati:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i dati",
      });
    }
  };

  const createCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Inserisci il nome dell'azienda",
      });
      return;
    }

    try {
      await addDoc(collection(db, "companies"), {
        name: newCompanyName,
        createdAt: new Date(),
      });

      setNewCompanyName("");
      loadData();
      toast({
        title: "Azienda creata",
        description: "Azienda aggiunta con successo",
      });
    } catch (error) {
      console.error("Errore creazione azienda:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile creare l'azienda",
      });
    }
  };

  const createSite = async () => {
    if (
      !newSiteName.trim() ||
      !newSiteAddress.trim() ||
      !selectedCompanyForSite
    ) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Compila tutti i campi",
      });
      return;
    }

    try {
      await addDoc(collection(db, "companySites"), {
        companyId: selectedCompanyForSite,
        name: newSiteName,
        address: newSiteAddress,
        createdAt: new Date(),
      });

      setNewSiteName("");
      setNewSiteAddress("");
      setSelectedCompanyForSite("");
      loadData();
      toast({
        title: "Sede creata",
        description: "Sede aggiunta con successo",
      });
    } catch (error) {
      console.error("Errore creazione sede:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile creare la sede",
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (
      !confirm(
        "Sei sicuro di voler eliminare questa azienda? Verranno eliminate anche tutte le sue sedi."
      )
    ) {
      return;
    }

    try {
      // Delete associated sites
      const sitesQuery = query(
        collection(db, "companySites"),
        where("companyId", "==", companyId)
      );
      const sitesSnap = await getDocs(sitesQuery);
      await Promise.all(sitesSnap.docs.map((doc) => deleteDoc(doc.ref)));

      // Delete company
      await deleteDoc(doc(db, "companies", companyId));

      loadData();
      toast({
        title: "Azienda eliminata",
        description: "Azienda e sedi associate eliminate",
      });
    } catch (error) {
      console.error("Errore eliminazione azienda:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare l'azienda",
      });
    }
  };

  const deleteSite = async (siteId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa sede?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "companySites", siteId));
      loadData();
      toast({
        title: "Sede eliminata",
        description: "Sede eliminata con successo",
      });
    } catch (error) {
      console.error("Errore eliminazione sede:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare la sede",
      });
    }
  };

  const toggleSuperAdmin = async (
    userId: string,
    currentRole: "user" | "super_admin"
  ) => {
    const newRole = currentRole === "super_admin" ? "user" : "super_admin";

    try {
      await updateDoc(doc(db, "userProfiles", userId), {
        role: newRole,
      });

      loadData();
      toast({
        title: "Ruolo aggiornato",
        description: `Utente ora è ${
          newRole === "super_admin" ? "Super Admin" : "User"
        }`,
      });
    } catch (error) {
      console.error("Errore aggiornamento ruolo:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiornare il ruolo",
      });
    }
  };

  const assignCompanyToUser = async (userId: string, companyId: string) => {
    try {
      await updateDoc(doc(db, "userProfiles", userId), {
        companyId: companyId || null,
        siteId: null,
        siteIds: [],
      });

      loadData();
      toast({
        title: "Azienda assegnata",
        description: "Utente associato all'azienda",
      });
    } catch (error) {
      console.error("Errore assegnazione azienda:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile assegnare l'azienda",
      });
    }
  };

  const assignSitesToUser = async (userId: string, siteIds: string[]) => {
    try {
      await updateDoc(doc(db, "userProfiles", userId), {
        siteIds,
      });

      loadData();
      toast({
        title: "Sedi assegnate",
        description: "Utente associato alle sedi selezionate",
      });
    } catch (error) {
      console.error("Errore assegnazione sedi:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile assegnare le sedi",
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
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
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
                <CardDescription>
                  Crea una nuova azienda nel sistema
                </CardDescription>
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
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna azienda creata
                  </p>
                ) : (
                  <div className="space-y-3">
                    {companies.map((company) => {
                      const companySites = sites.filter(
                        (s) => s.companyId === company.id
                      );
                      return (
                        <div
                          key={company.id}
                          className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{company.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {companySites.length} sedi
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

                          {companySites.length > 0 && (
                            <ul className="ml-8 mt-1 list-disc text-sm text-muted-foreground">
                              {companySites.map((site) => (
                                <li key={site.id}>{site.name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
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
                <CardDescription>
                  Aggiungi una sede ad un'azienda
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Azienda</Label>
                    <Select
                      value={selectedCompanyForSite}
                      onValueChange={setSelectedCompanyForSite}
                    >
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
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna sede creata
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sites.map((site) => {
                      const company = companies.find(
                        (c) => c.id === site.companyId
                      );
                      const assignedUsers = users.filter((u) =>
                        u.siteIds?.includes(site.id)
                      );

                      return (
                        <div
                          key={site.id}
                          className="p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{site.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {site.address}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="mt-1 text-xs"
                                >
                                  {company?.name || "Azienda non trovata"}
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
                          {assignedUsers.length > 0 ? (
                            <div className="mt-3 pl-8 border-l-2 border-primary/20">
                              <p className="text-sm font-medium mb-1 text-muted-foreground">
                                Utenti assegnati:
                              </p>
                              <ul className="space-y-1">
                                {assignedUsers.map((user) => (
                                  <li
                                    key={user.userId}
                                    className="text-sm flex items-center gap-2"
                                  >
                                    <UsersIcon className="h-4 w-4 text-primary" />
                                    <span>{user.email}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-muted-foreground italic pl-8">
                              Nessun utente assegnato
                            </p>
                          )}
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
                <CardDescription>
                  Assegna ruoli, aziende e sedi agli utenti
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Label htmlFor="search-user" className="text-sm font-medium">
                    Cerca utente
                  </Label>
                  <Input
                    id="search-user"
                    type="text"
                    placeholder="Cerca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sm:w-72 w-full"
                  />
                </div>
                {filteredUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessun utente trovato
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((userProfile) => {
                      const userState = userAssignments[userProfile.userId] || {
                        companies: userProfile.companyIds || [],
                        sites: userProfile.siteIds || [],
                        pending: false,
                      };

                      const toggleCompany = (companyId: string) => {
                        const updatedCompanies = userState.companies.includes(
                          companyId
                        )
                          ? userState.companies.filter((id) => id !== companyId)
                          : [...userState.companies, companyId];

                        setUserAssignments((prev) => ({
                          ...prev,
                          [userProfile.userId]: {
                            ...userState,
                            companies: updatedCompanies,
                            pending: true,
                          },
                        }));
                      };

                      const toggleSite = (siteId: string) => {
                        const updatedSites = userState.sites.includes(siteId)
                          ? userState.sites.filter((id) => id !== siteId)
                          : [...userState.sites, siteId];

                        setUserAssignments((prev) => ({
                          ...prev,
                          [userProfile.userId]: {
                            ...userState,
                            sites: updatedSites,
                            pending: true,
                          },
                        }));
                      };

                      const confirmAssignments = async () => {
                        try {
                          await updateDoc(
                            doc(db, "userProfiles", userProfile.userId),
                            {
                              companyIds: userState.companies,
                              siteIds: userState.sites,
                            }
                          );

                          toast({
                            title: "Assegnazioni aggiornate",
                            description: "Aziende e sedi salvate correttamente",
                          });

                          setUserAssignments((prev) => ({
                            ...prev,
                            [userProfile.userId]: {
                              ...userState,
                              pending: false,
                            },
                          }));
                          loadData();
                        } catch (error) {
                          console.error("Errore conferma assegnazioni:", error);
                          toast({
                            variant: "destructive",
                            title: "Errore",
                            description: "Impossibile salvare le assegnazioni",
                          });
                        }
                      };

                      return (
                        <div
                          key={userProfile.userId}
                          className="p-4 border rounded-lg space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">
                                {userProfile.email}
                              </p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant={
                                    userProfile.role === "super_admin"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {userProfile.role === "super_admin"
                                    ? "Super Admin"
                                    : "User"}
                                </Badge>
                                {userState.companies.length > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-primary/5"
                                  >
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {userState.companies.length} aziende
                                  </Badge>
                                )}
                                {userState.sites.length > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-primary/5"
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {userState.sites.length} sedi
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <Button
                                variant={
                                  userProfile.role === "super_admin"
                                    ? "outline"
                                    : "default"
                                }
                                size="sm"
                                onClick={() =>
                                  toggleSuperAdmin(
                                    userProfile.userId,
                                    userProfile.role
                                  )
                                }
                                className="gap-2 w-40 justify-center"
                              >
                                <Shield className="h-4 w-4" />
                                {userProfile.role === "super_admin"
                                  ? "Rimuovi Admin"
                                  : "Rendi Admin"}
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  deleteUserProfile(
                                    userProfile.userId,
                                    userProfile.email
                                  )
                                }
                                className="gap-2 w-40 justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                                Elimina
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Assegna Aziende</Label>
                            <div className="border rounded-lg p-3 bg-muted/10 space-y-1">
                              {companies.map((company) => (
                                <div
                                  key={company.id}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={userState.companies.includes(
                                      company.id
                                    )}
                                    onChange={() => toggleCompany(company.id)}
                                    id={`${userProfile.userId}-${company.id}`}
                                  />
                                  <Label
                                    htmlFor={`${userProfile.userId}-${company.id}`}
                                    className="cursor-pointer text-sm"
                                  >
                                    {company.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {userState.companies.map((companyId) => {
                            const company = companies.find(
                              (c) => c.id === companyId
                            );
                            const relatedSites = sites.filter(
                              (s) => s.companyId === companyId
                            );

                            if (!company) return null;

                            return (
                              <div key={companyId} className="space-y-2">
                                <Label className="text-xs">
                                  Sedi di{" "}
                                  <span className="font-medium">
                                    {company.name}
                                  </span>
                                </Label>
                                <div className="border rounded-lg p-3 bg-muted/10 space-y-1">
                                  {relatedSites.length > 0 ? (
                                    relatedSites.map((site) => (
                                      <div
                                        key={site.id}
                                        className="flex items-center space-x-2"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={userState.sites.includes(
                                            site.id
                                          )}
                                          onChange={() => toggleSite(site.id)}
                                          id={`${userProfile.userId}-${site.id}`}
                                        />
                                        <Label
                                          htmlFor={`${userProfile.userId}-${site.id}`}
                                          className="cursor-pointer text-sm"
                                        >
                                          {site.name} –{" "}
                                          <span className="text-xs text-muted-foreground">
                                            {site.address}
                                          </span>
                                        </Label>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                      Nessuna sede per questa azienda
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {userState.pending && (
                            <div className="pt-3 flex justify-end">
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={confirmAssignments}
                              >
                                Conferma Assegnazioni
                              </Button>
                            </div>
                          )}
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