import { useEffect, useMemo, useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, CalendarIcon, X, BarChart3 } from "lucide-react";
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
};

export default function Analysis() {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<ResponseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"workers" | "reparti" | "sedi" | "aziende" | "traReparti">("workers");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "responses"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ResponseDoc[];
      setResponses(data);
    } catch (err) {
      console.error("load responses", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = useMemo(() => {
    let filtered = responses;
    
    // Filtro per permessi utente
    if (!isSuperAdmin && userProfile) {
      filtered = filtered.filter((r) => {
        // Se l'utente ha un'azienda assegnata, mostra solo le risposte di quella azienda
        if (userProfile.companyId && r.companyId !== userProfile.companyId) {
          return false;
        }
        
        // Se l'utente ha sedi assegnate, mostra solo le risposte di quelle sedi
        if (userProfile.siteIds && userProfile.siteIds.length > 0) {
          return r.siteId && userProfile.siteIds.includes(r.siteId);
        }
        
        // Se l'utente ha una sede singola assegnata (compatibilità)
        if (userProfile.siteId && r.siteId !== userProfile.siteId) {
          return false;
        }
        
        return true;
      });
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
  }, [responses, dateFrom, dateTo, userProfile, isSuperAdmin]);

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
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtro Date */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Filtri Temporali
            </CardTitle>
            <CardDescription>Filtra le analisi per periodo di compilazione</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-hidden px-2 sm:px-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Data inizio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Data fine</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
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
                  Rimuovi filtri
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
              <TabsList className="grid grid-cols-5 gap-2 w-full">
                <TabsTrigger value="workers">Per Lavoratore</TabsTrigger>
                <TabsTrigger value="reparti">Per Reparto</TabsTrigger>
                <TabsTrigger value="sedi">Per Sede</TabsTrigger>
                <TabsTrigger value="aziende">Per Azienda</TabsTrigger>
                <TabsTrigger value="traReparti">Tra Reparti</TabsTrigger>
              </TabsList>

              <TabsContent value="workers" className="mt-8">
                <WorkerAnalysis 
                  filteredResponses={filteredResponses}
                />
              </TabsContent>

              <TabsContent value="reparti" className="mt-8">
                <RepartoAnalysis 
                  filteredResponses={filteredResponses}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                />
              </TabsContent>

              <TabsContent value="sedi" className="mt-8">
                <SiteAnalysis 
                  filteredResponses={filteredResponses}
                />
              </TabsContent>

              <TabsContent value="aziende" className="mt-8">
                <CompanyAnalysis 
                  filteredResponses={filteredResponses}
                />
              </TabsContent>

              <TabsContent value="traReparti" className="mt-8">
                <RepartiComparison />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}