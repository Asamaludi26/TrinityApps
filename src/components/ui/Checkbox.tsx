import React, { useRef, useEffect } from 'react';
import { CheckIcon } from '../icons/CheckIcon';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Pass through standard input props
  indeterminate?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ className, checked, id, indeterminate, ...props }) => {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate || false;
        }
    }, [indeterminate]);

    return (
        <label htmlFor={id} className={`relative flex cursor-pointer items-center justify-center group ${className}`}>
            <input
                ref={ref}
                id={id}
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                {...props}
            />
            <div
                className={`
                    flex h-5 w-5 flex-shrink-0 items-center justify-center rounded
                    border-2 border-gray-400 bg-white
                    transition-all duration-200 ease-in-out
                    group-hover:border-tm-accent
                    peer-checked:border-tm-primary peer-checked:bg-tm-primary
                    peer-focus-visible:ring-2 peer-focus-visible:ring-tm-accent peer-focus-visible:ring-offset-2
                    ${indeterminate ? '!border-tm-primary !bg-tm-primary' : ''}
                `}
                aria-hidden="true"
            >
                {indeterminate ? (
                    <div className="w-2.5 h-0.5 bg-white rounded-sm"></div>
                ) : (
                    <CheckIcon className={`h-3 w-3 text-white transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                )}
            </div>
        </label>
    );
};