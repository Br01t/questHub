import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface Response {
  id: string;
  answers: {
    [key: string]: string | string[];
  };
  companyId?: string;
  siteId?: string;
}
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ClipboardList,
  FileText,
  LogOut,
  Users,
  PenSquare,
  BarChart3,
  Shield,
  Building2,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

const FULL_QUESTIONS: { id: string; label: string }[] = [
  { id: "meta_nome", label: "Nome valutato / lavoratore" },
  { id: "meta_postazione", label: "Postazione n." },
  { id: "meta_reparto", label: "Ufficio / Reparto" },
  { id: "1.1", label: "1.1 Ore di lavoro settimanali a VDT (abituali)" },
  { id: "1.2", label: "1.2 Pause/cambi attività 15' ogni 120' (SI/NO)" },
  // { id: "1.2_note", label: "1.2 - Necessità di intervento (note)" },
  { id: "1.3", label: "1.3 Tipo di lavoro prevalente" },
  { id: "1.4", label: "1.4 Informazione al lavoratore per uso VDT (SI/NO)" },
  // { id: "1.4_note", label: "1.4 - Necessità di intervento (note)" },
  { id: "2.1", label: "2.1 Modalità ricambio aria (naturale/artificiale)" },
  { id: "2.2", label: "2.2 Possibilità di regolare la temperatura" },
  { id: "2.3", label: "2.3 Possibilità di regolare l'umidità" },
  { id: "2.4", label: "2.4 Eccesso di calore dalle attrezzature (SI/NO)" },
  // { id: "2.4_note", label: "2.4 - Necessità di intervento (note)" },
  { id: "3.1", label: "3.1 Tipo di luce (naturale/artificiale/mista)" },
  { id: "3.2_nat", label: "3.2 - Regolazione luce naturale" },
  { id: "3.2_art", label: "3.2 - Regolazione luce artificiale" },
  { id: "3.3", label: "3.3 Posizione rispetto alla sorgente naturale" },
  // { id: "3_note", label: "3 - Necessità di intervento (note)" },
  { id: "4.1", label: "4.1 Eventuale misura rumore (dB(A))" },
  { id: "4.2", label: "4.2 Disturbo attenzione/comunicazione (SI/NO)" },
  // { id: "4_note", label: "4 - Necessità di intervento (note)" },
  { id: "5.1", label: "5.1 Spazio di lavoro/manovra adeguato (SI/NO)" },
  { id: "5.2", label: "5.2 Percorsi liberi da ostacoli (SI/NO)" },
  // { id: "5_note", label: "5 - Necessità di intervento (note)" },
  { id: "6.1", label: "6.1 Superficie del piano adeguata (SI/NO)" },
  { id: "6.2", label: "6.2 Altezza del piano 70-80cm (SI/NO)" },
  {
    id: "6.3",
    label: "6.3 Dimensioni/disposizione schermo/tastiera/mouse (SI/NO)",
  },
  // { id: "6_note", label: "6 - Necessità di intervento (note)" },
  { id: "7.1", label: "7.1 Altezza sedile regolabile" },
  { id: "7.2", label: "7.2 Inclinazione sedile regolabile" },
  { id: "7.3", label: "7.3 Schienale con supporto dorso-lombare" },
  { id: "7.4", label: "7.4 Schienale regolabile in altezza" },
  {
    id: "7.5",
    label: "7.5 Schienale/seduta bordi smussati/materiali appropriati",
  },
  { id: "7.6", label: "7.6 Presenza di ruote/meccanismo spostamento" },
  // { id: "7_note", label: "7 - Necessità di intervento (note)" },
  { id: "8.1", label: "8.1 Monitor orientabile/inclinabile" },
  { id: "8.2", label: "8.2 Immagine stabile, senza sfarfallio" },
  { id: "8.3", label: "8.3 Risoluzione/luminosità regolabili" },
  { id: "8.4", label: "8.4 Contrasto/luminosità adeguati" },
  { id: "8.5", label: "8.5 Presenza di riflessi o riverberi" },
  // { id: "8.6", label: "8.6 Note su posizione dello schermo" },
  // { id: "8_note", label: "8 - Necessità di intervento (note)" },
  { id: "9.1", label: "9.1 Tastiera e mouse separati dallo schermo" },
  { id: "9.2", label: "9.2 Tastiera inclinabile" },
  { id: "9.3", label: "9.3 Spazio per appoggiare avambracci" },
  { id: "9.4", label: "9.4 Simboli/tasti leggibili" },
  // { id: "9_note", label: "9 - Necessità di intervento (note)" },
  { id: "10_note", label: "10 - Osservazioni (note)" },
];

interface Company {
  id: string;
  name: string;
}

interface CompanySite {
  id: string;
  name: string;
  companyId: string;
}

const Dashboard = () => {
  const { user, userProfile, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");

  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [availableSites, setAvailableSites] = useState<CompanySite[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [openCompany, setOpenCompany] = useState(false);
  const [openSite, setOpenSite] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadAvailableCompaniesAndSites();
    loadResponses();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadAvailableSitesForCompany(selectedCompanyId);
      updateCompanyName(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (
      selectedCompanyId &&
      selectedSiteId &&
      availableCompanies.length &&
      availableSites.length
    ) {
      const selectedCompany = availableCompanies.find(
        (c) => c.id === selectedCompanyId
      );
      const selectedSite = availableSites.find((s) => s.id === selectedSiteId);

      const dataToSave = {
        companyId: selectedCompanyId,
        companyName: selectedCompany?.name || "Sconosciuta",
        siteId: selectedSiteId,
        siteName: selectedSite?.name || "Sconosciuta",
      };
      localStorage.setItem("selectedCompanyData", JSON.stringify(dataToSave));
    } else {
      console.log("⚠️ [Dashboard] Dati non ancora pronti per il salvataggio", {
        selectedCompanyId,
        selectedSiteId,
        availableCompanies,
        availableSites,
      });
    }
  }, [selectedCompanyId, selectedSiteId, availableCompanies, availableSites]);

  const loadAvailableCompaniesAndSites = async () => {
    try {
      const companiesSnapshot = await getDocs(
        query(collection(db, "companies"))
      );
      let companies = companiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Company[];

      if (!isSuperAdmin) {
        const allowedCompanyIds: string[] = userProfile?.companyIds || [];

        if (allowedCompanyIds.length > 0) {
          companies = companies.filter((c) => allowedCompanyIds.includes(c.id));
        } else {
          companies = [];
        }
      }

      setAvailableCompanies(companies);

      if (companies.length > 0) {
        const defaultCompany = companies[0].id;
        setSelectedCompanyId(defaultCompany);
      } else {
        setSelectedCompanyId("");
      }
    } catch (error) {
      console.error("Errore caricamento aziende:", error);
    }
  };

  const loadAvailableSitesForCompany = async (companyId: string) => {
    try {
      const sitesSnapshot = await getDocs(
        query(collection(db, "companySites"))
      );
      let sites = sitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CompanySite[];

      sites = sites.filter((s) => s.companyId === companyId);

      if (!isSuperAdmin) {
        const allowedSiteIds: string[] = userProfile?.siteIds || [];

        if (allowedSiteIds.length > 0) {
          sites = sites.filter((s) => allowedSiteIds.includes(s.id));
        }
      }

      setAvailableSites(sites);

      if (sites.length > 0) {
        const defaultSite = sites[0].id;
        setSelectedSiteId(defaultSite);
      } else {
        setSelectedSiteId("");
      }
    } catch (error) {
      console.error("Errore caricamento sedi:", error);
    }
  };

  const updateCompanyName = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId));
      if (companyDoc.exists()) {
        setCompanyName(companyDoc.data().name);
      }
    } catch (error) {
      console.error("Errore caricamento nome azienda:", error);
    }
  };

  const loadResponses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "responses"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Response[];
      setResponses(data);
    } catch (error) {
      console.error("Errore nel caricamento delle risposte:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const filteredResponses = useMemo(() => {
    let filtered = responses;

    if (selectedCompanyId) {
      filtered = filtered.filter((r) => r.companyId === selectedCompanyId);
    }

    if (selectedSiteId) {
      filtered = filtered.filter((r) => r.siteId === selectedSiteId);
    }

    return filtered;
  }, [responses, selectedCompanyId, selectedSiteId]);

  const groupedByQuestion = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    filteredResponses.forEach((r) => {
      const answers = r.answers || {};
      FULL_QUESTIONS.forEach((q) => {
        const val = answers[q.id];
        if (!val) return;
        if (Array.isArray(val)) {
          val.forEach((v) => {
            grouped[q.id] = grouped[q.id] || {};
            grouped[q.id][String(v)] = (grouped[q.id][String(v)] || 0) + 1;
          });
        } else {
          grouped[q.id] = grouped[q.id] || {};
          grouped[q.id][String(val)] = (grouped[q.id][String(val)] || 0) + 1;
        }
      });
    });
    return FULL_QUESTIONS.map((q) => {
      const counts = grouped[q.id] || {};
      const data = Object.entries(counts).map(([name, value]) => ({
        name,
        value,
      }));
      return {
        id: q.id,
        label: q.label,
        total: data.reduce((s, d) => s + d.value, 0),
        data,
      };
    });
  }, [filteredResponses]);

  const { satisfactionData, averageScore } = useMemo(() => {
    if (filteredResponses.length === 0)
      return { satisfactionData: [], averageScore: 0 };
    const satisfactionCounts: Record<string, number> = {};
    let totalScore = 0;
    let totalCount = 0;
    filteredResponses.forEach((r) => {
      const val = r.answers?.q7 || r.answers?.["10.1"] || "";
      if (typeof val === "string" && val)
        satisfactionCounts[val] = (satisfactionCounts[val] || 0) + 1;
      const scoreMap: Record<string, number> = {
        Eccellente: 100,
        Ottimo: 90,
        Buono: 75,
        Sufficiente: 60,
        Insufficiente: 40,
        Scarso: 25,
        "Molto soddisfatto": 100,
        Soddisfatto: 75,
        Neutrale: 50,
        Insoddisfatto: 25,
      };
      let total = 0;
      let count = 0;
      ["q2", "q3", "q4", "q7"].forEach((k) => {
        const v = r.answers?.[k];
        if (typeof v === "string" && scoreMap[v] !== undefined) {
          total += scoreMap[v];
          count++;
        }
      });
      const score = count ? total / count : 0;
      if (score > 0) {
        totalScore += score;
        totalCount++;
      }
    });
    const satisfactionData = Object.entries(satisfactionCounts).map(
      ([name, value]) => ({ name, value })
    );
    const averageScore =
      totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
    return { satisfactionData, averageScore };
  }, [filteredResponses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <h1 className="text-xl font-bold leading-tight">QuestHub</h1>
                {isSuperAdmin && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Super Admin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground break-all">
                {user?.email}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                {availableCompanies.length === 0 ? (
                  <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
                    Nessuna azienda assegnata.{" "}
                    <br className="hidden sm:block" />
                    Contatta il responsabile per l’abilitazione.
                  </div>
                ) : (
                  <Popover open={openCompany} onOpenChange={setOpenCompany}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto justify-between gap-2 bg-background/50 hover:bg-background"
                        disabled={availableCompanies.length === 1}
                      >
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {availableCompanies.find(
                              (c) => c.id === selectedCompanyId
                            )?.name || "Seleziona azienda"}
                          </span>
                        </div>
                        {availableCompanies.length > 1 && (
                          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    {availableCompanies.length > 1 && (
                      <PopoverContent
                        className="w-[240px] p-0 bg-background z-50"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Cerca azienda..." />
                          <CommandList>
                            <CommandEmpty>
                              Nessuna azienda trovata.
                            </CommandEmpty>
                            <CommandGroup>
                              {availableCompanies.map((company) => (
                                <CommandItem
                                  key={company.id}
                                  value={company.id}
                                  onSelect={() => {
                                    setSelectedCompanyId(company.id);
                                    setOpenCompany(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCompanyId === company.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {company.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    )}
                  </Popover>
                )}

                {availableSites.length === 0 ? (
                  <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
                    Nessuna sede assegnata. <br className="hidden sm:block" />
                    Contatta il responsabile per l’abilitazione.
                  </div>
                ) : (
                  <Popover open={openSite} onOpenChange={setOpenSite}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto justify-between gap-2 bg-background/50 hover:bg-background"
                        disabled={availableSites.length === 1}
                      >
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {availableSites.find((s) => s.id === selectedSiteId)
                              ?.name || "Seleziona sede"}
                          </span>
                        </div>
                        {availableSites.length > 1 && (
                          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    {availableSites.length > 1 && (
                      <PopoverContent
                        className="w-[240px] p-0 bg-background z-50"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Cerca sede..." />
                          <CommandList>
                            <CommandEmpty>Nessuna sede trovata.</CommandEmpty>
                            <CommandGroup>
                              {availableSites.map((site) => (
                                <CommandItem
                                  key={site.id}
                                  value={site.id}
                                  onSelect={() => {
                                    setSelectedSiteId(site.id);
                                    setOpenSite(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSiteId === site.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {site.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    )}
                  </Popover>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-center sm:justify-end flex-wrap">
            {isSuperAdmin && (
              <Button
                variant="default"
                onClick={() => navigate("/admin")}
                className="gap-2 w-full sm:w-auto"
              >
                <Shield className="h-4 w-4" />
                Gestione Admin
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nuovo Questionario */}
          <Card
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:-translate-y-1 group"
            onClick={() => navigate("/compile")}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <PenSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Nuovo Questionario</CardTitle>
              </div>
              <CardDescription className="text-base">
                Compila un nuovo questionario di valutazione VDT
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Analisi Dati */}
          <Card
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:-translate-y-1 group"
            onClick={() => navigate("/analysis")}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Analisi Dati</CardTitle>
              </div>
              <CardDescription className="text-base">
                Visualizza statistiche e analisi dettagliate dei dati raccolti
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Guida / FAQ */}
          <Card
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:-translate-y-1 group"
            onClick={() => navigate("/guide")}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Guida / FAQ</CardTitle>
              </div>
              <CardDescription className="text-base">
                Scopri come usare l'app e visualizza le FAQ
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  Risposte Totali
                </CardDescription>
                <Users className="h-5 w-5 text-primary/50" />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {filteredResponses.length}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Questionari completati
              </p>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-accent shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  Questionari Attivi
                </CardDescription>
                <FileText className="h-5 w-5 text-accent/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-accent">
                1
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Attualmente disponibile
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Analisi Generali */}
        {filteredResponses.length === 0 ? (
          <Card className="shadow-lg border-2">
            <CardContent className="py-16 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <p className="text-lg text-muted-foreground">
                Nessun dato disponibile al momento
              </p>
              <Button
                onClick={() => navigate("/compile")}
                variant="gradient"
                size="lg"
              >
                <PenSquare className="mr-2 h-5 w-5" />
                Compila il primo questionario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {satisfactionData.length > 0 && (
                <Card className="shadow-lg border-2">
                  <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="text-xl">
                      Soddisfazione Generale
                    </CardTitle>
                    <CardDescription>
                      Distribuzione delle risposte per livello di soddisfazione
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={satisfactionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {satisfactionData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-lg border-2">
                <CardHeader className="border-b bg-gradient-to-r from-accent/5 to-transparent">
                  <CardTitle className="text-xl">
                    Distibuzione Questionari attivi per Settore
                  </CardTitle>
                  <CardDescription>
                    Valutazione complessiva su scala 0-100
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Sicurezza", punteggio: averageScore },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="punteggio" fill={COLORS[0]}>
                          <Cell key="cell" fill={COLORS[0]} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <div className="h-1 flex-1 bg-gradient-to-r from-primary to-primary-glow rounded-full" />
              <h2 className="text-2xl font-bold">Distribuzione per Domanda</h2>
              <div className="h-1 flex-1 bg-gradient-to-l from-primary to-primary-glow rounded-full" />
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {groupedByQuestion
                .filter((q) => q.total > 0)
                .map((q) => (
                  <AccordionItem
                    key={q.id}
                    value={q.id}
                    className="border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="px-4 py-3 flex items-center justify-between text-left">
                      <div>
                        <h3 className="text-sm font-medium">{q.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {q.total} risposte totali
                        </p>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 pt-2">
                      {q.data.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Nessuna risposta
                        </div>
                      ) : (
                        <div style={{ height: 260 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              layout="horizontal"
                              data={q.data.sort((a, b) => b.value - a.value)}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                interval={0}
                                angle={0}
                                textAnchor="middle"
                                tick={{ fontSize: 12, width: 100 }}
                              />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="value">
                                {q.data.map((_, i) => (
                                  <Cell
                                    key={`cell-${i}`}
                                    fill={COLORS[i % COLORS.length]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;