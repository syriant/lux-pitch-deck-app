import { type DeckObjective, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface ObjectivesSlideProps {
  objectives: DeckObjective[];
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

export function ObjectivesSlide({ objectives, deck, onFieldChange, onGalleryAdd }: ObjectivesSlideProps) {
  const primary = objectives[0];
  const secondary = objectives.slice(1);
  const hasObjectives = objectives.length > 0;
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        {/* Left column — heading + photo */}
        <div className="w-[45%] flex flex-col">
          <SlideRichText
            fieldKey="obj.headline"
            defaultValue="We create <mark style='background-color:#00b2a0;color:#ffffff;padding:0 2px;border-radius:2px'>tailored tactical campaigns</mark><br>to achieve your specific key objectives"
            defaultSize={20}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-light italic leading-snug mb-4"
            style={{ color: GREEN }}
          />

          <SlideImage
            fieldKey="image.objectives"
            customFields={cf}
            gallery={deck?.gallery}
            onFieldChange={onFieldChange}
            onGalleryAdd={onGalleryAdd}
            className="flex-1 rounded-lg overflow-hidden"
            placeholderText="Hotel photo"
          />
        </div>

        {/* Right column — objectives */}
        <div className="flex-1 flex flex-col justify-center">
          {!hasObjectives ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-400">No objectives set</p>
              <p className="text-[10px] text-gray-300 mt-1">Add objectives in the wizard (Step 4)</p>
            </div>
          ) : (
            <>
              {primary && (
                <div className="mb-6">
                  <div className="w-12 border-t-2 mb-3" style={{ borderColor: GREEN }} />
                  <h3 className="text-sm font-bold mb-2" style={{ color: '#333' }}>Primary Objective</h3>
                  {onFieldChange ? (
                    <EditableText
                      value={primary.objectiveText}
                      onChange={(v) => onFieldChange('objective', primary.id, 'objectiveText', v)}
                      className="text-[11px] leading-relaxed"
                      as="p"
                      multiline
                    />
                  ) : (
                    <p className="text-[11px] leading-relaxed" style={{ color: '#444' }}>
                      {primary.objectiveText}
                    </p>
                  )}
                </div>
              )}

              {secondary.length > 0 && (
                <div>
                  <div className="w-12 border-t-2 mb-3" style={{ borderColor: GREEN }} />
                  <h3 className="text-sm font-bold mb-2" style={{ color: '#333' }}>Secondary Objectives</h3>
                  {secondary.map((obj) => (
                    onFieldChange ? (
                      <EditableText
                        key={obj.id}
                        value={obj.objectiveText}
                        onChange={(v) => onFieldChange('objective', obj.id, 'objectiveText', v)}
                        className="text-[11px] leading-relaxed mb-1"
                        as="p"
                      />
                    ) : (
                      <p key={obj.id} className="text-[11px] leading-relaxed mb-1" style={{ color: '#444' }}>
                        {obj.objectiveText}
                      </p>
                    )
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
