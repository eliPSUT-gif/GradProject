import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  buttonLabel?: string;
  wrapperClassName?: string;
};

export default function PasswordInput({
  buttonLabel = 'password',
  className = '',
  wrapperClassName = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-400 transition-colors hover:text-[#2563eb]"
        aria-label={visible ? `Hide ${buttonLabel}` : `Show ${buttonLabel}`}
        title={visible ? `Hide ${buttonLabel}` : `Show ${buttonLabel}`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
