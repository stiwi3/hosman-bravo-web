import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { ContactForm } from './ContactForm';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/**
 * CONTACTO — formulario de contrataciones.
 *
 * Es la ruta que se comparte con los promotores, así que el envío tiene que
 * llegar a alguna parte: lo resuelve `ContactForm` abriendo WhatsApp con el
 * mensaje redactado. La sección se queda en el servidor; solo el formulario
 * necesita estado.
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

        <ContactForm />

        {/* ⚠️ hosmanbravo.com todavía no está comprado: este correo no recibe.
            Decisión de Danny (2 sep 2026): se deja hasta tener el dominio. */}
        <div className="mt-12 p-6 bg-amber-400/5 border border-amber-400/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-2">O contacta directamente:</p>
          <p className="text-sm font-bold text-amber-400">{data.contact.email}</p>
        </div>
      </div>
    </section>
  );
}
