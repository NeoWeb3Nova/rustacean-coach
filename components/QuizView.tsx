
import React, { useState, useEffect } from 'react';
import { QuizQuestion, Language } from '../types';
import { translations } from '../translations';
import { generateQuizForChapter } from '../services/gemini';

interface QuizViewProps {
  language: Language;
  chapterTitle: string;
  onPass: () => void;
  onFail: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ language, chapterTitle, onPass, onFail }) => {
  const t = translations[language];
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const quiz = await generateQuizForChapter(chapterTitle, language);
        setQuestions(quiz);
        setAnswers(new Array(quiz.length).fill(-1));
      } catch (e) {
        console.error("Quiz load error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuiz();
  }, [chapterTitle, language]);

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) correct++;
    });
    setScore(correct);
    setIsSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-10 w-10 border-4 border-[#1f6feb] border-t-transparent rounded-full"></div>
        <p className="text-[#8b949e]">{t.processingPdf}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full animate-in fade-in zoom-in duration-300">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t.quizTitle}: {chapterTitle}</h2>
        <p className="text-[#8b949e]">{t.quizSub}</p>
      </header>

      <div className="space-y-8">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">{qIdx + 1}. {q.question}</h3>
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  disabled={isSubmitted}
                  onClick={() => {
                    const newAnswers = [...answers];
                    newAnswers[qIdx] = oIdx;
                    setAnswers(newAnswers);
                  }}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    answers[qIdx] === oIdx 
                      ? 'bg-[#1f6feb22] border-[#1f6feb] text-[#58a6ff]' 
                      : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#484f58]'
                  } ${
                    isSubmitted && oIdx === q.correctAnswerIndex 
                      ? 'bg-green-900/20 border-green-500 text-green-400'
                      : ''
                  } ${
                    isSubmitted && answers[qIdx] === oIdx && oIdx !== q.correctAnswerIndex
                      ? 'bg-red-900/20 border-red-500 text-red-400'
                      : ''
                  }`}
                >
                  <span className="font-bold mr-3">{String.fromCharCode(65 + oIdx)}.</span>
                  {opt}
                </button>
              ))}
            </div>
            {isSubmitted && (
              <div className="mt-4 p-4 bg-[#21262d] rounded-lg text-sm text-[#8b949e]">
                <p className="text-white font-bold mb-1">Explanation:</p>
                {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 sticky bottom-8 flex justify-center">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="px-8 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
          >
            {t.submitQuiz}
          </button>
        ) : (
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl w-full flex flex-col items-center gap-4">
            <div className="text-3xl font-bold">
              {score} / {questions.length}
            </div>
            {score === questions.length ? (
              <>
                <p className="text-green-400 font-medium">{t.quizPassed}</p>
                <button onClick={onPass} className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-bold">
                  {t.nextChapter}
                </button>
              </>
            ) : (
              <>
                <p className="text-red-400 font-medium">{t.quizFailed}</p>
                <div className="flex gap-4">
                  <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#21262d] text-[#8b949e] rounded-md font-bold border border-[#30363d]">
                    {t.retryQuiz}
                  </button>
                  <button onClick={onFail} className="px-6 py-2 bg-[#1f6feb] text-white rounded-md font-bold">
                    {t.backToDashboard}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizView;
