import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideEditableText } from '../SlideEditableText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DemographicsSlideProps {
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

const defaultSegments = [
  'Couples at the peak of their careers with a high disposable income',
  'Young families with a desire for premium experiences',
  'Empty-nesters spoiling themselves with luxurious holidays',
  'Avid travelers taking 2-4 trips a year',
];

export function DemographicsSlide({ deck, onFieldChange }: DemographicsSlideProps) {
  const cf = deck?.customFields;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="px-[6%] pt-[5%] pb-2">
        <SlideEditableText
          fieldKey="demo.headline"
          defaultValue="With our affluent and engaged customers turn inspiration into bookings"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="text-lg font-bold leading-snug"
          as="h2"
        />
        <SlideEditableText
          fieldKey="demo.subheadline"
          defaultValue="Our demographic intelligence reveals who our customers are, how they travel, and what inspires them to book."
          customFields={cf}
          onFieldChange={onFieldChange}
          className="text-[10px] mt-1"
          as="p"
        />
      </div>

      <div className="px-[6%] grid grid-cols-4 gap-3 mb-4">
        {defaultSegments.map((s, i) => (
          <div key={i} className="flex flex-col">
            <div className="h-24 rounded-t-md" style={{
              background: `linear-gradient(${135 + i * 30}deg, #a3c4bd, #c8ddd8, #8eb8b0)`,
            }} />
            <SlideEditableText
              fieldKey={`demo.segment.${i}`}
              defaultValue={s}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="text-[9px] leading-snug mt-2 font-medium"
              as="p"
            />
          </div>
        ))}
      </div>

      <div className="mx-[6%] mb-[4%] border-t-2 pt-3" style={{ borderColor: GREEN }}>
        <SlideEditableText
          fieldKey="demo.audienceTitle"
          defaultValue="Access our loyal audience:"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="text-xs font-bold mb-2"
          as="p"
        />
        <ul className="space-y-1 text-[10px]" style={{ color: '#333' }}>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideEditableText
              fieldKey="demo.stat1"
              defaultValue="95% of our members weren't planning to stay at the hotel they booked and 63% weren't planning on visiting the destination until we put it in front of them."
              customFields={cf}
              onFieldChange={onFieldChange}
              className="flex-1"
              as="span"
              multiline
            />
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideEditableText
              fieldKey="demo.stat2"
              defaultValue="Try something new: Only 2.5% would have purchased directly from the hotel's site"
              customFields={cf}
              onFieldChange={onFieldChange}
              className="flex-1"
              as="span"
            />
          </li>
        </ul>
      </div>
    </div>
  );
}
