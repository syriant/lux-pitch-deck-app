import { type DeckObjective } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface ObjectivesSlideProps {
  objectives: DeckObjective[];
  onFieldChange?: FieldChangeHandler;
}

export function ObjectivesSlide({ objectives, onFieldChange }: ObjectivesSlideProps) {
  const primary = objectives[0];
  const secondary = objectives.slice(1);
  const hasObjectives = objectives.length > 0;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        {/* Left column — heading + photo */}
        <div className="w-[45%] flex flex-col">
          <p className="text-xl font-light italic leading-snug mb-4" style={{ color: GREEN }}>
            We create{' '}
            <span className="font-semibold not-italic px-1" style={{ backgroundColor: GREEN, color: 'white' }}>
              tailored tactical campaigns
            </span>
            <br />
            to achieve your specific key objectives
          </p>

          {/* Photo placeholder */}
          <div className="flex-1 rounded-lg overflow-hidden" style={{
            background: 'linear-gradient(135deg, #a3c4bd, #8eb8b0, #c8ddd8)',
          }}>
            <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
              Hotel photo
            </div>
          </div>
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

      {/* Bottom-right logo */}
      <div className="flex justify-end px-[5%] pb-[3%]">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: GREEN }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#333' }}>
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>
      </div>
    </div>
  );
}
