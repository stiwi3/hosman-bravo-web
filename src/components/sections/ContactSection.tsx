import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/**
 * CONTACTO — formulario de contrataciones.
 *
 * ⚠️ El formulario NO envía a ningún sitio todavía y el correo es un
 * marcador de posición. Deuda ya catalogada (A11Y-03 en `AUDITORIA_TECNICA.md`);
 * se resuelve en su propia fase, no aquí.
 */
export function ContactSection() {
  const data = hosmanData;

  return (
    <section className={SCENE_FULL}>
      <div className={`${SCENE_CONTENT} max-w-narrow`}>
        <div className="flex justify-center mb-8">
          <Image
            src={data.images.logo.imagotipoDorado}
            alt="Hosman Bravo"
            width={140}
            height={150}
            className="w-32 h-auto object-contain"
          />
        </div>
        <h2 className="text-section mb-block tracking-wide text-center">CONTRATACIONES</h2>

        <form className="space-y-6">
          {[
            { num: '01', label: 'NOMBRE COMPLETO', type: 'text', placeholder: 'Tu nombre' },
            { num: '02', label: 'EMAIL', type: 'email', placeholder: 'tu@email.com' },
            { num: '03', label: 'TIPO DE EVENTO', type: 'text', placeholder: 'Feria, discoteca, evento privado...' },
            { num: '04', label: 'MENSAJE', type: 'textarea', placeholder: 'Ciudad, fecha y detalles del evento...' }
          ].map(({ num, label, type, placeholder }) => (
            <div key={num} className="flex gap-6 items-baseline border-b border-white/25 pb-3">
              <span className="text-xs opacity-60 w-6">{num}.</span>
              <label className="text-sm font-black tracking-wide w-36">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  placeholder={placeholder}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-sans resize-none"
                  rows={3}
                ></textarea>
              ) : (
                <input
                  type={type}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            className="w-full bg-amber-400 text-black py-4 font-black tracking-widest text-sm mt-8 hover:bg-red-600 hover:text-white transition relative"
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2">•</span>
            ENVIAR
            <span className="absolute right-3 top-1/2 -translate-y-1/2">•</span>
          </button>
        </form>

        <div className="mt-12 p-6 bg-amber-400/5 border border-amber-400/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-2">O contacta directamente:</p>
          <p className="text-sm font-bold text-amber-400">{data.contact.email}</p>
        </div>
      </div>
    </section>
  );
}
