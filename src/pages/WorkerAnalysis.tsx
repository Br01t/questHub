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
import { useNavigate } from "react-router-dom";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
  companyId?: string | null;
  siteId?: string | null;
};

interface UserProfile {
  uid?: string;
  displayName?: string;
  email?: string;
  roles?: string[];
  companyId?: string;
  siteId?: string;
}

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

interface WorkerAnalysisProps {
  filteredResponses: ResponseDoc[];
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  availableCompanies: { id: string; name: string }[];
  availableSites: { id: string; name: string; companyId: string }[];
  selectedCompanyFilter: string;
  setSelectedCompanyFilter: (value: string) => void;
  selectedSiteFilter: string;
  setSelectedSiteFilter: (value: string) => void;
  selectedQuestionnaire: Questionnaire | null;
}

// Le domande vengono ora dal questionario selezionato

export default function WorkerAnalysis({
  filteredResponses,
  userProfile,
  isSuperAdmin,
  availableCompanies,
  availableSites,
  selectedCompanyFilter,
  setSelectedCompanyFilter,
  selectedSiteFilter,
  setSelectedSiteFilter,
  selectedQuestionnaire,
}: WorkerAnalysisProps) {
  const FULL_QUESTIONS = selectedQuestionnaire?.questions || [];
  const navigate = useNavigate();
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [openWorker, setOpenWorker] = useState(false);

  const workers = useMemo(
    () =>
      Array.from(new Set(filteredResponses.map((r) => String(r.answers?.meta_nome)).filter((n) => n && n !== "undefined" && n !== "null"))).sort(),
    [filteredResponses]
  );

  const responsesByWorker = useMemo(() => {
    if (selectedWorker === "all") return [];
    return filteredResponses
      .filter((r) => r.answers?.meta_nome === selectedWorker)
      .sort((a, b) => (a.createdAt?.toDate()?.getTime() || 0) - (b.createdAt?.toDate()?.getTime() || 0));
  }, [filteredResponses, selectedWorker]);

  const dates = responsesByWorker.map((r) => (r.createdAt?.toDate() ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "N/D"));

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    const str = String(val);

    if (str.startsWith("data:image/") || str.startsWith("http")) {
      return (
        <a href={str} target="_blank" rel="noopener noreferrer">
          <img src={str} alt="foto postazione" className="w-20 h-20 object-cover rounded-md mx-auto shadow-sm hover:scale-105 transition-transform" />
        </a>
      );
    }

    return str;
  };

  const renderAnswerForPDF = (val: AnswerValue): string => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    const str = String(val);

    if (str.startsWith("data:image/") || str.startsWith("http")) {
      return "[Immagine]";
    }
    return str;
  };

  const isTextQuestion = (id: string): boolean => id.includes("_note") || id.startsWith("meta_") || id === "foto_postazione";

  const hasDifferentAnswers = (questionId: string): boolean => {
    if (isTextQuestion(questionId)) return false;
    const values = responsesByWorker.map((r) => renderAnswer(r.answers?.[questionId]));
    return new Set(values).size > 1;
  };

  const generatePDF = () => {
    if (selectedWorker === "all" || responsesByWorker.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const marginLeft = 14;

    doc.setFontSize(16);
    doc.text(`Report questionari: ${selectedWorker}`, marginLeft, 20);
    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    type RowCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
    const body: {
      row: RowCell[];
      questionId?: string;
      isSectionHeader?: boolean;
    }[] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = q.section;
      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        body.push({
          row: [
            {
              content: sectionTitle,
              colSpan: responsesByWorker.length + 1,
              styles: {
                halign: "left",
                fillColor: [230, 230, 230],
                fontStyle: "bold",
              },
            },
          ],
          isSectionHeader: true,
        });
      }

      const answers = responsesByWorker.map((r) => renderAnswerForPDF(r.answers?.[q.id]));
      body.push({ row: [q.label, ...answers], questionId: q.id });
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...dates]],
      body: body.map((b) => b.row),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: (data) => {
        const rowMeta = body[data.row.index];
        if (!rowMeta) return;

        if (rowMeta.isSectionHeader) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = "bold";
          return;
        }

        if (rowMeta.questionId && hasDifferentAnswers(rowMeta.questionId) && data.section === "body") {
          data.cell.styles.fillColor = [255, 255, 180];
        }
      },
    });

    type DocWithAutoTable = { lastAutoTable?: { finalY?: number } };
    const lastY = ((doc as unknown as DocWithAutoTable).lastAutoTable?.finalY ?? 0) + 10;
    const lastResponse = responsesByWorker[responsesByWorker.length - 1];
    const foto = lastResponse?.answers?.["foto_postazione"];

    if (typeof foto === "string" && foto.startsWith("data:image/")) {
      try {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Foto della postazione", marginLeft, 20);
        doc.addImage(foto, "JPEG", marginLeft, 30, 180, 120);
      } catch (err) {
        console.warn("Impossibile aggiungere immagine al PDF:", err);
      }
    }

    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginLeft, 290);
    doc.save(`report_${selectedWorker}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div>
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

        {/* Pulsanti */}
        <div className="flex gap-2">
          <Button variant="default" className="gap-2" onClick={generatePDF} disabled={selectedWorker === "all"}>
            <BarChart3 className="h-4 w-4" />
            Esporta PDF
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigate("/final-report", {
                state: {
                  filteredResponses: responsesByWorker,
                  selectedWorker,
                },
              })
            }
            disabled={selectedWorker === "all"}
          >
            📝 Relazione finale
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <Popover open={openWorker} onOpenChange={setOpenWorker}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openWorker} className="w-full sm:w-[300px] justify-between">
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
                      <Check className={cn("mr-2 h-4 w-4", selectedWorker === "all" ? "opacity-100" : "opacity-0")} />
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
                        <Check className={cn("mr-2 h-4 w-4", selectedWorker === w ? "opacity-100" : "opacity-0")} />
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
                  <th className="text-left p-2 border-r font-semibold w-1/3">Domande</th>
                  {dates.map((d) => (
                    <th key={d} className="text-center p-2 border-r font-semibold">
                      Data:
                      {d}
                    </th>
                  ))}
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
                          <td colSpan={responsesByWorker.length + 1} className="p-2 font-semibold text-gray-800 uppercase tracking-wide">
                            {currentSection}
                          </td>
                        </tr>
                      );
                    }

                    const changed = hasDifferentAnswers(q.id);
                    rows.push(
                      <tr key={q.id} className={cn("border-b hover:bg-accent/10", changed ? "bg-yellow-100/70" : "")}>
                        <td className="p-2 border-r align-top font-medium">{q.label}</td>
                        {responsesByWorker.map((resp) => (
                          <td key={resp.id + q.id} className="p-2 text-center border-r align-top">
                            {renderAnswer(resp.answers?.[q.id])}
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