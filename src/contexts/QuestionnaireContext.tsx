import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Questionnaire } from "@/types/questionnaire";

interface QuestionnaireContextType {
  questionnaires: Questionnaire[];
  selectedQuestionnaire: Questionnaire | null;
  setSelectedQuestionnaireId: (id: string) => void;
  loading: boolean;
  refreshQuestionnaires: () => Promise<void>;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadQuestionnaires = async () => {
    try {
      const q = query(collection(db, "questionnaires"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date(),
        } as Questionnaire;
      });
      setQuestionnaires(data);

      // Se non c'è un questionario selezionato, seleziona il primo
      if (data.length > 0 && !selectedQuestionnaireId) {
        const active = data.find((q) => q.isActive) || data[0];
        setSelectedQuestionnaireId(active.id);
      }
    } catch (error) {
      console.error("Errore caricamento questionari:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const selectedQuestionnaire = questionnaires.find((q) => q.id === selectedQuestionnaireId) || null;

  return (
    <QuestionnaireContext.Provider
      value={{
        questionnaires,
        selectedQuestionnaire,
        setSelectedQuestionnaireId,
        loading,
        refreshQuestionnaires: loadQuestionnaires,
      }}
    >
      {children}
    </QuestionnaireContext.Provider>
  );
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (context === undefined) {
    throw new Error("useQuestionnaire must be used within a QuestionnaireProvider");
  }
  return context;
}
