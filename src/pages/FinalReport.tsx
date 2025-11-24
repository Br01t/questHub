import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
  companyId?: string | null;
  siteId?: string | null;
  userEmail?: string | null;
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
  {
    id: "6.3",
    label: "6.3 Dimensioni/disposizione schermo/tastiera/mouse (SI/NO)",
  },
  { id: "6_note", label: "6 - Necessità di intervento (note)" },
  { id: "7.1", label: "7.1 Altezza sedile regolabile" },
  { id: "7.2", label: "7.2 Inclinazione sedile regolabile" },
  { id: "7.3", label: "7.3 Schienale con supporto dorso-lombare" },
  { id: "7.4", label: "7.4 Schienale regolabile in altezza" },
  {
    id: "7.5",
    label: "7.5 Schienale/seduta bordi smussati/materiali appropriati",
  },
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

export default function FinalReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filteredResponses: rawResponses, selectedWorker } = location.state || {};

  const filteredResponses: ResponseDoc[] = useMemo(() => {
    if (!rawResponses) return [];

    return rawResponses.map((r) => ({
      ...r,
      createdAt: r.createdAt && typeof r.createdAt.toDate !== "function" ? { toDate: () => new Date(r.createdAt.seconds * 1000) } : r.createdAt,
    }));
  }, [rawResponses]);

  const [notes, setNotes] = useState("");

  const selectedCompanyData = JSON.parse(localStorage.getItem("selectedCompanyData") || "{}");

  const responsesByWorker = (filteredResponses || []).filter((r) => r.answers?.meta_nome === selectedWorker);

  const dates = responsesByWorker.map((r) => {
    const c = r.createdAt;
    try {
      if (!c) return "N/D";
      if (typeof c === "object" && typeof c.toDate === "function") {
        return format(c.toDate(), "dd/MM/yyyy HH:mm");
      }
      if (c instanceof Date) {
        return format(c, "dd/MM/yyyy HH:mm");
      }
      if (typeof c === "string" || typeof c === "number") {
        return format(new Date(c), "dd/MM/yyyy HH:mm");
      }
      return "N/D";
    } catch {
      return "N/D";
    }
  });

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

  const isTextQuestion = (id: string): boolean => id.includes("_note") || id.startsWith("meta_") || id === "foto_postazione";

  const hasDifferentAnswers = (questionId: string): boolean => {
    if (isTextQuestion(questionId)) return false;
    const values = responsesByWorker.map((r) => renderAnswer(r.answers?.[questionId]));
    return new Set(values).size > 1;
  };

  const generatePDF = () => {
    if (!responsesByWorker.length) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const marginLeft = 14;
    let yPos = 20;

    // Intestazione con azienda, sede e utente
    doc.setFontSize(16);
    doc.text(`Relazione finale lavoratore: ${selectedWorker}`, marginLeft, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.text(`Azienda: ${selectedCompanyData?.companyName || "N/D"}`, marginLeft, yPos);
    yPos += 6;
    doc.text(`Sede: ${selectedCompanyData?.siteName || "N/D"}`, marginLeft, yPos);
    yPos += 6;
    doc.text(`Utente compilatore: ${responsesByWorker[0]?.userEmail || "N/D"}`, marginLeft, yPos);
    yPos += 8;

    // doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, yPos);
    // yPos += 10;

    const SECTION_TITLES: Record<string, string> = {
      meta_nome: "INTESTAZIONE",
      "1.1": "1) ORGANIZZAZIONE DEL LAVORO",
      "2.1": "2) MICROCLIMA",
      "3.1": "3) ILLUMINAZIONE",
      "4.1": "4) RUMORE",
      "5.1": "5) AMBIENTE DI LAVORO",
      "6.1": "6) PIANO DI LAVORO",
      "7.1": "7) SEDILE DI LAVORO",
      "8.1": "8) SCHERMO",
      "9.1": "9) TASTIERA E DISPOSITIVI DI INPUT",
      "10.1": "10) SOFTWARE",
    };

    type RowCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
    const body: {
      row: RowCell[];
      questionId?: string;
      isSectionHeader?: boolean;
    }[] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = Object.entries(SECTION_TITLES).find(([id]) => q.id === id)?.[1];

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

      const answers = responsesByWorker.map((r) => {
        const val = r.answers?.[q.id];
        if (val === undefined || val === null || val === "") return "—";
        if (Array.isArray(val)) return val.join(", ");
        const str = String(val);
        if (str.startsWith("data:image/") || str.startsWith("http")) {
          return "[Immagine]";
        }
        return str;
      });

      body.push({ row: [q.label, ...answers], questionId: q.id });
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Domanda", ...dates]],
      body: body.map((b) => b.row),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
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

    if (notes.trim()) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("Note aggiuntive:", marginLeft, finalY);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(notes, 180);
      doc.text(splitNotes, marginLeft, finalY + 6);
    }

    doc.save(`Relazione_${selectedWorker}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)}>
        ← Torna indietro
      </Button>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Intestazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div>Azienda: {selectedCompanyData?.companyName || "N/D"}</div>
          <div>Sede: {selectedCompanyData?.siteName || "N/D"}</div>
          <div>Utente compilatore: {responsesByWorker[0]?.userEmail || "N/D"}</div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Relazione finale: {selectedWorker}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-accent/30 border-b">
                <th className="text-left p-2 border-r font-semibold">Domande</th>
                {dates.map((d, idx) => (
                  <th key={idx} className="text-center p-2 border-r font-semibold">
                    Data: {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const SECTION_TITLES: Record<string, string> = {
                  meta_nome: "INTESTAZIONE",
                  "1.1": "1) ORGANIZZAZIONE DEL LAVORO",
                  "2.1": "2) MICROCLIMA",
                  "3.1": "3) ILLUMINAZIONE",
                  "4.1": "4) RUMORE",
                  "5.1": "5) AMBIENTE DI LAVORO",
                  "6.1": "6) PIANO DI LAVORO",
                  "7.1": "7) SEDILE DI LAVORO",
                  "8.1": "8) SCHERMO",
                  "9.1": "9) TASTIERA E DISPOSITIVI DI INPUT",
                  "10.1": "10) SOFTWARE",
                };

                let currentSection = "";
                const rows: JSX.Element[] = [];

                FULL_QUESTIONS.forEach((q) => {
                  const sectionTitle = Object.entries(SECTION_TITLES).find(([id]) => q.id === id)?.[1];

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
                      <td className="p-2 border-r font-medium">{q.label}</td>
                      {responsesByWorker.map((resp) => (
                        <td key={resp.id + q.id} className="p-2 text-center">
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

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Note aggiuntive</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Inserisci note aggiuntive..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
        </CardContent>
      </Card>

      <Button variant="default" onClick={generatePDF} disabled={!responsesByWorker.length}>
        📄 Genera PDF
      </Button>
    </div>
  );
}