import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, type DeckWithProperties } from '@/api/decks.api';
import { StepIndicator } from '@/components/wizard/StepIndicator';
import { Step1Hotels } from './Step1Hotels';
import { Step2Pricing } from './Step2Pricing';
import { Step3Images } from './Step3Images';
import { Step4Objectives } from './Step4Objectives';
import { Step5CaseStudies } from './Step5CaseStudies';
import { Step6Assets } from './Step6Assets';

export function DeckWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<DeckWithProperties | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  async function loadDeck() {
    if (!id) return;
    try {
      setDeck(await getDeck(id));
    } catch {
      setError('Failed to load deck');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDeck(); }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error || !deck) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error || 'Deck not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{deck.name}</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Save & Exit
        </button>
      </div>

      <StepIndicator currentStep={currentStep} />

      {currentStep === 1 && (
        <Step1Hotels
          deckId={deck.id}
          properties={deck.properties}
          onPropertiesChange={loadDeck}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <Step2Pricing
          properties={deck.properties}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <Step3Images
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <Step4Objectives
          deckId={deck.id}
          onBack={() => setCurrentStep(3)}
          onNext={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && (
        <Step5CaseStudies
          onBack={() => setCurrentStep(4)}
          onNext={() => setCurrentStep(6)}
        />
      )}

      {currentStep === 6 && (
        <Step6Assets
          properties={deck.properties}
          onBack={() => setCurrentStep(5)}
        />
      )}
    </div>
  );
}
