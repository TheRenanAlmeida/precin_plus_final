import React from 'react';

interface PillToggleOption {
    label: string;
    value: string;
}

interface PillToggleButtonProps {
    options: PillToggleOption[];
    activeOption: string;
    onChange: (value: string) => void;
}

const PillToggleButton: React.FC<PillToggleButtonProps> = ({ options, activeOption, onChange }) => {
  return (
    <div className="flex w-[140px] bg-white border border-gray-300 rounded-full p-0.5 shadow-sm overflow-hidden">
      {options.map((option) => {
        // estilo base da sua pill
        const baseClasses =
          "flex-1 px-2 py-1.5 text-sm font-semibold transition-all rounded-full border whitespace-nowrap flex items-center justify-center";

        const className = `${baseClasses} ${
          activeOption === option.value
            ? "bg-green-50 text-green-700 border-green-400"
            : "bg-white text-gray-600 hover:text-green-700 border-transparent"
        }`;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={className}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default PillToggleButton;