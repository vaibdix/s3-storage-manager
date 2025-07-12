// components/ui/select.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const Select = ({
  children,
  value,
  onValueChange,
  defaultValue,
  disabled = false,
  name,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || defaultValue || '');
  const selectRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (newValue) => {
    setCurrentValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className="relative">
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => !disabled && setIsOpen(!isOpen),
            isOpen,
            disabled,
            'aria-expanded': isOpen,
            'aria-haspopup': 'listbox',
            role: 'combobox'
          });
        }
        if (child.type === SelectContent) {
          return React.cloneElement(child, {
            isOpen,
            currentValue,
            onSelect: handleSelect
          });
        }
        return child;
      })}
      <select
        name={name}
        value={currentValue}
        onChange={() => {}} // Controlled by our custom logic
        required={required}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value={currentValue}>{currentValue}</option>
      </select>
    </div>
  );
};

const SelectTrigger = ({
  children,
  className = '',
  onClick,
  isOpen,
  disabled,
  ...props
}) => {
  const baseClasses = `
    flex h-10 w-full items-center justify-between rounded-md border border-input
    bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground
    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
  `;

  const stateClasses = `
    ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'}
  `;

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClasses} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <span className="flex-1 text-left truncate">
        {children}
      </span>
      <ChevronDown
        className={`h-4 w-4 opacity-50 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
};

const SelectValue = ({
  placeholder = 'Select...',
  currentValue,
  children
}) => {
  if (children && currentValue) {
    const matchingChild = React.Children.toArray(children).find(
      child => child.props?.value === currentValue
    );
    if (matchingChild) {
      return <span>{matchingChild.props.children}</span>;
    }
  }
  if (currentValue) {
    return <span>{currentValue}</span>;
  }
  return <span className="text-muted-foreground">{placeholder}</span>;
};

const SelectContent = ({
  children,
  className = '',
  isOpen,
  currentValue,
  onSelect,
  position = 'item-aligned',
  sideOffset = 4
}) => {
  if (!isOpen) return null;

  const baseClasses = `
    absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md
    animate-in fade-in-0 zoom-in-95 slide-in-from-top-2
  `;

  const positionClasses = position === 'item-aligned'
    ? `top-full mt-1 w-full`
    : `top-full mt-1 w-full`;

  return (
    <div
      className={`${baseClasses} ${positionClasses} ${className}`.trim()}
      role="listbox"
      style={{
        marginTop: sideOffset,
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      {React.Children.map(children, child => {
        if (child.type === SelectItem) {
          return React.cloneElement(child, {
            isSelected: child.props.value === currentValue,
            onSelect
          });
        }
        return child;
      })}
    </div>
  );
};

const SelectItem = ({
  children,
  value,
  disabled = false,
  className = '',
  isSelected,
  onSelect
}) => {
  const baseClasses = `
    relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm
    outline-none focus:bg-accent focus:text-accent-foreground
  `;

  const stateClasses = `
    ${disabled
      ? 'pointer-events-none opacity-50'
      : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
    }
  `;

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(value);
    }
  };

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${className}`.trim()}
      onClick={handleClick}
      role="option"
      aria-selected={isSelected}
      data-disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
};

const SelectLabel = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`py-1.5 pl-8 pr-2 text-sm font-semibold text-muted-foreground ${className}`.trim()}
    >
      {children}
    </div>
  );
};

const SelectSeparator = ({
  className = ''
}) => {
  return (
    <div
      className={`-mx-1 my-1 h-px bg-muted ${className}`.trim()}
    />
  );
};

const useSelect = (initialValue = '') => {
  const [value, setValue] = useState(initialValue);
  const handleValueChange = (newValue) => {
    setValue(newValue);
  };

  return {
    value,
    onValueChange: handleValueChange,
    setValue
  };
};

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  useSelect
};