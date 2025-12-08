import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  companyIds?: string[];
  siteIds?: string[];
};

// Le domande vengono ora dal questionario selezionato

interface QuestionItem {
  id: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  section?: string;
}

interface Questionnaire {
  id: string;
  name: string;
  sector: string;
  questions: QuestionItem[];
  isActive?: boolean;
  createdAt?: Date;
}

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
  selectedQuestionnaire: Questionnaire | null;
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
  selectedQuestionnaire,
}: RepartoAnalysisProps) {
  const FULL_QUESTIONS = selectedQuestionnaire?.questions || [];
  const [selectedReparto, setSelectedReparto] = useState<string>("all");
  const [openReparto, setOpenReparto] = useState(false);

  // Crea mappa reparto -> azienda per mostrare l'azienda nel dropdown
  const repartiWithCompany = useMemo(() => {
    const repartiMap = new Map<string, { reparto: string; companyName: string }>();
    
    filteredResponses.forEach((r) => {
      const reparto = r.answers?.meta_reparto;
      if (!reparto) return;
      
      const repartoStr = String(reparto);
      if (!repartiMap.has(repartoStr)) {
        // Prova sia companyIds (array) che meta_azienda (dalla risposta)
        const companyId = r.companyIds?.[0];
        const metaAzienda = r.answers?.meta_azienda;
        
        let companyName = "";
        if (companyId) {
          companyName = availableCompanies.find((c) => c.id === companyId)?.name || "";
        }
        // Se non trovato via ID, usa meta_azienda direttamente
        if (!companyName && metaAzienda) {
          companyName = String(metaAzienda);
        }
        
        repartiMap.set(repartoStr, { reparto: repartoStr, companyName });
      }
    });
    
    return Array.from(repartiMap.values()).sort((a, b) => a.reparto.localeCompare(b.reparto));
  }, [filteredResponses, availableCompanies]);

  const reparti = useMemo(() => repartiWithCompany.map(r => r.reparto), [repartiWithCompany]);

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
      Array.from(new Set(responsesByReparto.map((r) => String(r.answers?.meta_nome)).filter((n) => n && n !== "undefined" && n !== "null"))).sort(),
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

    const dates = responsesByReparto
      .map((r) => r.createdAt?.toDate?.() ?? r.createdAt)
      .filter(Boolean)
      .map((d) => format(d as Date, "dd/MM/yyyy"));

    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    const body: any[] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = q.section;
      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        body.push([
          {
            content: currentSection,
            colSpan: workers.length + 1,
            styles: {
              fillColor: [230, 230, 230],
              fontStyle: "bold",
              halign: "left",
            },
          },
        ]);
      }

      const answers = responsesByReparto.map((r) => {
        const val = r.answers?.[q.id];
        if (q.id === "foto_postazione" && typeof val === "string" && val.startsWith("data:image")) {
          return { content: "", styles: {} }; // Placeholder: jspdf-autotable non gestisce direttamente immagini base64, vedi sotto
        }
        return renderAnswer(val);
      });

      if (answers.every((a) => a === "—")) return;

      body.push([{ content: q.label, styles: { fontStyle: "bold", halign: "left" } }, ...answers]);
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...workers]],
      body,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "middle",
        halign: "center",
      },
      didParseCell: (data) => {
        // Righe sezione con background grigio
        if (typeof data.cell.raw === 'object' && data.cell.raw && 'colSpan' in data.cell.raw) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // Footer con data generazione
    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginLeft, 290);

    doc.save(`report_reparto_${selectedReparto}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
        <Button variant="default" className="gap-2" onClick={generatePDF} disabled={selectedReparto === "all"}>
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
              <Button variant="outline" role="combobox" aria-expanded={openReparto} className="w-full sm:w-[300px] justify-between">
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
                      <Check className={cn("mr-2 h-4 w-4", selectedReparto === "all" ? "opacity-100" : "opacity-0")} />
                      Tutti
                    </CommandItem>
                    {repartiWithCompany.map((item) => (
                      <CommandItem
                        key={item.reparto}
                        value={item.reparto}
                        onSelect={(v) => {
                          setSelectedReparto(v);
                          setOpenReparto(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedReparto === item.reparto ? "opacity-100" : "opacity-0")} />
                        <span>{item.reparto}</span>
                        {item.companyName && <span className="ml-2 text-muted-foreground text-xs">({item.companyName})</span>}
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
          <CardContent className="py-12 text-center text-muted-foreground">Seleziona un reparto per visualizzare il report.</CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>{selectedReparto}</CardTitle>
            <CardDescription>Confronto risposte dei lavoratori nel reparto</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-accent/30 border-b">
                  <th className="text-left p-2 border-r font-semibold w-1/3">Domanda</th>
                  {workers.map((w) => {
                    const response = responsesByReparto.find((r) => r.answers?.meta_nome === w);
                    console.log("🧾 Trovata risposta per lavoratore", w, response);
                    const reparto = response?.answers?.meta_reparto;
                    const companyId = response?.companyIds?.[0];
                    const siteId = response?.siteIds?.[0];

                    const companyName = companyId && availableCompanies.find((c) => c.id === companyId)?.name;

                    const siteName = siteId && availableSites.find((s) => s.id === siteId)?.name;

                    return (
                      <th key={w} className="text-center p-2 border-r font-semibold">
                        {w}
                        {companyName ? ` - ${companyName}` : ""}
                        {siteName ? ` (${siteName})` : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let currentSection = "";
                  const rows: JSX.Element[] = [];
                  FULL_QUESTIONS.forEach((q) => {
                    const sectionTitle = q.section;
                    if (sectionTitle && sectionTitle !== currentSection) {
                      currentSection = sectionTitle;
                      rows.push(
                        <tr key={`section-${currentSection}`} className="bg-gray-200 text-left border-t-4 border-gray-300">
                          <td colSpan={workers.length + 1} className="p-2 font-semibold text-gray-800 uppercase tracking-wide">
                            {currentSection}
                          </td>
                        </tr>
                      );
                    }

                    const answers = responsesByReparto.map((r) => {
                      const val = r.answers?.[q.id];

                      if (q.id === "foto_postazione" && typeof val === "string" && val.startsWith("data:image")) {
                        return <img src={val} alt={`Foto ${r.answers?.meta_nome || ""}`} className="mx-auto h-16 w-16 object-cover rounded" />;
                      }

                      return renderAnswer(val);
                    });

                    if (answers.every((a) => a === "—")) return;

                    rows.push(
                      <tr key={q.id} className="border-b hover:bg-accent/10">
                        <td className="p-2 border-r align-top font-medium">{q.label}</td>
                        {answers.map((a, idx) => (
                          <td key={idx + q.id} className="p-2 text-center border-r align-top">
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