'use client';

/**
 * A password box you can look inside.
 *
 * There were two of these in the app — one on the sign-in overlay, one on the
 * sign-up form — and neither had a way to see what you had typed. On a phone
 * keyboard that is the difference between signing in and being told your
 * password is wrong three times, and it is the single most common reason
 * somebody gives up at the door.
 *
 * One component rather than the same markup twice, because the two had already
 * drifted apart in padding and placeholder and would have drifted again.
 *
 * Two details that matter more than they look:
 *
 * `type="button"` on the toggle. Inside a form, a button without it submits,
 * so revealing your password would have tried to sign you in with whatever was
 * there.
 *
 * The field keeps its own reveal state and always starts hidden. Nothing about
 * having shown it once should carry to the next time the form opens — somebody
 * else may be holding the phone.
 */

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function PasswordField({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** The input's own classes, so each form keeps the shape it had. */
  className: string;
  autoComplete?: string;
  required?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        // Room for the button, so a long password does not run under it.
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-label={shown ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-500 hover:text-white focus:outline-none focus:text-white"
      >
        {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
