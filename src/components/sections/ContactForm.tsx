'use client';

import { useState } from 'react';
import { hosmanData } from '@/data/hosman-data';

/** Los cuatro campos de la solicitud, en el orden en que se piden. */
const FIELDS = [
  { name: 'nombre', num: '01', label: 'NOMBRE COMPLETO', type: 'text', placeholder: 'Tu nombre', required: true },
  { name: 'email', num: '02', label: 'EMAIL', type: 'email', placeholder: 'tu@email.com', required: false },
  { name: 'evento', num: '03', label: 'TIPO DE EVENTO', type: 'text', placeholder: 'Feria, discoteca, evento privado...', required: false },
  { name: 'mensaje', num: '04', label: 'MENSAJE', type: 'textarea', placeholder: 'Ciudad, fecha y detalles del evento...', required: true },
] as const;

type FieldName = (typeof FIELDS)[number]['name'];
type FormState = Record<FieldName, string>;

const EMPTY: FormState = { nombre: '', email: '', evento: '', mensaje: '' };

/** Redacta el mensaje que llega a WhatsApp con los campos rellenados. */
function composeMessage(form: FormState): string {
  const lines = [
    `Hola Hosman, quiero contratar un show.`,
    ``,
    `Nombre: ${form.nombre.trim()}`,
  ];
  if (form.email.trim()) lines.push(`Email: ${form.email.trim()}`);
  if (form.evento.trim()) lines.push(`Tipo de evento: ${form.evento.trim()}`);
  lines.push(``, form.mensaje.trim());
  return lines.join('\n');
}

/**
 * Solicitud de contratación.
 *
 * No hay servidor detrás —el sitio es un export estático— así que el envío se
 * resuelve abriendo WhatsApp con el mensaje ya redactado. Es también el canal
 * en el que de verdad responde un promotor colombiano: no queda una solicitud
 * esperando en un buzón que nadie mira.
 */
export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const update = (name: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.mensaje.trim()) {
      setError('Escribe al menos tu nombre y los detalles del evento.');
      return;
    }

    const url = `https://wa.me/${hosmanData.contact.whatsapp}?text=${encodeURIComponent(
      composeMessage(form)
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {FIELDS.map(({ name, num, label, type, placeholder }) => (
        <div key={num} className="flex gap-6 items-baseline border-b border-white/25 pb-3">
          <span className="text-xs opacity-60 w-6" aria-hidden="true">
            {num}.
          </span>
          <label htmlFor={`contacto-${name}`} className="text-sm font-black tracking-wide w-36">
            {label}
          </label>
          {type === 'textarea' ? (
            <textarea
              id={`contacto-${name}`}
              name={name}
              value={form[name]}
              onChange={(e) => update(name, e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none text-sm font-sans resize-none"
              rows={3}
            />
          ) : (
            <input
              id={`contacto-${name}`}
              name={name}
              type={type}
              value={form[name]}
              onChange={(e) => update(name, e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
            />
          )}
        </div>
      ))}

      {/* `empty:hidden` lo saca del flujo mientras no hay error: en reposo el
          formulario conserva exactamente la separación aprobada. */}
      <p aria-live="polite" className="empty:hidden text-xs text-red-400">
        {error}
      </p>

      <button
        type="submit"
        className="w-full bg-amber-400 text-black py-4 font-black tracking-widest text-sm mt-8 hover:bg-red-600 hover:text-white transition relative"
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2">•</span>
        ENVIAR POR WHATSAPP
        <span className="absolute right-3 top-1/2 -translate-y-1/2">•</span>
      </button>
    </form>
  );
}
