import type { OptionKey, Question } from '../lib/types';
import { OPTION_KEYS } from '../lib/types';

interface OptionListProps {
  question: Question;
  selected: OptionKey | null;
  revealed?: boolean;
  disabled?: boolean;
  onSelect: (key: OptionKey) => void;
}

export function OptionList({ question, selected, revealed = false, disabled = false, onSelect }: OptionListProps) {
  return (
    <ul className="options" role="list">
      {OPTION_KEYS.map((key) => {
        const isSelected = selected === key;
        const isAnswer = question.answer === key;
        const state = revealed ? (isAnswer ? 'is-correct' : isSelected ? 'is-wrong' : 'is-idle') : isSelected ? 'is-selected' : '';

        return (
          <li key={key}>
            <button
              type="button"
              className={`option ${state}`}
              onClick={() => onSelect(key)}
              disabled={disabled || revealed}
              aria-pressed={isSelected}
              data-key={key}
            >
              <span className="option-key" aria-hidden="true">
                {key}
              </span>
              <span className="option-text">{question.options[key]}</span>
              {revealed && isAnswer ? <span className="option-flag">correct</span> : null}
              {revealed && isSelected && !isAnswer ? <span className="option-flag">your answer</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
