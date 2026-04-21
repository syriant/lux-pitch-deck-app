import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFullDeck, type FullDeck } from '@/api/decks.api';
import { AppShell } from '@/components/layout/AppShell';
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
  const [deck, setDeck] = useState<FullDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  async function loadDeck() {
    if (!id) return;
    try {
      setDeck(await getFullDeck(id));
    } catch {
      setError('Failed to load deck');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDeck(); }, [id]);

  if (loading) {
    return (
      <AppShell sidebar={false}>
        <div className="p-8 text-[#7E8188]">Loading...</div>
      </AppShell>
    );
  }

  if (error || !deck) {
    return (
      <AppShell sidebar={false}>
        <div className="p-8">
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error || 'Deck not found'}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={false} breadcrumb={deck.name}>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#363A45]">{deck.name}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/decks/${deck.id}/preview`)}
              className="text-sm text-[#01B18B] hover:text-[#009977]"
            >
              Preview
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-[#7E8188] hover:text-[#363A45]"
            >
              Save & Exit
            </button>
          </div>
        </div>

        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

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
            deckId={deck.id}
            properties={deck.properties}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Images
            deckId={deck.id}
            coverImage={deck.coverImage ?? null}
            heroImage={deck.heroImage ?? null}
            gallery={deck.gallery ?? []}
            hotelName={deck.properties[0]?.propertyName ?? null}
            destination={deck.properties[0]?.destination ?? null}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Step4Objectives
            deckId={deck.id}
            deck={deck}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <Step5CaseStudies
            deckId={deck.id}
            properties={deck.properties}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
          />
        )}

        {currentStep === 6 && (
          <Step6Assets
            deckId={deck.id}
            properties={deck.properties}
            onBack={() => setCurrentStep(5)}
          />
        )}
      </div>
    </AppShell>
  );
}
