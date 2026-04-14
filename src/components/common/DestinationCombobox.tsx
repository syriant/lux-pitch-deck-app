import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

export interface DestinationSelection {
  label: string;
  isCustom: boolean;
}

interface DestinationComboboxProps {
  options: string[];
  value: string;
  onChange: (selection: DestinationSelection) => void;
  placeholder?: string;
}

export function DestinationCombobox({
  options,
  value,
  onChange,
  placeholder = 'Search or type a destination...',
}: DestinationComboboxProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = inputValue
    ? options.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  const exactMatch = options.some((o) => o.toLowerCase() === inputValue.toLowerCase());

  function select(label: string, isCustom: boolean) {
    setInputValue(label);
    setIsOpen(false);
    setHighlightIndex(-1);
    onChange({ label, isCustom });
  }

  function handleBlur() {
    // Delay to allow click on option
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        if (inputValue && inputValue !== value) {
          select(inputValue, !exactMatch);
        }
      }
    }, 150);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlightIndex + 1, filtered.length - 1);
      setHighlightIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(highlightIndex - 1, 0);
      setHighlightIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        select(filtered[highlightIndex], false);
      } else if (inputValue) {
        select(inputValue, !exactMatch);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {isOpen && (filtered.length > 0 || (inputValue && !exactMatch)) && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === highlightIndex}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlightIndex ? 'bg-[#dff0ee] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(opt, false)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {opt}
            </li>
          ))}

          {inputValue && !exactMatch && (
            <li
              role="option"
              aria-selected={highlightIndex === filtered.length}
              className={`cursor-pointer border-t border-gray-100 px-3 py-2 text-sm ${
                highlightIndex === filtered.length ? 'bg-[#dff0ee]' : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(inputValue, true)}
              onMouseEnter={() => setHighlightIndex(filtered.length)}
            >
              <span className="text-gray-500">Use custom: </span>
              <span className="font-medium text-gray-900">{inputValue}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
