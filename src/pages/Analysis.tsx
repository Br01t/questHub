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
import { ArrowLeft, Search, Check, CalendarIcon, X, BarChart3, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  }, [responses, dateFrom, dateTo]);

  const workers = useMemo(
    () => Array.from(new Set(filteredResponses.map((r) => String(r.answers?.meta_nome)).filter((n) => n !== "undefined" && n !== "null"))).sort(),
    [filteredResponses]
  );

  const reparti = useMemo(
    () => Array.from(new Set(filteredResponses.map((r) => r.answers?.meta_reparto).filter(Boolean))).sort(),
    [filteredResponses]
  );

  const responsesByWorker = useMemo(() => {
    if (selectedWorker === "all") return [];
    return filteredResponses.filter((r) => r.answers?.meta_nome === selectedWorker);
  }, [filteredResponses, selectedWorker]);

  const responsesByReparto = useMemo(() => {
    if (selectedReparto === "all") return [];
    return filteredResponses.filter((r) => r.answers?.meta_reparto === selectedReparto);
  }, [filteredResponses, selectedReparto]);

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

  const generatePDF = () => {
      const doc = new jsPDF();
      const title =
        tab === "workers"
          ? selectedWorker === "all"
            ? "Analisi per lavoratore (tutti)"
            : `Analisi per lavoratore: ${selectedWorker}`
          : selectedReparto === "all"
          ? "Analisi per reparto (tutti)"
          : `Analisi per reparto: ${selectedReparto}`;

      // Titolo principale
      doc.setFontSize(16);
      doc.text("Report Analisi VDT", 14, 20);
      doc.setFontSize(12);
      doc.text(title, 14, 30);

      // Se ci sono filtri data
      if (dateFrom || dateTo) {
        doc.setFontSize(10);
        doc.text(
          `Periodo: ${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "..."} → ${
            dateTo ? format(dateTo, "dd/MM/yyyy") : "..."
          }`,
          14,
          38
        );
      }

      let y = 45; // punto iniziale

      if (tab === "workers") {
        // se nessun lavoratore selezionato
        if (selectedWorker === "all") {
          doc.text("Seleziona un lavoratore per esportare i dati.", 14, y);
        } else {
          responsesByWorker.forEach((resp, i) => {
            doc.setFontSize(12);
            doc.text(`${i + 1}. ${resp.answers?.meta_nome || "Sconosciuto"}`, 14, y);
            y += 6;
            doc.setFontSize(9);
            doc.text(
              `Compilato: ${
                resp.createdAt?.toDate
                  ? format(resp.createdAt.toDate(), "dd/MM/yyyy HH:mm")
                  : "N/D"
              }`,
              14,
              y
            );
            y += 4;

            doc.text(
              `Data creazione report: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
              14,
              y
            );
            y += 6;

            // Tabella delle risposte
            const tableData = FULL_QUESTIONS.map((q) => [
              q.label,
              resp.answers?.[q.id] ? String(resp.answers?.[q.id]) : "—",
            ]);

            autoTable(doc, {
              startY: y + 2,
              head: [["Domanda", "Risposta"]],
              body: tableData,
              theme: "striped",
              styles: { fontSize: 8, cellPadding: 2 },
              columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 70 } },
            });

      const lastTableY =
                    ((doc as unknown) as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
                    y;
                  y = lastTableY + 10;
                });
              }
            } else if (tab === "reparti") {
              if (selectedReparto === "all") {
                doc.text("Seleziona un reparto per esportare i dati.", 14, y);
              } else {
                FULL_QUESTIONS.forEach((q) => {
                  const answers = answersGroupedByQuestion[q.id] || [];
                  if (answers.length === 0) return;
      
                  doc.setFontSize(11);
                  doc.text(q.label, 14, y);
                  y += 4;
      
                  const tableData = answers.map((a) => [
                    a.lavoratore,
                    Array.isArray(a.value) ? a.value.join(", ") : String(a.value),
                  ]);
      
                  autoTable(doc, {
                    startY: y,
                    head: [["Lavoratore", "Risposta"]],
                    body: tableData,
                    theme: "striped",
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 100 } },
                  });
      
                  y = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
            if (y > 270) doc.addPage(); // nuova pagina se serve
          });
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.text(
        `Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        14,
        290
      );

      // Salva il file
      doc.save(
        `report_${tab === "workers" ? "lavoratore" : "reparto"}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    };

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
            <div className="flex justify-end mb-4">
              <Button
                variant="default"
                className="gap-2"
                onClick={generatePDF}
                disabled={
                  (tab === "workers" && selectedWorker === "all") ||
                  (tab === "reparti" && selectedReparto === "all")
                }
              >
                <BarChart3 className="h-4 w-4" />
                Esporta PDF
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v: "workers" | "reparti") => setTab(v)}>
              <TabsList className="grid grid-cols-2 gap-2 w-full md:w-1/2">
                <TabsTrigger value="workers">Per Lavoratore</TabsTrigger>
                <TabsTrigger value="reparti">Per Reparto</TabsTrigger>
              </TabsList>

              {/* --- Per lavoratore --- */}
              <TabsContent value="workers" className="mt-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border w-full">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search className="h-5 w-5 text-primary shrink-0" />
                    <Popover open={openWorker} onOpenChange={setOpenWorker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openWorker}
                          className="w-full sm:w-[300px] justify-between"
                        >
                          {selectedWorker === "all" ? "Cerca..." : selectedWorker}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full sm:w-[300px] p-0">
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
                </div>

                {selectedWorker === "all" ? (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Seleziona un lavoratore per vedere i dettagli delle risposte.</p>
                    </CardContent>
                  </Card>
                ) : (
                  responsesByWorker.map((resp) => (
                    <Card key={resp.id} className="shadow-lg border-2">
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                        <CardTitle className="text-xl">{resp.answers?.meta_nome}</CardTitle>
                        <CardDescription className="text-sm">
                          Compilato il {resp.createdAt?.toDate ? format(resp.createdAt.toDate(), "dd/MM/yyyy 'alle' HH:mm") : "Data non disponibile"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 overflow-x-hidden px-2 sm:px-4">
                        <div className="grid gap-4">
                          {FULL_QUESTIONS.map((q) => (
                            <div key={q.id} className="p-3 rounded-lg bg-card border-2 hover:border-primary/30 transition-colors break-words overflow-hidden text-wrap">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                <div className="font-medium">{q.label}</div>
                                <div className="text-sm text-muted-foreground max-w-full break-all">
                                  {renderAnswer(resp.answers?.[q.id])}
                                </div>
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
              <TabsContent value="reparti" className="mt-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border w-full">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search className="h-5 w-5 text-primary shrink-0" />
                    <Popover open={openReparto} onOpenChange={setOpenReparto}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openReparto}
                          className="w-full sm:w-[300px] justify-between"
                        >
                          {selectedReparto === "all" ? "Cerca..." : selectedReparto}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full sm:w-[300px] p-0">
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
                </div>

                {selectedReparto === "all" ? (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Seleziona un reparto per vedere i dettagli.</p>
                    </CardContent>
                  </Card>
                ) : (
                  FULL_QUESTIONS.map((q) => {
                    const answers = answersGroupedByQuestion[q.id] || [];
                    if (answers.length === 0) return null;
                    return (
                      <Card key={q.id} className="shadow-lg border-2">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                          <CardTitle className="text-lg">{q.label}</CardTitle>
                          <CardDescription>Risposte nel reparto {selectedReparto}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 overflow-x-hidden px-2 sm:px-4">
                          <div className="space-y-2">
                            {answers.map((a, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-accent/5 transition-colors rounded break-words text-wrap">
                                <div className="font-medium text-sm">{a.lavoratore}</div>
                                <div className="text-sm text-muted-foreground max-w-full break-all">{renderAnswer(a.value)}</div>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}