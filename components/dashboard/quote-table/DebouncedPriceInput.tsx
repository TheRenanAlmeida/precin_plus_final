
import React, { useState, useEffect } from 'react';

interface DebouncedPriceInputProps {
    value: string;
    onCommit: (newValue: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const DebouncedPriceInput: React.FC<DebouncedPriceInputProps> = ({ 
    value, 
    onCommit, 
    placeholder, 
    className,
    disabled 
}) => {
    const [localValue, setLocalValue] = useState(value);

    // Sincroniza se o valor externo mudar
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        let digits = rawValue.replace(/\D/g, '').slice(0, 5);
        if (digits === '') {
            setLocalValue('');
            return;
        }
        const formatted = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        setLocalValue(formatted);
    };

    const handleCommit = () => {
        if (localValue !== value) {
            onCommit(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleCommit();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleChange}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
        />
    );
};

export default DebouncedPriceInput;
