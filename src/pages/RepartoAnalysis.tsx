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
  userEmail?: string | null;
  userId?: string | null;
};

// ✅ Domande ufficiali (aggiornate da checklist)
const FULL_QUESTIONS: { id: string; label: string; section: string }[] = [
  {
    id: "meta_nome",
    label: "Nome del valutato (lavoratore o reparto)",
    section: "Intestazione",
  },
  { id: "meta_postazione", label: "Postazione n.", section: "Intestazione" },
  { id: "meta_reparto", label: "Ufficio / Reparto", section: "Intestazione" },

  {
    id: "1.1",
    label: "1.1 Ore di lavoro settimanali a VDT (abituali)",
    section: "1) ORGANIZZAZIONE DEL LAVORO",
  },
  {
    id: "1.2",
    label: "1.2 Pause/cambi attività 15' ogni 120' (SI/NO)",
    section: "1) ORGANIZZAZIONE DEL LAVORO",
  },
  {
    id: "1.3",
    label: "1.3 Tipo di lavoro prevalente",
    section: "1) ORGANIZZAZIONE DEL LAVORO",
  },
  {
    id: "1.4",
    label: "1.4 Informazione al lavoratore per uso VDT (SI/NO)",
    section: "1) ORGANIZZAZIONE DEL LAVORO",
  },

  {
    id: "2.1",
    label: "2.1 Modalità ricambio aria (naturale/artificiale)",
    section: "2) MICROCLIMA",
  },
  {
    id: "2.2",
    label: "2.2 Possibilità di regolare la temperatura",
    section: "2) MICROCLIMA",
  },
  {
    id: "2.3",
    label: "2.3 Possibilità di regolare l'umidità",
    section: "2) MICROCLIMA",
  },
  {
    id: "2.4",
    label: "2.4 Eccesso di calore dalle attrezzature (SI/NO)",
    section: "2) MICROCLIMA",
  },

  {
    id: "3.1",
    label: "3.1 Tipo di luce (naturale/artificiale/mista)",
    section: "3) ILLUMINAZIONE",
  },
  {
    id: "3.2_nat",
    label: "3.2 - Regolazione luce naturale",
    section: "3) ILLUMINAZIONE",
  },
  {
    id: "3.2_art",
    label: "3.2 - Regolazione luce artificiale",
    section: "3) ILLUMINAZIONE",
  },
  {
    id: "3.3",
    label: "3.3 Posizione rispetto alla sorgente naturale",
    section: "3) ILLUMINAZIONE",
  },

  {
    id: "4.1",
    label: "4.1 Eventuale misura rumore (dB(A))",
    section: "4) RUMORE AMBIENTALE",
  },
  {
    id: "4.2",
    label: "4.2 Disturbo attenzione/comunicazione (SI/NO)",
    section: "4) RUMORE AMBIENTALE",
  },

  {
    id: "5.1",
    label: "5.1 Spazio di lavoro/manovra adeguato (SI/NO)",
    section: "5) SPAZIO",
  },
  {
    id: "5.2",
    label: "5.2 Percorsi liberi da ostacoli (SI/NO)",
    section: "5) SPAZIO",
  },

  {
    id: "6.1",
    label: "6.1 Superficie del piano adeguata (SI/NO)",
    section: "6) PIANO DI LAVORO",
  },
  {
    id: "6.2",
    label: "6.2 Altezza del piano 70-80cm (SI/NO)",
    section: "6) PIANO DI LAVORO",
  },
  {
    id: "6.3",
    label: "6.3 Disposizione schermo/tastiera/mouse adeguata (SI/NO)",
    section: "6) PIANO DI LAVORO",
  },

  {
    id: "7.1",
    label: "7.1 Altezza sedile regolabile",
    section: "7) SEDILE DI LAVORO",
  },
  {
    id: "7.2",
    label: "7.2 Inclinazione sedile regolabile",
    section: "7) SEDILE DI LAVORO",
  },
  {
    id: "7.3",
    label: "7.3 Schienale con supporto dorso-lombare",
    section: "7) SEDILE DI LAVORO",
  },
  {
    id: "7.4",
    label: "7.4 Schienale regolabile in altezza",
    section: "7) SEDILE DI LAVORO",
  },
  {
    id: "7.5",
    label: "7.5 Schienale/seduta bordi smussati/materiali appropriati",
    section: "7) SEDILE DI LAVORO",
  },
  {
    id: "7.6",
    label: "7.6 Presenza di ruote/meccanismo spostamento",
    section: "7) SEDILE DI LAVORO",
  },

  {
    id: "8.1",
    label: "8.1 Monitor orientabile/inclinabile",
    section: "8) SCHERMO VIDEO",
  },
  {
    id: "8.2",
    label: "8.2 Immagine stabile, senza sfarfallio",
    section: "8) SCHERMO VIDEO",
  },
  {
    id: "8.3",
    label: "8.3 Risoluzione/luminosità regolabili",
    section: "8) SCHERMO VIDEO",
  },
  {
    id: "8.4",
    label: "8.4 Contrasto/luminosità adeguati",
    section: "8) SCHERMO VIDEO",
  },
  {
    id: "8.5",
    label: "8.5 Presenza di riflessi o riverberi",
    section: "8) SCHERMO VIDEO",
  },
  {
    id: "8.6",
    label: "8.6 Note su posizione dello schermo",
    section: "8) SCHERMO VIDEO",
  },

  {
    id: "9.1",
    label: "9.1 Tastiera e mouse separati dallo schermo",
    section: "9) TASTIERA",
  },
  { id: "9.2", label: "9.2 Tastiera inclinabile", section: "9) TASTIERA" },
  {
    id: "9.3",
    label: "9.3 Spazio per appoggiare avambracci",
    section: "9) TASTIERA",
  },
  { id: "9.4", label: "9.4 Simboli/tasti leggibili", section: "9) TASTIERA" },

  {
    id: "10.1",
    label: "10.1 Software adeguato e di facile utilizzo (SI/NO)",
    section: "10) INTERFACCIA UOMO-MACCHINA",
  },
  {
    id: "10_2",
    label: "10.2 Osservazioni (eventuali)",
    section: "10) INTERFACCIA UOMO-MACCHINA",
  },

  {
    id: "foto_postazione",
    label: "Foto della postazione (URL/nota)",
    section: "Fine",
  },
];

// ✅ Mappa per il titolo sezione (per PDF o tabella)
const SECTION_TITLES: Record<string, string> = {};
FULL_QUESTIONS.forEach((q) => {
  if (!SECTION_TITLES[q.id]) SECTION_TITLES[q.id] = q.section;
});

interface RepartoAnalysisProps {
  filteredResponses: ResponseDoc[];
  dateFrom?: Date;
  dateTo?: Date;
  availableCompanies: { id: string; name: string }[];
  availableSites: { id: string; name: string; companyId: string }[];
  selectedCompanyFilter: string;
  setSelectedCompanyFilter: (value: string) => void;
  selectedSiteFilter: string;
  setSelectedSiteFilter: (value: string) => void;
}

export default function RepartoAnalysis({
  filteredResponses,
  dateFrom,
  dateTo,
  availableCompanies,
  availableSites,
  selectedCompanyFilter,
  setSelectedCompanyFilter,
  selectedSiteFilter,
  setSelectedSiteFilter,
}: RepartoAnalysisProps) {
  const [selectedReparto, setSelectedReparto] = useState<string>("all");
  const [openReparto, setOpenReparto] = useState(false);

  const reparti = useMemo(() => {
    const repartiEstratti = filteredResponses
      .map((r) => r.answers?.meta_reparto)
      .filter(Boolean);

    console.log("🧭 meta_reparto trovati nei dati:", repartiEstratti);

    const repartiUnici = Array.from(new Set(repartiEstratti)).sort();

    console.log("✅ Reparti unici per la tendina:", repartiUnici);

    return repartiUnici;
  }, [filteredResponses]);

  const responsesByReparto = useMemo(() => {
    if (selectedReparto === "all") return [];

    const selezione = String(selectedReparto || "")
      .trim()
      .toLowerCase();

    const filtered = filteredResponses.filter((r) => {
      const reparto = String(r.answers?.meta_reparto || "")
        .trim()
        .toLowerCase();
      return reparto === selezione;
    });

    console.log("🎯 selectedReparto (raw):", selectedReparto);
    console.log("🔎 selectedReparto (normalized):", selezione);
    console.log("📦 filteredResponses length:", filteredResponses.length);
    // mostra qualche esempio (max 5) per capire cosa contiene
    console.log(
      "📂 filtered (sample up to 5):",
      filtered.slice(0, 5).map((r) => ({
        id: r.id,
        meta_reparto: r.answers?.meta_reparto,
        meta_nome: r.answers?.meta_nome,
        answers: r.answers,
        createdAt: r.createdAt?.toDate?.() ?? r.createdAt,
      }))
    );
    console.log("📊 filtered length:", filtered.length);

    return filtered;
  }, [filteredResponses, selectedReparto]);

  const workers = useMemo(
    () =>
      Array.from(
        new Set(
          responsesByReparto
            .map((r) => String(r.answers?.meta_nome))
            .filter((n) => n && n !== "undefined" && n !== "null")
        )
      ).sort(),
    [responsesByReparto]
  );

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null) return "—";
    if (Array.isArray(val)) {
      if (val.length === 0) return "—";
      return val.join(", ");
    }
    const str = String(val).trim();
    if (!str || str === "undefined" || str === "null") return "—";
    return str;
  };

  // 🔹 PDF generation aligned with WorkerAnalysis style
  const generatePDF = () => {
    if (selectedReparto === "all" || responsesByReparto.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const marginLeft = 14;

    doc.setFontSize(16);
    doc.text(`Report reparto: ${selectedReparto}`, marginLeft, 20);
    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    const body: string[][] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = Object.entries(SECTION_TITLES).find(
        ([id]) => q.id === id
      )?.[1];
      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        body.push([sectionTitle, ...Array(workers.length).fill("")]);
      }

      const answers = responsesByReparto.map((r) =>
        renderAnswer(r.answers?.[q.id])
      );
      console.log("🔍 Domanda:", q.id, "=>", answers);
      if (answers.every((a) => a === "—")) return;
      body.push([q.label, ...answers]);
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...workers]],
      body,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: (data) => {
        if (body[data.row.index][0] === currentSection) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.setFontSize(8);
    doc.text(
      `Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      marginLeft,
      290
    );

    doc.save(
      `report_reparto_${selectedReparto}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtri e Pulsante PDF */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        {/* Filtri Azienda/Sede */}
        {/* <div className="flex flex-wrap gap-2">
          {availableCompanies.length > 0 && (
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                setSelectedCompanyFilter(e.target.value);
                setSelectedSiteFilter("all");
              }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Tutte le aziende</option>
              {availableCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}

          {availableSites.filter(s => selectedCompanyFilter === "all" || s.companyId === selectedCompanyFilter).length > 0 && (
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">Tutte le sedi</option>
              {availableSites
                .filter(s => selectedCompanyFilter === "all" || s.companyId === selectedCompanyFilter)
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
            </select>
          )}
        </div> */}

        {/* Pulsante export */}
        <Button
          variant="default"
          className="gap-2"
          onClick={generatePDF}
          disabled={selectedReparto === "all"}
        >
          <BarChart3 className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      {/* Selettore reparto */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
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
                          selectedReparto === "all"
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      Tutti
                    </CommandItem>
                    {reparti.map((r) => (
                      <CommandItem
                        key={String(r)}
                        value={String(r)}
                        onSelect={(v) => {
                          setSelectedReparto(v);
                          setOpenReparto(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedReparto === String(r)
                              ? "opacity-100"
                              : "opacity-0"
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

      {/* Tabella comparativa */}
      {selectedReparto === "all" ? (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Seleziona un reparto per visualizzare il report.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>{selectedReparto}</CardTitle>
            <CardDescription>
              Confronto risposte dei lavoratori nel reparto
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-accent/30 border-b">
                  <th className="text-left p-2 border-r font-semibold w-1/3">
                    Domanda
                  </th>
                  {workers.map((w) => (
                    <th
                      key={w}
                      className="text-center p-2 border-r font-semibold"
                    >
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let currentSection = "";
                  const rows: JSX.Element[] = [];
                  FULL_QUESTIONS.forEach((q) => {
                    const sectionTitle = Object.entries(SECTION_TITLES).find(
                      ([id]) => q.id === id
                    )?.[1];
                    if (sectionTitle && sectionTitle !== currentSection) {
                      currentSection = sectionTitle;
                      rows.push(
                        <tr
                          key={`section-${currentSection}`}
                          className="bg-gray-200 text-left border-t-4 border-gray-300"
                        >
                          <td
                            colSpan={workers.length + 1}
                            className="p-2 font-semibold text-gray-800 uppercase tracking-wide"
                          >
                            {currentSection}
                          </td>
                        </tr>
                      );
                    }

                    const answers = responsesByReparto.map((r) => {
                      const val = r.answers?.[q.id];

                      if (
                        q.id === "foto_postazione" &&
                        typeof val === "string" &&
                        val.startsWith("data:image")
                      ) {
                        return (
                          <img
                            src={val}
                            alt={`Foto ${r.answers?.meta_nome || ""}`}
                            className="mx-auto h-16 w-16 object-cover rounded"
                          />
                        );
                      }

                      return renderAnswer(val);
                    });

                    if (answers.every((a) => a === "—")) return;

                    rows.push(
                      <tr key={q.id} className="border-b hover:bg-accent/10">
                        <td className="p-2 border-r align-top font-medium">
                          {q.label}
                        </td>
                        {answers.map((a, idx) => (
                          <td
                            key={idx + q.id}
                            className="p-2 text-center border-r align-top"
                          >
                            {a}
                          </td>
                        ))}
                      </tr>
                    );
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
