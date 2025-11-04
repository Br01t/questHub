import { useState, useMemo } from "react";
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
import { Search, Check, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
};

interface WorkerAnalysisProps {
  filteredResponses: ResponseDoc[];
}

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

export default function WorkerAnalysis({ filteredResponses }: WorkerAnalysisProps) {
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [openWorker, setOpenWorker] = useState(false);

  const workers = useMemo(
    () =>
      Array.from(
        new Set(
          filteredResponses
            .map((r) => String(r.answers?.meta_nome))
            .filter((n) => n && n !== "undefined" && n !== "null")
        )
      ).sort(),
    [filteredResponses]
  );

  const responsesByWorker = useMemo(() => {
    if (selectedWorker === "all") return [];
    return filteredResponses
      .filter((r) => r.answers?.meta_nome === selectedWorker)
      .sort(
        (a, b) =>
          (a.createdAt?.toDate()?.getTime() || 0) -
          (b.createdAt?.toDate()?.getTime() || 0)
      );
  }, [filteredResponses, selectedWorker]);

  const dates = responsesByWorker.map((r) =>
    r.createdAt?.toDate()
      ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm")
      : "N/D"
  );

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const isTextQuestion = (id: string): boolean =>
    id.includes("_note") || id.startsWith("meta_") || id === "foto_postazione";

  const hasDifferentAnswers = (questionId: string): boolean => {
    if (isTextQuestion(questionId)) return false;
    const values = responsesByWorker.map((r) => renderAnswer(r.answers?.[questionId]));
    return new Set(values).size > 1;
  };

  // 🔹 Esporta PDF
  const generatePDF = () => {
    if (selectedWorker === "all" || responsesByWorker.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.text(`Report questionari: ${selectedWorker}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, 14, 28);

    const body = FULL_QUESTIONS.map((q) => {
      const answers = responsesByWorker.map((r) => renderAnswer(r.answers?.[q.id]));
      return [q.label, ...answers];
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...dates]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      theme: "striped",
      didParseCell: (data) => {
        const q = FULL_QUESTIONS[data.row.index];
        if (hasDifferentAnswers(q.id) && data.section === "body") {
          data.cell.styles.fillColor = [255, 255, 180];
        }
      },
    });

    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 290);
    doc.save(`report_${selectedWorker}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Pulsante PDF */}
      <div className="flex justify-end mb-4">
        <Button
          variant="default"
          className="gap-2"
          onClick={generatePDF}
          disabled={selectedWorker === "all"}
        >
          <BarChart3 className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      {/* Selettore lavoratore */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
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
                        className={cn("mr-2 h-4 w-4", selectedWorker === "all" ? "opacity-100" : "opacity-0")}
                      />
                      Tutti
                    </CommandItem>
                    {workers.map((w) => (
                      <CommandItem
                        key={w}
                        value={w}
                        onSelect={(v) => {
                          setSelectedWorker(v);
                          setOpenWorker(false);
                        }}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", selectedWorker === w ? "opacity-100" : "opacity-0")}
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

      {/* Tabella comparativa */}
      {selectedWorker === "all" ? (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Seleziona un lavoratore per visualizzare e scaricare il report.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>{selectedWorker}</CardTitle>
            <CardDescription>Confronto questionari: {dates.join(", ")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-accent/30 border-b">
                  <th className="text-left p-2 border-r font-semibold w-1/3">Domanda</th>
                  {dates.map((d) => (
                    <th key={d} className="text-center p-2 border-r font-semibold">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FULL_QUESTIONS.map((q) => {
                  const changed = hasDifferentAnswers(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={cn(
                        "border-b hover:bg-accent/10",
                        changed ? "bg-yellow-100/70" : ""
                      )}
                    >
                      <td className="p-2 border-r align-top font-medium">{q.label}</td>
                      {responsesByWorker.map((resp) => (
                        <td key={resp.id + q.id} className="p-2 text-center border-r align-top">
                          {renderAnswer(resp.answers?.[q.id])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}