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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Search, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
  userEmail?: string | null;
  userId?: string | null;
};

const FULL_QUESTIONS: { id: string; label: string }[] = [
  { id: "meta_nome", label: "Nome valutato / lavoratore" },
  { id: "meta_postazione", label: "Postazione n." },
  { id: "meta_reparto", label: "Ufficio / Reparto" },
  { id: "1.1", label: "1.1 Ore di lavoro settimanali a VDT (abituali)" },
  { id: "1.2", label: "1.2 Pause/cambi attività 15' ogni 120' (SI/NO)" },
  { id: "1.2_note", label: "1.2 - Necessità di intervento (note)" },
  { id: "1.3", label: "1.3 Tipo di lavoro prevalente" },
  { id: "1.4", label: "1.4 Informazione al lavoratore per uso VDT (SI/NO)" },
  { id: "1.4_note", label: "1.4 - Necessità di intervento (note)" },
  { id: "2.1", label: "2.1 Modalità ricambio aria (naturale/artificiale)" },
  { id: "2.2", label: "2.2 Possibilità di regolare la temperatura" },
  { id: "2.3", label: "2.3 Possibilità di regolare l'umidità" },
  { id: "2.4", label: "2.4 Eccesso di calore dalle attrezzature (SI/NO)" },
  { id: "2.4_note", label: "2.4 - Necessità di intervento (note)" },
  { id: "3.1", label: "3.1 Tipo di luce (naturale/artificiale/mista)" },
  { id: "3.2_nat", label: "3.2 - Regolazione luce naturale" },
  { id: "3.2_art", label: "3.2 - Regolazione luce artificiale" },
  { id: "3.3", label: "3.3 Posizione rispetto alla sorgente naturale" },
  { id: "3_note", label: "3 - Necessità di intervento (note)" },
  { id: "4.1", label: "4.1 Eventuale misura rumore (dB(A))" },
  { id: "4.2", label: "4.2 Disturbo attenzione/comunicazione (SI/NO)" },
  { id: "4_note", label: "4 - Necessità di intervento (note)" },
  { id: "5.1", label: "5.1 Spazio di lavoro/manovra adeguato (SI/NO)" },
  { id: "5.2", label: "5.2 Percorsi liberi da ostacoli (SI/NO)" },
  { id: "5_note", label: "5 - Necessità di intervento (note)" },
  { id: "6.1", label: "6.1 Superficie del piano adeguata (SI/NO)" },
  { id: "6.2", label: "6.2 Altezza del piano 70-80cm (SI/NO)" },
  { id: "6.3", label: "6.3 Dimensioni/disposizione schermo/tastiera/mouse (SI/NO)" },
  { id: "6_note", label: "6 - Necessità di intervento (note)" },
  { id: "7.1", label: "7.1 Altezza sedile regolabile" },
  { id: "7.2", label: "7.2 Inclinazione sedile regolabile" },
  { id: "7.3", label: "7.3 Schienale con supporto dorso-lombare" },
  { id: "7.4", label: "7.4 Schienale regolabile in altezza" },
  { id: "7.5", label: "7.5 Schienale/seduta bordi smussati/materiali appropriati" },
  { id: "7.6", label: "7.6 Presenza di ruote/meccanismo spostamento" },
  { id: "7_note", label: "7 - Necessità di intervento (note)" },
  { id: "8.1", label: "8.1 Monitor orientabile/inclinabile" },
  { id: "8.2", label: "8.2 Immagine stabile, senza sfarfallio" },
  { id: "8.3", label: "8.3 Risoluzione/luminosità regolabili" },
  { id: "8.4", label: "8.4 Contrasto/luminosità adeguati" },
  { id: "8.5", label: "8.5 Presenza di riflessi o riverberi" },
  { id: "8.6", label: "8.6 Note su posizione dello schermo" },
  { id: "8_note", label: "8 - Necessità di intervento (note)" },
  { id: "9.1", label: "9.1 Tastiera e mouse separati dallo schermo" },
  { id: "9.2", label: "9.2 Tastiera inclinabile" },
  { id: "9.3", label: "9.3 Spazio per appoggiare avambracci" },
  { id: "9.4", label: "9.4 Simboli/tasti leggibili" },
  { id: "9_note", label: "9 - Necessità di intervento (note)" },
  { id: "10.1", label: "10.1 Software adeguato e di facile utilizzo (SI/NO)" },
  { id: "10_note", label: "10 - Osservazioni (note)" },
  { id: "foto_postazione", label: "Foto della postazione (URL/nota)" },
];

export default function Analysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<ResponseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"workers" | "reparti">("workers");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedReparto, setSelectedReparto] = useState<string>("all");
  const [openWorker, setOpenWorker] = useState(false);
  const [openReparto, setOpenReparto] = useState(false);

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

  const workers = useMemo(
    () => Array.from(new Set(responses.map((r) => String(r.answers?.meta_nome)).filter((n) => n !== "undefined" && n !== "null"))).sort(),
    [responses]
  );

  const reparti = useMemo(
    () => Array.from(new Set(responses.map((r) => r.answers?.meta_reparto).filter(Boolean))).sort(),
    [responses]
  );

  const responsesByWorker = useMemo(() => {
    if (selectedWorker === "all") return [];
    return responses.filter((r) => r.answers?.meta_nome === selectedWorker);
  }, [responses, selectedWorker]);

  const responsesByReparto = useMemo(() => {
    if (selectedReparto === "all") return [];
    return responses.filter((r) => r.answers?.meta_reparto === selectedReparto);
  }, [responses, selectedReparto]);

  const renderAnswer = (val: string | number | boolean | string[] | undefined | null) => {
    if (val === undefined || val === null || val === "") return <span className="text-muted-foreground">—</span>;
    if (Array.isArray(val)) return <span>{val.join(", ")}</span>;
    return <span>{String(val)}</span>;
  };

  const answersGroupedByQuestion = useMemo(() => {
    if (selectedReparto === "all") return {};
    const grouped: Record<string, { lavoratore: string; value: string | number | boolean | string[] }[]> = {};
    responsesByReparto.forEach((r) => {
      FULL_QUESTIONS.forEach((q) => {
        const value = r.answers?.[q.id];
        if (value !== undefined && value !== null && value !== "") {
          if (!grouped[q.id]) grouped[q.id] = [];
          grouped[q.id].push({
            lavoratore: String(r.answers?.meta_nome) || "Sconosciuto",
            value,
          });
        }
      });
    });
    return grouped;
  }, [responsesByReparto, selectedReparto]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla Dashboard
            </Button>
            <h2 className="text-lg font-semibold">Analisi dettagliata</h2>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={tab} onValueChange={(v: "workers" | "reparti") => setTab(v)}>
          <TabsList className="grid grid-cols-2 gap-2 w-full md:w-1/2">
            <TabsTrigger value="workers">Per lavoratore</TabsTrigger>
            <TabsTrigger value="reparti">Per reparto</TabsTrigger>
          </TabsList>

          {/* --- Per lavoratore --- */}
          <TabsContent value="workers" className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Popover open={openWorker} onOpenChange={setOpenWorker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openWorker}
                    className="w-[300px] justify-between"
                  >
                    {selectedWorker === "all" ? "Seleziona un lavoratore..." : selectedWorker}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca lavoratore..." />
                    <CommandList>
                      <CommandEmpty>Nessun lavoratore trovato.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedWorker("all");
                            setOpenWorker(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedWorker === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Tutti
                        </CommandItem>
                        {workers.map((w) => (
                          <CommandItem
                            key={w}
                            value={w}
                            onSelect={(currentValue) => {
                              setSelectedWorker(currentValue);
                              setOpenWorker(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedWorker === w ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {w}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedWorker === "all" ? (
              <Card><CardContent>Seleziona un lavoratore per vedere i dettagli.</CardContent></Card>
            ) : (
              responsesByWorker.map((resp) => (
                <Card key={resp.id}>
                  <CardHeader>
                    <CardTitle>{resp.answers?.meta_nome}</CardTitle>
                    <CardDescription>
                      {resp.createdAt?.toDate ? format(resp.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "Data non disponibile"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {FULL_QUESTIONS.map((q) => (
                        <div key={q.id} className="p-2 rounded bg-white border">
                          <div className="flex justify-between items-start">
                            <div className="font-medium">{q.label}</div>
                            <div className="text-sm text-muted-foreground">{renderAnswer(resp.answers?.[q.id])}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* --- Per reparto --- */}
          <TabsContent value="reparti" className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Popover open={openReparto} onOpenChange={setOpenReparto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openReparto}
                    className="w-[300px] justify-between"
                  >
                    {selectedReparto === "all" ? "Seleziona un reparto..." : selectedReparto}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca reparto..." />
                    <CommandList>
                      <CommandEmpty>Nessun reparto trovato.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedReparto("all");
                            setOpenReparto(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedReparto === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Tutti
                        </CommandItem>
                        {reparti.map((r) => (
                          <CommandItem
                            key={String(r)}
                            value={String(r)}
                            onSelect={(currentValue) => {
                              setSelectedReparto(currentValue);
                              setOpenReparto(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedReparto === String(r) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {String(r)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedReparto === "all" ? (
              <Card><CardContent>Seleziona un reparto per vedere i dettagli.</CardContent></Card>
            ) : (
              FULL_QUESTIONS.map((q) => {
                const answers = answersGroupedByQuestion[q.id] || [];
                if (answers.length === 0) return null;
                return (
                  <Card key={q.id}>
                    <CardHeader>
                      <CardTitle>{q.label}</CardTitle>
                      <CardDescription>Risposte nel reparto {selectedReparto}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {answers.map((a, idx) => (
                          <div key={idx} className="flex justify-between p-2 border-b last:border-0">
                            <div className="font-medium">{a.lavoratore}</div>
                            <div className="text-sm text-muted-foreground">{renderAnswer(a.value)}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}