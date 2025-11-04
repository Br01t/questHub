import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00bfff", "#ff69b4", "#a52a2a"];

interface Question {
  id: string;
  section: string;
  type: 'text' | 'select' | 'radio' | 'checkbox-multi' | 'textarea';
  question: string;
  options?: string[];
}

const questions: Question[] = [
  // Header data fields
  { id: 'meta_nome', section: 'Intestazione', type: 'text' as 'text' | 'select' | 'radio' | 'checkbox-multi' | 'textarea', question: 'Nome del valutato (lavoratore o reparto)' },
  { id: 'meta_postazione', section: 'Intestazione', type: 'text', question: 'Postazione n.' },
  { id: 'meta_reparto', section: 'Intestazione', type: 'text', question: 'Ufficio / Reparto' },

  // 1 ORGANIZZAZIONE DEL LAVORO
  { id: '1.1', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'select', question: 'Ore di lavoro settimanali a VDT (abituali)', options: ['<20', '>20'] },
  { id: '1.2', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: 'La mansione prevede pause/cambi attività di 15 minuti ogni 120 minuti di applicazione continuativa al VDT', options: ['SI', 'NO'] },
  { id: '1.2_note', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },
  { id: '1.3', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'checkbox-multi', question: 'Tipo di lavoro prevalente', options: ['inserimento dati', 'acquisizione dati', 'videoscrittura', 'programmazione'] },
  { id: '1.4', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: 'È stata effettuata informazione al lavoratore per il corretto uso del VDT', options: ['SI', 'NO'] },
  { id: '1.4_note', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 2 MICROCLIMA
  { id: '2.1', section: '2) MICROCLIMA', type: 'radio', question: "Modalità per il ricambio d'aria dell'ambiente", options: ['naturale', 'artificiale'] },
  { id: '2.2', section: '2) MICROCLIMA', type: 'radio', question: "Possibilità di regolare la temperatura dell'ambiente", options: ['presente', 'non presente'] },
  { id: '2.3', section: '2) MICROCLIMA', type: 'radio', question: "Possibilità di regolare l'umidità dell'ambiente", options: ['presente', 'non presente'] },
  { id: '2.4', section: '2) MICROCLIMA', type: 'radio', question: 'Le attrezzature in dotazione producono eccesso di calore che comporta discomfort termico', options: ['SI', 'NO'] },
  { id: '2.4_note', section: '2) MICROCLIMA', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 3 ILLUMINAZIONE
  { id: '3.1', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Tipo di luce', options: ['naturale', 'artificiale', 'mista'] },
  { id: '3.2_nat', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce naturale', options: ['dispositivo copertura regolabile', 'copertura non regolabile', 'nessun dispositivo'] },
  { id: '3.2_art', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce artificiale', options: ['variatori di luminosità', 'accensione a isole', 'accensione centralizzata'] },
  { id: '3.3', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Posizione della postazione rispetto alla sorgente di luce naturale', options: ['perpendicolare', 'frontale', 'di spalle'] },
  { id: '3_note', section: '3) ILLUMINAZIONE', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 4 RUMORE AMBIENTALE
  { id: '4.1', section: '4) RUMORE AMBIENTALE', type: 'text', question: 'Eventuale misura (dB(A))' },
  { id: '4.2', section: '4) RUMORE AMBIENTALE', type: 'radio', question: "Può disturbare l'attenzione e la comunicazione verbale", options: ['SI', 'NO'] },
  { id: '4_note', section: '4) RUMORE AMBIENTALE', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 5 SPAZIO
  { id: '5.1', section: '5) SPAZIO', type: 'radio', question: 'Spazio di lavoro e manovra adeguato per ruotare/assumere posture', options: ['SI', 'NO'] },
  { id: '5.2', section: '5) SPAZIO', type: 'radio', question: 'Percorsi liberi dagli ostacoli', options: ['SI', 'NO'] },
  { id: '5_note', section: '5) SPAZIO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 6 PIANO DI LAVORO
  { id: '6.1', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Superficie adeguata (poco ingombrante)', options: ['SI', 'NO'] },
  { id: '6.2', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Altezza del piano compresa indicativamente tra 70-80 cm', options: ['SI', 'NO'] },
  { id: '6.3', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Dimensioni e disposizione di schermo, tastiera, mouse adeguate', options: ['SI', 'NO'] },
  { id: '6_note', section: '6) PIANO DI LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 7 SEDILE DI LAVORO
  { id: '7.1', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Altezza sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.2', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Inclinazione sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.3', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale con supporto dorso-lombare', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.4', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale regolabile in altezza', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.5', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale e seduta con bordi smussati e materiali appropriati', options: ['SI', 'NO'] },
  { id: '7.6', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Presenza di ruote/meccanismo spostamento (se previsto)', options: ['SI', 'NO'] },
  { id: '7_note', section: '7) SEDILE DI LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 8 SCHERMO VIDEO
  { id: '8.1', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Monitor VDT orientabile/inclinabile', options: ['SI', 'NO'] },
  { id: '8.2', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Immagine stabile ed esente da sfarfallamento', options: ['SI', 'NO'] },
  { id: '8.3', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Risoluzione e luminosità del carattere regolabili', options: ['SI', 'NO'] },
  { id: '8.4', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Contrasto e luminosità adeguati', options: ['SI', 'NO'] },
  { id: '8.5', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Presenza di riflessi o riverberi sullo schermo', options: ['SI', 'NO'] },
  { id: '8.6', section: '8) SCHERMO VIDEO', type: 'text', question: 'Note su posizione dello schermo (altezza occhi, distanza, ecc.)' },
  { id: '8_note', section: '8) SCHERMO VIDEO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 9 TASTIERA
  { id: '9.1', section: '9) TASTIERA', type: 'radio', question: 'Tastiera e mouse separati dallo schermo', options: ['SI', 'NO'] },
  { id: '9.2', section: '9) TASTIERA', type: 'radio', question: 'Tastiera inclinabile', options: ['SI', 'NO'] },
  { id: '9.3', section: '9) TASTIERA', type: 'radio', question: 'Spazio adeguato per appoggiare avambracci davanti alla tastiera', options: ['SI', 'NO'] },
  { id: '9.4', section: '9) TASTIERA', type: 'radio', question: 'Simboli/tasti leggibili dalla normale posizione', options: ['SI', 'NO'] },
  { id: '9_note', section: '9) TASTIERA', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 10 INTERFACCIA UOMO-MACCHINA
  { id: '10.1', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'radio', question: 'Il software presente è di facile utilizzo e adeguato al lavoro svolto', options: ['SI', 'NO'] },
  { id: '10_note', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'text', question: 'Osservazioni (eventuali)' },

  // Foto e note finali
  { id: 'foto_postazione', section: 'Fine', type: 'text', question: 'Foto della postazione (URL o nota)' }
] as const;

interface Response {
  id: string;
  answers?: {
    [key: string]: string | string[] | null;
    meta_reparto?: string;
  };
}

const RepartiComparison = () => {
  const [responses, setResponses] = useState<Response[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const loadResponses = async () => {
      const snap = await getDocs(collection(db, "responses"));
      setResponses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadResponses();
  }, [user, navigate]);

  const reparti = useMemo(() => Array.from(new Set(responses.map(r => r.answers?.meta_reparto).filter(Boolean))).sort(), [responses]);

  const chartsData = useMemo(() => {
    return questions.map(q => {
      const buckets = new Set<string>();

      // raccogliere tutte le risposte date a questa domanda
      responses.forEach(r => {
        const val = r.answers?.[q.id];
        if (val === undefined || val === null) return;

        const vals = Array.isArray(val) ? val : [val];
        vals.forEach(v => buckets.add(String(v)));
      });

      // se la domanda ha opzioni predefinite, usarle tutte
      if (q.options) q.options.forEach(opt => buckets.add(opt));

      const data = Array.from(buckets).map(bucket => {
        const row: any = { risposta: bucket };
        reparti.forEach(rep => {
          const count = responses.filter(r => {
            if (r.answers?.meta_reparto !== rep) return false;
            const val = r.answers?.[q.id];
            if (val === undefined || val === null) return false;
            const vals = Array.isArray(val) ? val : [val];
            return vals.includes(bucket);
          }).length;
          row[rep] = count;
        });
        return row;
      });

      return { domanda: q.question, data };
    });
  }, [responses, reparti]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-xl font-bold leading-tight">Analisi Tra Reparti</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {chartsData.map(q => (
          <Card key={q.domanda} className="shadow-lg border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
              <CardTitle>{q.domanda}</CardTitle>
              <CardDescription>Distribuzione delle risposte per reparto</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={q.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="risposta" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {reparti.map((rep, idx) => (
                    <Bar key={rep} dataKey={rep} stackId="a" fill={COLORS[idx % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default RepartiComparison;