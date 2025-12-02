import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionnaire } from "@/contexts/QuestionnaireContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, CalendarIcon, X, BarChart3, FileText, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import WorkerAnalysis from "./WorkerAnalysis";
import RepartoAnalysis from "./RepartoAnalysis";
import RepartiComparison from "./RepartiComparison";
import SiteAnalysis from "./SiteAnalysis";
import CompanyAnalysis from "./CompanyAnalysis";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
  userEmail?: string | null;
  userId?: string | null;
  companyId?: string | null;
  siteId?: string | null;
  questionnaireId?: string | null;
};

export default function Analysis() {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const { questionnaires, selectedQuestionnaire, setSelectedQuestionnaireId } = useQuestionnaire();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<ResponseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"workers" | "reparti" | "sedi" | "aziende" | "traReparti">("workers");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [availableCompanies, setAvailableCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [availableSites, setAvailableSites] = useState<{ id: string; name: string; companyId: string }[]>([]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [openQuestionnaire, setOpenQuestionnaire] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    load();
    loadCompaniesAndSites();
  }, [user]);

  useEffect(() => {
    if (selectedCompanyFilter && selectedCompanyFilter !== "all") {
      loadSitesForCompany(selectedCompanyFilter);
    } else {
      setAvailableSites([]);
      setSelectedSiteFilter("all");
    }
  }, [selectedCompanyFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "responses"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ResponseDoc[];
      setResponses(data);
    } catch (err) {
      console.error("load responses", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompaniesAndSites = async () => {
    try {
      const companiesSnapshot = await getDocs(collection(db, "companies"));
      let companies = companiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));

      if (!isSuperAdmin && userProfile) {
        const allowedCompanyIds = userProfile.companyIds || [];
        if (allowedCompanyIds.length > 0) {
          companies = companies.filter((c) => allowedCompanyIds.includes(c.id));
        } else {
          companies = [];
        }
      }

      setAvailableCompanies(companies);
    } catch (error) {
      console.error("Errore caricamento aziende:", error);
    }
  };

  const loadSitesForCompany = async (companyId: string) => {
    try {
      const sitesSnapshot = await getDocs(collection(db, "companySites"));
      let sites = sitesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          companyId: doc.data().companyId,
        }))
        .filter((s) => s.companyId === companyId);

      if (!isSuperAdmin && userProfile) {
        const allowedSiteIds = userProfile.siteIds || [];
        if (allowedSiteIds.length > 0) {
          sites = sites.filter((s) => allowedSiteIds.includes(s.id));
        }
      }

      setAvailableSites(sites);
    } catch (error) {
      console.error("Errore caricamento sedi:", error);
    }
  };

  const filteredResponses = useMemo(() => {
    let filtered = responses;

    // Filtro per permessi utente
    if (!isSuperAdmin && userProfile) {
      filtered = filtered.filter((r) => {
        // Se l'utente ha aziende assegnate, mostra solo le risposte di quelle aziende
        if (userProfile.companyIds && userProfile.companyIds.length > 0) {
          if (!r.companyId || !userProfile.companyIds.includes(r.companyId)) {
            return false;
          }
        }

        // Se l'utente ha sedi assegnate, mostra solo le risposte di quelle sedi
        if (userProfile.siteIds && userProfile.siteIds.length > 0) {
          return r.siteId && userProfile.siteIds.includes(r.siteId);
        }

        return true;
      });
    }

    // Filtro per azienda selezionata
    if (selectedCompanyFilter && selectedCompanyFilter !== "all") {
      filtered = filtered.filter((r) => r.companyId === selectedCompanyFilter);
    }

    // Filtro per sede selezionata
    if (selectedSiteFilter && selectedSiteFilter !== "all") {
      filtered = filtered.filter((r) => r.siteId === selectedSiteFilter);
    }

    // Filtro per questionario selezionato
    if (selectedQuestionnaire) {
      filtered = filtered.filter((r) => r.questionnaireId === selectedQuestionnaire.id);
    }

    // Filtro per date
    if (dateFrom) {
      filtered = filtered.filter((r) => {
        if (!r.createdAt?.toDate) return false;
        const date = r.createdAt.toDate();
        return date >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((r) => {
        if (!r.createdAt?.toDate) return false;
        const date = r.createdAt.toDate();
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        return date <= endOfDay;
      });
    }
    return filtered;
  }, [responses, dateFrom, dateTo, userProfile, isSuperAdmin, selectedCompanyFilter, selectedSiteFilter, selectedQuestionnaire]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold leading-tight">Analisi e Statistiche</h1>
          </div>

          <div className="flex justify-center sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtri */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Filtri
            </CardTitle>
            <CardDescription>Filtra le analisi per questionario e periodo</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-hidden px-2 sm:px-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Filtro Questionario */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Questionario</label>
                <Popover open={openQuestionnaire} onOpenChange={setOpenQuestionnaire}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[280px] justify-between gap-2", !selectedQuestionnaire && "text-muted-foreground")}>
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{selectedQuestionnaire?.name || "Seleziona questionario"}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0 bg-background z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca questionario" />
                      <CommandList>
                        <CommandEmpty>Nessun questionario trovato.</CommandEmpty>
                        <CommandGroup>
                          {questionnaires.map((q) => (
                            <CommandItem
                              key={q.id}
                              value={q.name}
                              onSelect={() => {
                                setSelectedQuestionnaireId(q.id);
                                setOpenQuestionnaire(false);
                              }}
                              className="group"
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedQuestionnaire?.id === q.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{q.name}</span>
                                <span className="text-xs text-muted-foreground group-aria-selected:text-white">
                                  {q.sector} • {q.questions.length} domande
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Data inizio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Data fine</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rimuovi filtri date
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle>Seleziona Vista Analisi</CardTitle>
            <CardDescription>Scegli come visualizzare i dati raccolti</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-hidden px-2 sm:px-4">
            <Tabs value={tab} onValueChange={(v: "workers" | "reparti" | "sedi" | "aziende" | "traReparti") => setTab(v)}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full h-auto bg-muted p-2 rounded-lg">
                <TabsTrigger value="workers" className="text-xs sm:text-sm whitespace-nowrap">
                  Per Lavoratore
                </TabsTrigger>
                <TabsTrigger value="reparti" className="text-xs sm:text-sm whitespace-nowrap">
                  Per Reparto
                </TabsTrigger>
                <TabsTrigger value="sedi" className="text-xs sm:text-sm whitespace-nowrap">
                  Per Sede
                </TabsTrigger>
                <TabsTrigger value="aziende" className="text-xs sm:text-sm whitespace-nowrap">
                  Per Azienda
                </TabsTrigger>
                <TabsTrigger value="traReparti" className="text-xs sm:text-sm whitespace-nowrap col-span-2 sm:col-span-1">
                  Tra Reparti
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workers" className="mt-8">
                <WorkerAnalysis
                  filteredResponses={filteredResponses}
                  userProfile={userProfile}
                  isSuperAdmin={isSuperAdmin}
                  availableCompanies={availableCompanies}
                  availableSites={availableSites}
                  selectedCompanyFilter={selectedCompanyFilter}
                  setSelectedCompanyFilter={setSelectedCompanyFilter}
                  selectedSiteFilter={selectedSiteFilter}
                  setSelectedSiteFilter={setSelectedSiteFilter}
                />
              </TabsContent>

              <TabsContent value="reparti" className="mt-8">
                <RepartoAnalysis
                  filteredResponses={filteredResponses}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  availableCompanies={availableCompanies}
                  availableSites={availableSites}
                  selectedCompanyFilter={selectedCompanyFilter}
                  setSelectedCompanyFilter={setSelectedCompanyFilter}
                  selectedSiteFilter={selectedSiteFilter}
                  setSelectedSiteFilter={setSelectedSiteFilter}
                />
              </TabsContent>

              <TabsContent value="sedi" className="mt-8">
                <SiteAnalysis
                  filteredResponses={filteredResponses}
                  userProfile={userProfile}
                  isSuperAdmin={isSuperAdmin}
                  availableCompanies={availableCompanies}
                  availableSites={availableSites}
                  selectedCompanyFilter={selectedCompanyFilter}
                  setSelectedCompanyFilter={setSelectedCompanyFilter}
                  selectedSiteFilter={selectedSiteFilter}
                  setSelectedSiteFilter={setSelectedSiteFilter}
                />
              </TabsContent>

              <TabsContent value="aziende" className="mt-8">
                <CompanyAnalysis
                  filteredResponses={filteredResponses}
                  userProfile={userProfile}
                  isSuperAdmin={isSuperAdmin}
                  availableCompanies={availableCompanies}
                  availableSites={availableSites}
                  selectedCompanyFilter={selectedCompanyFilter}
                  setSelectedCompanyFilter={setSelectedCompanyFilter}
                  selectedSiteFilter={selectedSiteFilter}
                  setSelectedSiteFilter={setSelectedSiteFilter}
                />
              </TabsContent>

              <TabsContent value="traReparti" className="mt-8">
                <RepartiComparison filteredResponses={filteredResponses} availableCompanies={availableCompanies} availableSites={availableSites} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}